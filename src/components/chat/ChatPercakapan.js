import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import MaterialIcon from '@material/react-material-icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';
import { dekripsi, enkripsi, kunciBersama, nomorKeamanan } from '../../utils/chatCrypto';
import { Foto, Status } from './ChatShared';

// isi pesan didekripsi di browser; null bila tidak bisa dibuka (kunci berubah / pesan rusak)
const bacaPesan = async (privat, publikLawan, m, idSaya, idLawan) => {
  try {
    const kunci = await kunciBersama(privat, publikLawan);
    return await dekripsi(kunci, m.ciphertext, m.iv, idSaya, idLawan);
  } catch (e) {
    return null;
  }
};

const ChatPercakapan = ({ user, privat, idSaya, publikSaya, onKembali, onTutup }) => {
  const api = useAxios();
  const qc = useQueryClient();
  const [isi, setIsi] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState('');
  const [nomor, setNomor] = useState(null);
  const dasar = useRef(null);
  const bisaKirim = Boolean(user.public_key);

  const { data: pesan = [] } = useQuery({
    queryKey: ['chat-pesan', user.user_id],
    refetchInterval: 4000,
    queryFn: async () => {
      const res = await api.get(`api/chat/${user.user_id}/messages`);
      // pesan yang sudah didekripsi dipakai ulang agar tidak mendekripsi ulang tiap polling
      const lama = qc.getQueryData(['chat-pesan', user.user_id]) || [];
      const peta = new Map(lama.map((m) => [m.id, m]));
      return Promise.all(
        res.data.data.map(async (m) => {
          const ada = peta.get(m.id);
          if (ada && ada.isi !== null) return ada;
          const teks = user.public_key ? await bacaPesan(privat, user.public_key, m, idSaya, user.user_id) : null;
          return { id: m.id, dari_saya: m.dari_saya, waktu: m.waktu, isi: teks };
        }),
      );
    },
  });

  // gulir ke pesan terbaru setiap ada pesan baru
  useEffect(() => {
    if (dasar.current) dasar.current.scrollIntoView({ block: 'end' });
  }, [pesan.length]);

  // pesan yang baru dibuka dianggap dibaca: perbarui lencana
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['chat-users'] });
    qc.invalidateQueries({ queryKey: ['chat-unread'] });
  }, [pesan.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const kirim = async () => {
    const teks = isi.trim();
    if (!teks || mengirim || !bisaKirim) return;
    setMengirim(true);
    setGalat('');
    try {
      const kunci = await kunciBersama(privat, user.public_key);
      const { ciphertext, iv } = await enkripsi(kunci, teks, idSaya, user.user_id);
      const res = await api.post(`api/chat/${user.user_id}/messages`, { ciphertext, iv });
      qc.setQueryData(['chat-pesan', user.user_id], (lama = []) => [
        ...lama,
        { id: res.data.data.id, dari_saya: true, waktu: res.data.data.waktu, isi: teks },
      ]);
      setIsi('');
    } catch (e) {
      const pesanServer = e?.response?.data?.message;
      setGalat(typeof pesanServer === 'string' ? pesanServer : 'Pesan gagal dikirim.');
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

  const tampilkanNomor = async () => {
    if (nomor) {
      setNomor(null);
      return;
    }
    if (user.public_key && publikSaya) setNomor(await nomorKeamanan(publikSaya, user.public_key));
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
        {bisaKirim && (
          <button type="button" onClick={tampilkanNomor} aria-label="Verifikasi enkripsi" title="Verifikasi enkripsi">
            <MaterialIcon icon="verified_user" />
          </button>
        )}
        <button type="button" onClick={onTutup} aria-label="Tutup">
          &times;
        </button>
      </div>
      {nomor && (
        <div className="cw-nomor">
          <strong>Nomor keamanan</strong>
          <code>{nomor}</code>
          <span>
            Bandingkan angka ini dengan yang tampil di perangkat {user.nama} (bertemu langsung atau lewat telepon). Jika sama,
            percakapan ini aman dari penyadapan.
          </span>
        </div>
      )}
      <div className="cw-pesan">
        {!bisaKirim && (
          <div className="cw-kosong">
            {user.nama} belum mengaktifkan pesan terenkripsi. Minta mereka membuka menu Pesan dan membuat passphrase terlebih dahulu.
          </div>
        )}
        {bisaKirim && pesan.length === 0 && (
          <div className="cw-kosong">
            <MaterialIcon icon="lock" /> Pesan dienkripsi end-to-end. Mulai percakapan di bawah.
          </div>
        )}
        {pesan.map((m) => {
          const hari = dayjs(m.waktu).format('DD MMM YYYY');
          const tampilHari = hari !== hariTerakhir;
          hariTerakhir = hari;
          return (
            <React.Fragment key={m.id}>
              {tampilHari && <div className="cw-hari">{hari}</div>}
              <div className={`cw-gelembung${m.dari_saya ? ' saya' : ''}${m.isi === null ? ' rusak' : ''}`}>
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
          placeholder={bisaKirim ? 'Tulis pesan…' : 'Penerima belum mengaktifkan pesan'}
          value={isi}
          maxLength={2000}
          disabled={!bisaKirim}
          onChange={(e) => setIsi(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="button" onClick={kirim} disabled={mengirim || !isi.trim() || !bisaKirim} aria-label="Kirim">
          <MaterialIcon icon="send" />
        </button>
      </div>
    </>
  );
};

ChatPercakapan.propTypes = {
  user: PropTypes.shape({
    user_id: PropTypes.number,
    employe_id: PropTypes.string,
    nama: PropTypes.string,
    online: PropTypes.bool,
    terakhir_aktif: PropTypes.string,
    public_key: PropTypes.string,
  }).isRequired,
  privat: PropTypes.shape({}).isRequired,
  idSaya: PropTypes.number.isRequired,
  publikSaya: PropTypes.string,
  onKembali: PropTypes.func.isRequired,
  onTutup: PropTypes.func.isRequired,
};

ChatPercakapan.defaultProps = { publikSaya: null };

export default ChatPercakapan;
