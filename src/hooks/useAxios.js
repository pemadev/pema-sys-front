import { useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import jwtDecode from 'jwt-decode';
import { AuthContext } from '../context/AuthContext';

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
      if (auth?.token) {
        const tokenDecode = jwtDecode(auth?.token);
        const tokenExp = dayjs.unix(tokenDecode.exp);
        const isExpired = tokenExp.diff(dayjs()) < 1;

        if (isExpired) {
          dispatch({ type: 'LOGOUT' });
          // halaman yang sedang dibuka (termasuk query dan hash dari tautan notifikasi) dibuka lagi setelah login
          const { pathname, search, hash } = window.location;
          navigate(
            '/auth/login',
            pathname.startsWith('/auth') ? undefined : { state: { from: `${pathname}${search}${hash}` } },
          );

          // let hours = tokenExp.diff(dayjs(), 'hours');
          // const days = Math.floor(hours / 24);
          // // eslint-disable-next-line operator-assignment
          // hours = hours - days * 24;

          // // user inactive after 12 hours
          // if (hours >= 12) {
          //   dispatch({ type: 'LOGOUT' });
          //   // navigate('/auth/lockscreen');
          //   navigate('/auth/login');
          // }

          // const response = await axios.post(
          //   `${baseURL}api/auth/refresh`,
          //   {},
          //   { withCredentials: true },
          // );

          // const data = {
          //   userInfo: auth.userInfo,
          //   accessToken: response.data.accessToken,
          // };

          // dispatch({ type: 'REFRESH_TOKEN', payload: data });

          // req.headers.Authorization = `Bearer ${response.data.accessToken}`;
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
