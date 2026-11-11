import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Spinner } from 'reactstrap';
import useAxios from '../../hooks/useAxios';

const Whatsapp = () => {
  const api = useAxios();
  const [status, setStatus] = useState(null);
  const [simpan, setSimpan] = useState(false);
  const [galat, setGalat] = useState(null);

  const muat = useCallback(() => {
    api
      .get('api/pengaturan/wa')
      .then((res) => setStatus(res.data.data))
      .catch((err) => setGalat(err?.response?.data?.message || 'Gagal memuat status.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muat();
    const t = setInterval(muat, 30000);
    return () => clearInterval(t);
  }, [muat]);

  const ubah = () => {
    const lanjutkan = status.dijeda;
    // eslint-disable-next-line no-alert
    if (!window.confirm(lanjutkan ? 'Lanjutkan pengiriman WhatsApp notifikasi?' : 'Jeda pengiriman WhatsApp notifikasi? Antrean pesan akan tertahan.')) return;
    setSimpan(true);
    api
      .post('api/pengaturan/wa', { aktif: lanjutkan })
      .then((res) => setStatus(res.data.data))
      .catch((err) => setGalat(err?.response?.data?.message || 'Gagal menyimpan.'))
      .finally(() => setSimpan(false));
  };

  if (!status) return galat ? <Alert color="danger">{galat}</Alert> : <Spinner size="sm" />;

  const g = status.gateway;
  const sesi = g.terhubung === null ? 'tidak diketahui' : g.terhubung ? 'tersambung' : 'terputus';

  return (
    <>
      {galat && (
        <Alert color="danger" toggle={() => setGalat(null)}>
          {galat}
        </Alert>
      )}
      <div className="d-flex align-items-center gap-3 mb-2">
        <h6 className="mb-0">Status WhatsApp</h6>
        <Badge color={status.aktif ? 'success' : 'danger'}>{status.aktif ? 'AKTIF' : 'TIDAK AKTIF'}</Badge>
      </div>
      <p className="mb-1">
        Gateway (app.pema.co.id/api/health): <strong>{g.hidup ? 'hidup' : 'mati'}</strong>
        {g.http ? ` (HTTP ${g.http})` : ''}, sesi WhatsApp: <strong>{sesi}</strong>.
      </p>
      {g.pesan && <div className="text-danger small mb-1">{g.pesan}</div>}
      {g.respons && <pre className="small bg-light p-2 mb-2" style={{ whiteSpace: 'pre-wrap' }}>{g.respons}</pre>}
      <p className="mb-2">
        Pesan menunggu dikirim: <strong>{status.antre}</strong> (dikirim 1 pesan per menit).
      </p>
      <div className="d-flex align-items-center gap-2">
        <Button color={status.dijeda ? 'success' : 'warning'} size="sm" disabled={simpan} onClick={ubah}>
          {status.dijeda ? 'Lanjutkan pengiriman' : 'Jeda pengiriman'}
        </Button>
        {status.dijeda && <Badge color="warning">Dijeda Super Admin</Badge>}
        <Button color="secondary" size="sm" outline onClick={muat}>
          Cek ulang
        </Button>
      </div>
      {!status.notif_dasar_aktif && (
        <Alert color="warning" className="mt-3">
          Sistem notifikasi baru belum aktif di server, jadi belum ada pesan yang masuk antrean walau gateway hidup.
        </Alert>
      )}
      <p className="text-muted small mt-3 mb-0">
        Status aktif ditentukan oleh gateway. Tombol jeda hanya menahan pengiriman sementara. Saat gateway mati, pesan tetap mengantre dan IT mendapat email.
      </p>
    </>
  );
};

export default Whatsapp;
