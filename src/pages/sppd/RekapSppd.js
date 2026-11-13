import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Input, Pagination, PaginationItem, PaginationLink, Spinner, Table } from 'reactstrap';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';
import ModalDocs from './ModalDocs';
import './RekapSppd.scss';

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

  const tombolST = (b) => (
    <Button size="sm" color="primary" outline disabled={!!unduh} onClick={() => setUnduh({ id: b.id, namaFile: namaFileST(b) })}>
      {unduh?.id === b.id ? 'Menyiapkan...' : 'Unduh ST'}
    </Button>
  );

  const statusRealisasi = (b) => {
    if (b.void) return <small>Alasan void: {b.alasan_void}</small>;
    const rl = REALISASI[b.realisasi_status];

    return rl ? (
      <Badge color={rl[1]} pill>
        {rl[0]}
      </Badge>
    ) : (
      <small className="rekap-sub">Realisasi belum</small>
    );
  };

  const chips = (b) => (
    <>
      <span className="rekap-chip">{b.divisi || 'Non-karyawan'}</span>
      {(b.kategori || []).map((k) => (
        <span className="rekap-chip" key={k}>
          {k}
        </span>
      ))}
    </>
  );

  // realisasi biaya + selisih terhadap perkiraan (hijau = hemat, merah = melebihi)
  const realisasiBiaya = (b) => {
    if (b.realisasi_biaya === null || b.realisasi_biaya === undefined) return <small className="rekap-sub">Belum direalisasi</small>;
    const selisih = (b.perkiraan_biaya ?? 0) - b.realisasi_biaya;

    return (
      <>
        <div className="rekap-uang">{rupiah(b.realisasi_biaya)}</div>
        {b.perkiraan_biaya !== null && b.perkiraan_biaya !== undefined && selisih !== 0 && (
          <div className={`rekap-selisih ${selisih > 0 ? 'hemat' : 'lebih'}`}>
            {selisih > 0 ? 'Hemat' : 'Lebih'} {rupiah(Math.abs(selisih))}
          </div>
        )}
      </>
    );
  };

  const tanggal = (b) => `${tgl(b.mulai)}${b.selesai ? ` - ${tgl(b.selesai)}` : ''}`;
  const jumlahSemua = (r?.jumlah_aktif ?? 0) + (r?.jumlah_void ?? 0);

  return (
    <div className="rekap">
      {galat && <Alert color="danger">{galat}</Alert>}

      <div className="rekap-stats">
        <div className="rekap-stat">
          <div className="rekap-stat__ikon rekap-nada-biru">{r?.jumlah_aktif ?? 0}</div>
          <div>
            <div className="rekap-stat__label">SPPD aktif</div>
            <div className="rekap-stat__nilai">{tahun && tahun !== 'all' ? `Tahun ${tahun}` : 'Semua tahun'}</div>
          </div>
        </div>
        <div className="rekap-stat">
          <div className="rekap-stat__ikon rekap-nada-hijau">Rp</div>
          <div>
            <div className="rekap-stat__label">Perkiraan biaya (aktif)</div>
            <div className="rekap-stat__nilai">{rupiah(r?.total_biaya_aktif ?? 0)}</div>
          </div>
        </div>
        <div className="rekap-stat">
          <div className="rekap-stat__ikon rekap-nada-biru">Rp</div>
          <div>
            <div className="rekap-stat__label">Realisasi biaya (aktif)</div>
            <div className="rekap-stat__nilai">{rupiah(r?.total_realisasi_aktif ?? 0)}</div>
            <div className="rekap-sub">{r?.jumlah_realisasi_aktif ?? 0} SPPD sudah direalisasi</div>
          </div>
        </div>
        <div className="rekap-stat">
          <div className="rekap-stat__ikon rekap-nada-merah">{r?.jumlah_void ?? 0}</div>
          <div>
            <div className="rekap-stat__label">SPPD void</div>
            <div className="rekap-stat__nilai">{r?.jumlah_void ? 'Dibatalkan' : 'Tidak ada'}</div>
          </div>
        </div>
      </div>

      <div className="rekap-bar">
        <div className="rekap-segmen" role="tablist">
          <button type="button" className={bagian === 'aktif' ? 'aktif' : ''} onClick={() => setBagian('aktif')}>
            Aktif<span>{r?.jumlah_aktif ?? 0}</span>
          </button>
          <button type="button" className={bagian === 'semua' ? 'aktif' : ''} onClick={() => setBagian('semua')}>
            Semua<span>{jumlahSemua}</span>
          </button>
          <button type="button" className={bagian === 'void' ? 'aktif void' : ''} onClick={() => setBagian('void')}>
            Void<span>{r?.jumlah_void ?? 0}</span>
          </button>
        </div>
      </div>

      <div className="rekap-bar">
        <div className="rekap-filter">
          <Input type="select" bsSize="sm" value={tahun || 'all'} onChange={(e) => setTahun(e.target.value)} aria-label="Tahun">
            <option value="all">Semua tahun</option>
            {(data?.tahun_tersedia || []).map((th) => (
              <option key={th} value={th}>
                {th}
              </option>
            ))}
          </Input>
          <Input type="select" bsSize="sm" value={jenis} onChange={(e) => setJenis(e.target.value)} aria-label="Jenis ST">
            <option value="all">Semua jenis ST</option>
            {daftarJenis.map(([j, n]) => (
              <option key={j} value={j}>
                {j}
                {NAMA_ST[j] ? ` (${NAMA_ST[j]})` : ''} - {n}
              </option>
            ))}
          </Input>
          <Input type="select" bsSize="sm" value={urut} onChange={(e) => setUrut(e.target.value)} aria-label="Urutan">
            <option value="terbaru">Urut: terbaru</option>
            <option value="jenis">Urut: jenis ST</option>
          </Input>
          <Input bsSize="sm" className="rekap-filter__cari" placeholder="Cari nomor, nama, divisi, tujuan" value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="rekap-kosong">
          <Spinner size="sm" /> Memuat rekap...
        </div>
      ) : baris.length === 0 ? (
        <div className="rekap-tabel">
          <div className="rekap-kosong">Tidak ada SPPD untuk pilihan ini.</div>
        </div>
      ) : (
        <>
          {/* tampilan tabel (layar lebar) */}
          <div className="rekap-tabel table-responsive">
            <Table borderless size="sm" className="align-middle">
              <thead>
                <tr>
                  <th>ST</th>
                  <th>Nomor SPPD</th>
                  <th>Pelaksana</th>
                  <th>Tujuan</th>
                  <th>Tanggal</th>
                  <th className="text-end">Perkiraan biaya</th>
                  <th className="text-end">Realisasi biaya</th>
                  <th>Status realisasi</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((b) => (
                  <tr key={b.id} className={b.void ? 'void-baris' : ''}>
                    <td className="text-nowrap">{tombolST(b)}</td>
                    <td>
                      <span className="rekap-nomor">{b.nomor_sppd}</span>
                      {b.void && <span className="rekap-tag void">VOID</span>}
                    </td>
                    <td>
                      <div className="rekap-nama">{b.nama}</div>
                      <div className="rekap-sub mb-1">{b.jabatan}</div>
                      {chips(b)}
                    </td>
                    <td style={{ maxWidth: 260 }}>{(b.tujuan || []).join('; ') || '-'}</td>
                    <td className="text-nowrap">{tanggal(b)}</td>
                    <td className="rekap-uang">{rupiah(b.perkiraan_biaya)}</td>
                    <td className="text-end">{realisasiBiaya(b)}</td>
                    <td>{statusRealisasi(b)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* tampilan kartu (layar kecil) */}
          <div className="rekap-kartu">
            {tampil.map((b, i) => (
              <div key={b.id} className={`rekap-kartu-item ${b.void ? 'void-baris' : ''}`}>
                <div className="rekap-kartu-item__atas">
                  <div>
                    <span className="rekap-nomor">
                      {mulaiNo + i + 1}. {b.nomor_sppd}
                    </span>
                    {b.void && <span className="rekap-tag void">VOID</span>}
                  </div>
                  {tombolST(b)}
                </div>
                <div className="rekap-nama">{b.nama}</div>
                <div className="rekap-sub mb-2">{b.jabatan}</div>
                {chips(b)}
                <div className="rekap-kartu-item__baris">
                  <span>Tujuan</span>
                  <span>{(b.tujuan || []).join('; ') || '-'}</span>
                </div>
                <div className="rekap-kartu-item__baris">
                  <span>Tanggal</span>
                  <span>{tanggal(b)}</span>
                </div>
                <div className="rekap-kartu-item__baris">
                  <span>Perkiraan biaya</span>
                  <span className="fw-semibold">{rupiah(b.perkiraan_biaya)}</span>
                </div>
                <div className="rekap-kartu-item__baris">
                  <span>Realisasi biaya</span>
                  <span>{realisasiBiaya(b)}</span>
                </div>
                <div className="rekap-kartu-item__baris">
                  <span>Status realisasi</span>
                  <span>{statusRealisasi(b)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rekap-kaki">
            <div className="d-flex align-items-center gap-2 small text-muted">
              <span>Tampilkan</span>
              <Input type="select" bsSize="sm" style={{ width: 80 }} value={perHalaman} onChange={(e) => setPerHalaman(Number(e.target.value))}>
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Input>
              <span>
                {mulaiNo + 1}-{Math.min(mulaiNo + perHalaman, baris.length)} dari {baris.length}
              </span>
            </div>
            <Pagination size="sm" className="mb-0">
              <PaginationItem disabled={halamanAktif === 1}>
                <PaginationLink
                  previous
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setHalaman(halamanAktif - 1);
                  }}
                />
              </PaginationItem>
              {nomorHalaman().map((n, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <PaginationItem key={`${n}-${i}`} active={n === halamanAktif} disabled={n === '...'}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (n !== '...') setHalaman(n);
                    }}
                  >
                    {n}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem disabled={halamanAktif === jumlahHalaman}>
                <PaginationLink
                  next
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setHalaman(halamanAktif + 1);
                  }}
                />
              </PaginationItem>
            </Pagination>
          </div>
        </>
      )}
      <ModalDocs modalDoc={!!unduh} toggleDoc={() => setUnduh(null)} sppdDetail={unduh ? { id: unduh.id } : null} namaUnduh={unduh?.namaFile || ''} selesaiUnduh={() => setUnduh(null)} />
    </div>
  );
};

export default RekapSppd;
