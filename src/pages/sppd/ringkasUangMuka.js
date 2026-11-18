// Ringkasan uang muka per kategori biaya untuk lembar proses KeuanganSppd.
// Sumber: detail SPPD (dapi/sppd/pengajuan/{id}) -> tujuan_sppd[].rincian_uang_muka, dihitung backend
// (uang makan 100%, transportasi lokal 100%, hotel 100% per malam, BBM 100%, lainnya 0%, termin 4 hari).
const ringkasUangMuka = (detail) => {
  const tujuan = detail?.tujuan_sppd || [];
  const rincian = tujuan.map((t) => ({ t, r: t.rincian_uang_muka })).filter((x) => x.r);
  if (rincian.length === 0) return null;

  const peta = new Map();
  let malam = 0;
  let tiket = 0;
  let total = 0;
  rincian.forEach(({ r }) => {
    malam += Number(r.malam) || 0;
    tiket += Number(r.tiket?.jumlah) || 0;
    total += Number(r.total) || 0;
    (r.komponen || []).forEach((k) => {
      const ada = peta.get(k.kode) || { kode: k.kode, nama: k.nama, persen: k.persen, dasar: 0, jumlah: 0 };
      ada.dasar += Number(k.dasar) || 0;
      ada.jumlah += Number(k.jumlah) || 0;
      peta.set(k.kode, ada);
    });
  });
  const komponen = Array.from(peta.values()).map((k) => (k.kode === 'hotel' ? { ...k, catatan: `${malam} malam` } : k));

  // termin per tujuan (satu termin bila SPPD sampai 4 hari), lengkap dengan bukti transfer yang sudah diupload
  const bertahap = rincian.some(({ r }) => (r.termin || []).length > 1);
  // kategori SPPD + rate per komponen untuk tiap tujuan
  const rate = rincian.map(({ t, r }) => ({
    tujuan: t.detail_tujuan,
    hari: r.hari,
    malam: r.malam,
    kategori: r.kategori || {},
    komponen: (r.komponen || []).map((k) => ({ kode: k.kode, nama: k.nama, rate: k.rate, porsi: k.porsi, qty: k.qty, satuan: k.satuan, dasar: Number(k.dasar) || 0 })),
  }));
  const termin = rincian.map(({ t, r }) => ({
    tujuan: t.detail_tujuan,
    hari: r.hari,
    daftar: (r.termin || []).map((x) => {
      const no = Number(x.no ?? Number(x.id) + 1);
      const idTujuan = Number(x.id_tujuan ?? t.id);
      return { no, idTujuan, kunci: `${idTujuan}:${no}`, tgl: x.tgl_bayar, ket: x.keterangan, jumlah: Number(x.jumlah) || 0, bukti: x.bukti || null };
    }),
  }));
  // tiket yang diupload UmumSppd (pergi/pulang per tujuan) beserta file untuk diunduh
  const namaTujuan = new Map(tujuan.map((t) => [Number(t.id), t.detail_tujuan]));
  const daftarTiket = (detail?.proses_tiket || []).map((x) => ({
    id: x.id,
    tujuan: namaTujuan.get(Number(x.id_tujuan)) || '-',
    arah: x.arah,
    keterangan: x.keterangan,
    harga: Number(x.harga) || 0,
    file: x.file || null,
  }));
  // status tiket: tanpa (tidak ada tujuan yang perlu tiket), mandiri (tidak dibeli umum), umum (diupload UmumSppd), menunggu
  const perluTiket = tujuan.some((t) => Number(t.perlu_tiket) !== 0);
  const sumberTiket = (detail?.proses || []).find((p) => p.as === 'umum')?.sumber_tiket || null;
  let statusTiket = 'menunggu';
  if (!perluTiket) statusTiket = 'tanpa';
  else if (sumberTiket === 'mandiri') statusTiket = 'mandiri';
  else if (sumberTiket === 'umum' || daftarTiket.length > 0) statusTiket = 'umum';
  const semuaTermin = termin.flatMap((x) => x.daftar);
  const selesai = semuaTermin.length > 0 && semuaTermin.every((x) => x.bukti);

  return { komponen, rate, tiket: { jumlah: tiket, ada: tiket > 0, daftar: daftarTiket, status: statusTiket }, total, termin, bertahap, selesai };
};

export default ringkasUangMuka;
