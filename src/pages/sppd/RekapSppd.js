import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, ButtonGroup, Input, Pagination, PaginationItem, PaginationLink, Spinner, Table } from 'reactstrap';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';
import ModalDocs from './ModalDocs';

const rupiah = (v) => (v === null || v === undefined ? '-' : `Rp ${Number(v).toLocaleString('id-ID')}`);
const tgl = (v) => (v ? dayjs(v).format('DD MMM YYYY') : '-');
// Jenis nomor surat tugas: 239/PEMA/ST-SF/X/2026 => ST-SF (kode dari tabel penomoran_sppds)
const NAMA_ST = { 'ST-KOM': 'Komisaris', 'ST-DIR': 'Direksi', 'ST-SF': 'Staff', 'ST-ADV': 'Advisor', 'ST-SPS': 'Non Advisor' };
const URUT_ST = ['ST-KOM', 'ST-DIR', 'ST-SF', 'ST-ADV', 'ST-SPS'];
const jenisST = (nomor) => (String(nomor || '').match(/\/(ST-[A-Z0-9]+)\//i) || [])[1]?.toUpperCase() || 'Lainnya';
const daftarBagian = (d, bagian) => {
  if (!d) return [];
  if (bagian === 'aktif') return d.aktif;
  if (bagian === 'void') return d.void;

  return [...d.aktif, ...d.void];
};
const REALISASI = { verified: ['Terverifikasi', 'success'], under_review: ['Proses verifikasi', 'warning'], rejected: ['Ditolak', 'danger'] };

// Rekap semua SPPD yang sudah di-approve (semua kategori dan divisi), aktif dan void dipisah, terbaru di atas
const RekapSppd = () => {
  const api = useAxios();
  const [tahun, setTahun] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState('');
  const [bagian, setBagian] = useState('aktif'); // aktif | semua | void
  const [cari, setCari] = useState('');
  const [jenis, setJenis] = useState('all');
  const [urut, setUrut] = useState('terbaru'); // terbaru | jenis
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState(25);
  const [unduh, setUnduh] = useState(null); // { id, namaFile } SPPD yang sedang diunduh ST-nya

  useEffect(() => {
    setLoading(true);
    setGalat('');
    api
      .get('dapi/sppd/rekap', { params: { tahun: tahun || undefined } })
      .then((res) => {
        const d = res.data.data;
        setData(d);
        // pertama kali dibuka: tahun terbaru yang ada datanya
        if (tahun === '' && d.tahun_tersedia.length > 0) setTahun(d.tahun_tersedia[0]);
      })
      .catch((err) => setGalat(err?.response?.data?.message || 'Gagal memuat rekap SPPD.'))
      .finally(() => setLoading(false));
  }, [tahun]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHalaman(1);
  }, [tahun, bagian, cari, jenis, urut, perHalaman]);

  const baris = useMemo(() => {
    let sumber = daftarBagian(data, bagian);
    if (jenis !== 'all') sumber = sumber.filter((b) => jenisST(b.nomor_sppd) === jenis);
    const q = cari.trim().toLowerCase();
    if (q) {
      sumber = sumber.filter((b) =>
        [b.nomor_sppd, b.nama, b.jabatan, b.divisi, ...(b.tujuan || []), ...(b.kategori || [])].some((v) => String(v || '').toLowerCase().includes(q)),
      );
    }
    if (urut === 'jenis') {
      // kelompok per jenis ST (urutan tetap), di dalam kelompok tetap terbaru di atas (urutan dari server)
      const rank = (b) => {
        const i = URUT_ST.indexOf(jenisST(b.nomor_sppd));
        return i === -1 ? URUT_ST.length : i;
      };
      sumber = [...sumber].sort((a, b) => rank(a) - rank(b));
    } else {
      // terbaru di atas menurut created_at (aktif dan void digabung, jadi diurutkan ulang di sini)
      sumber = [...sumber].sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)) || b.id - a.id);
    }
    return sumber;
  }, [data, bagian, cari, jenis, urut]);

  // jenis ST yang ada pada bagian yang sedang dibuka, untuk pilihan filter
  const daftarJenis = useMemo(() => {
    const hitung = {};
    daftarBagian(data, bagian).forEach((b) => {
      const j = jenisST(b.nomor_sppd);
      hitung[j] = (hitung[j] || 0) + 1;
    });
    return Object.keys(hitung)
      .sort((a, b) => (URUT_ST.indexOf(a) === -1 ? 99 : URUT_ST.indexOf(a)) - (URUT_ST.indexOf(b) === -1 ? 99 : URUT_ST.indexOf(b)))
      .map((j) => [j, hitung[j]]);
  }, [data, bagian]);

  const r = data?.ringkasan;
  const jumlahHalaman = Math.max(1, Math.ceil(baris.length / perHalaman));
  const halamanAktif = Math.min(halaman, jumlahHalaman);
  const mulaiNo = (halamanAktif - 1) * perHalaman;
  const tampil = baris.slice(mulaiNo, mulaiNo + perHalaman);

  // daftar nomor halaman dengan "..." bila banyak
  const nomorHalaman = () => {
    const semua = [];
    for (let i = 1; i <= jumlahHalaman; i += 1) {
      if (i === 1 || i === jumlahHalaman || Math.abs(i - halamanAktif) <= 1) semua.push(i);
      else if (semua[semua.length - 1] !== '...') semua.push('...');
    }

    return semua;
  };

  // 262/PEMA/ST-SF/XI/2026 + Budi Santoso => "262 Budi Santoso.pdf"
  const namaFileST = (b) => {
    const urutan = String(b.nomor_sppd || '').split('/')[0].trim();
    const nama = String(b.nama || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

    return `${[urutan, nama].filter(Boolean).join(' ')}.pdf`;
  };

  return (
    <div>
      {galat && <Alert color="danger">{galat}</Alert>}
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div className="d-flex gap-2 align-items-center">
          <span>Tahun</span>
          <Input type="select" bsSize="sm" style={{ width: 130 }} value={tahun || 'all'} onChange={(e) => setTahun(e.target.value)}>
            <option value="all">Semua tahun</option>
            {(data?.tahun_tersedia || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </Input>
          <Input type="select" bsSize="sm" style={{ width: 190 }} value={jenis} onChange={(e) => setJenis(e.target.value)}>
            <option value="all">Semua jenis ST</option>
            {daftarJenis.map(([j, n]) => <option key={j} value={j}>{j}{NAMA_ST[j] ? ` (${NAMA_ST[j]})` : ''} - {n}</option>)}
          </Input>
          <Input type="select" bsSize="sm" style={{ width: 150 }} value={urut} onChange={(e) => setUrut(e.target.value)}>
            <option value="terbaru">Urut: terbaru</option>
            <option value="jenis">Urut: jenis ST</option>
          </Input>
          <Input bsSize="sm" style={{ width: 240 }} placeholder="Cari nomor, nama, divisi, tujuan" value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
        <ButtonGroup size="sm">
          <Button color="secondary" outline={bagian !== 'semua'} onClick={() => setBagian('semua')}>Semua ({(r?.jumlah_aktif ?? 0) + (r?.jumlah_void ?? 0)})</Button>
          <Button color="primary" outline={bagian !== 'aktif'} onClick={() => setBagian('aktif')}>Aktif ({r?.jumlah_aktif ?? 0})</Button>
          <Button color="danger" outline={bagian !== 'void'} onClick={() => setBagian('void')}>Void ({r?.jumlah_void ?? 0})</Button>
        </ButtonGroup>
      </div>
      {r && bagian !== 'void' && <p className="text-muted mb-2">Total perkiraan biaya (aktif): <b>{rupiah(r.total_biaya_aktif)}</b></p>}

      {loading ? (
        <Spinner size="sm" />
      ) : (
        <div className="table-responsive">
          <Table hover size="sm" className="align-middle">
            <thead>
              <tr>
                <th>No</th>
                <th>ST</th>
                <th>Nomor SPPD</th>
                <th>Pelaksana</th>
                <th className="d-none d-lg-table-cell">Divisi</th>
                <th className="d-none d-lg-table-cell">Kategori</th>
                <th className="d-none d-lg-table-cell">Tujuan</th>
                <th>Tanggal</th>
                <th className="text-end">Perkiraan biaya</th>
                <th>Realisasi / keterangan</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((b, i) => {
                const rl = REALISASI[b.realisasi_status];

                return (
                  <tr key={b.id} className={b.void ? 'table-danger text-muted' : ''} style={b.void ? { opacity: 0.85 } : undefined}>
                    <td>{mulaiNo + i + 1}</td>
                    <td className="text-nowrap">
                      <Button size="sm" outline color="primary" disabled={!!unduh} onClick={() => setUnduh({ id: b.id, namaFile: namaFileST(b) })}>
                        {unduh?.id === b.id ? 'Menyiapkan...' : 'Unduh ST'}
                      </Button>
                    </td>
                    <td className="text-nowrap">
                      {b.nomor_sppd}
                      {b.void && <Badge color="danger" className="ms-2">VOID</Badge>}
                    </td>
                    <td>
                      <b>{b.nama}</b>
                      <br />
                      <small className="text-muted">{b.jabatan}</small>
                      <div className="d-lg-none small mt-1">
                        <div>{b.divisi || 'Non-karyawan'}{(b.kategori || []).length ? ` · ${b.kategori.join(', ')}` : ''}</div>
                        <div className="text-muted">{(b.tujuan || []).join('; ') || '-'}</div>
                      </div>
                    </td>
                    <td className="d-none d-lg-table-cell">{b.divisi || <span className="text-muted">Non-karyawan</span>}</td>
                    <td className="d-none d-lg-table-cell">{(b.kategori || []).join(', ') || '-'}</td>
                    <td className="d-none d-lg-table-cell">{(b.tujuan || []).join('; ') || '-'}</td>
                    <td className="text-nowrap">{tgl(b.mulai)}{b.selesai ? ` - ${tgl(b.selesai)}` : ''}</td>
                    <td className="text-end text-nowrap">{rupiah(b.perkiraan_biaya)}</td>
                    <td>
                      {b.void ? <small>Alasan void: {b.alasan_void}</small> : rl ? <Badge color={rl[1]}>{rl[0]}</Badge> : <small className="text-muted">Belum</small>}
                    </td>
                  </tr>
                );
              })}
              {baris.length === 0 && (
                <tr><td colSpan={10} className="text-muted">Tidak ada SPPD untuk pilihan ini.</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      )}
      {!loading && baris.length > 0 && (
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
          <div className="d-flex align-items-center gap-2 small text-muted">
            <span>Tampilkan</span>
            <Input type="select" bsSize="sm" style={{ width: 80 }} value={perHalaman} onChange={(e) => setPerHalaman(Number(e.target.value))}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </Input>
            <span>
              {mulaiNo + 1}-{Math.min(mulaiNo + perHalaman, baris.length)} dari {baris.length}
            </span>
          </div>
          <Pagination size="sm" className="mb-0">
            <PaginationItem disabled={halamanAktif === 1}>
              <PaginationLink previous href="#" onClick={(e) => { e.preventDefault(); setHalaman(halamanAktif - 1); }} />
            </PaginationItem>
            {nomorHalaman().map((n, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <PaginationItem key={`${n}-${i}`} active={n === halamanAktif} disabled={n === '...'}>
                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); if (n !== '...') setHalaman(n); }}>{n}</PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem disabled={halamanAktif === jumlahHalaman}>
              <PaginationLink next href="#" onClick={(e) => { e.preventDefault(); setHalaman(halamanAktif + 1); }} />
            </PaginationItem>
          </Pagination>
        </div>
      )}
      <ModalDocs modalDoc={!!unduh} toggleDoc={() => setUnduh(null)} sppdDetail={unduh ? { id: unduh.id } : null} namaUnduh={unduh?.namaFile || ''} selesaiUnduh={() => setUnduh(null)} />
    </div>
  );
};

export default RekapSppd;
