import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, ButtonGroup, Card, CardBody, CardTitle, Input, Spinner } from 'reactstrap';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';

const STATUS = [
  { nilai: '', label: 'Semua' },
  { nilai: 'belum', label: 'Belum dibaca' },
  { nilai: 'sudah', label: 'Sudah dibaca' },
];

const MODUL = [
  ['', 'Semua modul'],
  ['adm', 'Surat (ADM)'],
  ['sppd', 'SPPD'],
  ['mobil', 'Mobil operasional'],
  ['asset', 'Aset'],
  ['project', 'Project'],
  ['task', 'Task'],
  ['daily', 'Daily'],
  ['pengajuan', 'Pengajuan'],
  ['tender', 'Tender'],
  ['vendor', 'Vendor'],
];

// Riwayat semua notifikasi, yang sudah maupun belum dibaca
const Notifications = () => {
  const api = useAxios();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [modul, setModul] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [hasil, setHasil] = useState({ data: [], total: 0, halaman_terakhir: 1, belum_dibaca: 0 });
  const [loading, setLoading] = useState(true);

  const muat = useCallback(() => {
    setLoading(true);
    api
      .get('api/notification/semua', { params: { status, modul, page: halaman } })
      .then((res) => setHasil(res.data))
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [status, modul, halaman]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muat();
  }, [muat]);

  const ubahFilter = (set, nilai) => {
    set(nilai);
    setHalaman(1);
  };

  const buka = (n) => {
    const tujuan = n.url ? `/${String(n.url).replace(/^\//, '')}` : null;
    const lanjut = () => {
      if (tujuan) navigate(tujuan);
      else muat();
    };
    if (n.read_at) {
      lanjut();
      return;
    }
    api
      .post('api/notification/baca', { id: n.id })
      .catch((err) => console.log(err))
      .finally(lanjut);
  };

  const bacaSemua = () => {
    api
      .post('api/notification/baca')
      .catch((err) => console.log(err))
      .finally(muat);
  };

  return (
    <Card className="rounded-3">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <CardTitle tag="h4" className="fw-bold mb-0">
            Notifikasi {hasil.belum_dibaca > 0 ? <Badge color="danger">{hasil.belum_dibaca} baru</Badge> : null}
          </CardTitle>
          <Button size="sm" color="primary" outline disabled={hasil.belum_dibaca === 0} onClick={bacaSemua}>
            Tandai semua sudah dibaca
          </Button>
        </div>

        <div className="d-flex gap-2 flex-wrap mb-3">
          <ButtonGroup size="sm">
            {STATUS.map((s) => (
              <Button key={s.nilai} color="primary" outline={status !== s.nilai} onClick={() => ubahFilter(setStatus, s.nilai)}>
                {s.label}
              </Button>
            ))}
          </ButtonGroup>
          <Input type="select" bsSize="sm" value={modul} onChange={(e) => ubahFilter(setModul, e.target.value)} style={{ width: '12rem' }}>
            {MODUL.map(([nilai, label]) => (
              <option key={nilai} value={nilai}>
                {label}
              </option>
            ))}
          </Input>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <Spinner size="sm" />
          </div>
        ) : null}
        {!loading && hasil.data.length === 0 ? <p className="text-muted text-center py-4">Tidak ada notifikasi.</p> : null}

        {!loading &&
          hasil.data.map((n) => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => buka(n)}
              onKeyDown={(e) => e.key === 'Enter' && buka(n)}
              className={`border rounded p-3 mb-2 ${n.read_at ? '' : 'bg-light border-primary'}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div className={n.read_at ? '' : 'fw-bold'}>
                    {n.judul} <Badge color="secondary">{String(n.modul).toUpperCase()}</Badge>
                  </div>
                  <div className="text-muted">{n.isi}</div>
                </div>
                <div className="text-end text-nowrap">
                  <small className="text-muted d-block">{dayjs(n.created_at).format('DD/MM/YYYY HH:mm')}</small>
                  <Badge color={n.read_at ? 'light' : 'primary'} className={n.read_at ? 'text-muted' : ''}>
                    {n.read_at ? 'Sudah dibaca' : 'Belum dibaca'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}

        {hasil.halaman_terakhir > 1 ? (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <Button size="sm" outline disabled={halaman <= 1} onClick={() => setHalaman(halaman - 1)}>
              Sebelumnya
            </Button>
            <small className="text-muted">
              Halaman {halaman} dari {hasil.halaman_terakhir} ({hasil.total} notifikasi)
            </small>
            <Button size="sm" outline disabled={halaman >= hasil.halaman_terakhir} onClick={() => setHalaman(halaman + 1)}>
              Berikutnya
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
};

export default Notifications;
