import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, ModalBody } from 'reactstrap';
import MaterialIcon from '@material/react-material-icon';
import useAuth from '../hooks/useAuth';
import useAxios from '../hooks/useAxios';

// Pengingat keamanan akun, jadwalnya diatur server per pengguna (berlaku di semua perangkat): seminggu sekali, atau sehari sekali bila
// password tidak diubah dalam 30 hari terakhir. Server menandai pengingat sudah ditampilkan saat dijawab 'tampil', jadi muat ulang atau tab lain tidak menampilkannya lagi.
const Butir = ({ icon, judul, children }) => (
  <div className="d-flex align-items-start gap-3 p-3 rounded-3 mb-2" style={{ background: 'rgba(13, 110, 253, 0.06)' }}>
    <div
      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
      style={{ width: 40, height: 40, background: 'rgba(13, 110, 253, 0.12)', color: '#0d6efd' }}
    >
      <MaterialIcon icon={icon} />
    </div>
    <div>
      <div className="fw-semibold">{judul}</div>
      <div className="text-muted small">{children}</div>
    </div>
  </div>
);

Butir.propTypes = { icon: PropTypes.string.isRequired, judul: PropTypes.string.isRequired, children: PropTypes.node.isRequired };

const PengingatKeamanan = () => {
  const { auth } = useAuth();
  const api = useAxios();
  const navigate = useNavigate();
  const [buka, setBuka] = useState(false);
  const [info, setInfo] = useState({ mode: 'mingguan', hari_sejak_ubah: null });
  const pengguna = auth?.user?.employe_id;

  useEffect(() => {
    if (!pengguna) return;
    api
      .post('api/keamanan/pengingat')
      .then((res) => {
        if (res.data?.tampil) {
          setInfo({ mode: res.data.mode, hari_sejak_ubah: res.data.hari_sejak_ubah });
          setBuka(true);
        }
      })
      .catch(() => {});
  }, [pengguna]); // eslint-disable-line react-hooks/exhaustive-deps

  const tutup = () => setBuka(false);
  const ubahPassword = () => {
    tutup();
    navigate('/auth/change-password');
  };

  return (
    <Modal isOpen={buka} toggle={tutup} centered size="md" contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
      <div className="text-center text-white px-4 pt-4 pb-3" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0a3d91 100%)' }}>
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
          style={{ width: 64, height: 64, background: 'rgba(255, 255, 255, 0.18)' }}
        >
          <MaterialIcon icon="shield" style={{ fontSize: 34 }} />
        </div>
        <h5 className="fw-bold mb-1">Jaga Keamanan Akun Anda</h5>
        <div className="small" style={{ opacity: 0.9 }}>
          Pengingat harian dari Tim IT PEMA
        </div>
      </div>
      <ModalBody className="p-4">
        {info.mode === 'harian' ? (
          <div className="rounded-3 p-3 mb-3 d-flex gap-2 align-items-start" style={{ background: 'rgba(255, 193, 7, 0.15)', color: '#7a5b00' }}>
            <MaterialIcon icon="warning" />
            <div className="small">
              {info.hari_sejak_ubah === null
                ? 'Password Anda belum tercatat diubah.'
                : `Password Anda sudah ${info.hari_sejak_ubah} hari belum diubah.`}{' '}
              Pengingat ini akan tampil setiap hari sampai password sys diperbarui.
            </div>
          </div>
        ) : null}
        <p className="mb-3">
          Untuk melindungi data perusahaan, mohon <b>perbarui password secara berkala</b>:
        </p>
        <Butir icon="lock" judul="Password sys.pema.co.id">
          Ganti berkala, misalnya setiap 3 bulan, dan segera ganti bila Anda merasa akun pernah dipakai orang lain.
        </Butir>
        <Butir icon="mail" judul="Password email PEMA">
          Email dipakai untuk pemulihan akun dan menerima informasi penting, jadi perbarui password email dengan jadwal yang sama.
        </Butir>
        <ul className="text-muted small ps-3 mt-3 mb-0">
          <li>Gunakan password panjang (minimal 12 karakter) dengan kombinasi huruf, angka, dan simbol.</li>
          <li>Jangan memakai password yang sama untuk sys dan email, dan jangan membagikannya kepada siapa pun.</li>
          <li>Tim IT tidak pernah meminta password Anda melalui pesan atau telepon.</li>
        </ul>
      </ModalBody>
      <div className="d-flex gap-2 justify-content-end px-4 pb-4">
        <Button color="secondary" outline onClick={tutup}>
          Nanti
        </Button>
        <Button color="primary" onClick={ubahPassword}>
          Ubah Password Sys
        </Button>
      </div>
    </Modal>
  );
};

export default PengingatKeamanan;
