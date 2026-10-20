import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Alert, Button, Card, CardBody, Container } from 'reactstrap';
import PdfPages from '../adm/Docusign/PdfPages';

const base = `${process.env.REACT_APP_BASEURL}`.replace(/\/$/, '');

const SignDocument = () => {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [buffer, setBuffer] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await axios.get(`${base}/dapi/docusign/public/sign/${token}`);
      setInfo(res.data.data);
      const file = await axios.get(`${base}/dapi/docusign/public/sign/${token}/file`, { responseType: 'arraybuffer' });
      setBuffer(file.data);
    } catch (e) {
      setError('Tautan tidak valid atau dokumen tidak ditemukan');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sign = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.post(`${base}/dapi/docusign/public/sign/${token}`);
      setDone(true);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menandatangani');
    } finally {
      setSaving(false);
    }
  };

  const signed = done || info?.signer.status === 'signed';
  const active = info?.status === 'pending';
  const waiting = info?.waiting_for || [];

  return (
    <Container className="py-4">
      {error && <Alert color="danger">{error}</Alert>}
      {info && (
        <Card className="mb-3">
          <CardBody className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h5 className="mb-0">{info.title}</h5>
              <small>
                Penanda tangan: <b>{info.signer.name}</b>, {info.signer.position} ({info.signer.email})
              </small>
            </div>
            {signed && <Alert color="success" className="mb-0">Dokumen telah Anda tandatangani</Alert>}
            {!signed && !active && <Alert color="secondary" className="mb-0">Dokumen sudah tidak aktif</Alert>}
            {!signed && active && waiting.length > 0 && (
              <Alert color="warning" className="mb-0">
                Menunggu tanda tangan terlebih dahulu dari: {waiting.map((w) => `${w.name} (${w.position})`).join(', ')}
              </Alert>
            )}
            {!signed && active && waiting.length === 0 && (
              <Button color="primary" size="lg" disabled={saving} onClick={sign}>
                {saving ? 'Memproses...' : 'Tanda Tangani Dokumen'}
              </Button>
            )}
          </CardBody>
        </Card>
      )}
      {buffer && (
        <PdfPages
          source={buffer}
          width={Math.min(760, window.innerWidth - 60)}
          fields={signed ? [] : info?.fields || []}
          renderField={() => (
            <div
              style={{
                width: '100%',
                height: '100%',
                border: '2px dashed #1976d2',
                background: '#1976d233',
                color: '#1976d2',
                fontSize: 10,
              }}
            >
              Tanda tangan Anda
            </div>
          )}
        />
      )}
    </Container>
  );
};

export default SignDocument;
