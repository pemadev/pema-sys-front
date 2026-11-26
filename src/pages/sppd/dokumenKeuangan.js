import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import 'dayjs/locale/en';
import logoVoucher from '../../assets/images/logos/logo-voucher.png';
import logoTabel from '../../assets/images/logos/logo-tabel.png';

// Dokumen keuangan lembar proses (Excel .xlsx, mudah diedit), mengikuti format "UM SPPD No <kode> an <nama>.xlsx" (voucher)
// dan "<nomor>. <nama>.xlsx" (tabel standar biaya). Total memakai rumus. Tanda tangan dikosongkan (ditandatangani basah
// setelah dicetak); nama penandatangan dari sistem.

// Akun dan isian tetap voucher (ubah di sini bila berganti)
export const KONFIG_VOUCHER = {
  akunUangMuka: { kode: '112.001.000.000', nama: 'UANG MUKA SPPD' },
  akunBank: { kode: '102.001.002.000', nama: 'BANK SYARIAH INDONESIA - KCP LUENG BATA' },
  rekeningPerusahaan: '1994804193 (Kcp. Luengbata)',
  noDokumen: 'FPR-KEU-PEMA-02-02',
  noDokumenTabel: 'FPR-KEU-PEMA-06-01',
  tanggalBerlaku: new Date(Date.UTC(2024, 8, 9)),
  kota: 'Banda Aceh',
};

// pilihan Cheque / Giro pada voucher
export const PILIHAN_CHEQUE_GIRO = ['CMS', 'Cheque'];

const WARNA = { banner: 'FF0070C0', judulKolom: 'FF93CDDD', total: 'FFEDEDED', putih: 'FFFFFFFF', hitam: 'FF000000' };
const FONT = 'Archivo';
const FMT_AKUNTANSI = '_-* #,##0_-;-* #,##0_-;_-* "-"??_-;_-@_-';
const FMT_RP_AKUNTANSI = '_-"Rp"* #,##0_-;-"Rp"* #,##0_-;_-"Rp"* "-"??_-;_-@_-';
const FMT_RP_VOUCHER = '_-[$Rp-421]* #,##0_-;-[$Rp-421]* #,##0_-;_-[$Rp-421]* "-"??_-;_-@_-';

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
const bilang = (x) => {
  const n = Math.floor(x);
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${bilang(n - 10)} belas`;
  if (n < 100) return `${bilang(Math.floor(n / 10))} puluh${n % 10 ? ` ${bilang(n % 10)}` : ''}`;
  if (n < 200) return `seratus${n > 100 ? ` ${bilang(n - 100)}` : ''}`;
  if (n < 1000) return `${bilang(Math.floor(n / 100))} ratus${n % 100 ? ` ${bilang(n % 100)}` : ''}`;
  if (n < 2000) return `seribu${n > 1000 ? ` ${bilang(n - 1000)}` : ''}`;
  if (n < 1e6) return `${bilang(Math.floor(n / 1e3))} ribu${n % 1e3 ? ` ${bilang(n % 1e3)}` : ''}`;
  if (n < 1e9) return `${bilang(Math.floor(n / 1e6))} juta${n % 1e6 ? ` ${bilang(n % 1e6)}` : ''}`;
  if (n < 1e12) return `${bilang(Math.floor(n / 1e9))} miliar${n % 1e9 ? ` ${bilang(n % 1e9)}` : ''}`;

  return `${bilang(Math.floor(n / 1e12))} triliun${n % 1e12 ? ` ${bilang(n % 1e12)}` : ''}`;
};
export const terbilang = (n) => {
  const t = Math.round(Number(n) || 0);
  const kata = t === 0 ? 'nol' : bilang(t);

  return `${kata} rupiah`.replace(/\b\w/g, (c) => c.toUpperCase());
};

// "268/PEMA/ST-SF/XI/2026" -> nomor "268", kode "268-SF", nomor voucher "268/PEMA/ST-SF/2026" (tanpa bulan romawi).
// Nomor di dalam dokumen polos tanpa huruf; akhiran "-A", "-B", ... (per termin / urutan extend) hanya untuk NAMA FILE: kodeBerkas, urutBerkas.
const pecahNomor = (nomor, akhiran = '') => {
  const bagian = String(nomor || '').split('/');
  if (bagian.length < 4) return { urut: String(nomor || '-'), urutBerkas: `${String(nomor || '-')}${akhiran}`, kode: String(nomor || '-'), kodeBerkas: `${String(nomor || '-')}${akhiran}`, voucher: String(nomor || '-') };
  const kodeJenis = (bagian[2] || '').replace(/^ST-/, '');
  const tanpaBulan = bagian.filter((b, i) => !(i === 3 && /^[IVXLC]+$/.test(b)));

  return {
    urut: bagian[0],
    urutBerkas: `${bagian[0]}${akhiran}`,
    kode: `${bagian[0]}-${kodeJenis}`,
    kodeBerkas: `${bagian[0]}-${kodeJenis}${akhiran}`,
    voucher: tanpaBulan.join('/'),
  };
};
// akhiran nomor dan nama file: lebih dari satu termin -> -A, -B, ... per termin; extend -> -A, -B, ... mengikuti urutan extend (bila satu termin)
const hitungAkhiran = ({ unit, ekstend, ringkasan }) => {
  const huruf = (n) => String.fromCharCode(65 + (((n % 26) + 26) % 26));
  const urutanExtend = Math.min(...(ringkasan?.rate || []).map((x) => Number(x.noUrut) || Infinity));
  if (unit && unit.jumlahUnit > 1) return `-${huruf(unit.urutan)}`;
  if (ekstend) return `-${huruf(Number.isFinite(urutanExtend) ? urutanExtend - 1 : 0)}`;
  return '';
};

// periode "23-26 November 2026"; kurangiHari: dipakai penginapan (malam terakhir = hari terakhir - 1)
const periode = (mulai, selesai, kurangiHari = 0) => {
  const a = dayjs(mulai).locale('id');
  const b = dayjs(selesai).subtract(kurangiHari, 'day').locale('id');
  if (!a.isValid() || !b.isValid()) return '';
  if (b.isBefore(a, 'day') || a.isSame(b, 'day')) return a.format('D MMMM YYYY');
  if (a.isSame(b, 'month')) return `${a.format('D')}-${b.format('D MMMM YYYY')}`;
  if (a.isSame(b, 'year')) return `${a.format('D MMMM')} - ${b.format('D MMMM YYYY')}`;

  return `${a.format('D MMMM YYYY')} - ${b.format('D MMMM YYYY')}`;
};

const namaAman = (teks) => String(teks || '').replace(/[\\/:*?"<>|]+/g, '-').trim();
const muatLogo = (url) => fetch(url).then((r) => r.arrayBuffer());

// ---------------------------------------------------------------- pembangun sel Excel
const garis = (gaya) => ({ style: gaya, color: { argb: WARNA.hitam } });
const kotakTipis = { top: garis('thin'), bottom: garis('thin'), left: garis('thin'), right: garis('thin') };
const kotakTebal = { top: garis('medium'), bottom: garis('medium'), left: garis('medium'), right: garis('medium') };

// tulis nilai ke sel (alamat "A1" atau rentang "A1:C1" yang digabung) dengan gaya
const tulis = (ws, alamat, nilai, o = {}) => {
  const [awal, akhir] = alamat.split(':');
  if (akhir) ws.mergeCells(alamat);
  const c = ws.getCell(awal);
  c.value = nilai;
  c.font = { name: FONT, size: o.size || 11, bold: !!o.bold, italic: !!o.italic, underline: !!o.underline, color: { argb: o.warnaTeks || WARNA.hitam } };
  c.alignment = { horizontal: o.rata, vertical: o.vAtas ? 'top' : 'middle', wrapText: !!o.bungkus, indent: o.indent || 0 };
  if (o.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } };
  if (o.fmt) c.numFmt = o.fmt;

  return c;
};

// atur satu sisi garis pada seluruh sel dalam rentang tanpa menghapus sisi lain
const tepi = (ws, rentang, sisi, gaya) => {
  const [a, b] = rentang.split(':');
  const aw = ws.getCell(a);
  const ak = ws.getCell(b || a);
  for (let r = aw.row; r <= ak.row; r += 1) {
    for (let c = aw.col; c <= ak.col; c += 1) {
      const sel = ws.getCell(r, c);
      sel.border = { ...(sel.border || {}), [sisi]: gaya };
    }
  }
};

// pasang garis/isian pada seluruh sel dalam rentang (sel gabungan butuh gaya di tiap sel)
const kotak = (ws, rentang, border, fill) => {
  const [a, b] = rentang.split(':');
  const aw = ws.getCell(a);
  const ak = ws.getCell(b || a);
  for (let r = aw.row; r <= ak.row; r += 1) {
    for (let c = aw.col; c <= ak.col; c += 1) {
      const sel = ws.getCell(r, c);
      if (border) sel.border = border;
      if (fill) sel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    }
  }
};

const siapkanKertas = (ws, area) => {
  ws.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    margins: { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    printArea: area,
  };
  ws.views = [{ showGridLines: false }];
};

const tinggi = (ws, peta) => Object.entries(peta).forEach(([r, h]) => {
  ws.getRow(Number(r)).height = h;
});

const simpan = async (wb, namaFile) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const bukuBaru = () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PT Pembangunan Aceh';
  wb.created = new Date();

  return wb;
};

// ---------------------------------------------------------------- Tabel Standar Biaya ("<nomor>. <nama>.xlsx")
const URAIAN = { uang_makan: 'Uang Makan', uang_saku: 'Uang Saku', transport_lokal: 'Transportasi Lokal', hotel: 'Penginapan', bbm: 'BBM' };

// komponen yang tidak masuk uang muka (hotel dipesan admin / tidak menginap, transportasi lokal via vendor): tetap dicantumkan dengan catatan
const CATATAN_KECUALI = { hotel: 'tidak termasuk uang muka', transport_lokal: 'vendor, tidak termasuk uang muka' };

// baris tabel dari satu termin (bagian per tujuan): periode memakai tanggal termin; penginapan hanya sebanyak malam termin itu
const barisDariUnit = (unit, adminNama) => {
  const baris = [];
  const urutan = ['uang_makan', 'hotel', 'transport_lokal', 'uang_saku', 'bbm'];
  unit.bagian.forEach((b) => {
    [...b.komponen]
      .sort((x, y) => urutan.indexOf(x.kode) - urutan.indexOf(y.kode))
      .forEach((k) => {
        const jumlah = Number(k.jumlah) || 0;
        const kecuali = jumlah <= 0 && CATATAN_KECUALI[k.kode] && Number(k.persen) === 0 && Number(k.rate) > 0;
        if (jumlah <= 0 && !kecuali) return;
        const qty = Number(k.qty) || 1;
        const persenEfektif = ((Number(k.persen) || 0) * (k.porsi === null || k.porsi === undefined ? 100 : Number(k.porsi))) / 100;
        // hotel dipesan admin: biayanya ditampilkan dengan keterangan dikirim ke admin (tidak masuk uang muka pelaksana)
        const keAdmin = kecuali && k.kode === 'hotel' && Number(b.hotelAdmin) > 0;
        const rate = Number(k.rate) > 0 ? Number(k.rate) : jumlah / ((persenEfektif / 100) * qty || 1);
        // penginapan: malam sebelum tiap hari termin kecuali hari pertama perjalanan (termin 2 dst mulai dari malam sebelum hari pertamanya)
        // tanggal malam pertama dari server (memuat malam penyambung extend); cadangan: aturan termin biasa
        const awalHotel = b.mulaiHotel ? dayjs(b.mulaiHotel) : unit.no === 1 ? dayjs(b.mulai) : dayjs(b.mulai).subtract(1, 'day');
        const akhirHotel = awalHotel.add(Math.max(b.malam - 1, 0), 'day');
        const per = k.kode === 'bbm' ? '' : k.kode === 'hotel' ? periode(awalHotel, akhirHotel) : periode(b.mulai, b.selesai);
        baris.push({
          uraian: `${URAIAN[k.kode] || k.nama}${per ? ` (${per})` : ''}${unit.banyakTujuan > 1 ? ` - ${b.tujuan}` : ''}${keAdmin ? ` - dikirim ke admin${adminNama ? ` (${adminNama})` : ''}` : kecuali ? ` - ${CATATAN_KECUALI[k.kode]}` : ''}`,
          rate,
          qty,
          paket: k.satuan === 'paket',
          persen: keAdmin ? (k.porsi === null || k.porsi === undefined ? 100 : Number(k.porsi)) / 100 : persenEfektif / 100,
          jumlah: keAdmin ? Number(b.hotelAdmin) : jumlah,
        });
      });
  });

  return baris;
};

const barisBiaya = (ringkasan, adminNama) => {
  const baris = [];
  (ringkasan?.rate || []).forEach((tj) => {
    // urutan seperti formulir: uang makan, penginapan, transportasi lokal, uang saku, BBM
    const urutan = ['uang_makan', 'hotel', 'transport_lokal', 'uang_saku', 'bbm'];
    [...(tj.komponen || [])]
      .sort((x, y) => urutan.indexOf(x.kode) - urutan.indexOf(y.kode))
      .forEach((k) => {
        const persenEfektif = ((Number(k.persen) || 0) * (k.porsi === null || k.porsi === undefined ? 100 : Number(k.porsi))) / 100;
        const jumlah = Number(k.jumlah) || 0;
        const kecuali = jumlah <= 0 && CATATAN_KECUALI[k.kode] && Number(k.persen) === 0 && Number(k.rate) > 0;
        if (jumlah <= 0 && !kecuali) return;
        const keAdmin = kecuali && k.kode === 'hotel' && Number(tj.hotelAdmin) > 0;
        const qty = Number(k.qty) || 1;
        const rate = Number(k.rate) > 0 ? Number(k.rate) : Number(k.dasar) / qty;
        // penginapan: dari malam pertama (memuat malam penyambung extend) sebanyak malamnya; lainnya per hari perjalanan
        const hotelPer = k.kode === 'hotel' && tj.mulaiHotel ? periode(tj.mulaiHotel, dayjs(tj.mulaiHotel).add(Math.max(Math.round(Number(k.qty)) - 1, 0), 'day')) : null;
        const per = k.kode === 'bbm' ? '' : hotelPer || periode(tj.mulai, tj.selesai, k.kode === 'hotel' ? 1 : 0);
        baris.push({
          uraian: `${URAIAN[k.kode] || k.nama}${per ? ` (${per})` : ''}${(ringkasan.rate || []).length > 1 ? ` - ${tj.tujuan}` : ''}${keAdmin ? ` - dikirim ke admin${adminNama ? ` (${adminNama})` : ''}` : kecuali ? ` - ${CATATAN_KECUALI[k.kode]}` : ''}`,
          rate,
          qty,
          paket: k.satuan === 'paket',
          persen: keAdmin ? (k.porsi === null || k.porsi === undefined ? 100 : Number(k.porsi)) / 100 : persenEfektif / 100,
          jumlah: keAdmin ? Number(tj.hotelAdmin) : jumlah,
        });
      });
  });

  return baris;
};

export const unduhTabelBiaya = async ({ sppd, ringkasan, data, ekstend, unit }) => {
  const logo = await muatLogo(logoTabel);
  const akhiran = hitungAkhiran({ unit, ekstend, ringkasan });
  const { urutBerkas, kode } = pecahNomor(sppd?.nomor_sppd, akhiran);
  const baris = unit ? barisDariUnit(unit, data?.admin?.nama) : barisBiaya(ringkasan, data?.admin?.nama);
  const awal = unit ? unit.mulai : (ringkasan?.rate || []).map((t) => t.mulai).filter(Boolean).sort()[0];
  const akhir = unit ? unit.selesai : (ringkasan?.rate || []).map((t) => t.selesai).filter(Boolean).sort().slice(-1)[0];
  const tahun = dayjs(awal || undefined).year();

  const wb = bukuBaru();
  const ws = wb.addWorksheet(urutBerkas.slice(0, 28) || 'Tabel Biaya');
  ws.columns = [{ width: 4.4 }, { width: 51.4 }, { width: 21.4 }, { width: 17 }, { width: 15 }, { width: 4 }, { width: 1.4 }, { width: 25.1 }];

  // logo di kolom B (baris 2-6) dan kotak nomor dokumen di kanan atas
  const id = wb.addImage({ buffer: logo, extension: 'png' });
  ws.addImage(id, { tl: { col: 0.253, row: 1.3175 }, ext: { width: 219, height: 88.4 }, editAs: 'oneCell' });
  const meta = [['No. Dokumen', KONFIG_VOUCHER.noDokumenTabel], ['Revisi', '0'], ['Tanggal Berlaku', KONFIG_VOUCHER.tanggalBerlaku], ['Halaman', '1 dari 1']];
  meta.forEach(([k, v], i) => {
    const r = 3 + i;
    tulis(ws, `E${r}:F${r}`, k, { size: 9 });
    tulis(ws, `G${r}`, ':', { size: 9, rata: 'center' });
    tulis(ws, `H${r}`, v, { size: 9, rata: 'left', fmt: v instanceof Date ? 'd-mmm-yy' : undefined });
    kotak(ws, `E${r}:H${r}`, kotakTipis);
  });
  tinggi(ws, { 3: 15, 4: 15, 5: 15, 6: 15 });

  // banner judul
  [`Tabel Standar Biaya SPPD Tahun ${tahun}`, `${ekstend ? 'Extend ' : ''}SPPD No ${kode} an ${sppd?.nama || '-'}${unit ? ` (Termin ${unit.no}${unit.jumlahUnit > 1 ? ` dari ${unit.jumlahUnit}` : ''})` : ''}`, periode(awal, akhir)].forEach((t, i) => {
    tulis(ws, `A${8 + i}:H${8 + i}`, t, { bold: true, size: 11, rata: 'center', warnaTeks: WARNA.putih, fill: WARNA.banner });
  });
  tinggi(ws, { 8: 15, 9: 12.95, 10: 12.95 });

  // judul kolom
  const judul = 12;
  [['A', 'No'], ['B', 'Uraian'], ['C', `Rate ${sppd?.golongan || ''} / Hari`], ['D', 'Total Hari/Paket'], ['E', 'Persentase']].forEach(([k, t]) => {
    tulis(ws, `${k}${judul}`, t, { bold: true, size: 11, rata: 'center', fill: WARNA.judulKolom, bungkus: true });
    kotak(ws, `${k}${judul}`, kotakTebal);
  });
  tulis(ws, `F${judul}:H${judul}`, 'Total yang Harus Dibayarkan', { bold: true, size: 11, rata: 'center', fill: WARNA.judulKolom, bungkus: true });
  kotak(ws, `F${judul}:H${judul}`, kotakTebal, WARNA.judulKolom);
  ws.getRow(judul).height = 20.1;

  // baris biaya
  baris.forEach((b, i) => {
    const r = judul + 1 + i;
    ws.getRow(r).height = 20.1;
    tulis(ws, `A${r}`, i + 1, { bold: true, rata: 'center' });
    tulis(ws, `B${r}`, b.uraian, { rata: 'left' });
    tulis(ws, `C${r}`, b.rate, { rata: 'right', fmt: FMT_RP_AKUNTANSI });
    tulis(ws, `D${r}`, b.qty, { rata: 'center', fmt: b.paket ? '0 "paket"' : '#,##0.##' });
    tulis(ws, `E${r}`, b.persen, { rata: 'center', fmt: '0%' });
    tulis(ws, `F${r}:H${r}`, { formula: `C${r}*D${r}*E${r}`, result: b.jumlah }, { rata: 'center', fmt: FMT_RP_AKUNTANSI });
    kotak(ws, `A${r}:H${r}`, kotakTipis);
  });

  const awalData = judul + 1;
  const akhirData = judul + baris.length;
  const rTotal = akhirData + 1;
  const total = baris.reduce((a, b) => a + b.jumlah, 0);
  ws.getRow(rTotal).height = 20.1;
  tulis(ws, `A${rTotal}:E${rTotal}`, 'Total', { bold: true, size: 11, rata: 'center', fill: WARNA.total });
  tulis(ws, `F${rTotal}:H${rTotal}`, { formula: baris.length ? `SUM(F${awalData}:H${akhirData})` : '0', result: total }, { bold: true, size: 11, rata: 'center', fill: WARNA.total, fmt: FMT_RP_AKUNTANSI });
  kotak(ws, `A${rTotal}:H${rTotal}`, { top: garis('thin'), bottom: garis('medium'), left: garis('medium'), right: garis('medium') }, WARNA.total);

  const rCatatan = rTotal + 1;
  ws.getRow(rCatatan).height = 74.25;
  tulis(ws, `A${rCatatan}:H${rCatatan}`, 'Catatan : \n-  Aktual Uang Makan atas ketibaan pelaksana akan disesuaikan persentase pada pelaporan Laporan SPPD.', { size: 11, rata: 'left', bungkus: true, vAtas: true });
  ws.getRow(rCatatan + 1).height = 9.75;
  tulis(ws, `A${rCatatan + 3}`, `  ${KONFIG_VOUCHER.kota}, ${dayjs().locale('id').format('D MMMM YYYY')}`, { bold: true, size: 11, rata: 'left' });

  // tanda tangan: tiga blok rata kiri seperti kotak teks di file contoh (peran, lima baris kosong, nama tebal bergaris bawah, jabatan).
  // Tiap blok menggabungkan beberapa kolom (A:B, C:D, E:H) supaya teks tidak terpotong oleh sel tetangga yang berisi.
  const rTtd = rCatatan + 4;
  const blokTtd = (rentang, peran, orang) => {
    const [k1, k2] = rentang.split(':');
    const isiTtd = (r, nilai, o) => tulis(ws, `${k1}${r}:${k2}${r}`, nilai, { size: 11, rata: 'left', indent: 1, ...o });
    isiTtd(rTtd, peran);
    isiTtd(rTtd + 6, orang?.nama || '..............................', { bold: true, underline: true });
    isiTtd(rTtd + 7, orang?.jabatan || '');
  };
  blokTtd('A:B', 'Disajikan Oleh,', data?.pencetak);
  blokTtd('C:D', 'Diperiksa dan Disetujui Oleh,', data?.manajer_keuangan);
  blokTtd('E:H', 'Diketahui Oleh,', data?.dir_keuangan);
  for (let r = rTtd; r <= rTtd + 8; r += 1) ws.getRow(r).height = r === rTtd + 7 ? 28.5 : 15;

  siapkanKertas(ws, `A1:H${rTtd + 8}`);

  return simpan(wb, `${namaAman(urutBerkas)}. ${namaAman(sppd?.nama)}.xlsx`);
};

// ---------------------------------------------------------------- Voucher Pengeluaran Kas ("UM SPPD No <kode> an <nama>.xlsx")
const sebut = (bank) => {
  if (!bank) return '-';
  const nama = bank.nama_bank.replace(/Bank Syariah Indonesia/i, 'BSI');

  return `${nama} - ${bank.nomor_rekening}`;
};

// petugas: nama Petugas Transaksi (dipilih sebelum unduh); chequeGiro: salah satu PILIHAN_CHEQUE_GIRO;
// nomorCheque: nomor cheque (teks) bila chequeGiro 'Cheque', tercetak "Cheque (nomor)"; tanggal: tanggal voucher (YYYY-MM-DD), bawaan hari ini
export const unduhVoucher = async ({ sppd, ringkasan, data, ekstend, petugas, chequeGiro, nomorCheque, tanggal, unit }) => {
  const logo = await muatLogo(logoVoucher);
  const akhiran = hitungAkhiran({ unit, ekstend, ringkasan });
  const { kode, kodeBerkas, voucher } = pecahNomor(sppd?.nomor_sppd, akhiran);
  // hotel dipesan admin: biayanya tidak masuk uang muka pelaksana, melainkan baris tersendiri yang dibayarkan ke rekening admin yang mengajukan SPPD
  const totalUM = Math.round(Number(unit ? unit.jumlah : ringkasan?.total) || 0);
  const adminHotel = data?.admin;
  const jumlahHotel = adminHotel ? Math.round(Number(unit ? unit.hotelAdmin : ringkasan?.hotelAdmin) || 0) : 0;
  const adaHotel = jumlahHotel > 0;
  const total = totalUM + jumlahHotel;
  // dengan baris hotel: nama dan rekening admin (2 baris) serta 2 baris debit/kredit tambahan menggeser seluruh isi di bawahnya
  const geser = adaHotel ? 4 : 0;
  const geserKunci = (peta) => Object.fromEntries(Object.entries(peta).map(([r, v]) => [Number(r) >= 17 ? Number(r) + geser : r, v]));
  const g = (a) => a.replace(/([A-Z]+)(\d+)/g, (m, kol, baris) => `${kol}${Number(baris) >= 17 ? Number(baris) + geser : baris}`);
  const tanggalVoucher = tanggal && dayjs(tanggal).isValid() ? dayjs(tanggal) : dayjs();
  const hariIni = tanggalVoucher.startOf('day').add(12, 'hour').toDate();
  const judulDokumen = `UM ${ekstend ? 'Extend ' : ''}SPPD No ${kode} an ${sppd?.nama || '-'}`;
  const ket = `${judulDokumen}${unit ? ` Termin ${unit.no}` : ''}`;
  const namaBerkas = `UM ${ekstend ? 'Extend ' : ''}SPPD No ${kodeBerkas} an ${sppd?.nama || '-'}`;
  const k = KONFIG_VOUCHER;

  const wb = bukuBaru();
  const ws = wb.addWorksheet('SPM-001');
  ws.columns = [{ width: 5.7 }, { width: 3.4 }, { width: 19.6 }, { width: 12.9 }, { width: 29 }, { width: 28.9 }, { width: 33.3 }, { width: 33.9 }, { width: 21.7 }, { width: 2.7 }, { width: 55.6 }, { width: 3.1 }];

  // logo kiri atas dan kotak nomor dokumen
  const id = wb.addImage({ buffer: logo, extension: 'png' });
  ws.addImage(id, { tl: { col: 2.0248, row: 1.9 }, ext: { width: 370, height: 161.8 }, editAs: 'oneCell' });
  const meta = [['No. Dokumen', k.noDokumen], ['Revisi', '0'], ['Tanggal Berlaku', k.tanggalBerlaku], ['Halaman', '1 dari 1']];
  meta.forEach(([label, v], i) => {
    const r = 3 + i;
    tulis(ws, `I${r}`, label, { size: 14 });
    tulis(ws, `J${r}`, ':', { size: 14, rata: 'center' });
    tulis(ws, `K${r}`, v, { size: 14, rata: 'left', fmt: v instanceof Date ? 'd-mmm-yy' : undefined });
    kotak(ws, `I${r}:K${r}`, kotakTebal);
  });
  tinggi(ws, { 3: 21.75, 4: 21.75, 5: 42.75, 6: 21.75, 8: 45.95 });

  tulis(ws, 'C8:K8', 'VOUCHER PENGELUARAN KAS PT PEMBANGUNAN ACEH', { bold: true, size: 20, rata: 'center', warnaTeks: WARNA.putih, fill: WARNA.banner });
  kotak(ws, 'C8:K8', null, WARNA.banner);

  // identitas penerima
  tulis(ws, 'C10', 'Dibayar Kpd', { size: 18 });
  tulis(ws, 'D10', ':', { size: 18, rata: 'center' });
  tulis(ws, 'E10', sppd?.nama || '-', { size: 18, bold: true });
  tulis(ws, 'I10', 'Tanggal', { size: 18 });
  tulis(ws, 'J10', ':', { size: 18, rata: 'center' });
  tulis(ws, 'K10', hariIni, { size: 18, rata: 'left', fmt: 'd-mmm-yy' });
  tulis(ws, 'C11', 'Nomor Rekening', { size: 18 });
  tulis(ws, 'D11', ':', { size: 18, rata: 'center' });
  tulis(ws, 'E11', sebut(data?.pelaksana?.bank), { size: 18 });
  tulis(ws, 'I11', 'Nomor', { size: 18 });
  tulis(ws, 'J11', ':', { size: 18, rata: 'center' });
  tulis(ws, 'K11', voucher, { size: 18, rata: 'left' });
  tinggi(ws, { 10: 25.5, 11: 26.25 });
  if (adaHotel) {
    tulis(ws, 'E12', adminHotel.nama || '-', { size: 18, bold: true });
    tulis(ws, 'C13', 'Nomor Rekening', { size: 18 });
    tulis(ws, 'D13', ':', { size: 18, rata: 'center' });
    tulis(ws, 'E13', sebut(adminHotel.bank), { size: 18 });
    tinggi(ws, { 12: 25.5, 13: 26.25 });
  }

  // tabel akun (garis luar ganda seperti formulir)
  const h = adaHotel ? 14 : 12;
  const judul = (rentang, teks) => {
    tulis(ws, rentang, teks, { bold: true, size: 18, rata: 'center', bungkus: true });
    kotak(ws, rentang, kotakTipis);
  };
  judul(`C${h}:D${h}`, 'Kode Perkiraan');
  judul(`E${h}:F${h}`, 'Nama Akun');
  judul(`G${h}`, 'Debit');
  judul(`H${h}`, 'Kredit');
  judul(`I${h}:K${h}`, 'Keterangan');

  // satu baris debit uang muka (+ satu baris debit hotel bila dipesan admin), lalu baris kredit bank dengan jumlah yang sama
  const daftarDebit = [{ jumlah: totalUM, ket }];
  if (adaHotel) daftarDebit.push({ jumlah: jumlahHotel, ket: `${ket} (Hotel)` });
  const nDebit = daftarDebit.length;
  daftarDebit.forEach((d, n) => {
    const r = h + 1 + n;
    tulis(ws, `C${r}:D${r}`, k.akunUangMuka.kode, { size: 20, rata: 'center', bungkus: true });
    tulis(ws, `E${r}:F${r}`, k.akunUangMuka.nama, { size: 18, rata: 'left', bungkus: true });
    tulis(ws, `G${r}`, d.jumlah, { size: 18, fmt: FMT_AKUNTANSI });
    tulis(ws, `I${r}:K${r}`, d.ket, { size: 18, rata: 'center', bungkus: true });
  });
  daftarDebit.forEach((d, n) => {
    const r = h + 1 + nDebit + n;
    tulis(ws, `C${r}:D${r}`, k.akunBank.kode, { size: 20, rata: 'center', bungkus: true });
    tulis(ws, `E${r}:F${r}`, k.akunBank.nama, { size: 18, rata: 'left', bungkus: true });
    tulis(ws, `H${r}`, { formula: `G${h + 1 + n}`, result: d.jumlah }, { size: 18, fmt: FMT_AKUNTANSI });
    if (adaHotel && n === 0) tulis(ws, `I${r}:K${r}`, d.ket, { size: 18, rata: 'center', bungkus: true });
  });
  kotak(ws, `C${h + 1}:K${h + 2 * nDebit}`, kotakTipis);

  const rTotal = h + 2 * nDebit + 1;
  tulis(ws, `C${rTotal}:F${rTotal}`, 'T o t a l', { bold: true, size: 18, rata: 'center' });
  tulis(ws, `G${rTotal}`, { formula: `SUM(G${h + 1}:G${h + 2 * nDebit})`, result: total }, { bold: true, size: 18, fmt: FMT_AKUNTANSI });
  tulis(ws, `H${rTotal}`, { formula: `SUM(H${h + nDebit + 1}:H${h + 2 * nDebit})`, result: total }, { bold: true, size: 18, fmt: FMT_AKUNTANSI });
  tulis(ws, `I${rTotal}:K${rTotal}`, null, { size: 18 });
  kotak(ws, `C${rTotal}:K${rTotal}`, kotakTipis);

  const rBayar = rTotal + 1;
  tulis(ws, `C${rBayar}:H${rBayar}`, 'Total yang Harus Dibayarkan', { bold: true, size: 18, rata: 'center', fill: WARNA.judulKolom });
  tulis(ws, `I${rBayar}:K${rBayar}`, { formula: `H${rTotal}`, result: total }, { bold: true, size: 18, rata: 'left', fill: WARNA.judulKolom, fmt: FMT_RP_VOUCHER });
  kotak(ws, `C${rBayar}:K${rBayar}`, kotakTipis, WARNA.judulKolom);
  tinggi(ws, { [h]: 54, [rBayar]: 54, [rTotal]: 54 });
  for (let r = h + 1; r <= h + 2 * nDebit; r += 1) tinggi(ws, { [r]: adaHotel ? 70 : 91.5 });

  // terbilang: label di kiri, kotak berwarna (bentuk di file contoh) berisi tulisan 16 pt tebal
  tulis(ws, g('C18:C19'), 'Terbilang', { size: 18, rata: 'left' });
  tulis(ws, g('E18'), ':', { size: 18, rata: 'center' });
  tulis(ws, g('F17:K21'), terbilang(total), { size: 16, bold: true, rata: 'center', bungkus: true, fill: WARNA.judulKolom });
  kotak(ws, g('F17:K21'), null, WARNA.judulKolom);

  // catatan: kotak hanya selebar kolom C sampai H
  tulis(ws, g('C22'), 'Catatan :', { size: 20 });
  tulis(ws, g('C23:H23'), '', { size: 18 });

  // cheque / giro dan petugas transaksi (isian bergaris putus-putus)
  tulis(ws, g('C25'), 'Cheque / Giro No.', { size: 18, rata: 'left' });
  const jenisBayar = chequeGiro || PILIHAN_CHEQUE_GIRO[0];
  const teksCheque = jenisBayar === 'Cheque' && String(nomorCheque || '').trim() ? `Cheque (${String(nomorCheque).trim()})` : jenisBayar;
  tulis(ws, g('E25'), `: ${teksCheque}`, { size: 18, rata: 'left' });
  tulis(ws, g('I25'), 'A/C', { size: 18 });
  tulis(ws, g('J25'), ':', { size: 18, rata: 'center' });
  tulis(ws, g('K25'), k.rekeningPerusahaan, { size: 18, rata: 'left' });
  tulis(ws, g('C26'), 'Petugas Transaksi', { size: 18, rata: 'left' });
  tulis(ws, g('E26'), `: ${petugas || ''}`, { size: 18, rata: 'left' });
  tulis(ws, g('I26'), 'Tgl', { size: 18 });
  tulis(ws, g('J26'), ':', { size: 18, rata: 'center' });
  tulis(ws, g('K26'), { formula: g('K10'), result: hariIni }, { size: 18, rata: 'left', fmt: 'dd-mm-yy' });

  // tanda tangan: Disajikan Oleh (pengguna yang mengunduh) dan Diperiksa dan Disetujui Oleh (Manajer Keuangan, dari sistem)
  tulis(ws, g('C30:E30'), 'Disajikan Oleh,', { bold: true, size: 18 });
  tulis(ws, g('F32'), 'Tgl:              /                 /2026', { bold: true, size: 18 });
  tulis(ws, g('C36:E36'), data?.pencetak?.nama || '..............................', { bold: true, size: 18, underline: true });
  tulis(ws, g('C37:E37'), data?.pencetak?.jabatan || '', { size: 18 });
  tulis(ws, g('C40:E40'), 'Diperiksa dan Disetujui Oleh,', { bold: true, size: 18 });
  tulis(ws, g('F42'), { formula: g('F32'), result: 'Tgl:              /                 /2026' }, { bold: true, size: 18 });
  tulis(ws, g('C46:E46'), data?.manajer_keuangan?.nama || '..............................', { bold: true, size: 18, underline: true });
  tulis(ws, g('C47:E47'), data?.manajer_keuangan?.jabatan || '', { size: 18 });
  tulis(ws, g('C48:K48'), '*Catatan : Tidak Berlaku Apabila Belum Ada Persetujuan', { size: 16, bold: true });

  // tinggi baris mengikuti file contoh
  tinggi(ws, geserKunci({ 17: 26.25, 18: 25.5, 20: 12.75, 22: 28.5, 23: 24, 25: 25.5, 26: 25.5, 27: 25.5, 28: 21, 30: 25.5, 31: 25.5, 32: 25.5, 36: 25.5, 37: 25.5, 40: 25.5, 41: 25.5, 42: 25.5, 43: 25.5, 44: 25.5, 45: 25.5, 46: 25.5, 47: 25.5, 48: 24 }));

  // ---- garis (dipasang terakhir agar tidak tertimpa): tepi tabel akun ganda, bingkai tebal di kiri-kanan bagian bawah
  const ganda = garis('double');
  const tebal = garis('medium');
  const tipis = garis('thin');
  tepi(ws, `C${h}:K${h}`, 'top', ganda);
  tepi(ws, `C${h}:C${rBayar}`, 'left', ganda);
  tepi(ws, `C${rBayar}:K${rBayar}`, 'bottom', ganda);
  [[h, ganda], ...Array.from({ length: 2 * nDebit }, (_, n) => [h + 1 + n, tipis]), [rTotal, ganda], [rBayar, ganda]].forEach(([r, gaya]) => tepi(ws, `K${r}`, 'right', gaya));
  tepi(ws, g('C17:C48'), 'left', tebal);
  tepi(ws, g('K17:K48'), 'right', tebal);
  tepi(ws, g('C28:K28'), 'bottom', tipis);
  tepi(ws, g('C48:K48'), 'bottom', tebal);
  // kotak catatan (C22:H23)
  tepi(ws, g('C22:H22'), 'top', tipis);
  tepi(ws, g('C23:H23'), 'bottom', tipis);
  tepi(ws, g('H22:H23'), 'right', tipis);
  // garis putus-putus di bawah isian cheque/giro dan petugas
  [g('E25'), g('E26'), g('K25'), g('K26')].forEach((a) => tepi(ws, a, 'bottom', garis('dashed')));

  siapkanKertas(ws, g('B1:L48'));

  return simpan(wb, `${namaAman(namaBerkas)}.xlsx`);
};
