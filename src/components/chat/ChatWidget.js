import React, { useEffect, useRef, useState } from 'react';
import MaterialIcon from '@material/react-material-icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAxios from '../../hooks/useAxios';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';
import {
  ambilKunciLokal,
  bukaPaketKunci,
  buatPaketKunci,
  dekripsi,
  gantiPassphrase,
  kunciBersama,
  PASSPHRASE_BAWAAN,
  simpanKunciLokal,
} from '../../utils/chatCrypto';
import ChatGanti from './ChatGanti';
import ChatKunci from './ChatKunci';
import ChatPercakapan from './ChatPercakapan';
import { Foto, Status } from './ChatShared';
import './ChatWidget.scss';

// tombol melayang di atas tombol notifikasi: daftar user (online di atas) dan pesan terenkripsi antar akun
const ChatWidget = () => {
  const api = useAxios();
  const qc = useQueryClient();
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState('');
  const [tujuanId, setTujuanId] = useState(null);
  const [privat, setPrivat] = useState(null);
  const [lokalSiap, setLokalSiap] = useState(false);
  const [gantiBuka, setGantiBuka] = useState(false);
  const sudahCobaBawaan = useRef(false);
  const [bawaanGagal, setBawaanGagal] = useState(false);

  // paket kunci milik saya di server; kunci privat yang sudah dibuka disimpan di IndexedDB browser ini
  const { data: kunciData } = useQuery({
    queryKey: ['chat-kunci'],
    queryFn: () => api.get('api/chat/keys/me').then((res) => res.data),
  });
  const paket = kunciData ? kunciData.data : null;
  const idSaya = kunciData ? kunciData.user_id : null;
  // akun yang dikecualikan (mis. Tenaga Pendukung): tidak ada tombol pesan dan tidak memanggil API pesan lain
  const aktif = Boolean(kunciData) && kunciData.aktif !== false;

  useEffect(() => {
    if (!kunciData) return undefined;
    let batal = false;
    if (!kunciData.data) {
      setPrivat(null);
      setLokalSiap(true);
      return undefined;
    }
    ambilKunciLokal(kunciData.user_id).then((tersimpan) => {
      if (batal) return;
      // kunci lokal hanya dipakai bila cocok dengan kunci publik terbaru di server (bukan sisa sebelum reset)
      setPrivat(tersimpan && tersimpan.publik === kunciData.data.public_key ? tersimpan.privat : null);
      setLokalSiap(true);
    });
    return () => {
      batal = true;
    };
  }, [kunciData]);

  let tahap = 'memuat';
  if (kunciData && lokalSiap) {
    if (!paket) tahap = 'aktifkan';
    else if (!privat) tahap = 'buka';
    else tahap = 'siap';
  }

  // kunci bawaan (dibuat massal oleh admin) dibuka otomatis; pengguna diingatkan untuk menggantinya
  useEffect(() => {
    if (tahap !== 'buka' || !paket || !paket.bawaan || sudahCobaBawaan.current) return;
    sudahCobaBawaan.current = true;
    bukaPaketKunci(paket, PASSPHRASE_BAWAAN)
      .then(async (kunci) => {
        await simpanKunciLokal(idSaya, kunci, paket.public_key);
        setPrivat(kunci);
      })
      .catch(() => setBawaanGagal(true)); // gagal dibuka otomatis: tampilkan layar buka kunci biasa
  }, [tahap, paket, idSaya]);

  const aktifkan = async (pass, reset) => {
    const { paket: baru, privat: kunciBaru } = await buatPaketKunci(pass);
    await api.post('api/chat/keys', { ...baru, reset: Boolean(reset) });
    await simpanKunciLokal(idSaya, kunciBaru, baru.public_key);
    qc.removeQueries({ queryKey: ['chat-pesan'] });
    setPrivat(kunciBaru);
    await qc.invalidateQueries({ queryKey: ['chat-kunci'] });
    qc.invalidateQueries({ queryKey: ['chat-users'] });
  };

  const ganti = async (lama, baru) => {
    const bungkus = await gantiPassphrase(paket, lama, baru);
    await api.post('api/chat/keys/passphrase', bungkus);
    await qc.invalidateQueries({ queryKey: ['chat-kunci'] });
  };

  const bukaKunci = async (pass) => {
    const kunci = await bukaPaketKunci(paket, pass);
    await simpanKunciLokal(idSaya, kunci, paket.public_key);
    setPrivat(kunci);
  };

  const { data } = useQuery({
    queryKey: ['chat-users'],
    enabled: aktif,
    refetchInterval: 20000,
    queryFn: () => api.get('api/chat/users').then((res) => res.data),
  });

  // ringkasan pesan belum dibaca: lebih ringan dari daftar user, jadi dicek lebih sering untuk lencana dan notifikasi
  const { data: unread } = useQuery({
    queryKey: ['chat-unread'],
    enabled: aktif,
    refetchInterval: 8000,
    queryFn: () => api.get('api/chat/unread').then((res) => res.data),
  });
  const sudahTahu = useRef(null); // user_id -> id pesan terakhir yang sudah dinotifikasikan
  const keadaan = useRef({});
  keadaan.current = { buka, tujuanId, privat, idSaya };

  // pratinjau notifikasi: didekripsi di browser bila kunci sudah terbuka
  const pratinjau = async (b) => {
    const { privat: kunciSaya, idSaya: aku } = keadaan.current;
    if (!kunciSaya || !b.public_key || !b.ciphertext) return 'Pesan terenkripsi baru';
    try {
      const kunci = await kunciBersama(kunciSaya, b.public_key);
      const teks = await dekripsi(kunci, b.ciphertext, b.iv, aku, b.user_id);
      return teks.length > 90 ? `${teks.slice(0, 90)}…` : teks;
    } catch (e) {
      return 'Pesan terenkripsi baru';
    }
  };

  // notifikasi pesan baru per pengirim; pesan yang sudah ada saat pertama dimuat hanya diringkas satu kali
  useEffect(() => {
    if (!unread) return;
    const baris = unread.data || [];
    if (sudahTahu.current === null) {
      sudahTahu.current = {};
      baris.forEach((b) => {
        sudahTahu.current[b.user_id] = b.terakhir_id;
      });
      if (unread.total > 0) {
        toast(`Anda punya ${unread.total} pesan belum dibaca`, { icon: '💬', duration: 5000 });
      }
      return;
    }
    let berubah = false;
    baris.forEach((b) => {
      if ((sudahTahu.current[b.user_id] || 0) < b.terakhir_id) {
        sudahTahu.current[b.user_id] = b.terakhir_id;
        berubah = true;
        const { buka: terbuka, tujuanId: aktifId } = keadaan.current;
        // percakapan dengan pengirim ini sedang terbuka: tidak perlu notifikasi
        if (terbuka && aktifId === b.user_id) return;
        pratinjau(b).then((teks) => {
          toast.custom(
            (t) => (
              <div
                className="cw-toast"
                role="button"
                tabIndex={0}
                style={{ opacity: t.visible ? 1 : 0 }}
                onClick={() => {
                  toast.dismiss(t.id);
                  setBuka(true);
                  setTujuanId(b.user_id);
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
              >
                <img src={fotoKaryawan(b.employe_id)} alt={b.nama} onError={onAvatarError} />
                <div>
                  <strong>{b.nama}</strong>
                  <span>{teks}</span>
                </div>
              </div>
            ),
            { duration: 6000 },
          );
        });
      }
    });
    // pesan yang sudah dibaca dikeluarkan dari catatan agar pesan baru berikutnya tetap memicu notifikasi
    Object.keys(sudahTahu.current).forEach((k) => {
      if (!baris.some((b) => String(b.user_id) === k)) delete sudahTahu.current[k];
    });
    if (berubah) qc.invalidateQueries({ queryKey: ['chat-users'] });
  }, [unread]); // eslint-disable-line react-hooks/exhaustive-deps

  const semua = data?.data || [];
  const daftar = semua.filter((u) =>
    `${u.nama} ${u.divisi || ''} ${u.jabatan || ''}`.toLowerCase().includes(cari.toLowerCase()),
  );
  // data tujuan selalu diambil dari daftar terbaru agar status online ikut diperbarui
  const tujuan = tujuanId ? semua.find((u) => u.user_id === tujuanId) : null;

  const tutup = () => {
    setBuka(false);
    setTujuanId(null);
    setGantiBuka(false);
  };

  const belum = unread?.total ?? data?.belum_dibaca ?? 0;

  const isiPanel = () => {
    if (tahap === 'memuat') return <div className="cw-kosong">Memuat…</div>;
    // kunci bawaan sedang dibuka otomatis
    if (tahap === 'buka' && paket && paket.bawaan && !bawaanGagal) {
      return <div className="cw-kosong">Membuka pesan…</div>;
    }
    if (tahap === 'aktifkan') {
      return <ChatKunci mode="aktifkan" onAktifkan={aktifkan} onBuka={bukaKunci} onTutup={tutup} />;
    }
    if (tahap === 'buka') {
      // dari layar buka kunci, pilihan "reset" memanggil aktifkan dengan reset=true
      return <ChatKunci mode="buka" onAktifkan={aktifkan} onBuka={bukaKunci} onTutup={tutup} />;
    }
    if (gantiBuka) {
      return (
        <ChatGanti
          bawaan={Boolean(paket && paket.bawaan)}
          onGanti={ganti}
          onKembali={() => setGantiBuka(false)}
          onTutup={tutup}
        />
      );
    }
    if (tujuan) {
      return (
        <ChatPercakapan
          user={tujuan}
          privat={privat}
          idSaya={idSaya}
          publikSaya={paket ? paket.public_key : null}
          onKembali={() => setTujuanId(null)}
          onTutup={tutup}
        />
      );
    }
    return (
      <>
        <div className="cw-kepala">
          <div className="cw-kepala__isi">
            <h6>Pesan</h6>
            <small>{data?.jumlah_online ?? 0} online · terenkripsi end-to-end</small>
          </div>
          <button type="button" onClick={() => setGantiBuka(true)} aria-label="Ganti passphrase" title="Ganti passphrase">
            <MaterialIcon icon="key" />
          </button>
          <button type="button" onClick={tutup} aria-label="Tutup">
            &times;
          </button>
        </div>
        {paket && paket.bawaan && (
          <button type="button" className="cw-bawaan" onClick={() => setGantiBuka(true)}>
            <MaterialIcon icon="warning_amber" />
            <span>
              Passphrase pesan Anda masih bawaan: <strong>{PASSPHRASE_BAWAAN}</strong>. Segera ganti agar pesan benar-benar rahasia.
            </span>
          </button>
        )}
        <div className="cw-cari">
          <input
            type="search"
            placeholder="Cari nama, jabatan, atau divisi…"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>
        <div className="cw-daftar">
          {daftar.length === 0 ? (
            <div className="cw-kosong">Tidak ada user ditemukan.</div>
          ) : (
            daftar.map((u) => (
              <div
                key={u.user_id}
                className={`cw-user${u.belum_dibaca > 0 ? ' belum-dibaca' : ''}`}
                onClick={() => setTujuanId(u.user_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setTujuanId(u.user_id)}
              >
                <Foto user={u} />
                <div className="cw-user__isi">
                  <strong>{u.nama}</strong>
                  <span>{[u.jabatan, u.divisi].filter(Boolean).join(' · ') || '-'}</span>
                  <Status user={u} />
                </div>
                <div className="cw-user__aksi">
                  {u.belum_dibaca > 0 && (
                    <span className="belum" title={`${u.belum_dibaca} pesan belum dibaca`}>
                      <MaterialIcon icon="mark_email_unread" />
                      {u.belum_dibaca}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Kirim pesan ke ${u.nama}`}
                    title={u.public_key ? 'Kirim pesan' : 'Belum mengaktifkan pesan terenkripsi'}
                    className={u.public_key ? '' : 'nonaktif'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTujuanId(u.user_id);
                    }}
                  >
                    <MaterialIcon icon="chat_bubble_outline" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  };

  // belum tahu / tidak berhak: tidak menampilkan tombol apa pun
  if (!aktif) return null;

  return (
    <>
      {buka && <div className="cw-overlay" onClick={tutup} />}
      <div className="cw">
        {buka && <div className="cw-panel">{isiPanel()}</div>}
        <button
          type="button"
          className={`cw-tombol${belum > 0 ? ' ada-pesan' : ''}`}
          onClick={() => (buka ? tutup() : setBuka(true))}
          aria-label={belum > 0 ? `Pesan, ${belum} belum dibaca` : 'Pesan'}
        >
          <MaterialIcon icon={belum > 0 ? 'mark_chat_unread' : 'chat'} />
          {belum > 0 && <span className="total belum">{belum > 99 ? '99+' : belum}</span>}
        </button>
      </div>
    </>
  );
};

export default ChatWidget;
