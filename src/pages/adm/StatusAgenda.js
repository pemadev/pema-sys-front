import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { Badge, Card, CardBody, Container } from 'reactstrap';

const base = `${process.env.REACT_APP_BASEURL}`.replace(/\/$/, '');

const STATUS = {
  selesai: { color: 'success', label: 'Selesai' },
  diproses: { color: 'warning', label: 'Diproses' },
};

// Halaman publik dari QR nomor agenda surat masuk: hanya ringkasan dan status, tanpa isi surat
const StatusAgenda = () => {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`${base}/dapi/adm/public/agenda/${token}`)
      .then((res) => setInfo(res.data.data))
      .catch(() => setError('Nomor agenda tidak ditemukan atau tidak valid'));
  }, [token]);

  const status = STATUS[info?.status] || { color: 'secondary', label: '-' };
  const waktu = (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-');

  return (
    <Container className="py-4" style={{ maxWidth: 640 }}>
      <div className="border-bottom pb-3 mb-4">
        <div className="fw-bold" style={{ color: '#17483d', letterSpacing: 1 }}>PEMA</div>
        <small className="text-muted">Status Surat Masuk</small>
      </div>
      {error ? <Card><CardBody className="text-danger">{error}</CardBody></Card> : null}
      {!error && !info ? <p className="text-muted">Memuat...</p> : null}
      {info ? (
        <Card className="shadow-sm">
          <CardBody>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
              <div>
                <small className="text-muted">Nomor Agenda</small>
                <div className="fs-4 fw-bold">{info.nomor_agenda || '-'}</div>
              </div>
              <Badge color={status.color} className="fs-6 px-3 py-2">{status.label}</Badge>
            </div>
            <dl className="row mb-4">
              <dt className="col-sm-4 text-muted fw-normal">Nomor Surat</dt>
              <dd className="col-sm-8">{info.nomor}</dd>
              <dt className="col-sm-4 text-muted fw-normal">Pengirim</dt>
              <dd className="col-sm-8">{info.pengirim}</dd>
              <dt className="col-sm-4 text-muted fw-normal">Perihal</dt>
              <dd className="col-sm-8">{info.perihal}</dd>
              <dt className="col-sm-4 text-muted fw-normal">Tanggal Surat</dt>
              <dd className="col-sm-8">{info.tgl_surat ? dayjs(info.tgl_surat).format('DD/MM/YYYY') : '-'}</dd>
            </dl>
            <div className="fw-semibold mb-2">Perjalanan surat</div>
            <ul className="list-unstyled mb-0">
              {info.langkah.map((l, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={i} className="d-flex gap-3 pb-3">
                  <span className="rounded-circle bg-primary" style={{ width: 10, height: 10, marginTop: 7, flexShrink: 0 }} />
                  <div>
                    <div>{l.keterangan}</div>
                    <small className="text-muted">{waktu(l.waktu)}</small>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </Container>
  );
};

export default StatusAgenda;
