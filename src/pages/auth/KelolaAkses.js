import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Button } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { Clock, Globe, Info, Monitor, Shield, Smartphone, Tablet } from 'react-feather';
import dayjs from 'dayjs';
import { alert } from '../../components/atoms/Toast';
import useAxios from '../../hooks/useAxios';
import { AuthContext } from '../../context/AuthContext';

const waktu = (t) => (t ? dayjs(t).format('DD MMM YYYY, HH:mm') : '-');

// ikon mengikuti sistem operasi pada nama perangkat ("Chrome 120 · Android")
const ikonPerangkat = (nama = '') => {
  if (/Android|iOS/.test(nama)) return Smartphone;
  if (/iPadOS/.test(nama)) return Tablet;
  return Monitor;
};

const KelolaAkses = () => {
  const api = useAxios();
  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  const [daftar, setDaftar] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(null);

  const muat = useCallback(() => {
    setMemuat(true);
    api
      .get('api/auth/sessions')
      .then((res) => setDaftar(res.data?.data || []))
      .catch(() => alert('error', 'Gagal memuat daftar akses'))
      .finally(() => setMemuat(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muat();
  }, [muat]);

  const keluarkan = async (s) => {
    // eslint-disable-next-line no-alert
    const lanjut = window.confirm(
      s.saat_ini
        ? 'Perangkat ini akan logout dan Anda harus login ulang. Lanjutkan?'
        : `Keluarkan ${s.perangkat || 'perangkat ini'} (${s.ip || 'IP tidak diketahui'})?`,
    );
    if (!lanjut) return;
    setProses(s.id);
    try {
      await api.post(`api/auth/sessions/${s.id}/logout`);
      if (s.saat_ini) {
        dispatch({ type: 'LOGOUT' });
        navigate('/auth/login');
        return;
      }
      alert('success', 'Perangkat dikeluarkan');
      muat();
    } catch (e) {
      alert('error', e?.response?.data?.message || 'Gagal mengeluarkan perangkat');
    } finally {
      setProses(null);
    }
  };

  const keluarkanLainnya = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Keluarkan semua perangkat lain? Perangkat ini tetap login.')) return;
    setProses('semua');
    try {
      await api.post('api/auth/sessions/logout-lainnya');
      alert('success', 'Semua perangkat lain dikeluarkan');
      muat();
    } catch (e) {
      alert('error', e?.response?.data?.message || 'Gagal mengeluarkan perangkat');
    } finally {
      setProses(null);
    }
  };

  const adaLain = daftar.some((s) => !s.saat_ini);

  return (
    <div className="akun-kartu">
      <div className="akun-kartu__kepala">
        <div className="akun-kartu__ikon">
          <Shield size={20} />
        </div>
        <div>
          <h5>Perangkat yang sedang login</h5>
          <p>IP dan browser yang masuk ke akun Anda.</p>
        </div>
      </div>

      <div className="akun-kartu__isi">
        {!memuat && daftar.length > 0 && (
          <div className="akun-bar">
            <div className="akun-jumlah">
              <strong>{daftar.length}</strong> perangkat aktif
            </div>
            {adaLain && (
              <Button color="danger" outline size="sm" disabled={proses !== null} onClick={keluarkanLainnya}>
                {proses === 'semua' ? 'Memproses…' : 'Keluarkan semua perangkat lain'}
              </Button>
            )}
          </div>
        )}

        {memuat ? (
          <>
            <div className="akun-rangka" />
            <div className="akun-rangka" />
          </>
        ) : daftar.length === 0 ? (
          <div className="akun-kosong">Tidak ada sesi aktif.</div>
        ) : (
          daftar.map((s) => {
            const Ikon = ikonPerangkat(s.perangkat);
            return (
              <div key={s.id} className={`akun-sesi${s.saat_ini ? ' ini' : ''}`}>
                <div className="akun-sesi__ikon">
                  <Ikon size={22} />
                </div>
                <div className="akun-sesi__badan">
                  <div className="akun-sesi__nama">
                    {s.perangkat || 'Perangkat tidak dikenal'}
                    {s.saat_ini && <span className="akun-tag">Perangkat ini</span>}
                  </div>
                  <div className="akun-sesi__meta">
                    <span>
                      <Globe size={13} />
                      IP {s.ip || '-'}
                      {s.aplikasi ? ` · ${s.aplikasi}` : ''}
                    </span>
                    <span>
                      <Clock size={13} />
                      Login {waktu(s.login_at)}
                    </span>
                    <span>Terakhir aktif {waktu(s.terakhir_aktif)}</span>
                  </div>
                </div>
                <div className="akun-sesi__aksi">
                  <Button
                    color={s.saat_ini ? 'secondary' : 'danger'}
                    outline
                    size="sm"
                    disabled={proses !== null}
                    onClick={() => keluarkan(s)}
                  >
                    {proses === s.id ? 'Memproses…' : 'Logout'}
                  </Button>
                </div>
              </div>
            );
          })
        )}

        <div className="akun-info">
          <Info size={16} />
          <span>Jika ada perangkat atau IP yang tidak Anda kenali, keluarkan perangkat tersebut lalu segera ganti password.</span>
        </div>
      </div>
    </div>
  );
};

export default KelolaAkses;
