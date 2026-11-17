import { useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const CEK_MS = 60 * 1000;
const bacaToken = () => {
  try {
    return JSON.parse(localStorage.getItem('auth'))?.token;
  } catch (e) {
    return null;
  }
};

// Pengguna yang tampak login di browser tetapi sesinya tidak tercatat (atau sudah dicabut) di user session
// akan keluar sendiri. Pengguna yang sesinya tercatat tidak disentuh sama sekali.
// Dicek saat aplikasi dibuka, saat tab kembali aktif, dan berkala, tanpa menunggu ada request lain.
const useCekSesi = () => {
  const { auth, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  const sudahLogin = !!auth?.token;

  useEffect(() => {
    if (!sudahLogin) return undefined;

    let berhenti = false;
    let berjalan = false;

    const periksa = async () => {
      const token = bacaToken();
      if (berjalan || !token) return;
      berjalan = true;
      try {
        await axios.get(`${process.env.REACT_APP_BASEURL}api/auth/sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        // endpoint ini tidak memeriksa peran, jadi 401 apa pun berarti token/sesi tidak lagi sah
        if (!berhenti && error?.response?.status === 401) {
          dispatch({ type: 'LOGOUT' });
          const { pathname, search, hash } = window.location;
          navigate(
            '/auth/login',
            pathname.startsWith('/auth') ? undefined : { state: { from: `${pathname}${search}${hash}` } },
          );
        }
        // kegagalan lain (jaringan, 5xx) diabaikan: pengguna tidak dikeluarkan karena gangguan sementara
      } finally {
        berjalan = false;
      }
    };

    const saatTabAktif = () => {
      if (document.visibilityState === 'visible') periksa();
    };

    periksa();
    document.addEventListener('visibilitychange', saatTabAktif);
    const timer = setInterval(periksa, CEK_MS);

    return () => {
      berhenti = true;
      document.removeEventListener('visibilitychange', saatTabAktif);
      clearInterval(timer);
    };
  }, [sudahLogin, dispatch, navigate]);
};

export default useCekSesi;
