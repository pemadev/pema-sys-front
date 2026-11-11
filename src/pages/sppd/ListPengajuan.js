import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DataTable from 'react-data-table-component';
import { Alert, Badge, Button, Input, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';
import PilihTahun from '../../components/atoms/PilihTahun';
import TombolExcel from '../../components/atoms/TombolExcel';
import { daftarTahun, formatTanggal, saringTahun, tahunBerjalan, tanggalValid } from '../../utils/tahun';
import { lebarKolomTombol } from '../../utils/lebarTombol';
import { pasKolom } from '../../utils/lebarKolom';
import './style.scss';

const ListPengajuan = ({
  submitted,
  updateForm,
  toggleDetail,
  toggleApproval,
  toggleLog,
  value,
  toggleR,
  toggleDoc,
  toggleRe,
  done,
  extend,
  toggle3, // Tambahkan prop extend
  refresh,
}) => {
  const api = useAxios();
  // void SPPD: tandai SPPD yang tidak jadi berangkat (sudah atau belum di-approve) beserta alasannya
  const [voidRow, setVoidRow] = useState(null);
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
    l.push('Detail', 'Approval', 'Logs');
    if (value === '3') l.push('Review');
    l.push('Docs');
    if (value === '4') l.push('Process');
    if (bisaVoid(row)) l.push('Void');
    if (bisaRealisasi(row)) l.push('Realisasi');

    return l;
  };
  const columns = [
    {
      name: 'Actions',
      width: lebarKolomTombol(submitted, labelsAksi),
      selector: (row) => (
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

          {row.current_status === 'signed' && value === '1' && !row.void ? ( <Button
            size="sm"
            className="me-2"
            outline
            color="dark"
            tag="input"
            type="reset"
            value="Hotel 30%"
            onClick={() => toggle3(row)}
          />) : ('')}

          <Button
            size="sm"
            className="me-2"
            outline
            color="dark"
            tag="input"
            type="reset"
            value="Detail"
            onClick={() => toggleDetail(row)}
          />

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

          {value === '4' ? (
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
      ),
    },
    {
      name: 'Nomor ST',
      selector: (row) => row.nomor_sppd,
    },
    {
      name: 'Nama',
      selector: (row) => row.nama,
    },
    {
      name: 'Jabatan',
      selector: (row) => row.jabatan,
    },

    {
      name: 'Diajukan sejak',
      selector: (row) =>
        formatTanggal(row.created_at, 'M/D/YYYY h:mm:ss A'),
    },
    {
      name: 'Jenis Proses',
      selector: (row) =>
      (
        <Badge color="info" style={{ width: '100px' }}>
          {row.type_proses}
        </Badge>
      ),
      omit: !hPro
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

  const tampilkanPerluVoid = () => {
    setTahun('semua');
    setHanyaPerluVoid(true);
  };

  return (
    <>
      {daftarPerluVoid.length > 0 ? (
        <Alert color="warning" className="d-flex justify-content-between align-items-center flex-wrap gap-2">
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
        columns={pasKolom(columns, listP)}
        data={listP}
        pagination
        subHeader
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
  toggleDetail: PropTypes.func,
  toggleApproval: PropTypes.func,
  toggleLog: PropTypes.func,
  value: PropTypes.string,
  toggleR: PropTypes.func,
  toggleDoc: PropTypes.func,
  toggleRe: PropTypes.func,
  done: PropTypes.func,
  extend: PropTypes.func, 
  toggle3:PropTypes.func,// Tambahkan propTypes extend
  refresh: PropTypes.func,
};

export default ListPengajuan;
