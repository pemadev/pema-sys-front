// Setelan DataTable bersama: dipakai list SPPD dan list Surat agar tampilannya seragam.
// Warna memakai variabel .tampilan-pro (HalamanPro.css) sehingga ikut mode gelap.
export const gayaTabel = {
  table: { style: { borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--pro-garis, #eaecf0)', backgroundColor: 'transparent' } },
  headRow: { style: { backgroundColor: 'var(--pro-latar-lembut, #f9fafb)', minHeight: '46px', borderBottom: '1px solid var(--pro-garis, #eaecf0)' } },
  headCells: { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pro-teks-redup, #667085)' } },
  rows: { style: { minHeight: '58px', fontSize: '13px', borderBottom: '1px solid var(--pro-garis, #eaecf0)' } },
  cells: { style: { paddingTop: '8px', paddingBottom: '8px' } },
  pagination: { style: { borderTop: '1px solid var(--pro-garis, #eaecf0)', fontSize: '13px', flexWrap: 'wrap', justifyContent: 'center' } },
  noData: { style: { padding: '32px 16px', color: 'var(--pro-teks-redup, #667085)', backgroundColor: 'transparent' } },
};

// props yang sama untuk semua list
export const setelanTabel = {
  customStyles: gayaTabel,
  highlightOnHover: true,
  pagination: true,
  subHeader: true,
  paginationPerPage: 15,
  paginationRowsPerPageOptions: [10, 15, 25, 50, 100],
  paginationComponentOptions: { rowsPerPageText: 'Baris per halaman', rangeSeparatorText: 'dari', selectAllRowsItem: true, selectAllRowsItemText: 'Semua' },
  noDataComponent: 'Tidak ada data untuk ditampilkan',
};
