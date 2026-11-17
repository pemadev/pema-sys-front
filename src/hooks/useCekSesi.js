import { useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import useAxios from './useAxios';

const CEK_MS = 60 * 1000;

// Pengguna yang tampak login di browser tetapi sesinya tidak tercatat (atau sudah dicabut) di user session
// akan keluar sendiri. Pengguna yang sesinya tercatat tidak disentuh sama sekali.
// Dicek saat aplikasi dibuka, saat tab kembali aktif, dan berkala, tanpa menunggu ada request lain.
const useCekSesi = () => {
  const { auth, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  // pengecekan lewat useAxios: token yang sudah lewat 15 menit diperpanjang dulu, jadi tidak dianggap sesi tidak sah
  const api = useAxios();
  const apiRef = useRef(api);
  apiRef.current = api;
  const sudahLogin = !!auth?.token;

  useEffect(() => {
    if (!sudahLogin) return undefined;

    let berhenti = false;
    let berjalan = false;

    const periksa = async () => {
      if (berjalan) return;
      berjalan = true;
      try {
        await apiRef.current.get('api/auth/sessions', { timeout: 15000 });
      } catch (error) {
        // hanya 401 (tidak terautentikasi) yang ke halaman login; jaringan putus / 5xx / timeout diabaikan
        if (!berhenti && error?.response?.status === 401) {
          dispatch({ type: 'LOGOUT' });
          const { pathname, search, hash } = window.location;
          navigate(
            '/auth/login',
            pathname.startsWith('/auth') ? undefined : { state: { from: `${pathname}${search}${hash}` } },
          );
        }
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
