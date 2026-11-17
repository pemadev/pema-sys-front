import { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import useAxios from './useAxios';

const LAPOR_MS = 2 * 60 * 1000;
const TANYA_ULANG_MS = 24 * 60 * 60 * 1000; // izin yang belum diberikan ditanyakan lagi sehari sekali

const kunciTanya = (id) => `lokasiDitanya:${id}`;

// Melaporkan lokasi browser untuk peta di Setting > Lokasi User.
// - Izin sudah diberikan: lokasi dilaporkan berkala selama tab terlihat.
// - Izin belum diberikan: permintaan izin dari browser muncul saat akses pertama, lalu paling cepat sehari sekali per pengguna.
// - Izin ditolak (diblokir): browser tidak mengizinkan bertanya lagi, jadi tidak ada yang dilakukan dan peta memakai lokasi dari IP.
const useLaporLokasi = () => {
  const { auth } = useContext(AuthContext);
  const api = useAxios();
  const apiRef = useRef(api);
  apiRef.current = api;
  const sudahLogin = !!auth?.token;
  const idPengguna = auth?.user?.employe_id || auth?.user?.id || 'anon';

  useEffect(() => {
    if (!sudahLogin || !navigator.geolocation || !navigator.permissions?.query) return undefined;

    let berhenti = false;
    let timer = null;
    let status = null;

    const kirim = (pos) => {
      apiRef.current
        .post('api/auth/sessions/lokasi', { lat: pos.coords.latitude, lng: pos.coords.longitude, akurasi: pos.coords.accuracy })
        .catch(() => {});
    };

    const lapor = () => {
      if (berhenti || document.visibilityState !== 'visible' || !status) return;

      if (status.state === 'granted') {
        navigator.geolocation.getCurrentPosition(kirim, () => {}, { enableHighAccuracy: false, maximumAge: 60 * 1000, timeout: 15 * 1000 });
        return;
      }

      if (status.state === 'prompt') {
        let terakhir = 0;
        try {
          terakhir = Number(localStorage.getItem(kunciTanya(idPengguna))) || 0;
        } catch (e) {
          terakhir = 0;
        }
        if (Date.now() - terakhir < TANYA_ULANG_MS) return;
        try {
          localStorage.setItem(kunciTanya(idPengguna), String(Date.now()));
        } catch (e) {
          // penyimpanan tidak tersedia: tetap bertanya, tetapi bisa berulang tiap muat halaman
        }
        // memunculkan permintaan izin bawaan browser; bila disetujui, lokasinya langsung dikirim
        navigator.geolocation.getCurrentPosition(kirim, () => {}, { enableHighAccuracy: false, maximumAge: 60 * 1000, timeout: 60 * 1000 });
      }
    };

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((s) => {
        if (berhenti) return;
        status = s;
        s.onchange = lapor; // izin baru diberikan: langsung dilaporkan
        lapor();
        timer = setInterval(lapor, LAPOR_MS);
      })
      .catch(() => {});

    document.addEventListener('visibilitychange', lapor);

    return () => {
      berhenti = true;
      if (status) status.onchange = null;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', lapor);
    };
  }, [sudahLogin, idPengguna]);
};

export default useLaporLokasi;
