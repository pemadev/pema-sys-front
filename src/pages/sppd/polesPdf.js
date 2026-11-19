// Pemolesan tampilan cetak dokumen SPPD (surat tugas, pengajuan biaya, realisasi, dll.) yang dibuat dari HTML lewat html-to-pdfmake.
// Hanya mengubah gaya (warna garis, latar judul kolom, nomor halaman); isi dan susunan templat tidak disentuh.

const GARIS = '#9aa3af'; // garis tabel abu-abu lembut (sebelumnya hitam pekat)
const JUDUL_KOLOM = '#eef2f7'; // latar judul kolom tabel
const TEKS_REDUP = '#6b7280';

const sel = (node) => node && typeof node === 'object' && !Array.isArray(node);

// judul kolom: sel pada <thead> (headerRows) atau bergaya html-th
const adalahJudul = (cell, barisKe, headerRows) => barisKe < headerRows || (Array.isArray(cell.style) ? cell.style : [cell.style]).includes('html-th');

const poles = (node) => {
  if (Array.isArray(node)) {
    node.forEach(poles);
    return node;
  }
  if (!sel(node)) return node;

  if (node.table && Array.isArray(node.table.body)) {
    const headerRows = Number(node.table.headerRows) || 0;
    node.table.body.forEach((baris, barisKe) => {
      (baris || []).forEach((cell) => {
        if (!sel(cell)) return;
        if (!cell.borderColor) cell.borderColor = [GARIS, GARIS, GARIS, GARIS];
        if (!cell.fillColor && adalahJudul(cell, barisKe, headerRows)) cell.fillColor = JUDUL_KOLOM;
        poles(cell);
      });
    });
  }
  ['stack', 'ul', 'ol', 'columns', 'text'].forEach((k) => {
    if (Array.isArray(node[k])) poles(node[k]);
  });

  return node;
};

// pie halaman: gambar kop alamat hanya di halaman terakhir (seperti semula); halaman lain diberi nomor halaman
const kakiHalaman = (foot, lebar) => (currentPage, pageCount) => {
  if (currentPage !== pageCount) {
    return { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'center', fontSize: 8, color: TEKS_REDUP, margin: [0, 24, 0, 0] };
  }

  return { image: foot, width: lebar };
};

export { poles, kakiHalaman };
