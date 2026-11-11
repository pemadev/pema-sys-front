// Lebar kolom tombol mengikuti baris dengan tombol terbanyak pada tab atau sub-tab yang sedang tampil. Teks tombol diukur dengan canvas;
// tiap tombol kecil Bootstrap menambah padding 2x8px + border 2px + margin kanan 8px (+2px cadangan), sel tabel menambah padding 2x16px.
let konteksUkur;
export const ukurTeks = (teks) => {
  if (!konteksUkur) konteksUkur = document.createElement('canvas').getContext('2d');
  // font tombol kecil Bootstrap: 0,875rem dengan font-family turunan dari body (sama dengan yang dirender)
  const akar = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  konteksUkur.font = `${akar * 0.875}px ${window.getComputedStyle(document.body).fontFamily}`;

  return Math.ceil(konteksUkur.measureText(teks).width);
};

// untuk tombol yang labelnya berganti (mis. "Lihat Surat" menjadi "Loading . . ."), pakai label yang terlebar agar lebar kolom tidak bergeser
export const terlebar = (...labels) => labels.reduce((a, b) => (ukurTeks(b) > ukurTeks(a) ? b : a));

export const lebarKolomTombol = (rows, labelsOf, ekstra = 0) => {
  const maks = Math.max(0, ...(rows || []).map((r) => labelsOf(r).reduce((s, l) => s + ukurTeks(l) + 28, 0)));

  return `${Math.max(maks + ekstra + 32 + 12, 110)}px`;
};
