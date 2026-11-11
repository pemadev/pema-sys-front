import dayjs from 'dayjs';

// Filter tahun untuk tabel: tampil tahun berjalan, bisa diganti ke tahun lain atau 'semua'
export const SEMUA_TAHUN = 'semua';

export const tahunBerjalan = () => String(new Date().getFullYear());

// tanggal kosong (null, '0000-00-00', epoch 1970) dianggap tidak ada
export const tanggalValid = (nilai) => {
  if (!nilai) return null;
  const t = dayjs(nilai);

  return t.isValid() && t.year() > 1970 ? t : null;
};

// teks tanggal untuk tabel; '-' bila kosong atau 1970
export const formatTanggal = (nilai, pola = 'YYYY-MM-DD', bahasa = 'en') => {
  const t = tanggalValid(nilai);

  return t ? t.locale(bahasa).format(pola) : '-';
};

// tahun dari kolom tanggal pertama yang terisi; '' bila tidak ada
export const tahunBaris = (row, kolom) => {
  for (let i = 0; i < kolom.length; i += 1) {
    const t = tanggalValid(row?.[kolom[i]]);
    if (t) return String(t.year());
  }
  return '';
};

export const saringTahun = (daftar, tahun, kolom) =>
  tahun === SEMUA_TAHUN ? daftar : (daftar || []).filter((r) => tahunBaris(r, kolom) === tahun);

// pilihan tahun: dari TAHUN_AWAL sampai tahun berjalan; data yang lebih lama hanya tampil di 'Semua'
export const TAHUN_AWAL = 2024;
export const daftarTahun = () => {
  const akhir = new Date().getFullYear();
  const hasil = [];
  for (let t = TAHUN_AWAL; t <= akhir; t += 1) hasil.push(String(t));
  return hasil;
};
