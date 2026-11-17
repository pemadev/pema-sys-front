import React, { Suspense, useEffect, useRef } from 'react';
import { useRoutes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Themeroutes from './routes/Router';
import ThemeSelector from './layouts/theme/ThemeSelector';
import Loader from './layouts/loader/Loader';
import useCekSesi from './hooks/useCekSesi';

const App = () => {
  const routing = useRoutes(Themeroutes);
  const direction = useSelector((state) => state.customizer.isRTL);
  const isMode = useSelector((state) => state.customizer.isDark);
  useCekSesi();
  const timerRef = useRef();
  const intervalRef = useRef();

  useEffect(() => {
    // Fungsi yang dijalankan jika tidak ada request selama 1 menit
    const handleNoRequest = () => {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          // Generate random string
          // const randomString = Math.random().toString(36).substring(2, 10);
          // // fetch(`https://harianpaparazzi.com/?s=${randomString}`)
          // //   .catch(() => {});
        }, 300);
      }
    };

    // Fungsi untuk reset timer dan stop interval log
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('user udah aktif lagi, reset timer');
      }
      timerRef.current = setTimeout(handleNoRequest, 15000); 
    };

    // Set timer saat pertama kali aplikasi dibuka
    resetTimer();

    // Listener untuk event custom 'api-request'
    window.addEventListener('api-request', resetTimer);

    // Listener untuk aktivitas user (klik, ketik, dll)
    const userEvents = ['click', 'keydown', 'mousemove', 'touchstart'];
    userEvents.forEach(event =>
      window.addEventListener(event, resetTimer)
    );

    // Global axios interceptor agar setiap request reset timer
    import('axios').then(({ default: axios }) => {
      if (axios && axios.interceptors && axios.interceptors.request) {
        const interceptorId = axios.interceptors.request.use(config => {
          window.dispatchEvent(new Event('api-request'));
          return config;
        });
        // Cleanup interceptor on unmount
        return () => {
          axios.interceptors.request.eject(interceptorId);
        };
      }
      return null;
    });

    return () => {
      window.removeEventListener('api-request', resetTimer);
      userEvents.forEach(event =>
        window.removeEventListener(event, resetTimer)
      );
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Interceptor cleanup handled in dynamic import's then block
    };
  }, []);

  return (
    <Suspense fallback={<Loader />}>
      <div
        className={`${direction ? 'rtl' : 'ltr'} ${isMode ? 'dark' : ''}`}
        dir={direction ? 'rtl' : 'ltr'}
      >
    {/* sdgsdg */}
        <ThemeSelector   />
        {routing}
      </div>
    </Suspense>
  );
};

export default App;
