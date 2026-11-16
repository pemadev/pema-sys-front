import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Input } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, Eye, EyeOff, Lock } from 'react-feather';
import { alert } from '../../components/atoms/Toast';
import useAxios from '../../hooks/useAxios';
import useAuth from '../../hooks/useAuth';

const TINGKAT = ['', 'Lemah', 'Cukup', 'Baik', 'Kuat'];

const hitungKekuatan = (p) => {
  if (!p) return 0;
  let n = 0;
  if (p.length >= 8) n += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n += 1;
  if (/\d/.test(p)) n += 1;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) n += 1;
  return Math.max(1, n);
};

const Kolom = ({ id, label, nilai, onChange, autoComplete }) => {
  const [lihat, setLihat] = useState(false);
  return (
    <div className="akun-field">
      <label htmlFor={id}>{label}</label>
      <div className="akun-field__input">
        <Input
          type={lihat ? 'text' : 'password'}
          id={id}
          name={id}
          value={nilai}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        <button type="button" onClick={() => setLihat((v) => !v)} aria-label={lihat ? 'Sembunyikan' : 'Tampilkan'}>
          {lihat ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

Kolom.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  nilai: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  autoComplete: PropTypes.string,
};

Kolom.defaultProps = { autoComplete: 'off' };

const Syarat = ({ ok, children }) => (
  <li className={ok ? 'ok' : ''}>
    {ok ? <Check size={15} /> : <Circle size={15} />}
    {children}
  </li>
);

Syarat.propTypes = { ok: PropTypes.bool.isRequired, children: PropTypes.node.isRequired };

const ChangePassword = () => {
  const { dispatch } = useAuth();
  const [data, setData] = useState({ oldpassword: '', password: '', confirmpassword: '' });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const api = useAxios();

  const handleChange = (e) => {
    setData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const kuat = hitungKekuatan(data.password);
  const panjangOk = data.password.length >= 8;
  const cocok = data.confirmpassword !== '' && data.password === data.confirmpassword;
  const bedaLama = data.password !== '' && data.password !== data.oldpassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!panjangOk) {
      alert('error', 'Password baru minimal 8 karakter');
      return;
    }
    if (data.password !== data.confirmpassword) {
      alert('error', 'Konfirmasi password tidak sama');
      return;
    }
    if (!bedaLama) {
      alert('error', 'Password baru harus berbeda dari password lama');
      return;
    }
    setLoading(true);
    try {
      await api.post('api/auth/change-pas', { oldpas: data.oldpassword, newpas: data.password });
      alert('success', 'Password berhasil diubah, silakan login ulang');
      setData({ oldpassword: '', password: '', confirmpassword: '' });
      setTimeout(() => {
        dispatch({ type: 'LOGOUT' });
        navigate('/auth/login');
      }, 1800);
    } catch (err) {
      const pesan = err?.response?.data?.message;
      alert('error', typeof pesan === 'string' ? pesan : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="akun-kartu">
      <div className="akun-kartu__kepala">
        <div className="akun-kartu__ikon">
          <Lock size={20} />
        </div>
        <div>
          <h5>Ubah password</h5>
          <p>Gunakan password yang kuat dan tidak dipakai di layanan lain.</p>
        </div>
      </div>
      <div className="akun-kartu__isi">
        <div className="akun-grid">
          <Form onSubmit={handleSubmit} id="form-pass">
            <Kolom
              id="oldpassword"
              label="Password lama"
              nilai={data.oldpassword}
              onChange={handleChange}
              autoComplete="current-password"
            />
            <Kolom
              id="password"
              label="Password baru"
              nilai={data.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {data.password && (
              <div className={`akun-kuat l${kuat}`}>
                <div className="akun-kuat__batang">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="akun-kuat__teks">Kekuatan password: {TINGKAT[kuat]}</div>
              </div>
            )}
            <Kolom
              id="confirmpassword"
              label="Konfirmasi password baru"
              nilai={data.confirmpassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
            <Button type="submit" color="primary" className="akun-simpan" disabled={loading}>
              {loading ? 'Menyimpan…' : 'Simpan password'}
            </Button>
          </Form>

          <aside className="akun-syarat">
            <h6>Syarat password</h6>
            <ul>
              <Syarat ok={panjangOk}>Minimal 8 karakter</Syarat>
              <Syarat ok={bedaLama}>Berbeda dari password lama</Syarat>
              <Syarat ok={cocok}>Konfirmasi sama dengan password baru</Syarat>
            </ul>
            <div className="akun-syarat__catatan">
              Setelah password diubah, semua perangkat akan logout dan Anda perlu login kembali.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
