import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DataTable from 'react-data-table-component';
import { Alert, Badge, Button, Input, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import useAuth from '../../hooks/useAuth';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';
import PilihTahun from '../../components/atoms/PilihTahun';
import TombolExcel from '../../components/atoms/TombolExcel';
import { daftarTahun, formatTanggal, saringTahun, tahunBerjalan, tanggalValid } from '../../utils/tahun';
import { lebarKolomTombol } from '../../utils/lebarTombol';
import { pasKolom } from '../../utils/lebarKolom';
import { setelanTabel } from '../../utils/setelanTabel';
import AksiBaris from './AksiBaris';
import ModalBatalEkstend from './ModalBatalEkstend';
import './style.scss';

const LABEL_SUMBER_TIKET = {
  umum: 'Diupload divisi umum',
  mandiri: 'Dipesan mandiri',
  // nilai lama, hanya untuk menampilkan data yang diproses sebelum perubahan ini
  tidak_ada: 'Tidak ada tiket',
  pelaksana: 'Diupload pelaksana',
  admin: 'Diupload admin pengaju',
};

// tab Pengajuan: kolom selebar isinya (tanpa melar mengisi ruang kosong); hanya kolom teks panjang yang menampung sisa ruang
const KOLOM_LUWES = ['Pelaksana'];
const rapatkan = (kolom) => kolom.map((k) => (k.width || k.omit ? k : { ...k, grow: KOLOM_LUWES.includes(k.name) ? 1 : 0 }));

const ListPengajuan = ({
  submitted,
  updateForm,
  toggleApproval,
  toggleLog,
  value,
  toggleR,
  toggleDoc,
  toggleRe,
  done,
  modeKeuangan, // tabel "Sudah diproses KeuanganSppd": tanpa tombol Process, ada kolom tanggal proses
  modeSelesai, // tabel "Sudah diproses UmumSppd": tombol Ubah Tiket, kolom sumber/jumlah tiket, dan status kunci
  ubah,
  extend,
  toggle3, // Tambahkan prop extend
  refresh,
}) => {
  const api = useAxios();
  const { auth } = useAuth();
  // AdminSPPD: banyak tombol per baris, jadi dirapikan menjadi satu tombol utama + menu Aksi
  const adalahAdmin = value !== '2' && !!auth?.user?.roles?.includes('AdminSPPD');
  // tampilan baru tabel berlaku di semua tab
  const tampilanBaru = true;
  // modal pilih extend yang dibatalkan
  const [batalRow, setBatalRow] = useState(null);
  // void SPPD: tandai SPPD yang tidak jadi berangkat (sudah atau belum di-approve) beserta alasannya
  const [voidRow, setVoidRow] = useState(null);
  // jumlah SPPD perlu void yang peringatannya sudah ditutup; muncul lagi bila jumlahnya bertambah
  const [peringatanDitutup, setPeringatanDitutup] = useState(0);
  const [alasanVoid, setAlasanVoid] = useState('');
  const [prosesVoid, setProsesVoid] = useState(false);
  const bukaVoid = (row) => {
    setAlasanVoid('');
    setVoidRow(row);
  };
  const kirimVoid = () => {
    setProsesVoid(true);
    api
      .post(`dapi/sppd/pengajuan/${voidRow.id}/void`, { alasan: alasanVoid })
      .then((res) => {
        alert('success', res.data?.message || 'SPPD ditandai void.');
        setVoidRow(null);
        if (refresh) refresh();
      })
      .catch((err) => alert('error', err?.response?.data?.message || err.message))
      .finally(() => setProsesVoid(false));
  };
  // realisasi sudah diverifikasi: tombol Realisasi tidak ditampilkan lagi
  const bisaRealisasi = (row) => value === '1' && !row.void && row.realisasi_status !== 'verified';
  // tidak bisa di-void lagi setelah verifikasi realisasi selesai atau bila sudah void
  const bisaVoid = (row) => value === '1' && !row.void && row.realisasi_status !== 'verified';

  const [search, setSearch] = React.useState('');
  const [listP, setListP] = React.useState([]);
  const [hCol, setHCol] = React.useState(false);
  const [hPro, setHPro] = React.useState(false);
  // filter tahun (kanan atas): tahun berjalan, tahun lain, atau semua
  const [tahun, setTahun] = React.useState(tahunBerjalan());
  const opsiTahun = daftarTahun();

  // pengingat void: SPPD yang sudah lewat tanggal kembali (lebih dari 2 hari) tetapi belum ada realisasi, kemungkinan tidak jadi berangkat
  const [hanyaPerluVoid, setHanyaPerluVoid] = React.useState(false);
  const perluVoid = (row) => {
    const kembali = tanggalValid(row.selesai_tugas);

    return (
      !row.void &&
      !row.realisasi_status &&
      ['signed', 'under_review'].includes(row.current_status) &&
      !!kembali &&
      kembali.isBefore(new Date(Date.now() - 2 * 24 * 3600 * 1000))
    );
  };
  const daftarPerluVoid = value === '1' ? (submitted || []).filter(perluVoid) : [];
  const saring = (daftar) => {
    const hasil = saringTahun(daftar, tahun, ['created_at']);

    return hanyaPerluVoid && daftarPerluVoid.length > 0 ? (hasil || []).filter(perluVoid) : hasil;
  };

  useEffect(() => {
    setListP(saring(submitted));
    if (value === '3') {
      setHCol(true);
    }
    if (value === '4') {
      setHPro(true);
    }
  }, [submitted, value, tahun, hanyaPerluVoid]);

  useEffect(() => {
    const result = saring(submitted)?.filter((p) =>
      p.nama.toLocaleLowerCase().match(search.toLocaleLowerCase()),
    );
    setListP(result);
    console.log(search);
  }, [search, tahun, hanyaPerluVoid]);



  const update = (row) => {
    if (row.current_status === 'signed') {
      extend(row); // Panggil extend di sini
    } else {
      updateForm(row);
    }
  };
  // label tombol aksi per baris (harus sama dengan yang dirender di kolom Actions) untuk mengukur lebar kolom
  const labelsAksi = (row) => {
    const l = [];
    if (value === '1' && !row.void) l.push(row.current_status !== 'signed' ? 'Update' : 'Ekstend');
    if (row.current_status === 'signed' && value === '1' && !row.void) l.push('Hotel 30%');
    l.push('Approval', 'Logs');
    if (value === '3') l.push('Review');
    l.push('Docs');
    if (value === '4' && !modeKeuangan) l.push(modeSelesai ? 'Ubah Tiket' : 'Process');
    if (bisaVoid(row)) l.push('Void');
    if (bisaRealisasi(row)) l.push('Realisasi');

    return l;
  };
  // daftar aksi per baris untuk tampilan AdminSPPD; syaratnya sama dengan tombol biasa di bawah
  const aksiBaris = (row) => {
    const a = [];
    const approval = { label: 'Approval', ikon: 'verified', warna: 'success', jalan: () => toggleApproval(row) };
    // tab Pengajuan: semua aksi ada di menu Action (tanpa tombol utama)
    if (value === '3') a.push({ label: 'Review', ikon: 'rate_review', warna: 'danger', jalan: () => toggleR(row) });
    if (value === '4' && !modeSelesai && !modeKeuangan) a.push({ label: 'Process', ikon: 'play_circle', warna: 'info', jalan: () => done(row) });
    if (value === '4' && modeSelesai) a.push({ label: 'Ubah Tiket', ikon: 'confirmation_number', warna: 'info', jalan: () => ubah(row) });
    if (value === '1' && !row.void) a.push({ label: row.current_status !== 'signed' ? 'Update' : 'Ekstend', ikon: 'edit', warna: 'danger', jalan: () => update(row) });
    if (row.current_status === 'signed' && value === '1' && !row.void) a.push({ label: 'Hotel 30%', ikon: 'hotel', warna: 'dark', jalan: () => toggle3(row) });
    if (Number(row.jumlah_ekstend) > 0 && !row.void) a.push({ label: 'Batalkan Extend', ikon: 'event_busy', warna: 'danger', jalan: () => setBatalRow(row) });
    a.push(approval);
    a.push({ label: 'Logs', ikon: 'history', warna: 'primary', jalan: () => toggleLog(row) });
    a.push({ label: 'Docs', ikon: 'description', warna: 'warning', jalan: () => toggleDoc(row) });
    if (bisaRealisasi(row)) {
      a.push({
        label: 'Realisasi',
        ikon: 'assignment_turned_in',
        warna: 'warning',
        jalan: () => (row.current_status === 'signed' ? toggleRe(row) : alert('error', 'Realisasi hanya bisa dilakukan pada status approved')),
      });
    }
    if (bisaVoid(row)) a.push({ label: 'Void', ikon: 'block', warna: 'secondary', jalan: () => bukaVoid(row), pisah: true });

    return a;
  };

  const columns = [
    {
      name: 'Actions',
      width: adalahAdmin ? (value === '1' ? '130px' : '220px') : lebarKolomTombol(submitted, labelsAksi),
      selector: (row) => (adalahAdmin ? <AksiBaris aksi={aksiBaris(row)} semuaDiMenu={value === '1'} /> : (
        <>
          {value === '1' && !row.void ? (
            <Button
              className="me-2"
              size="sm"
              outline
              color="danger"
              tag="input"
              type="reset"
              value={row.current_status !== 'signed' ? 'Update' : 'Ekstend'}
              onClick={() => update(row)}
            />
          ) : (
            ''
          )}

          {row.current_status === 'signed' && value === '1' && !row.void ? (
            <Button
              size="sm"
              className="me-2"
              outline
              color="dark"
              tag="input"
              type="reset"
              value="Hotel 30%"
              onClick={() => toggle3(row)}
            />
          ) : ('')}

          <Button
            className="me-2"
            size="sm"
            outline
            color="success"
            tag="input"
            type="reset"
            value="Approval"
            onClick={() => toggleApproval(row)}
          />
          <Button
            className="me-2"
            size="sm"
            outline
            color="primary"
            tag="input"
            type="reset"
            value="Logs"
            onClick={() => toggleLog(row)}
          />
          {value === '3' ? (
            <Button
              className="me-2"
              size="sm"
              outline
              color="danger"
              tag="input"
              type="reset"
              value="Review"
              onClick={() => toggleR(row)}
            />
          ) : (
            ''
          )}
          <Button
            className="me-2"
            size="sm"
            outline
            color="warning"
            tag="input"
            type="reset"
            value="Docs"
            onClick={() => toggleDoc(row)}
          />

          {value === '4' && !modeSelesai && !modeKeuangan ? (
            <Button
              className="me-2"
              size="sm"
              outline
              color="info"
              tag="input"
              type="reset"
              value="Process"
              onClick={() => done(row)}
            />
          ) : (
            ''
          )}

          {value === '4' && modeSelesai ? (
            <Button
              className="me-2"
              size="sm"
              outline
              color="info"
              tag="input"
              type="reset"
              value="Ubah Tiket"
              title="Ubah / tambah tiket (juga setelah diproses divisi keuangan)"
              onClick={() => ubah(row)}
            />
          ) : (
            ''
          )}

          {bisaVoid(row) ? (
            <Button
              className="me-2"
              size="sm"
              outline
              color="secondary"
              tag="input"
              type="reset"
              value="Void"
              onClick={() => bukaVoid(row)}
            />
          ) : (
            ''
          )}

          {bisaRealisasi(row) ? (
            <Button
              className="me-2"
              size="sm"
              outline
              color="warning"
              tag="input"
              type="reset"
              value="Realisasi"
              onClick={() => {
                if (row.current_status === 'signed') {
                  toggleRe(row);
                } else {
                  alert('error', 'Realisasi hanya bisa dilakukan pada status approved');
                }
              }}
            />
          ) : (
            ''
          )}
        </>
      )),
    },
    {
      name: 'Nomor ST',
      // badge tidak bisa diukur otomatis: nomor + ruang badge 'Extend n x'
      ukur: (row) => `${row.nomor_sppd || ''}${value !== '4' && row.jumlah_ekstend > 0 ? '          Extend 2x' : ''}`,
      selector: (row) => (
        <>
          {row.nomor_sppd}
          {value !== '4' && row.jumlah_ekstend > 0 ? (
            <Badge color="primary" className="ms-1" title={`Sudah mengajukan extend (${row.jumlah_ekstend}x)`}>
              Extend{row.jumlah_ekstend > 1 ? ` ${row.jumlah_ekstend}x` : ''}
            </Badge>
          ) : null}
        </>
      ),
    },
    {
      name: 'Nama',
      selector: (row) => row.nama,
    },
    ...(value === '1'
      ? [
          {
            name: 'Diajukan oleh',
            selector: (row) => row.first_name,
          },
        ]
      : []),
    {
      name: 'Jabatan',
      selector: (row) => row.jabatan,
    },

    {
      name: 'Diajukan sejak',
      ...(tampilanBaru ? { width: '170px' } : {}),
      selector: (row) =>
        formatTanggal(row.created_at, 'M/D/YYYY h:mm:ss A'),
    },
    {
      name: 'Jenis Proses',
      selector: (row) =>
      (
        <>
          <Badge color="info" style={{ width: '100px' }}>
            {row.type_proses}
          </Badge>
          {row.uangmuka_aktual ? (
            <Badge color="warning" className="ms-1" title={row.catatan_aktual || 'Termin uang muka tidak dibayar di muka'}>
              {Array.isArray(row.termin_aktual) && row.termin_aktual.length ? `Termin ${row.termin_aktual.join(', ')} dibayar di aktual` : 'Dibayar di aktual'}
            </Badge>
          ) : null}
          {row.mode_ekstend ? (
            <Badge color="primary" className="ms-1" title={row.ekstend_judul}>
              Extend
            </Badge>
          ) : null}
          {row.termin_terbukti > 0 ? (
            <Badge color="warning" className="ms-1" title="Sebagian termin sudah dibuktikan transfer, masih dalam proses">
              Dalam proses {row.termin_terbukti}/{row.termin_total} termin
            </Badge>
          ) : null}
        </>
      ),
      omit: !hPro || !!modeSelesai,
    },
    {
      name: 'Tanggal Diproses',
      selector: (row) => (row.tgl_proses ? new Date(String(row.tgl_proses).replace(' ', 'T')).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'),
      omit: !modeKeuangan,
    },
    {
      name: 'Sumber Tiket',
      selector: (row) => LABEL_SUMBER_TIKET[row.sumber_tiket] || '-',
      omit: !modeSelesai,
    },
    {
      name: 'Tiket',
      selector: (row) =>
        row.jumlah_tiket > 0 ? `${row.jumlah_tiket} tiket · Rp ${Number(row.total_tiket).toLocaleString('id-ID')}` : '-',
      omit: !modeSelesai,
    },
    {
      name: 'Status Proses',
      selector: (row) =>
        row.sudah_keuangan ? (
          <Badge color="info" style={{ width: '220px' }} title="Divisi keuangan sudah memproses; tiket (mis. tiket pulang) masih bisa ditambah atau diubah">
            Sudah diproses divisi keuangan
          </Badge>
        ) : (
          <Badge color="success" style={{ width: '220px' }}>
            Menunggu divisi keuangan
          </Badge>
        ),
      omit: !modeSelesai,
    },
    {
      name: 'Jenis Persetujuan',
      selector: (row) => (
        <Badge color="success" style={{ width: '100px' }}>
          {row.current_type}
        </Badge>
      ),
      omit: !hCol,
    },
    {
      name: 'Status Pengajuan',
      ...(tampilanBaru ? { width: '140px' } : {}),
      selector: (row) =>
        row.void ? (
          <Badge color="dark" style={{ width: '100px' }} title={row.alasan_void || ''}>
            Void
          </Badge>
        ) : row.current_status === 'signed' ? (
          <Badge color="success" style={{ width: '100px' }}>
            Approved
          </Badge>
        ) : row.current_status === 'rejected' ? (
          <Badge color="danger" style={{ width: '100px' }}>
            Rejected
          </Badge>
        ) : (
          <Badge color="warning" style={{ width: '100px' }}>
            Under Review
          </Badge>
        ),
      omit: hCol,
    },
    {
      name: 'Alasan Void',
      selector: (row) => row.alasan_void || '',
      omit: !(listP || []).some((r) => r.void),
    },

    {
      name: 'Status Realisasi',
      ...(tampilanBaru ? { width: '140px' } : {}),
      selector: (row) =>
        row.realisasi_status ? (
          <Badge color="info" style={{ width: '100px' }}>
            {row.realisasi_status}
          </Badge>
        ) : (
          <Badge color="dark" style={{ width: '100px' }}>
            Belum Ada
          </Badge>
        ),
    },
  ];

  // tab Pengajuan: data yang berhubungan ditumpuk dalam satu sel supaya kolom lebih sedikit dan rapi (kolom asli tetap dipakai untuk Excel)
  const kolomRapi = (cols) => {
    const hasil = [];
    cols.forEach((k) => {
      if (k.name === 'Nomor ST') {
        hasil.push({
          ...k,
          ukur: (row) => `${row.nomor_sppd || ''}
${value !== '4' && row.jumlah_ekstend > 0 ? 'Extend 2x' : ''}`,
          selector: (row) => (
            <div className="sel-tumpuk">
              <span className="sel-utama">{row.nomor_sppd}</span>
              {value !== '4' && row.jumlah_ekstend > 0 ? (
                <span className="sel-extend" title={`Sudah mengajukan extend (${row.jumlah_ekstend}x)`}>
                  Extend{row.jumlah_ekstend > 1 ? ` ${row.jumlah_ekstend}x` : ''}
                </span>
              ) : null}
            </div>
          ),
        });
      } else if (k.name === 'Nama') {
        hasil.push({
          name: 'Pelaksana',
          ukur: (row) => `${row.nama || ''}
${row.jabatan || ''}`,
          selector: (row) => (
            <div className="sel-tumpuk">
              <span className="sel-utama">{row.nama}</span>
              <span className="sel-kecil">{row.jabatan}</span>
            </div>
          ),
        });
      } else if (k.name === 'Jabatan') {
        // sudah digabung ke kolom Pelaksana
      } else if (k.name === 'Diajukan oleh') {
        hasil.push({
          name: 'Diajukan',
          ukur: (row) => `${row.first_name || ''}
${formatTanggal(row.created_at, 'DD MMM YYYY HH:mm')}`,
          selector: (row) => (
            <div className="sel-tumpuk">
              <span className="sel-utama">{row.first_name}</span>
              <span className="sel-kecil">{formatTanggal(row.created_at, 'DD MMM YYYY HH:mm')}</span>
            </div>
          ),
        });
      } else if (k.name === 'Diajukan sejak' && cols.some((c) => c.name === 'Diajukan oleh')) {
        // sudah digabung ke kolom Diajukan (tab Pengajuan); tab lain tetap memakai kolom ini
      } else {
        hasil.push(k);
      }
    });

    return hasil;
  };

  const tampilkanPerluVoid = () => {
    setTahun('semua');
    setHanyaPerluVoid(true);
  };

  return (
    <>
      {daftarPerluVoid.length > 0 && (daftarPerluVoid.length > peringatanDitutup || hanyaPerluVoid) ? (
        <Alert
          color="warning"
          toggle={() => {
            setPeringatanDitutup(daftarPerluVoid.length);
            setHanyaPerluVoid(false);
          }}
          className="d-flex justify-content-between align-items-center flex-wrap gap-2"
        >
          <div>
            <b>{daftarPerluVoid.length} SPPD</b> sudah lewat tanggal kembali tetapi belum ada realisasi. Jika perjalanan dinas tidak jadi berangkat,
            segera lakukan <b>Void</b> beserta alasannya.
          </div>
          <Button
            size="sm"
            color="warning"
            outline
            className="text-nowrap"
            onClick={() => (hanyaPerluVoid ? setHanyaPerluVoid(false) : tampilkanPerluVoid())}
          >
            {hanyaPerluVoid ? 'Tampilkan semua SPPD' : 'Tampilkan yang perlu di-void'}
          </Button>
        </Alert>
      ) : null}
      <DataTable
        keyField={value === '4' ? 'id_unique' : 'id'}
        columns={tampilanBaru ? rapatkan(pasKolom(kolomRapi(columns), listP)) : pasKolom(columns, listP)}
        data={listP}
        {...setelanTabel}
        pointerOnHover={false}
        subHeaderComponent={
          <div className="baris-filter">
            <Input
              type="text"
              value={search}
              placeholder="search . . . . "
              className="kolom-cari"
              onChange={(e) => setSearch(e.target.value)}
            />
            <PilihTahun tahun={tahun} onChange={setTahun} daftar={opsiTahun} />
            <TombolExcel kolom={columns} data={listP} namaFile={`SPPD ${tahun === 'semua' ? 'Semua Tahun' : tahun}`} />
          </div>
        }
      />

      <ModalBatalEkstend row={batalRow} onTutup={() => setBatalRow(null)} onUbah={refresh} />
      <Modal isOpen={!!voidRow} toggle={() => setVoidRow(null)}>
        <ModalHeader toggle={() => setVoidRow(null)}>Void SPPD</ModalHeader>
        <ModalBody>
          <p className="mb-2">
            SPPD <b>{voidRow?.nomor_sppd}</b> a.n. {voidRow?.nama} akan ditandai void. SPPD void tidak bisa diproses lagi dan tidak bisa dibatalkan.
            Tombol void tidak tersedia setelah verifikasi realisasi selesai.
          </p>
          <Input
            type="textarea"
            rows={3}
            placeholder="Alasan void (wajib), misalnya: perjalanan dinas tidak jadi berangkat"
            value={alasanVoid}
            onChange={(e) => setAlasanVoid(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setVoidRow(null)} disabled={prosesVoid}>
            Batal
          </Button>
          <Button color="danger" onClick={kirimVoid} disabled={prosesVoid || alasanVoid.trim().length < 5}>
            {prosesVoid ? 'Memproses...' : 'Void SPPD'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
ListPengajuan.propTypes = {
  submitted: PropTypes.array,
  updateForm: PropTypes.func,
  toggleApproval: PropTypes.func,
  toggleLog: PropTypes.func,
  value: PropTypes.string,
  toggleR: PropTypes.func,
  toggleDoc: PropTypes.func,
  toggleRe: PropTypes.func,
  done: PropTypes.func,
  modeSelesai: PropTypes.bool,
  modeKeuangan: PropTypes.bool,
  ubah: PropTypes.func,
  extend: PropTypes.func, 
  toggle3:PropTypes.func,// Tambahkan propTypes extend
  refresh: PropTypes.func,
};

export default ListPengajuan;
