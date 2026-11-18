import { useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import jwtDecode from 'jwt-decode';
import { AuthContext } from '../context/AuthContext';

// token terbaru selalu dibaca dari localStorage agar tab lain yang sudah memperpanjang token ikut terpakai
const bacaAuth = () => {
  try {
    return JSON.parse(localStorage.getItem('auth'));
  } catch (e) {
    return null;
  }
};

const masihBerlaku = (token) => {
  try {
    return dayjs.unix(jwtDecode(token).exp).diff(dayjs()) > 0;
  } catch (e) {
    return false;
  }
};

// perpanjang token secepatnya sebelum habis (batas 60 detik)
const BATAS_PERPANJANG_MS = 60 * 1000;

// 401 karena sesi sudah tidak sah (token lama, perangkat dikeluarkan, password diganti, akun nonaktif);
// 401 "Unauthorized!" artinya hanya tidak punya hak akses, bukan sesi habis
const SESI_TIDAK_SAH = /Sesi|Unauthenticated|deactivated/i;
let sedangKeluar = false;

// satu permintaan refresh dipakai bersama oleh semua request yang berjalan bersamaan
let sedangRefresh = null;

const perbaruiToken = (tokenLama) => {
  if (!sedangRefresh) {
    sedangRefresh = axios
      // BASEURL boleh berakhiran "/" atau tidak (di .env lokal tanpa "/" URL lama menjadi http://host:8000api/... dan perpanjangan token gagal)
      .get(`${String(process.env.REACT_APP_BASEURL || '').replace(/\/+$/, '')}/api/auth/refresh`, {
        headers: { Authorization: `Bearer ${tokenLama}` },
      })
      .then((res) => {
        const tokenBaru = res.data?.auth?.token;
        if (!tokenBaru) throw new Error('Token tidak diterima');
        const tersimpan = bacaAuth();
        if (tersimpan) localStorage.setItem('auth', JSON.stringify({ ...tersimpan, token: tokenBaru }));
        return tokenBaru;
      })
      .finally(() => {
        sedangRefresh = null;
      });
  }
  return sedangRefresh;
};

const useAxios = (baseURL = process.env.REACT_APP_BASEURL) => {
  const { auth, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  const newRequest = axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${auth?.token}`,
    },
  });

  newRequest.interceptors.request.use(
    async (req) => {
      const tokenSaatIni = bacaAuth()?.token || auth?.token;
      if (tokenSaatIni) {
        let tokenPakai = tokenSaatIni;
        let gagal = false;
        try {
          const sisa = dayjs.unix(jwtDecode(tokenSaatIni).exp).diff(dayjs());
          if (sisa < BATAS_PERPANJANG_MS) {
            tokenPakai = await perbaruiToken(tokenSaatIni);
            dispatch({ type: 'REFRESH_TOKEN', payload: tokenPakai });
          }
        } catch (e) {
          if (e?.response?.status === 401) {
            // server menolak memperpanjang. Bila tab lain sudah memperpanjang lebih dulu, pakai token terbarunya
            const terbaru = bacaAuth()?.token;
            if (terbaru && terbaru !== tokenSaatIni && masihBerlaku(terbaru)) {
              tokenPakai = terbaru;
              dispatch({ type: 'REFRESH_TOKEN', payload: terbaru });
            } else {
              gagal = true;
            }
          }
          // gangguan jaringan / server (bukan 401): jangan logout, pakai token yang ada dan biarkan permintaannya sendiri yang berhasil atau gagal
        }

        if (gagal) {
          // server menolak memperpanjang (tidak aktif 3 hari, password diganti, akun nonaktif, atau sesi dikeluarkan): login ulang
          dispatch({ type: 'LOGOUT' });
          // halaman yang sedang dibuka (termasuk query dan hash dari tautan notifikasi) dibuka lagi setelah login
          const { pathname, search, hash } = window.location;
          navigate(
            '/auth/login',
            pathname.startsWith('/auth') ? undefined : { state: { from: `${pathname}${search}${hash}` } },
          );
        } else {
          req.headers.Authorization = `Bearer ${tokenPakai}`;
        }
      }
      return req;
    },
    (error) => {
      Promise.reject(error);
    },
  );

  // server menolak token (mis. sesi dikeluarkan dari Kelola Akses atau token lama): langsung ke halaman login
  newRequest.interceptors.response.use(
    (res) => res,
    (error) => {
      const pesan = error?.response?.data?.message;
      if (error?.response?.status === 401 && typeof pesan === 'string' && SESI_TIDAK_SAH.test(pesan) && !sedangKeluar) {
        sedangKeluar = true;
        setTimeout(() => {
          sedangKeluar = false;
        }, 3000);
        dispatch({ type: 'LOGOUT' });
        const { pathname, search, hash } = window.location;
        navigate(
          '/auth/login',
          pathname.startsWith('/auth') ? undefined : { state: { from: `${pathname}${search}${hash}` } },
        );
      }
      return Promise.reject(error);
    },
  );

  return newRequest;
};

export default useAxios;
