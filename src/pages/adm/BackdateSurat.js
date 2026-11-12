import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Badge, Button, Card, CardBody, Input } from 'reactstrap';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';

const WARNA = { menunggu: 'warning', selesai: 'success', ditolak: 'danger' };
const LABEL = { menunggu: 'Belum mendapatkan nomor', selesai: 'Selesai', ditolak: 'Ditolak' };

// Panel PICAdm untuk satu permintaan: pilih nomor dari saran sistem lalu setujui, atau tolak
const PanelPilih = ({ item, onDone }) => {
  const api = useAxios();
  const [tanggal, setTanggal] = useState(item.tanggal);
  const [saran, setSaran] = useState([]);
  const [nomor, setNomor] = useState('');
  const [galat, setGalat] = useState('');
  const [alasan, setAlasan] = useState('');
  const [proses, setProses] = useState(false);

  useEffect(() => {
    setNomor('');
    setGalat('');
    setSaran([]);
    api
      .get(`dapi/adm/backdate/${item.id}/saran`, { params: { tanggal } })
      .then((res) => {
        setSaran(res.data.data);
        if (res.data.data.length > 0) setNomor(res.data.data[0].nomor);
      })
      .catch((err) => setGalat(err?.response?.data?.message || err.message));
  }, [item.id, tanggal]); // eslint-disable-line react-hooks/exhaustive-deps

  const kirim = (url, body, pesan) => {
    setProses(true);
    api
      .post(url, body)
      .then((res) => {
        alert('success', res.data?.message || pesan);
        onDone();
      })
      .catch((err) => alert('error', err?.response?.data?.message || err.message))
      .finally(() => setProses(false));
  };

  return (
    <div className="border rounded p-3 mt-2 bg-light">
      <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
        <span className="fw-semibold">Tanggal surat</span>
        <Input
          type="date"
          bsSize="sm"
          value={tanggal}
          min={`${new Date().getFullYear()}-01-01`}
          onChange={(e) => e.target.value && setTanggal(e.target.value)}
          style={{ width: '11rem', maxWidth: '100%' }}
        />
      </div>
      {galat ? <Alert color="danger">{galat}</Alert> : null}
      {saran.length > 0 ? <div className="fw-semibold mb-1">Saran nomor dari sistem</div> : null}
      {saran.map((s) => (
        <label key={s.nomor} htmlFor={`nomor-${item.id}-${s.nomor}`} className="d-flex align-items-center flex-wrap gap-2 mb-1" style={{ cursor: 'pointer' }}>
          <input id={`nomor-${item.id}-${s.nomor}`} type="radio" name={`nomor-${item.id}`} checked={nomor === s.nomor} onChange={() => setNomor(s.nomor)} />
          <span className="fw-bold">{s.nomor_surat}</span>
          <Badge color={s.mode === 'kosong' ? 'success' : 'info'}>{s.mode === 'kosong' ? 'nomor kosong' : 'sisipan'}</Badge>
          <small className="text-muted">{s.keterangan}</small>
        </label>
      ))}
      <div className="d-flex gap-2 mt-3 flex-wrap align-items-stretch">
        <Button color="primary" size="sm" disabled={!nomor || proses} onClick={() => kirim(`dapi/adm/backdate/${item.id}/setujui`, { nomor, tanggal }, 'Surat dibuat.')}>
          {proses ? 'Memproses...' : 'Setujui dengan nomor ini'}
        </Button>
        <Input bsSize="sm" placeholder="Alasan jika ditolak" value={alasan} onChange={(e) => setAlasan(e.target.value)} style={{ maxWidth: '20rem', flex: '1 1 12rem' }} />
        <Button color="danger" outline size="sm" disabled={proses} onClick={() => kirim(`dapi/adm/backdate/${item.id}/tolak`, { alasan }, 'Permintaan ditolak.')}>
          Tolak
        </Button>
      </div>
    </div>
  );
};
PanelPilih.propTypes = {
  item: PropTypes.shape({ id: PropTypes.number, tanggal: PropTypes.string }).isRequired,
  onDone: PropTypes.func.isRequired,
};

// Daftar permintaan surat bertanggal mundur. PICAdm memproses; AdminAdm hanya melihat statusnya.
const BackdateSurat = ({ pic, refresh, hideDone, hanyaTtdManual }) => {
  const api = useAxios();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buka, setBuka] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('dapi/adm/backdate/daftar')
      .then((res) => setItems(res.data.data))
      .catch((err) => alert('error', err?.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // tautan dari notifikasi (?backdate=<id>): PICAdm langsung melihat panel "Pilih nomor" permintaan itu, sekali saja
  const backdateDariLink = new URLSearchParams(location.search).get('backdate');
  const sudahDibuka = useRef(false);
  useEffect(() => {
    if (!pic || !backdateDariLink || sudahDibuka.current || !items.length) return;
    const it = items.find((i) => String(i.id) === backdateDariLink && i.status === 'menunggu');
    if (!it) return;
    sudahDibuka.current = true;
    setBuka(it.id);
  }, [pic, backdateDariLink, items]);

  let tampil = hideDone ? items.filter((it) => it.status !== 'selesai') : items;
  // dipakai di sub-tab TTD Manual: hanya permintaan backdate yang sekaligus TTD manual, disembunyikan bila tidak ada
  if (hanyaTtdManual) tampil = tampil.filter((it) => it.ttd_basah);
  if (hanyaTtdManual && !loading && tampil.length === 0) return null;

  const selesai = () => {
    setBuka(null);
    load();
    if (refresh) refresh();
  };

  return (
    <Card>
      <CardBody>
        <p className="text-muted">
          {pic
            ? 'Permintaan surat bertanggal mundur dari admin. Pilih nomor yang cocok dari saran sistem; nomor hari ini tidak terpakai.'
            : 'Surat bertanggal mundur yang Anda ajukan dan belum mendapatkan nomor. Jika surat sudah mendapatkan nomor backdate, surat akan pindah ke daftar surat yang belum di-approve dan masuk alur paraf. Permintaan yang ditolak tetap tampil di sini beserta alasannya.'}
        </p>
        {loading ? <p className="text-muted">Memuat...</p> : null}
        {!loading && tampil.length === 0 ? <p className="text-muted">Belum ada permintaan.</p> : null}
        {tampil.map((it) => (
          <div key={it.id} className="border rounded p-3 mb-2">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div style={{ minWidth: 0, flex: '1 1 16rem', overflowWrap: 'anywhere' }}>
                <div className="fw-semibold">
                  {it.perihal} {it.ttd_basah ? <Badge color="info">TTD manual</Badge> : null}
                </div>
                <small className="text-muted">
                  Kepada: {it.kepada} · Pemohon: {it.pemohon} · Tanggal diminta: {dayjs(it.tanggal).format('DD/MM/YYYY')} · Diajukan{' '}
                  {dayjs(it.created_at).format('DD/MM/YYYY HH:mm')}
                </small>
                {it.nomor_surat ? <div className="fw-bold">Nomor: {it.nomor_surat}</div> : null}
                {it.alasan_tolak ? <div className="text-danger">Alasan: {it.alasan_tolak}</div> : null}
              </div>
              <div className="d-flex align-items-center flex-wrap gap-2">
                <Badge color={WARNA[it.status]}>{LABEL[it.status]}</Badge>
                {pic && it.status === 'menunggu' ? (
                  <Button size="sm" color="primary" outline onClick={() => setBuka(buka === it.id ? null : it.id)}>
                    {buka === it.id ? 'Tutup' : 'Pilih nomor'}
                  </Button>
                ) : null}
              </div>
            </div>
            {pic && buka === it.id ? <PanelPilih item={it} onDone={selesai} /> : null}
          </div>
        ))}
      </CardBody>
    </Card>
  );
};
BackdateSurat.propTypes = { pic: PropTypes.bool, refresh: PropTypes.func, hideDone: PropTypes.bool, hanyaTtdManual: PropTypes.bool };
BackdateSurat.defaultProps = { pic: false, refresh: undefined, hideDone: false, hanyaTtdManual: false };

export default BackdateSurat;
