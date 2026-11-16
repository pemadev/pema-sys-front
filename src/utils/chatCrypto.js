// Enkripsi pesan end-to-end (browser saja): ECDH P-256 untuk kesepakatan kunci + AES-GCM untuk isi pesan.
// Kunci privat dibuat di browser, dibungkus dengan passphrase pesan (PBKDF2 -> AES-GCM) sebelum disimpan ke server,
// sehingga server hanya memegang kunci publik, kunci privat terbungkus, dan ciphertext.

const ITERASI = 310000;
const INFO_HKDF = 'pema-chat-v1';
const enc = new TextEncoder();
const dec = new TextDecoder();

const subtle = () => crypto.subtle;

export const b64e = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

export const b64d = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

const kunciDariPassphrase = async (passphrase, salt, iterasi) => {
  const dasar = await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', salt, iterations: iterasi, hash: 'SHA-256' },
    dasar,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

// buat pasangan kunci baru; kembalikan paket untuk server dan kunci privat (tidak bisa diekspor) untuk dipakai di browser ini
export const buatPaketKunci = async (passphrase) => {
  const pasangan = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publik = await subtle().exportKey('raw', pasangan.publicKey);
  const pkcs8 = await subtle().exportKey('pkcs8', pasangan.privateKey);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pembungkus = await kunciDariPassphrase(passphrase, salt, ITERASI);
  const terbungkus = await subtle().encrypt({ name: 'AES-GCM', iv }, pembungkus, pkcs8);

  const privat = await subtle().importKey('pkcs8', pkcs8, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  return {
    paket: {
      public_key: b64e(publik),
      wrapped_private: b64e(terbungkus),
      salt: b64e(salt),
      iv: b64e(iv),
      iterasi: ITERASI,
    },
    privat,
  };
};

// buka kunci privat dari paket di server; passphrase salah -> melempar galat
export const bukaPaketKunci = async (paket, passphrase) => {
  const pembungkus = await kunciDariPassphrase(passphrase, b64d(paket.salt), paket.iterasi);
  const pkcs8 = await subtle().decrypt({ name: 'AES-GCM', iv: b64d(paket.iv) }, pembungkus, b64d(paket.wrapped_private));
  return subtle().importKey('pkcs8', pkcs8, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
};

// kunci AES bersama dengan satu lawan bicara; ECDH(a, B) == ECDH(b, A), jadi pengirim juga bisa membaca pesannya sendiri
// cache per kunci privat (bukan hanya per kunci publik lawan), agar tidak tertukar saat ganti akun atau reset kunci
const cacheBersama = new WeakMap();
export const kunciBersama = async (privat, publikLawanB64) => {
  let peta = cacheBersama.get(privat);
  if (!peta) {
    peta = new Map();
    cacheBersama.set(privat, peta);
  }
  if (peta.has(publikLawanB64)) return peta.get(publikLawanB64);
  const publik = await subtle().importKey('raw', b64d(publikLawanB64), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const rahasia = await subtle().deriveBits({ name: 'ECDH', public: publik }, privat, 256);
  const hkdf = await subtle().importKey('raw', rahasia, 'HKDF', false, ['deriveKey']);
  const kunci = await subtle().deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode(INFO_HKDF) },
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  peta.set(publikLawanB64, kunci);
  return kunci;
};

// data tambahan yang diikat ke ciphertext: pesan tidak bisa dipindah ke percakapan lain
const aad = (idA, idB) => enc.encode(`${Math.min(idA, idB)}:${Math.max(idA, idB)}`);

export const enkripsi = async (kunci, teks, idSaya, idLawan) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const hasil = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad(idSaya, idLawan) }, kunci, enc.encode(teks));
  return { ciphertext: b64e(hasil), iv: b64e(iv) };
};

export const dekripsi = async (kunci, ciphertext, iv, idSaya, idLawan) => {
  const hasil = await subtle().decrypt(
    { name: 'AES-GCM', iv: b64d(iv), additionalData: aad(idSaya, idLawan) },
    kunci,
    b64d(ciphertext),
  );
  return dec.decode(hasil);
};

// nomor keamanan: sama di kedua sisi bila tidak ada pihak yang menyisipkan kunci palsu; bandingkan lewat jalur lain
export const nomorKeamanan = async (publikA, publikB) => {
  const urut = [publikA, publikB].sort();
  const gabung = new Uint8Array([...b64d(urut[0]), ...b64d(urut[1])]);
  const hash = new Uint8Array(await subtle().digest('SHA-256', gabung));
  const kelompok = [];
  for (let i = 0; i < 12; i += 1) {
    const n = (hash[i * 2] * 65536 + hash[i * 2 + 1] * 256 + hash[(i * 2 + 2) % 32]) % 100000;
    kelompok.push(String(n).padStart(5, '0'));
  }
  return kelompok.join(' ');
};

// ---- penyimpanan kunci privat di browser ini (IndexedDB, tidak bisa diekspor) -------------------

const DB_NAMA = 'pema-chat';
const TOKO = 'kunci';

const bukaDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia'));
      return;
    }
    const req = indexedDB.open(DB_NAMA, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(TOKO);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const jalankan = async (mode, fn) => {
  const db = await bukaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TOKO, mode);
    const hasil = fn(tx.objectStore(TOKO));
    tx.oncomplete = () => resolve(hasil.result);
    tx.onerror = () => reject(tx.error);
  });
};

// disimpan bersama kunci publik pasangannya agar kunci lama (setelah reset di perangkat lain) bisa dikenali dan dibuang
export const simpanKunciLokal = (userId, privat, publik) =>
  jalankan('readwrite', (t) => t.put({ privat, publik }, `privat:${userId}`)).catch(() => {});

export const ambilKunciLokal = (userId) => jalankan('readonly', (t) => t.get(`privat:${userId}`)).catch(() => null);

// dipanggil saat logout agar kunci tidak tertinggal di browser bersama
export const hapusSemuaKunciLokal = () => {
  return jalankan('readwrite', (t) => t.clear()).catch(() => {});
};

// passphrase bawaan untuk kunci yang dibuat massal oleh admin; pengguna diminta menggantinya
export const PASSPHRASE_BAWAAN = 'asdasdasd';

// bungkus ulang kunci privat yang sama dengan passphrase baru (kunci publik tidak berubah, riwayat tetap terbaca)
export const gantiPassphrase = async (paket, lama, baru) => {
  const pembungkusLama = await kunciDariPassphrase(lama, b64d(paket.salt), paket.iterasi);
  const pkcs8 = await subtle().decrypt({ name: 'AES-GCM', iv: b64d(paket.iv) }, pembungkusLama, b64d(paket.wrapped_private));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pembungkusBaru = await kunciDariPassphrase(baru, salt, ITERASI);
  const terbungkus = await subtle().encrypt({ name: 'AES-GCM', iv }, pembungkusBaru, pkcs8);
  return { wrapped_private: b64e(terbungkus), salt: b64e(salt), iv: b64e(iv), iterasi: ITERASI };
};
