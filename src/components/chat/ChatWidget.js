import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import MaterialIcon from '@material/react-material-icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';
import './ChatWidget.scss';

// "aktif 3 menit lalu" untuk akun yang sudah tidak online
const aktifLalu = (t) => {
  if (!t) return 'belum pernah aktif';
  const menit = Math.max(0, dayjs().diff(dayjs(t), 'minute'));
  if (menit < 1) return 'aktif baru saja';
  if (menit < 60) return `aktif ${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `aktif ${jam} jam lalu`;
  return `aktif ${Math.floor(jam / 24)} hari lalu`;
};

const Foto = ({ user, kecil }) => (
  <div className={`cw-foto${kecil ? ' kecil' : ''}`}>
    <img src={fotoKaryawan(user.employe_id)} alt={user.nama} onError={onAvatarError} />
    {user.online && <span className="titik" />}
  </div>
);

Foto.propTypes = {
  user: PropTypes.shape({
    employe_id: PropTypes.string,
    nama: PropTypes.string,
    online: PropTypes.bool,
  }).isRequired,
  kecil: PropTypes.bool,
};

Foto.defaultProps = { kecil: false };

const Status = ({ user }) => {
  if (user.online) return <span className="online">Online</span>;
  return <span>{aktifLalu(user.terakhir_aktif)}</span>;
};

Status.propTypes = {
  user: PropTypes.shape({ online: PropTypes.bool, terakhir_aktif: PropTypes.string }).isRequired,
};

const Percakapan = ({ user, onKembali, onTutup }) => {
  const api = useAxios();
  const qc = useQueryClient();
  const [isi, setIsi] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const dasar = useRef(null);

  const { data: pesan = [] } = useQuery({
    queryKey: ['chat-pesan', user.user_id],
    refetchInterval: 4000,
    queryFn: () => api.get(`api/chat/${user.user_id}/messages`).then((res) => res.data.data),
  });

  // gulir ke pesan terbaru setiap ada pesan baru
  useEffect(() => {
    if (dasar.current) dasar.current.scrollIntoView({ block: 'end' });
  }, [pesan.length]);

  // pesan yang baru dibuka dianggap dibaca: perbarui lencana di daftar
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['chat-users'] });
  }, [pesan.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const kirim = async () => {
    const teks = isi.trim();
    if (!teks || mengirim) return;
    setMengirim(true);
    try {
      const res = await api.post(`api/chat/${user.user_id}/messages`, { isi: teks });
      qc.setQueryData(['chat-pesan', user.user_id], (lama = []) => [...lama, res.data.data]);
      setIsi('');
    } catch (e) {
      // pesan tetap di kotak agar bisa dikirim ulang
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

  return (
    <>
      <div className="cw-kepala">
        <button type="button" onClick={onKembali} aria-label="Kembali">
          <MaterialIcon icon="arrow_back" />
        </button>
        <Foto user={user} kecil />
        <div className="cw-kepala__isi">
          <h6>{user.nama}</h6>
          <small>
            <Status user={user} />
          </small>
        </div>
        <button type="button" onClick={onTutup} aria-label="Tutup">
          &times;
        </button>
      </div>
      <div className="cw-pesan">
        {pesan.length === 0 && <div className="cw-kosong">Belum ada pesan. Mulai percakapan di bawah.</div>}
        {pesan.map((m) => {
          const hari = dayjs(m.waktu).format('DD MMM YYYY');
          const tampilHari = hari !== hariTerakhir;
          hariTerakhir = hari;
          return (
            <React.Fragment key={m.id}>
              {tampilHari && <div className="cw-hari">{hari}</div>}
              <div className={`cw-gelembung${m.dari_saya ? ' saya' : ''}`}>
                {m.isi}
                <small>{dayjs(m.waktu).format('HH:mm')}</small>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={dasar} />
      </div>
      <div className="cw-tulis">
        <textarea
          rows={1}
          placeholder="Tulis pesan…"
          value={isi}
          maxLength={2000}
          onChange={(e) => setIsi(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="button" onClick={kirim} disabled={mengirim || !isi.trim()} aria-label="Kirim">
          <MaterialIcon icon="send" />
        </button>
      </div>
    </>
  );
};

Percakapan.propTypes = {
  user: PropTypes.shape({
    user_id: PropTypes.number,
    employe_id: PropTypes.string,
    nama: PropTypes.string,
    online: PropTypes.bool,
    terakhir_aktif: PropTypes.string,
  }).isRequired,
  onKembali: PropTypes.func.isRequired,
  onTutup: PropTypes.func.isRequired,
};

// tombol melayang di atas tombol notifikasi: daftar user (online di atas) dan pesan antar akun
const ChatWidget = () => {
  const api = useAxios();
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState('');
  const [tujuanId, setTujuanId] = useState(null);

  const { data } = useQuery({
    queryKey: ['chat-users'],
    refetchInterval: 20000,
    queryFn: () => api.get('api/chat/users').then((res) => res.data),
  });

  const semua = data?.data || [];
  const daftar = semua.filter((u) =>
    `${u.nama} ${u.divisi || ''} ${u.jabatan || ''}`.toLowerCase().includes(cari.toLowerCase()),
  );
  // data tujuan selalu diambil dari daftar terbaru agar status online ikut diperbarui
  const tujuan = tujuanId ? semua.find((u) => u.user_id === tujuanId) : null;

  const tutup = () => {
    setBuka(false);
    setTujuanId(null);
  };

  const belum = data?.belum_dibaca || 0;

  return (
    <>
      {buka && <div className="cw-overlay" onClick={tutup} />}
      <div className="cw">
        {buka && (
          <div className="cw-panel">
            {tujuan ? (
              <Percakapan user={tujuan} onKembali={() => setTujuanId(null)} onTutup={tutup} />
            ) : (
              <>
                <div className="cw-kepala">
                  <div className="cw-kepala__isi">
                    <h6>Pesan</h6>
                    <small>{data?.jumlah_online ?? 0} online</small>
                  </div>
                  <button type="button" onClick={tutup} aria-label="Tutup">
                    &times;
                  </button>
                </div>
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
                        className="cw-user"
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
                          {u.belum_dibaca > 0 && <span className="belum">{u.belum_dibaca}</span>}
                          <button
                            type="button"
                            aria-label={`Kirim pesan ke ${u.nama}`}
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
            )}
          </div>
        )}
        <button type="button" className="cw-tombol" onClick={() => (buka ? tutup() : setBuka(true))} aria-label="Pesan">
          <MaterialIcon icon="chat" />
          <span className={`total${belum > 0 ? ' belum' : ''}`}>{belum > 0 ? belum : data?.jumlah_online ?? 0}</span>
        </button>
      </div>
    </>
  );
};

export default ChatWidget;
