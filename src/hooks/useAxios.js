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

// perpanjang token secepatnya sebelum habis (batas 60 detik)
const BATAS_PERPANJANG_MS = 60 * 1000;

// satu permintaan refresh dipakai bersama oleh semua request yang berjalan bersamaan
let sedangRefresh = null;

const perbaruiToken = (tokenLama) => {
  if (!sedangRefresh) {
    sedangRefresh = axios
      .get(`${process.env.REACT_APP_BASEURL}api/auth/refresh`, {
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
          gagal = true;
        }

        if (gagal) {
          // token tidak bisa diperpanjang (sesi habis, password diganti, atau akun nonaktif): login ulang
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

  return newRequest;
};

export default useAxios;
