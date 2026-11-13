import React, { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import DataTable from 'react-data-table-component';
import { Badge, Button, Input } from 'reactstrap';
import { QRCode } from 'react-qrcode-logo';
import { confirmAlert } from 'react-confirm-alert';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';
import { formatTanggal } from '../../utils/tahun';
import { pasKolom } from '../../utils/lebarKolom';
import GenerateSurat from './Fungsi/Generate';
import FMerge from './Fungsi/FMerge';
import toRoman from './Fungsi/toRoman';
import logo from '../../assets/images/qrcode/qr-code-logo.png';
import '../sppd/style.scss';

// Draft surat milik admin: belum bernomor dan belum masuk alur paraf. Nomor didapat setelah draft dilanjutkan dan di-submit.
// Tampilan mengikuti daftar surat lain (ListSurat): tabel dengan kolom cari, tombol outline kecil, badge, dan paginasi.
const DraftSurat = ({ drafts, onLanjut, refresh }) => {
  const api = useAxios();
  const [loadingId, setLoadingId] = useState('');
  const [search, setSearch] = useState('');
  const [viewId, setViewId] = useState('');
  const qrCodeRef = useRef();

  const data = useMemo(() => {
    const q = search.toLowerCase();
    return (drafts || []).filter((d) => `${d.kepada || ''} ${d.perihal || ''}`.toLowerCase().includes(q));
  }, [drafts, search]);

  const lanjut = async (id) => {
    setLoadingId(id);
    await onLanjut(id);
    setLoadingId('');
  };

  // pratinjau PDF draft: nomor surat masih kosong (". . .") karena nomor baru didapat saat Submit
  const lihat = async (id) => {
    setViewId(id);
    try {
      const draft = (await api.get(`dapi/adm/draft/${id}`)).data.data;
      const signers = draft.divisi ? (await api.get(`dapi/adm/signers/${draft.divisi}`)).data.data : [];
      const now = new Date();
      const pdf = await GenerateSurat(
        {
          ...draft,
          draft: true, // watermark DRAFT di setiap halaman
          jenisLampiran: draft.jenislampiran,
          tembusans: draft.tembusans || [],
          signer: signers?.find((s) => s.employe_id === draft.ttdBy),
          tglSurat: now.toISOString(),
          nomorSurat: `. . . /PEMA/${toRoman(now.getMonth() + 1)}/${now.getFullYear()}`,
        },
        qrCodeRef,
      );
      const url = await FMerge(pdf, (draft.fileLampiran || '').replace('data:application/pdf;base64,', ''));
      window.open(url);
    } catch (err) {
      alert('error', err?.response?.data?.message || err.message || 'Gagal membuka draft');
    }
    setViewId('');
  };

  const hapus = (row) => {
    confirmAlert({
      title: 'Hapus draft?',
      message: `Draft "${row.perihal || row.kepada || 'tanpa judul'}" akan dihapus permanen.`,
      buttons: [
        {
          label: 'Hapus',
          onClick: () => {
            api.post(`dapi/adm/draft/${row.id}/hapus`)
              .then(() => {
                alert('success', 'Draft dihapus');
                refresh();
              })
              .catch((err) => alert('error', err?.response?.data?.message || err.message));
          },
        },
        { label: 'Batal', onClick: () => {} },
      ],
    });
  };

  const columns = [
    {
      name: 'Actions',
      width: '300px',
      selector: (row) => (
        <>
          <Button
            className="me-2"
            size="sm"
            outline
            color="info"
            tag="input"
            type="button"
            value={viewId === row.id ? 'Loading . . .' : 'Lihat Surat'}
            onClick={() => lihat(row.id)}
          />
          <Button
            className="me-2"
            size="sm"
            outline
            color="danger"
            tag="input"
            type="button"
            value={loadingId === row.id ? 'Loading . . .' : 'Lanjutkan'}
            onClick={() => lanjut(row.id)}
          />
          <Button className="me-2" size="sm" outline color="secondary" tag="input" type="button" value="Hapus" onClick={() => hapus(row)} />
        </>
      ),
    },
    { name: 'Nomor Surat', selector: () => 'Belum bernomor' },
    {
      name: 'Jenis Surat',
      width: '170px',
      selector: (row) => (row.ttd_basah ? <Badge color="info">TTD Manual</Badge> : <Badge color="secondary">Normal</Badge>),
    },
    { name: 'Kepada', selector: (row) => row.kepada || '-' },
    { name: 'Perihal', selector: (row) => row.perihal || '-' },
    {
      name: 'Status',
      selector: () => (
        <Badge color="secondary" style={{ width: '100px' }}>
          Draft
        </Badge>
      ),
    },
    { name: 'Terakhir diubah', selector: (row) => formatTanggal(row.updated_at, 'DD/MM/YYYY HH:mm') },
  ];

  return (
    <>
      <div ref={qrCodeRef} style={{ display: 'none' }}>
        <QRCode value="draft" size={400} qrStyle="dots" logoImage={logo} logoWidth={100} logoHeight={100} eyeRadius={20} fgColor="#0F52BA" />
      </div>
      <DataTable
      columns={pasKolom(columns, data)}
      data={data}
      pagination
      subHeader
      noDataComponent="Belum ada draft"
      subHeaderComponent={
        <div className="baris-filter">
          <Input type="text" value={search} placeholder="search . . . . " className="kolom-cari" onChange={(e) => setSearch(e.target.value)} />
        </div>
      }
      />
    </>
  );
};

DraftSurat.propTypes = {
  drafts: PropTypes.array,
  onLanjut: PropTypes.func.isRequired,
  refresh: PropTypes.func.isRequired,
};
DraftSurat.defaultProps = { drafts: [] };

export default DraftSurat;
