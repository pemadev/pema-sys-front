import React from 'react';

// Lebar kolom tabel mengikuti isi terpanjang dari data yang sedang tampil (dan judul kolomnya).
// Lebar itu dipakai sebagai minWidth dengan grow, jadi kolom melebar mengisi sisa ruang di layar lebar dan
// tabel bisa digeser ke samping di layar sempit. Kolom yang sudah punya `width` (kolom tombol) tidak disentuh.
// Kolom yang selector-nya menghasilkan elemen React tidak bisa diukur; beri `ukur: (row) => teks` bila perlu,
// kalau tidak dipakai lebar minimum untuk lencana.
const PADDING_SEL = 32 + 14; // padding kiri-kanan sel (2x16) + cadangan
const IKON_URUT = 22; // ruang panah pengurutan di judul kolom
const MIN_LENCANA = 132;
const MIN_KOLOM = 72;
const MAKS_KOLOM = 360; // isi yang lebih panjang membungkus ke baris berikutnya

let konteks;
const ukur = (teks, rem, bobot, spasiEm = 0) => {
  if (!konteks) konteks = document.createElement('canvas').getContext('2d');
  const akar = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  const px = akar * rem;
  konteks.font = `${bobot} ${px}px ${window.getComputedStyle(document.body).fontFamily}`;

  return konteks.measureText(teks).width + spasiEm * px * teks.length;
};

// hasil per kumpulan data (identitas array), supaya tidak diukur ulang tiap render
const cache = new WeakMap();

const hitung = (kolom, rows) => {
  const judul = typeof kolom.name === 'string' ? kolom.name : '';
  // gaya judul: 0,72rem tebal huruf kapital berjarak 0,04em (lihat HalamanPro.css); isi 0,85rem
  const lebarJudul = judul ? ukur(judul.toUpperCase(), 0.72, 600, 0.04) + IKON_URUT : 0;
  let lebarIsi = 0;
  let bisaDiukur = true;
  for (let i = 0; i < rows.length; i += 1) {
    let v;
    try {
      v = kolom.ukur ? kolom.ukur(rows[i]) : kolom.selector(rows[i]);
    } catch (e) {
      v = '';
    }
    if (React.isValidElement(v)) {
      bisaDiukur = false;
      break;
    }
    if (v !== null && v !== undefined && v !== false && v !== true) {
      const teks = String(v);
      // isi bertanda baris baru: ukur baris terpanjang
      const w = teks.includes('\n') ? Math.max(...teks.split('\n').map((t) => ukur(t, 0.85, 400))) : ukur(teks, 0.85, 400);
      if (w > lebarIsi) lebarIsi = w;
    }
  }
  if (!bisaDiukur) return { min: Math.max(MIN_LENCANA, Math.ceil(lebarJudul + PADDING_SEL)), wrap: false };
  const lebar = Math.ceil(Math.max(lebarJudul, lebarIsi) + PADDING_SEL);

  return { min: Math.min(MAKS_KOLOM, Math.max(MIN_KOLOM, lebar)), wrap: lebar > MAKS_KOLOM };
};

export const pasKolom = (columns, rows) => {
  if (typeof document === 'undefined' || !Array.isArray(columns)) return columns;
  const data = Array.isArray(rows) ? rows : [];
  let peta = cache.get(data);
  if (!peta) {
    peta = new Map();
    cache.set(data, peta);
  }

  return columns.map((kolom) => {
    if (kolom.width || kolom.omit || typeof kolom.selector !== 'function') return kolom;
    const kunci = `${kolom.name}|${kolom.selector}`;
    let hasil = peta.get(kunci);
    if (!hasil) {
      hasil = hitung(kolom, data);
      // jangan simpan selama font web belum selesai dimuat: ukurannya masih memakai font cadangan
      if (!document.fonts || document.fonts.status === 'loaded') peta.set(kunci, hasil);
    }
    const { min, wrap } = hasil;

    return { ...kolom, minWidth: `${min}px`, grow: Math.max(1, Math.round(min / 100)), wrap: kolom.wrap || wrap };
  });
};

export default pasKolom;
