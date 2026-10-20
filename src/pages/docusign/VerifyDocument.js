import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { Alert, Badge, Button, Card, CardBody, Container, Table } from 'reactstrap';
import PdfPages from '../adm/Docusign/PdfPages';

const base = `${process.env.REACT_APP_BASEURL}`.replace(/\/$/, '');

const STATUS = {
  completed: { color: 'success', label: 'Seluruh tanda tangan lengkap' },
  pending: { color: 'warning', label: 'Menunggu tanda tangan' },
  cancelled: { color: 'secondary', label: 'Dibatalkan' },
};

const VerifyDocument = () => {
  const { uuid } = useParams();
  const [info, setInfo] = useState(null);
  const [buffer, setBuffer] = useState(null);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [showDocument, setShowDocument] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(false);

  useEffect(() => {
    axios
      .get(`${base}/dapi/docusign/public/verify/${uuid}`)
      .then((res) => setInfo(res.data.data))
      .catch(() => setError('Dokumen tidak ditemukan / tidak valid'));
  }, [uuid]);

  const toggleDocument = async () => {
    if (buffer) {
      setShowDocument(!showDocument);
      return;
    }

    setLoadingDocument(true);
    setFileError('');
    try {
      const res = await axios.get(`${base}/dapi/docusign/public/verify/${uuid}/file`, { responseType: 'arraybuffer' });
      setBuffer(res.data);
      setShowDocument(true);
    } catch (e) {
      setFileError('Dokumen tidak dapat dimuat. Silakan coba lagi.');
    } finally {
      setLoadingDocument(false);
    }
  };

  const status = STATUS[info?.status] || { color: 'secondary', label: 'Status tidak diketahui' };

  return (
    <Container className="py-4" style={{ maxWidth: 1040 }}>
      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
        <div>
          <div className="fw-bold" style={{ color: '#17483d', letterSpacing: 1 }}>PEMA</div>
          <small className="text-muted">Layanan Dokumen Elektronik</small>
        </div>
        <div className="text-end">
          <div className="small fw-semibold text-uppercase">Verifikasi Dokumen</div>
          <small className="text-muted">Keaslian dan status tanda tangan</small>
        </div>
      </div>
      {error && <Alert color="danger">{error}</Alert>}
      {info && (
        <>
          <Card className="mb-4" style={{ border: '1px solid #dfe7e3', borderRadius: 6 }}>
            <CardBody className="p-4">
              <div className="d-flex justify-content-between align-items-start flex-wrap mb-4">
                <div className="me-3">
                  <small className="text-uppercase text-muted fw-semibold">Dokumen terdaftar</small>
                  <h3 className="h4 mt-1 mb-2">{info.title}</h3>
                  <small className="text-muted">Dibuat {dayjs(info.created_at).format('DD MMMM YYYY, HH:mm')}</small>
                </div>
                <Badge color={status.color} pill className="px-3 py-2 mt-2">{status.label}</Badge>
              </div>
              <div className="p-3 mb-4" style={{ background: '#f3f7f5', borderLeft: '3px solid #2f7764' }}>
                <small className="d-block text-muted fw-semibold mb-1">HASH SHA-256 DOKUMEN ASLI</small>
                <code style={{ color: '#263b35', overflowWrap: 'anywhere' }}>{info.original_hash}</code>
              </div>
              <h2 className="h6 mb-3">Riwayat penandatangan</h2>
              <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>Penanda tangan</th>
                  <th>Status</th>
                  <th>Waktu</th>
                  <th>Token verifikasi tanda tangan</th>
                </tr>
              </thead>
              <tbody>
                {info.signers.map((s, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i}>
                    <td><span className="fw-semibold">{s.name}</span><small className="d-block text-muted">{s.position}</small></td>
                    <td><Badge color={s.status === 'signed' ? 'success' : 'light'} className={s.status === 'signed' ? '' : 'text-dark'}>{s.status === 'signed' ? 'Ditandatangani' : 'Menunggu'}</Badge></td>
                    <td>{s.signed_at ? dayjs(s.signed_at).format('DD-MM-YYYY HH:mm') : '-'}</td>
                    <td>{s.code ? <code style={{ color: '#17483d', overflowWrap: 'anywhere' }}>{s.code}</code> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            </CardBody>
          </Card>
          <div className="d-flex justify-content-between align-items-center flex-wrap border-top pt-3">
            <small className="text-muted">Dokumen hanya dimuat saat diminta.</small>
            <Button color="success" outline onClick={toggleDocument} disabled={loadingDocument}>
              {loadingDocument ? 'Memuat dokumen...' : showDocument ? 'Sembunyikan dokumen' : 'Lihat dokumen'}
            </Button>
          </div>
          {fileError && <Alert color="danger" className="mt-3">{fileError}</Alert>}
          {showDocument && buffer && <div className="mt-3"><PdfPages source={buffer} width={Math.min(760, window.innerWidth - 60)} /></div>}
        </>
      )}
    </Container>
  );
};

export default VerifyDocument;
