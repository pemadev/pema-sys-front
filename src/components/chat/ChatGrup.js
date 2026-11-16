import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import MaterialIcon from '@material/react-material-icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';
import {
  bukaKunciGrup,
  bungkusKunciGrup,
  buatKunciGrupMentah,
  dekripsiGrup,
  eksporKunciGrup,
  enkripsiGrup,
} from '../../utils/chatCrypto';

// bungkus kunci grup (mentah) untuk daftar anggota yang sudah punya kunci publik
const bungkusUntuk = async (privat, anggota, mentah, org, versi) => {
  const hasil = [];
  for (let i = 0; i < anggota.length; i += 1) {
    const a = anggota[i];
    // eslint-disable-next-line no-await-in-loop
    const w = await bungkusKunciGrup(privat, a.public_key, mentah, org, versi);
    hasil.push({ user_id: a.user_id, ...w });
  }
  return hasil;
};

const ChatGrup = ({ grup, privat, onKembali, onTutup }) => {
  const api = useAxios();
  // useAxios membuat instance baru tiap render; ref menjaga siapkan() tetap stabil agar tidak dijalankan berulang
  const apiRef = useRef(api);
  apiRef.current = api;
  const qc = useQueryClient();
  const org = grup.org_id;
  const [isi, setIsi] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState('');
  const [lihatAnggota, setLihatAnggota] = useState(false);
  const [status, setStatus] = useState('memuat'); // memuat | siap | menunggu
  const kunci = useRef(new Map()); // versi -> CryptoKey (hanya di memori)
  const sibuk = useRef(false);
  const dasar = useRef(null);
  const [versiAktif, setVersiAktif] = useState(0);

  const { data: info, refetch: muatInfo } = useQuery({
    queryKey: ['chat-grup-info', org],
    refetchInterval: 8000,
    queryFn: () => api.get(`api/chat/groups/${org}/info`).then((res) => res.data.data),
  });

  // buka semua kunci grup milik saya; bagikan ke anggota baru; putar kunci bila ada yang sudah keluar; atau buat kunci pertama
  const siapkan = useCallback(
    async (data) => {
      if (sibuk.current) return;
      sibuk.current = true;
      try {
        for (let i = 0; i < data.kunci_saya.length; i += 1) {
          const k = data.kunci_saya[i];
          if (!kunci.current.has(k.versi) && k.pembungkus_public_key) {
            try {
              // eslint-disable-next-line no-await-in-loop
              kunci.current.set(k.versi, await bukaKunciGrup(privat, k.pembungkus_public_key, k.wrapped_key, k.iv, org, k.versi));
            } catch (e) {
              // kunci versi ini tidak bisa dibuka (mis. kunci pribadi berubah): pesan versi itu tampil terkunci
            }
          }
        }
        const berpublik = data.anggota.filter((a) => a.public_key);
        const terbaru = data.versi_terbaru;

        if (terbaru === 0) {
          // grup belum punya kunci: anggota pertama yang membukanya membuat versi 1
          const mentah = buatKunciGrupMentah();
          const kunciBaru = await bungkusUntuk(privat, berpublik, mentah, org, 1);
          await apiRef.current.post(`api/chat/groups/${org}/keys`, { versi: 1, kunci: kunciBaru });
          await muatInfo();
          return;
        }
        if (kunci.current.has(terbaru)) {
          if (data.perlu_putar) {
            // ada mantan anggota yang masih memegang kunci terbaru: buat kunci baru hanya untuk anggota sekarang
            const mentah = buatKunciGrupMentah();
            const kunciBaru = await bungkusUntuk(privat, berpublik, mentah, org, terbaru + 1);
            await apiRef.current.post(`api/chat/groups/${org}/keys`, { versi: terbaru + 1, kunci: kunciBaru });
            await muatInfo();
            return;
          }
          const kurang = berpublik.filter((a) => !a.punya_kunci);
          if (kurang.length > 0) {
            // anggota baru: bagikan kunci terbaru kepadanya
            const mentah = await eksporKunciGrup(kunci.current.get(terbaru));
            const kunciBaru = await bungkusUntuk(privat, kurang, mentah, org, terbaru);
            await apiRef.current.post(`api/chat/groups/${org}/keys`, { versi: terbaru, kunci: kunciBaru });
            await muatInfo();
          }
          setVersiAktif(terbaru);
          setStatus('siap');
        } else {
          // saya anggota baru: tunggu anggota lain membagikan kunci
          setStatus('menunggu');
        }
      } catch (e) {
        // bentrok dengan anggota lain yang bersamaan menyiapkan kunci: info dimuat ulang oleh polling berikutnya
      } finally {
        sibuk.current = false;
      }
    },
    [privat, org, muatInfo],
  );

  useEffect(() => {
    if (info) siapkan(info);
  }, [info, siapkan]);

  const { data: pesan = [] } = useQuery({
    queryKey: ['chat-grup-pesan', org],
    enabled: status === 'siap',
    refetchInterval: 4000,
    queryFn: async () => {
      const res = await api.get(`api/chat/groups/${org}/messages`);
      const lama = new Map((qc.getQueryData(['chat-grup-pesan', org]) || []).map((m) => [m.id, m]));
      return Promise.all(
        res.data.data.map(async (m) => {
          const ada = lama.get(m.id);
          if (ada && ada.isi !== null) return ada;
          const k = kunci.current.get(m.versi);
          let teks = null;
          if (k) {
            try {
              teks = await dekripsiGrup(k, m.ciphertext, m.iv, org, m.versi, m.dari_user_id);
            } catch (e) {
              teks = null;
            }
          }
          return { id: m.id, dari_saya: m.dari_saya, dari_nama: m.dari_nama, waktu: m.waktu, isi: teks };
        }),
      );
    },
  });

  useEffect(() => {
    if (dasar.current) dasar.current.scrollIntoView({ block: 'end' });
  }, [pesan.length, status]);

  // membuka grup menandai pesan dibaca: perbarui lencana
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['chat-unread'] });
    qc.invalidateQueries({ queryKey: ['chat-grup-daftar'] });
  }, [pesan.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const kirim = async () => {
    const teks = isi.trim();
    if (!teks || mengirim || status !== 'siap') return;
    const k = kunci.current.get(versiAktif);
    if (!k) return;
    setMengirim(true);
    setGalat('');
    try {
      const idSaya = info.saya_id;
      const { ciphertext, iv } = await enkripsiGrup(k, teks, org, versiAktif, idSaya);
      const res = await api.post(`api/chat/groups/${org}/messages`, { versi: versiAktif, ciphertext, iv });
      qc.setQueryData(['chat-grup-pesan', org], (lama = []) => [
        ...lama,
        { id: res.data.data.id, dari_saya: true, dari_nama: 'Anda', waktu: res.data.data.waktu, isi: teks },
      ]);
      setIsi('');
    } catch (e) {
      if (e?.response?.status === 409) {
        // kunci grup baru saja berubah: muat ulang agar memakai kunci terbaru
        setStatus('memuat');
        await muatInfo();
        setGalat('Kunci grup diperbarui, kirim ulang pesan Anda.');
      } else {
        const p = e?.response?.data?.message;
        setGalat(typeof p === 'string' ? p : 'Pesan gagal dikirim.');
      }
    } finally {
      setMengirim(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      kirim();
    }
  };

  let hariTerakhir = '';
  const tanpaKunci = info ? info.anggota.filter((a) => !a.public_key) : [];

  return (
    <>
      <div className="cw-kepala">
        <button type="button" onClick={onKembali} aria-label="Kembali">
          <MaterialIcon icon="arrow_back" />
        </button>
        <div className="cw-grup-ikon">
          <MaterialIcon icon="groups" />
        </div>
        <div className="cw-kepala__isi">
          <h6>{grup.nama}</h6>
          <small>{info ? info.anggota.length : grup.jumlah_anggota} anggota · terenkripsi end-to-end</small>
        </div>
        <button type="button" onClick={() => setLihatAnggota((v) => !v)} aria-label="Anggota grup" title="Anggota grup">
          <MaterialIcon icon="people_outline" />
        </button>
        <button type="button" onClick={onTutup} aria-label="Tutup">
          &times;
        </button>
      </div>
      {lihatAnggota && info && (
        <div className="cw-anggota">
          {info.anggota.map((a) => (
            <span key={a.user_id} className={a.public_key ? '' : 'belum'}>
              {a.nama}
              {!a.public_key && ' (belum aktif)'}
            </span>
          ))}
        </div>
      )}
      <div className="cw-pesan">
        {status === 'memuat' && <div className="cw-kosong">Menyiapkan kunci grup…</div>}
        {status === 'menunggu' && (
          <div className="cw-kosong">
            Menunggu anggota lain membagikan kunci grup kepada Anda. Ini otomatis begitu ada anggota yang membuka grup ini.
          </div>
        )}
        {status === 'siap' && pesan.length === 0 && (
          <div className="cw-kosong">
            <MaterialIcon icon="lock" /> Pesan grup dienkripsi end-to-end. Mulai percakapan di bawah.
          </div>
        )}
        {status === 'siap' && tanpaKunci.length > 0 && (
          <div className="cw-hari">{tanpaKunci.length} anggota belum mengaktifkan pesan dan belum bisa membaca grup</div>
        )}
        {pesan.map((m) => {
          const hari = dayjs(m.waktu).format('DD MMM YYYY');
          const tampilHari = hari !== hariTerakhir;
          hariTerakhir = hari;
          return (
            <React.Fragment key={m.id}>
              {tampilHari && <div className="cw-hari">{hari}</div>}
              <div className={`cw-gelembung${m.dari_saya ? ' saya' : ''}${m.isi === null ? ' rusak' : ''}`}>
                {!m.dari_saya && <strong className="cw-pengirim">{m.dari_nama}</strong>}
                {m.isi === null ? '🔒 Pesan tidak dapat dibuka' : m.isi}
                <small>{dayjs(m.waktu).format('HH:mm')}</small>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={dasar} />
      </div>
      {galat && <div className="cw-galat">{galat}</div>}
      <div className="cw-tulis">
        <textarea
          rows={1}
          placeholder={status === 'siap' ? 'Tulis pesan ke grup…' : 'Menunggu kunci grup…'}
          value={isi}
          maxLength={2000}
          disabled={status !== 'siap'}
          onChange={(e) => setIsi(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="button" onClick={kirim} disabled={mengirim || !isi.trim() || status !== 'siap'} aria-label="Kirim">
          <MaterialIcon icon="send" />
        </button>
      </div>
    </>
  );
};

ChatGrup.propTypes = {
  grup: PropTypes.shape({
    org_id: PropTypes.number,
    nama: PropTypes.string,
    jumlah_anggota: PropTypes.number,
  }).isRequired,
  privat: PropTypes.shape({}).isRequired,
  onKembali: PropTypes.func.isRequired,
  onTutup: PropTypes.func.isRequired,
};

export default ChatGrup;
