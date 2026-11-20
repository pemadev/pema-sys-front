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
    noUrut: t.no_urut,
    mulai: t.waktu_berangkat,
    selesai: t.waktu_kembali,
    mulaiHotel: r.termin && r.termin[0] ? r.termin[0].mulai_hotel : undefined,
    hari: r.hari,
    malam: r.malam,
    kategori: r.kategori || {},
    komponen: (r.komponen || []).map((k) => ({ kode: k.kode, nama: k.nama, rate: k.rate, porsi: k.porsi, qty: k.qty, satuan: k.satuan, dasar: Number(k.dasar) || 0, persen: Number(k.persen) || 0, jumlah: Number(k.jumlah) || 0 })),
  }));
  const termin = rincian.map(({ t, r }) => ({
    tujuan: t.detail_tujuan,
    hari: r.hari,
    daftar: (r.termin || []).map((x) => {
      const no = Number(x.no ?? Number(x.id) + 1);
      // termin extend memakai kunci "e<id extend>" agar tidak bentrok dengan termin tujuan SPPD awal
      const idTujuan = x.id_ekstend ? `e${x.id_ekstend}` : Number(x.id_tujuan ?? t.id);
      return { no, idTujuan, kunci: `${idTujuan}:${no}`, tgl: x.tgl_bayar, ket: x.keterangan, jumlah: Number(x.jumlah) || 0, bukti: x.bukti || null, aktual: x.aktual || null, mulai: x.mulai, selesai: x.selesai, mulaiHotel: x.mulai_hotel, malam: Number(x.malam) || 0, komponen: x.komponen || [] };
    }),
  }));
  // tiket yang diupload UmumSppd (pergi/pulang per tujuan) beserta file untuk diunduh
  const namaTujuan = new Map(tujuan.map((t) => [String(t.id), t.detail_tujuan]));
  const daftarTiket = (detail?.proses_tiket || []).map((x) => ({
    id: x.id,
    tujuan: namaTujuan.get(String(x.id_tujuan)) || '-',
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
  const selesai = semuaTermin.length > 0 && semuaTermin.every((x) => x.bukti || x.aktual);

  // uang muka bertermin atau tidak: pengaturan ketetapan (Setting > Biaya & Ketetapan SPPD); tanpa termin pembayarannya satu kali
  const terminAktif = !rincian.some(({ r }) => r.termin_aktif === false);

  return { ekstend: !!detail?.adalahEkstend, terminAktif, komponen, rate, tiket: { jumlah: tiket, ada: tiket > 0, daftar: daftarTiket, status: statusTiket }, total, termin, bertahap, selesai };
};

// detail "semu" dari extend yang disetujui (tiket + uang muka terpisah dari SPPD awal) agar ringkasUangMuka dapat dipakai ulang
export const detailDariEkstend = (items) => ({
  adalahEkstend: true,
  tujuan_sppd: items.map((it) => ({ id: `e${it.id}`, no_urut: it.no_urut, detail_tujuan: it.judul, waktu_berangkat: it.start, waktu_kembali: it.end, perlu_tiket: it.perlu_tiket, rincian_uang_muka: it.rincian_uang_muka })),
  proses_tiket: items.flatMap((it) => (it.tiket || []).map((x) => ({ ...x, id_tujuan: `e${it.id}` }))),
  proses: items.some((it) => Number(it.by_umum) === 1 && it.sumber_tiket)
    ? [{ as: 'umum', sumber_tiket: items.find((it) => Number(it.by_umum) === 1 && it.sumber_tiket).sumber_tiket }]
    : [],
});

// Unit dokumen keuangan (voucher dan tabel biaya): satu per nomor termin (gabungan semua tujuan pada termin itu) bila termin aktif.
// Kosong bila termin dinonaktifkan: dokumen tunggal untuk seluruh uang muka.
export const unitDokumen = (ringkasan) => {
  const per = ringkasan?.termin || [];
  const maks = Math.max(0, ...per.map((x) => x.daftar.length));
  // tanpa termin (pengaturan ketetapan) tidak ada unit per termin: dokumen tunggal tanpa kata termin
  if (!ringkasan?.terminAktif || maks < 1) return [];

  return Array.from({ length: maks }, (_, i) => {
    const no = i + 1;
    const bagian = per
      .map((tj) => ({ tujuan: tj.tujuan, d: tj.daftar.find((x) => x.no === no) }))
      .filter((x) => x.d)
      .map(({ tujuan, d }) => ({ tujuan, mulai: d.mulai, selesai: d.selesai, mulaiHotel: d.mulaiHotel, malam: d.malam, ket: d.ket, komponen: d.komponen, jumlah: d.jumlah }));
    const mulai = bagian.map((b) => b.mulai).filter(Boolean).sort()[0];
    const selesai = bagian.map((b) => b.selesai).filter(Boolean).sort().slice(-1)[0];

    return { no, urutan: i, jumlahUnit: maks, banyakTujuan: per.length, bagian, jumlah: bagian.reduce((a2, b) => a2 + b.jumlah, 0), ket: bagian.map((b) => b.ket).join('; '), mulai, selesai };
  });
};

export default ringkasUangMuka;
