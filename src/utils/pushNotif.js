// Langganan Web Push: notifikasi tetap muncul di perangkat walau situs tidak dibuka.
const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));

  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const pushDidukung = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

// mendaftarkan service worker dan langganan browser ini ke server; false bila server belum mengaktifkan push
export const kirimLangganan = async (api) => {
  const { data } = await api.get('api/notifikasi/push/kunci');
  if (!data.status || !data.public_key) return false;

  await navigator.serviceWorker.register('/push-sw.js');
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key),
    }));
  await api.post('api/notifikasi/push/langganan', sub.toJSON());

  return true;
};

// dipanggil dari tombol (butuh klik pengguna untuk meminta izin)
export const aktifkanPush = async (api) => {
  const izin = await Notification.requestPermission();
  if (izin === 'granted') await kirimLangganan(api);

  return izin;
};
