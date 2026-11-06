import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardText, CardTitle, Input } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';
import useAxios from '../../hooks/useAxios';

// Atur tampilan Dashboard TV: urutan bagian (naik/turun) dan tampil/sembunyi. Hanya untuk role PICDashboard.
const PengaturanDashboardTv = () => {
  const api = useAxios();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('dapi/hr/dashboard-tv/slides')
      .then((res) => {
        setSlides(Array.isArray(res.data.data) ? res.data.data : []);
        setDirty(false);
      })
      .catch(() => setMessage({ color: 'danger', text: 'Gagal memuat pengaturan.' }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const change = (next) => {
    setSlides(next);
    setDirty(true);
    setMessage(null);
  };

  const move = (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[index], next[j]] = [next[j], next[index]];
    change(next);
  };

  const setDurasi = (index, value) => change(slides.map((s, i) => (i === index ? { ...s, durasi: value === '' ? null : Number(value) } : s)));

  const toggle = (index) => change(slides.map((s, i) => (i === index ? { ...s, tampil: !s.tampil } : s)));

  const save = () => {
    setSaving(true);
    setMessage(null);
    api
      .put('dapi/hr/dashboard-tv/slides', { slides: slides.map((s) => ({ key: s.key, tampil: s.tampil, durasi: s.durasi || null })) })
      .then((res) => {
        if (res.data && res.data.success === false) {
          setMessage({ color: 'danger', text: res.data.message || 'Gagal menyimpan.' });
          return;
        }
        setSlides(Array.isArray(res.data.data) ? res.data.data : slides);
        setDirty(false);
        setMessage({ color: 'success', text: 'Tersimpan. Dashboard TV memakai pengaturan ini pada putaran berikutnya.' });
      })
      .catch(() => setMessage({ color: 'danger', text: 'Gagal menyimpan pengaturan.' }))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <BreadCrumbs />
      <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <CardTitle tag="h4" className="mb-1">
                Atur Dashboard TV
              </CardTitle>
              <CardText className="text-muted mb-0">
                Atur urutan bagian yang diputar di Dashboard TV, dan tampilkan atau sembunyikan tiap bagian.
              </CardText>
            </div>
            <div className="d-flex gap-2">
              <Button color="secondary" outline onClick={load} disabled={loading || saving || !dirty}>
                Batalkan
              </Button>
              <Button color="primary" onClick={save} disabled={loading || saving || !dirty}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>

          {message ? <Alert color={message.color}>{message.text}</Alert> : null}

          {loading ? <p className="text-muted">Memuat...</p> : null}

          <div className="d-grid gap-2">
            {slides.map((s, i) => (
              <div
                key={s.key}
                className="d-flex align-items-center gap-3 border rounded p-2 px-3"
                style={{ opacity: s.tampil ? 1 : 0.55, background: s.tampil ? undefined : '#f8f9fa' }}
              >
                <span className="fw-bold text-muted" style={{ width: '1.5rem' }}>
                  {i + 1}
                </span>
                <div className="flex-grow-1">
                  <div className="fw-semibold">{s.label}</div>
                  {s.key === 'struktur' ? <small className="text-muted">Termasuk halaman per divisi.</small> : null}
                </div>
                <div className="d-flex align-items-center gap-1" title="Lama tayang (detik). Kosong = otomatis.">
                  <Input
                    type="number"
                    bsSize="sm"
                    min="5"
                    max="600"
                    value={s.durasi || ''}
                    placeholder={s.durasi_bawaan ? String(s.durasi_bawaan) : 'otomatis'}
                    onChange={(e) => setDurasi(i, e.target.value)}
                    style={{ width: '6rem' }}
                    aria-label={`Lama tayang ${s.label} (detik)`}
                  />
                  <small className="text-muted">detik</small>
                </div>
                <Badge color={s.tampil ? 'success' : 'secondary'}>{s.tampil ? 'Tampil' : 'Disembunyikan'}</Badge>
                <div className="d-flex gap-1">
                  <Button size="sm" color="light" onClick={() => move(i, -1)} disabled={i === 0} title="Naik" aria-label="Naik">
                    &#9650;
                  </Button>
                  <Button size="sm" color="light" onClick={() => move(i, 1)} disabled={i === slides.length - 1} title="Turun" aria-label="Turun">
                    &#9660;
                  </Button>
                  <Button size="sm" color={s.tampil ? 'outline-danger' : 'outline-success'} onClick={() => toggle(i)} style={{ minWidth: '6.5rem' }}>
                    {s.tampil ? 'Sembunyikan' : 'Tampilkan'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <small className="text-muted d-block mt-3">
            Lama tayang (detik) berlaku untuk bagian yang muat satu layar. Daftar panjang (hadir, tidak hadir, rapat banyak, struktur) tetap mengikuti lama gulir.
            Kosong berarti otomatis. Bagian tanpa data (misalnya tidak ada rapat hari ini) otomatis dilewati walaupun berstatus tampil.
          </small>
        </CardBody>
      </Card>
    </>
  );
};

export default PengaturanDashboardTv;
