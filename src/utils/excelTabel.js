import * as XLSX from 'xlsx';

// ambil teks dari nilai selector kolom, termasuk elemen React (mis. Badge) yang isinya teks
const teks = (v) => {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (typeof v === 'string' || typeof v === 'number') return v;
  if (Array.isArray(v)) return v.map(teks).join(' ').trim();
  if (v.props) return teks(v.props.children);
  return String(v);
};

// kolom yang ikut diunduh: yang tampil di tabel, bukan kolom tombol Action
export const kolomExcel = (kolom) =>
  (kolom || []).filter((k) => typeof k.name === 'string' && k.name.trim() !== '' && !/^actions?$/i.test(k.name.trim()) && !k.omit && typeof k.selector === 'function');

// unduh isi tabel sesuai yang sedang tampil (sudah tersaring tahun dan pencarian), tanpa kolom Action
export const unduhExcel = (kolom, data, namaFile) => {
  const kolomUnduh = kolomExcel(kolom);
  const baris = (data || []).map((row) => kolomUnduh.map((k) => teks(k.selector(row))));
  const lembar = XLSX.utils.aoa_to_sheet([kolomUnduh.map((k) => k.name), ...baris]);
  lembar['!cols'] = kolomUnduh.map((k, i) => ({
    wch: Math.min(60, Math.max(String(k.name).length, ...baris.map((b) => String(b[i]).length)) + 2),
  }));
  const buku = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(buku, lembar, 'Data');
  XLSX.writeFile(buku, `${namaFile}.xlsx`);
};
