import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';

// "aktif 3 menit lalu" untuk akun yang sudah tidak online
export const aktifLalu = (t) => {
  if (!t) return 'belum pernah aktif';
  const menit = Math.max(0, dayjs().diff(dayjs(t), 'minute'));
  if (menit < 1) return 'aktif baru saja';
  if (menit < 60) return `aktif ${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `aktif ${jam} jam lalu`;
  return `aktif ${Math.floor(jam / 24)} hari lalu`;
};

export const Foto = ({ user, kecil }) => (
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

export const Status = ({ user }) => {
  if (user.online) return <span className="online">Online</span>;
  return <span>{aktifLalu(user.terakhir_aktif)}</span>;
};

Status.propTypes = {
  user: PropTypes.shape({ online: PropTypes.bool, terakhir_aktif: PropTypes.string }).isRequired,
};
