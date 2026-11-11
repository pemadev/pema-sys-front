import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import DataTable from 'react-data-table-component';
import { Badge, Button, Input } from 'reactstrap';
import { alert } from '../../components/atoms/Toast';
import PilihTahun from '../../components/atoms/PilihTahun';
import TombolExcel from '../../components/atoms/TombolExcel';
import { daftarTahun, formatTanggal, saringTahun, tahunBerjalan } from '../../utils/tahun';
import { lebarKolomTombol } from '../../utils/lebarTombol';
import { pasKolom } from '../../utils/lebarKolom';
import './style.scss';

const ListApproved = ({
  approved,
  toggleDetail,
  toggleApproval,
  toggleLog,
  value,
  toggleDoc,
  toggleRe,
}) => {
  const [search, setSearch] = React.useState('');
  const [listP, setListP] = React.useState([]);
  const [hCol, setHCol] = React.useState(false);
  // filter tahun (kanan atas): tahun berjalan, tahun lain, atau semua
  const [tahun, setTahun] = React.useState(tahunBerjalan());
  const kolomTanggal = ['approved_at', 'created_at'];
  const opsiTahun = daftarTahun();

  useEffect(() => {
    setListP(saringTahun(approved, tahun, kolomTanggal));
    if (value === '3') {
      setHCol(true);
    }
  }, [approved, value, tahun]);

  useEffect(() => {
    const result = saringTahun(approved, tahun, kolomTanggal)?.filter((p) =>
      p.nama.toLocaleLowerCase().match(search.toLocaleLowerCase()),
    );
    setListP(result);
    console.log(search);
  }, [search, tahun]);

  // label tombol aksi (harus sama dengan yang dirender di kolom Actions) untuk mengukur lebar kolom
  // realisasi sudah diverifikasi: tombol Realisasi tidak ditampilkan lagi
  const bisaRealisasi = (row) => value === '1' && row.realisasi_status !== 'verified';
  const labelsAksi = (row) => ['Detail', 'Approval', 'Logs', 'Docs', ...(bisaRealisasi(row) ? ['Realisasi'] : [])];
  const columns = [
    {
      name: 'Actions',
      width: lebarKolomTombol(approved, labelsAksi),
      selector: (row) => (
        <>
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
      name: 'Disetujui pada',
      selector: (row) =>
        formatTanggal(row.approved_at || row.created_at, 'M/D/YYYY h:mm:ss A'),
    },
    {
      name: 'Jenis Persetujuan',
      selector: (row) => (
        <Badge color="success" style={{ width: '100px' }}>
          {row.type}
        </Badge>
      ),
      omit: !hCol,
    },
  ];

  return (
    <>
      <DataTable
        keyField="id_unique"
        columns={pasKolom(columns, listP)}
        data={listP}
        pagination
        subHeader
        subHeaderComponent={
          <div className="baris-filter baris-filter-judul">
            <h5 className="mb-0">Pengajuan yang Telah Saya Setujui</h5>
            <div className="baris-filter">
              <Input
                type="text"
                value={search}
                placeholder="search . . . . "
                className="kolom-cari"
                onChange={(e) => setSearch(e.target.value)}
              />
              <PilihTahun tahun={tahun} onChange={setTahun} daftar={opsiTahun} />
            <TombolExcel kolom={columns} data={listP} namaFile={`SPPD Disetujui ${tahun === 'semua' ? 'Semua Tahun' : tahun}`} />
            </div>
          </div>
        }
      />
    </>
  );
};
ListApproved.propTypes = {
  approved: PropTypes.array,
  toggleDetail: PropTypes.func,
  toggleApproval: PropTypes.func,
  toggleLog: PropTypes.func,
  value: PropTypes.string,
  toggleDoc: PropTypes.func,
  toggleRe: PropTypes.func,
};
export default ListApproved;
