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
  }, [muat]);

  const ubah = () => {
    const tujuan = !status.aktif;
    // eslint-disable-next-line no-alert
    if (!window.confirm(tujuan ? 'Aktifkan pengiriman WhatsApp notifikasi?' : 'Matikan pengiriman WhatsApp notifikasi? Antrean pesan akan tertahan.')) return;
    setSimpan(true);
    api
      .post('api/pengaturan/wa', { aktif: tujuan })
      .then((res) => setStatus(res.data.data))
      .catch((err) => setGalat(err?.response?.data?.message || 'Gagal menyimpan.'))
      .finally(() => setSimpan(false));
  };

  if (!status) return galat ? <Alert color="danger">{galat}</Alert> : <Spinner size="sm" />;

  return (
    <>
      {galat && <Alert color="danger" toggle={() => setGalat(null)}>{galat}</Alert>}
      <div className="d-flex align-items-center gap-3 mb-3">
        <h6 className="mb-0">Pengiriman WhatsApp notifikasi</h6>
        <Badge color={status.aktif ? 'success' : 'secondary'}>{status.aktif ? 'AKTIF' : 'NONAKTIF'}</Badge>
        <Button color={status.aktif ? 'danger' : 'success'} size="sm" disabled={simpan} onClick={ubah}>
          {status.aktif ? 'Matikan' : 'Aktifkan'}
        </Button>
      </div>
      <p className="mb-1">
        Pesan menunggu dikirim: <strong>{status.antre}</strong> (dikirim 1 pesan per menit).
      </p>
      {!status.notif_dasar_aktif && (
        <Alert color="warning" className="mt-3">
          Sistem notifikasi baru (NOTIF_BARU_AKTIF) belum aktif di server, jadi belum ada pesan yang masuk antrean walau WhatsApp aktif.
        </Alert>
      )}
      <p className="text-muted small mt-3 mb-0">
        Saklar ini mengalahkan NOTIF_WA_AKTIF di .env. Saat nonaktif, notifikasi baru dicatat sebagai &quot;dilewati&quot; dan antrean tidak dikirim sampai diaktifkan lagi.
      </p>
    </>
  );
};

export default Whatsapp;
