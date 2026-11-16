import React, { useState } from 'react';
import PropTypes from 'prop-types';
import MaterialIcon from '@material/react-material-icon';
import { PASSPHRASE_BAWAAN } from '../../utils/chatCrypto';

// ganti passphrase pesan; untuk kunci bawaan, passphrase lama tidak perlu diketik
const ChatGanti = ({ bawaan, onGanti, onKembali, onTutup }) => {
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);
  const [selesai, setSelesai] = useState(false);

  const kirim = async (e) => {
    e.preventDefault();
    setGalat('');
    const pakaiLama = bawaan ? PASSPHRASE_BAWAAN : lama;
    if (baru.length < 8) {
      setGalat('Passphrase baru minimal 8 karakter.');
      return;
    }
    if (baru === PASSPHRASE_BAWAAN || baru === pakaiLama) {
      setGalat('Passphrase baru harus berbeda dari yang lama.');
      return;
    }
    if (baru !== ulang) {
      setGalat('Konfirmasi passphrase tidak sama.');
      return;
    }
    setProses(true);
    try {
      await onGanti(pakaiLama, baru);
      setSelesai(true);
    } catch (err) {
      setGalat(bawaan ? 'Gagal mengganti passphrase, coba lagi.' : 'Passphrase saat ini salah atau gagal disimpan.');
    } finally {
      setProses(false);
    }
  };

  return (
    <>
      <div className="cw-kepala">
        <button type="button" onClick={onKembali} aria-label="Kembali">
          <MaterialIcon icon="arrow_back" />
        </button>
        <div className="cw-kepala__isi">
          <h6>Ganti passphrase</h6>
          <small>{bawaan ? 'Anda masih memakai passphrase bawaan' : 'Passphrase melindungi kunci pesan Anda'}</small>
        </div>
        <button type="button" onClick={onTutup} aria-label="Tutup">
          &times;
        </button>
      </div>
      {selesai ? (
        <div className="cw-kunci">
          <div className="cw-kunci__ikon">
            <MaterialIcon icon="check" />
          </div>
          <p>Passphrase berhasil diganti. Gunakan passphrase baru untuk membuka pesan di perangkat lain.</p>
          <button type="button" className="cw-kunci__tombol" onClick={onKembali}>
            Selesai
          </button>
        </div>
      ) : (
        <form className="cw-kunci" onSubmit={kirim}>
          {bawaan && (
            <div className="cw-kunci__peringatan">
              Passphrase bawaan Anda saat ini: <strong>{PASSPHRASE_BAWAAN}</strong>. Passphrase ini diketahui admin dan siapa pun
              yang pernah melihat database, sehingga pesan Anda belum sepenuhnya rahasia. Ganti sekarang dengan passphrase yang hanya
              Anda ketahui.
            </div>
          )}
          {!bawaan && (
            <div className="cw-kunci__isi">
              <input
                type={lihat ? 'text' : 'password'}
                placeholder="Passphrase saat ini"
                value={lama}
                onChange={(e) => setLama(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
          <div className="cw-kunci__isi">
            <input
              type={lihat ? 'text' : 'password'}
              placeholder="Passphrase baru"
              value={baru}
              onChange={(e) => setBaru(e.target.value)}
              autoComplete="off"
            />
            <button type="button" onClick={() => setLihat((v) => !v)} aria-label={lihat ? 'Sembunyikan' : 'Tampilkan'}>
              <MaterialIcon icon={lihat ? 'visibility_off' : 'visibility'} />
            </button>
          </div>
          <div className="cw-kunci__isi">
            <input
              type={lihat ? 'text' : 'password'}
              placeholder="Ulangi passphrase baru"
              value={ulang}
              onChange={(e) => setUlang(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="cw-kunci__peringatan">
            Passphrase tidak dikirim ke server dan <strong>tidak bisa dipulihkan</strong>. Jika lupa, pesan lama tidak dapat dibaca.
          </div>
          {galat && <div className="cw-kunci__galat">{galat}</div>}
          <button type="submit" className="cw-kunci__tombol" disabled={proses || !baru || (!bawaan && !lama)}>
            {proses ? 'Memproses…' : 'Simpan passphrase'}
          </button>
        </form>
      )}
    </>
  );
};

ChatGanti.propTypes = {
  bawaan: PropTypes.bool,
  onGanti: PropTypes.func.isRequired,
  onKembali: PropTypes.func.isRequired,
  onTutup: PropTypes.func.isRequired,
};

ChatGanti.defaultProps = { bawaan: false };

export default ChatGanti;
