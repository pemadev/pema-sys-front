// Pilihan per tujuan SPPD (form Pengajuan dan EditSppd). Nilai dikirim ke backend: perlu_tiket, hotel_oleh, transport_lokal.

// perlu_tiket: 1 = dipesan divisi umum (diproses bersamaan dengan uang muka), 2 = dipesan admin/mandiri, 0 = tidak perlu tiket
export const OPSI_TIKET = [
  { key: 1, label: 'Dipesan divisi umum', singkat: 'Divisi umum', warna: 'success', ket: 'Setelah disetujui, SPPD diproses divisi umum (pemesanan tiket) dan divisi keuangan (uang muka) secara bersamaan.' },
  { key: 2, label: 'Dipesan admin/mandiri', singkat: 'Admin/mandiri', warna: 'primary', ket: 'Tiket dipesan admin atau pemohon sendiri. Setelah disetujui, SPPD langsung masuk ke divisi keuangan tanpa melewati divisi umum.' },
  { key: 0, label: 'Tidak perlu tiket', singkat: 'Tidak', warna: 'secondary', ket: 'Setelah disetujui, SPPD langsung masuk ke divisi keuangan tanpa melewati divisi umum.' },
];

// hotel_oleh: sendiri = dipesan yang berangkat, admin = dipesan admin, tidak = tidak menginap (dua terakhir tidak termasuk uang muka)
export const OPSI_HOTEL = [
  { key: 'sendiri', label: 'Dipesan yang berangkat', singkat: 'Pemohon', ket: 'Biaya hotel termasuk dalam uang muka.' },
  { key: 'admin', label: 'Dipesan admin', singkat: 'Dipesan admin', ket: 'Biaya hotel tidak termasuk dalam uang muka.' },
  { key: 'tidak', label: 'Tidak menginap', singkat: 'Tidak menginap', ket: 'Tidak ada biaya hotel pada perkiraan biaya maupun uang muka.' },
];

// transport_lokal: mandiri = dibayar sendiri, vendor = memakai vendor (tidak termasuk uang muka)
export const OPSI_TRANSPORT = [
  { key: 'mandiri', label: 'Mandiri', ket: 'Biaya transportasi lokal termasuk dalam uang muka.' },
  { key: 'vendor', label: 'Menggunakan vendor', ket: 'Biaya transportasi lokal tidak termasuk dalam uang muka.' },
];
