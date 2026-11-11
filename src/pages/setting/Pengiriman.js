import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, ButtonGroup, Spinner, Table } from 'reactstrap';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';

const STATUS = [
  ['', 'Semua'],
  ['belum', 'Belum terkirim'],
  ['terkirim', 'Terkirim'],
  ['gagal', 'Gagal'],
  ['dilewati', 'Dilewati'],
];
const KANAL = [
  ['wa', 'WhatsApp'],
  ['webpush', 'Push'],
  ['', 'Semua kanal'],
];
const WARNA = { pending: 'warning', sent: 'success', failed: 'danger', skipped: 'secondary' };
const LABEL = { pending: 'Belum terkirim', sent: 'Terkirim', failed: 'Gagal', skipped: 'Dilewati' };

const Pengiriman = () => {
  const api = useAxios();
  const [status, setStatus] = useState('');
  const [kanal, setKanal] = useState('wa');
  const [halaman, setHalaman] = useState(1);
  const [hasil, setHasil] = useState({ data: { data: [], last_page: 1, total: 0 }, ringkasan: {} });
  const [loading, setLoading] = useState(true);
  const [sibuk, setSibuk] = useState(null);
  const [info, setInfo] = useState(null);

  const muat = useCallback(() => {
    setLoading(true);
    api
      .get('api/pengaturan/pengiriman', { params: { status, kanal, page: halaman } })
      .then((res) => setHasil(res.data))
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [status, kanal, halaman]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muat();
  }, [muat]);

  const pilih = (set, nilai) => {
    set(nilai);
    setHalaman(1);
  };
  const r = hasil.ringkasan || {};

  const ulang = (id) => {
    setSibuk(id);
    api
      .post(`api/pengaturan/pengiriman/${id}/ulang`)
      .then((res) => setInfo({ warna: 'success', teks: res.data.message }))
      .catch((err) => setInfo({ warna: 'danger', teks: err?.response?.data?.message || 'Gagal mengirim ulang.' }))
      .finally(() => {
        setSibuk(null);
        muat();
      });
  };

  const ulangSemuaGagal = () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Kirim ulang semua pengiriman yang gagal (maksimal 100 sekali jalan)?')) return;
    setSibuk('semua');
    api
      .post('api/pengaturan/pengiriman/ulang-gagal', { kanal })
      .then((res) => {
        const sisa = Object.entries(res.data.tidak_bisa || {}).map(([alasan, jml]) => `${jml}x: ${alasan}`);
        setInfo({ warna: sisa.length ? 'warning' : 'success', teks: `${res.data.diulang} dikirim ulang.${sisa.length ? ` Tidak bisa: ${sisa.join('; ')}` : ''}` });
      })
      .catch((err) => setInfo({ warna: 'danger', teks: err?.response?.data?.message || 'Gagal mengirim ulang.' }))
      .finally(() => {
        setSibuk(null);
        muat();
      });
  };

  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-2">
        <ButtonGroup size="sm">
          {KANAL.map(([k, l]) => (
            <Button key={l} color="primary" outline={kanal !== k} onClick={() => pilih(setKanal, k)}>
              {l}
            </Button>
          ))}
        </ButtonGroup>
        <ButtonGroup size="sm">
          {STATUS.map(([k, l]) => (
            <Button key={l} color="primary" outline={status !== k} onClick={() => pilih(setStatus, k)}>
              {l}
            </Button>
          ))}
        </ButtonGroup>
        <Button size="sm" color="secondary" onClick={muat}>
          Muat ulang
        </Button>
        <Button size="sm" color="danger" outline disabled={sibuk === 'semua' || !r.gagal} onClick={ulangSemuaGagal}>
          Kirim ulang semua yang gagal
        </Button>
      </div>
      {info && (
        <Alert color={info.warna} toggle={() => setInfo(null)}>
          {info.teks}
        </Alert>
      )}
      <div className="small text-muted mb-2">
        Belum terkirim {r.belum ?? 0} | Terkirim {r.terkirim ?? 0} | Gagal {r.gagal ?? 0} | Dilewati {r.dilewati ?? 0}
      </div>
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <Table responsive size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Dibuat</th>
              <th>Kanal</th>
              <th>Penerima</th>
              <th>Notifikasi</th>
              <th>Status</th>
              <th>Alasan</th>
              <th>Terkirim</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {hasil.data.data.map((d) => (
              <tr key={d.id}>
                <td className="text-nowrap">{dayjs(d.created_at).format('DD/MM/YYYY HH:mm')}</td>
                <td>{d.channel}</td>
                <td>
                  {d.penerima}
                  {d.target ? <div className="text-muted small">{d.target}</div> : null}
                </td>
                <td style={{ minWidth: 260 }}>
                  <strong>{d.judul}</strong>
                  <div className="text-muted small">{d.event}</div>
                </td>
                <td>
                  <Badge color={WARNA[d.status]}>{LABEL[d.status]}</Badge>
                </td>
                <td style={{ minWidth: 220 }} className={d.status === 'failed' ? 'text-danger small' : 'text-muted small'}>
                  {d.error || '-'}
                </td>
                <td className="text-nowrap">{d.sent_at ? dayjs(d.sent_at).format('DD/MM/YYYY HH:mm') : '-'}</td>
                <td className="text-end">
                  {(d.status === 'failed' || d.status === 'skipped') && d.channel !== 'fcm' && (
                    <Button size="sm" color="primary" outline disabled={sibuk === d.id} onClick={() => ulang(d.id)}>
                      {sibuk === d.id ? '...' : 'Kirim ulang'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!hasil.data.data.length && (
              <tr>
                <td colSpan={8} className="text-center text-muted">
                  Tidak ada data.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
      <div className="d-flex align-items-center gap-2">
        <Button size="sm" disabled={halaman <= 1} onClick={() => setHalaman((h) => h - 1)}>
          Sebelumnya
        </Button>
        <span className="small">
          Halaman {hasil.data.current_page || 1} dari {hasil.data.last_page} ({hasil.data.total} data)
        </span>
        <Button size="sm" disabled={halaman >= hasil.data.last_page} onClick={() => setHalaman((h) => h + 1)}>
          Berikutnya
        </Button>
      </div>
    </>
  );
};

export default Pengiriman;
