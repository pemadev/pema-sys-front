import React, { useState } from 'react';
import PropTypes from 'prop-types';
import MaterialIcon from '@material/react-material-icon';

// layar aktivasi (pertama kali / reset) dan layar buka kunci (perangkat atau sesi baru)
const ChatKunci = ({ mode, onAktifkan, onBuka, onTutup }) => {
  const [pass, setPass] = useState('');
  const [ulang, setUlang] = useState('');
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);
  const [resetDipilih, setResetDipilih] = useState(false);

  const membuatBaru = mode === 'aktifkan' || resetDipilih;

  const kirim = async (e) => {
    e.preventDefault();
    setGalat('');
    if (membuatBaru) {
      if (pass.length < 8) {
        setGalat('Passphrase minimal 8 karakter.');
        return;
      }
      if (pass !== ulang) {
        setGalat('Konfirmasi passphrase tidak sama.');
        return;
      }
    }
    setProses(true);
    try {
      if (membuatBaru) await onAktifkan(pass, resetDipilih);
      else await onBuka(pass);
    } catch (err) {
      setGalat(membuatBaru ? 'Gagal mengaktifkan, coba lagi.' : 'Passphrase salah.');
    } finally {
      setProses(false);
    }
  };

  return (
    <>
      <div className="cw-kepala">
        <div className="cw-kepala__isi">
          <h6>Pesan terenkripsi</h6>
          <small>Hanya Anda dan lawan bicara yang bisa membaca</small>
        </div>
        <button type="button" onClick={onTutup} aria-label="Tutup">
          &times;
        </button>
      </div>
      <form className="cw-kunci" onSubmit={kirim}>
        <div className="cw-kunci__ikon">
          <MaterialIcon icon="lock" />
        </div>
        {membuatBaru ? (
          <>
            <p>
              {resetDipilih
                ? 'Buat passphrase baru. Kunci lama diganti dan pesan lama tidak bisa dibaca lagi.'
                : 'Buat passphrase pesan. Passphrase ini melindungi kunci enkripsi Anda dan dipakai untuk membuka pesan di perangkat lain.'}
            </p>
            <div className="cw-kunci__peringatan">
              Passphrase tidak dikirim ke server dan <strong>tidak bisa dipulihkan</strong>. Jika lupa, pesan lama tidak dapat dibaca
              lagi.
            </div>
          </>
        ) : (
          <p>Masukkan passphrase pesan untuk membuka pesan terenkripsi di browser ini.</p>
        )}
        <div className="cw-kunci__isi">
          <input
            type={lihat ? 'text' : 'password'}
            placeholder="Passphrase pesan"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="off"
          />
          <button type="button" onClick={() => setLihat((v) => !v)} aria-label={lihat ? 'Sembunyikan' : 'Tampilkan'}>
            <MaterialIcon icon={lihat ? 'visibility_off' : 'visibility'} />
          </button>
        </div>
        {membuatBaru && (
          <div className="cw-kunci__isi">
            <input
              type={lihat ? 'text' : 'password'}
              placeholder="Ulangi passphrase"
              value={ulang}
              onChange={(e) => setUlang(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
        {galat && <div className="cw-kunci__galat">{galat}</div>}
        <button type="submit" className="cw-kunci__tombol" disabled={proses || !pass}>
          {proses ? 'Memproses…' : membuatBaru ? 'Aktifkan' : 'Buka pesan'}
        </button>
        {mode === 'buka' && !resetDipilih && (
          <button
            type="button"
            className="cw-kunci__tautan"
            onClick={() => {
              // eslint-disable-next-line no-alert
              if (window.confirm('Reset kunci? Semua pesan lama tidak akan bisa dibaca lagi.')) {
                setResetDipilih(true);
                setPass('');
                setGalat('');
              }
            }}
          >
            Lupa passphrase? Reset kunci
          </button>
        )}
      </form>
    </>
  );
};

ChatKunci.propTypes = {
  mode: PropTypes.oneOf(['aktifkan', 'buka']).isRequired,
  onAktifkan: PropTypes.func.isRequired,
  onBuka: PropTypes.func.isRequired,
  onTutup: PropTypes.func.isRequired,
};

export default ChatKunci;
