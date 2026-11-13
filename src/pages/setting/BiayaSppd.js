import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Input, InputGroup, InputGroupText, Label, Row, Spinner, Table } from 'reactstrap';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import useAxios from '../../hooks/useAxios';

const KOLOM = [
  ['tiket', 'Tiket'],
  ['um', 'Uang makan'],
  ['us', 'Uang saku'],
  ['tr', 'Transport lokal'],
  ['hotel', 'Hotel / malam'],
];

const rupiah = (v) => Number(v || 0).toLocaleString('id-ID');

// Isian rupiah: tampil 1.500.000, nilai yang disimpan tetap bilangan bulat biasa
const InputRupiah = ({ value, onChange }) => (
  <InputGroup size="sm">
    <InputGroupText>Rp</InputGroupText>
    <Input
      inputMode="numeric"
      className="text-end"
      value={value === '' || value === null || value === undefined ? '' : rupiah(value)}
      onChange={(e) => {
        const angka = e.target.value.replace(/\D/g, '').slice(0, 10);
        onChange(angka === '' ? 0 : Number(angka));
      }}
    />
  </InputGroup>
);

InputRupiah.propTypes = { value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), onChange: PropTypes.func.isRequired };
InputRupiah.defaultProps = { value: 0 };

// Isian persen: tampil 35 %, nilai yang disimpan pecahan (0,35)
const InputPersen = ({ value, onChange }) => (
  <InputGroup size="sm">
    <Input
      type="number"
      min={0}
      max={500}
      step={1}
      className="text-end"
      value={Math.round(Number(value || 0) * 100)}
      onChange={(e) => onChange(Math.min(500, Math.max(0, Number(e.target.value) || 0)) / 100)}
    />
    <InputGroupText>%</InputGroupText>
  </InputGroup>
);

// Setting > Biaya & Ketetapan SPPD: tarif SPPD per ketetapan (dasar hukum). SPPD memakai ketetapan yang aktif saat dibuat.
InputPersen.propTypes = { value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), onChange: PropTypes.func.isRequired };
InputPersen.defaultProps = { value: 0 };

const BiayaSppd = () => {
  const api = useAxios();
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [baru, setBaru] = useState(null); // form ketetapan baru
  const [detail, setDetail] = useState(null); // ketetapan yang sedang dibuka
  const [form, setForm] = useState(null);
  const [sibuk, setSibuk] = useState(false);

  const pesan = (err, cadangan) => err?.response?.data?.message || cadangan;

  const muat = useCallback(() => {
    setLoading(true);
    api
      .get('api/pengaturan/biaya')
      .then((res) => setDaftar(res.data.data || []))
      .catch((err) => setInfo({ warna: 'danger', teks: pesan(err, 'Gagal memuat ketetapan.') }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muat();
  }, [muat]);

  const buka = (id) => {
    setInfo(null);
    api
      .get(`api/pengaturan/biaya/${id}`)
      .then((res) => {
        const d = res.data.data;
        setDetail(d);
        setForm({
          dasar_ketetapan: d.ketetapan.dasar_ketetapan,
          berlaku_mulai: d.ketetapan.berlaku_mulai,
          biaya: d.biaya.map((b) => ({ ...b })),
          waktu: d.waktu.map((w) => ({ ...w })),
        });
      })
      .catch((err) => setInfo({ warna: 'danger', teks: pesan(err, 'Gagal membuka ketetapan.') }));
  };

  const tutup = () => {
    setDetail(null);
    setForm(null);
  };

  const buat = () => {
    setSibuk(true);
    api
      .post('api/pengaturan/biaya', baru)
      .then((res) => {
        setBaru(null);
        setInfo({ warna: 'success', teks: res.data.message });
        muat();
        buka(res.data.data.id);
      })
      .catch((err) => setInfo({ warna: 'danger', teks: pesan(err, 'Gagal membuat ketetapan.') }))
      .finally(() => setSibuk(false));
  };

  const simpan = (konfirmasi = false) => {
    setSibuk(true);
    api
      .put(`api/pengaturan/biaya/${detail.ketetapan.id}`, { ...form, konfirmasi })
      .then((res) => {
        setInfo({ warna: 'success', teks: res.data.message });
        muat();
        buka(detail.ketetapan.id);
      })
      .catch((err) => {
        if (err?.response?.status === 409) {
          // eslint-disable-next-line no-alert
          if (window.confirm(`${err.response.data.message}\n\nTetap simpan?`)) {
            simpan(true);
          }
          return;
        }
        setInfo({ warna: 'danger', teks: pesan(err, 'Gagal menyimpan.') });
      })
      .finally(() => setSibuk(false));
  };

  const aktifkan = (k) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Aktifkan ketetapan "${k.dasar_ketetapan}"? SPPD baru akan memakai tarifnya. SPPD yang sudah dibuat tidak berubah.`)) return;
    api
      .post(`api/pengaturan/biaya/${k.id}/aktifkan`)
      .then((res) => {
        setInfo({ warna: 'success', teks: res.data.message });
        muat();
        if (detail?.ketetapan.id === k.id) buka(k.id);
      })
      .catch((err) => setInfo({ warna: 'danger', teks: pesan(err, 'Gagal mengaktifkan.') }));
  };

  const hapus = (k) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Hapus ketetapan "${k.dasar_ketetapan}" beserta tarifnya?`)) return;
    api
      .delete(`api/pengaturan/biaya/${k.id}`)
      .then((res) => {
        setInfo({ warna: 'success', teks: res.data.message });
        tutup();
        muat();
      })
      .catch((err) => setInfo({ warna: 'danger', teks: pesan(err, 'Gagal menghapus.') }));
  };

  const ubahBiaya = (id, kol, nilai) => setForm((f) => ({ ...f, biaya: f.biaya.map((b) => (b.id === id ? { ...b, [kol]: nilai } : b)) }));
  const ubahWaktu = (id, kol, nilai) => setForm((f) => ({ ...f, waktu: f.waktu.map((w) => (w.id === id ? { ...w, [kol]: nilai } : w)) }));

  if (loading) return <Spinner size="sm" />;

  // ---------- detail ----------
  if (detail && form) {
    const k = detail.ketetapan;
    const nmKategori = (id) => detail.kategori.find((c) => c.id === id)?.nama || id;

    return (
      <div>
        {info && <Alert color={info.warna}>{info.teks}</Alert>}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <Button size="sm" outline color="secondary" onClick={tutup}>&larr; Kembali ke daftar</Button>
          <div className="d-flex gap-2">
            {!k.aktif && <Button size="sm" color="success" onClick={() => aktifkan(k)}>Aktifkan</Button>}
            {!k.aktif && k.jumlah_sppd === 0 && <Button size="sm" outline color="danger" onClick={() => hapus(k)}>Hapus</Button>}
            <Button size="sm" color="primary" disabled={sibuk} onClick={() => simpan(false)}>{sibuk ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </div>
        {k.jumlah_sppd > 0 && (
          <Alert color="warning">
            Ketetapan ini sudah dipakai <b>{k.jumlah_sppd}</b> SPPD. Mengubah tarif di bawah ikut mengubah total biaya SPPD tersebut.
            Untuk tarif baru, buat ketetapan baru dari daftar lalu aktifkan.
          </Alert>
        )}
        <Row className="mb-3">
          <Col md={7}>
            <Label>Dasar ketetapan</Label>
            <Input value={form.dasar_ketetapan} onChange={(e) => setForm({ ...form, dasar_ketetapan: e.target.value })} />
          </Col>
          <Col md={3}>
            <Label>Berlaku mulai</Label>
            <Input type="date" value={form.berlaku_mulai || ''} onChange={(e) => setForm({ ...form, berlaku_mulai: e.target.value })} />
          </Col>
          <Col md={2} className="d-flex align-items-end">
            <Badge color={k.aktif ? 'success' : 'secondary'}>{k.aktif ? 'Aktif' : 'Tidak aktif'}</Badge>
          </Col>
        </Row>

        <h6>Tarif per golongan dan kategori</h6>
        <div className="table-responsive">
          <Table size="sm" bordered className="align-middle">
            <thead>
              <tr>
                <th>Golongan</th>
                <th>Kategori</th>
                {KOLOM.map(([kol, label]) => <th key={kol}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {detail.golongan.map((g) => {
                const baris = form.biaya.filter((b) => b.id_golongan === g.id);
                return baris.map((b, i) => (
                  <tr key={b.id}>
                    {i === 0 && (
                      <td rowSpan={baris.length}>
                        <b>{g.nama}</b>
                        <br />
                        <small className="text-muted">{g.pihak}</small>
                      </td>
                    )}
                    <td>{nmKategori(b.id_category)}</td>
                    {KOLOM.map(([kol]) => (
                      <td key={kol} style={{ minWidth: 170 }}>
                        <InputRupiah value={b[kol]} onChange={(v) => ubahBiaya(b.id, kol, v)} />
                      </td>
                    ))}
                  </tr>
                ));
              })}
              {form.biaya.length === 0 && (
                <tr><td colSpan={KOLOM.length + 2} className="text-muted">Belum ada tarif untuk ketetapan ini.</td></tr>
              )}
            </tbody>
          </Table>
        </div>

        <h6 className="mt-4">Faktor uang makan dan uang saku hari berangkat / pulang (menurut jam, dalam persen dari tarif harian)</h6>
        <Table size="sm" bordered className="align-middle" style={{ maxWidth: 520 }}>
          <thead>
            <tr><th>Jam</th><th>Hari berangkat</th><th>Hari pulang</th></tr>
          </thead>
          <tbody>
            {form.waktu.map((w) => (
              <tr key={w.id}>
                <td>{w.start} - {w.end}</td>
                <td><InputPersen value={w.rate_pergi} onChange={(v) => ubahWaktu(w.id, 'rate_pergi', v)} /></td>
                <td><InputPersen value={w.rate_pulang} onChange={(v) => ubahWaktu(w.id, 'rate_pulang', v)} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }

  // ---------- daftar ----------
  return (
    <div>
      {info && <Alert color={info.warna}>{info.teks}</Alert>}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="text-muted">
          SPPD memakai ketetapan yang aktif saat dibuat. Untuk tarif baru, buat ketetapan baru (tarif disalin dari yang lama), sesuaikan, lalu aktifkan.
        </div>
        <Button size="sm" color="primary" onClick={() => setBaru({ dasar_ketetapan: '', berlaku_mulai: dayjs().format('YYYY-MM-DD'), salin_dari: daftar.find((d) => d.aktif)?.id || daftar[0]?.id || '' })}>
          + Ketetapan baru
        </Button>
      </div>

      {baru && (
        <div className="border rounded p-3 mb-3">
          <Row>
            <Col md={5}>
              <Label>Dasar ketetapan</Label>
              <Input placeholder="Nomor / dasar hukum" value={baru.dasar_ketetapan} onChange={(e) => setBaru({ ...baru, dasar_ketetapan: e.target.value })} />
            </Col>
            <Col md={3}>
              <Label>Berlaku mulai</Label>
              <Input type="date" value={baru.berlaku_mulai} onChange={(e) => setBaru({ ...baru, berlaku_mulai: e.target.value })} />
            </Col>
            <Col md={4}>
              <Label>Salin tarif dari</Label>
              <Input type="select" value={baru.salin_dari} onChange={(e) => setBaru({ ...baru, salin_dari: e.target.value })}>
                {daftar.map((d) => <option key={d.id} value={d.id}>{d.dasar_ketetapan}{d.aktif ? ' (aktif)' : ''}</option>)}
              </Input>
            </Col>
          </Row>
          <div className="d-flex gap-2 mt-3">
            <Button size="sm" color="primary" disabled={sibuk || !baru.dasar_ketetapan.trim() || !baru.salin_dari} onClick={buat}>Buat</Button>
            <Button size="sm" outline color="secondary" onClick={() => setBaru(null)}>Batal</Button>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <Table hover className="align-middle">
          <thead>
            <tr><th>Dasar ketetapan</th><th>Berlaku mulai</th><th>Status</th><th className="text-end">SPPD memakai</th><th className="text-end">Baris tarif</th><th /></tr>
          </thead>
          <tbody>
            {daftar.map((k) => (
              <tr key={k.id}>
                <td>{k.dasar_ketetapan}</td>
                <td>{k.berlaku_mulai ? dayjs(k.berlaku_mulai).format('DD MMM YYYY') : '-'}</td>
                <td><Badge color={k.aktif ? 'success' : 'secondary'}>{k.aktif ? 'Aktif' : 'Tidak aktif'}</Badge></td>
                <td className="text-end">{rupiah(k.jumlah_sppd)}</td>
                <td className="text-end">{k.jumlah_biaya}</td>
                <td className="text-end">
                  <Button size="sm" outline color="primary" className="me-1" onClick={() => buka(k.id)}>Buka</Button>
                  {!k.aktif && <Button size="sm" outline color="success" onClick={() => aktifkan(k)}>Aktifkan</Button>}
                </td>
              </tr>
            ))}
            {daftar.length === 0 && <tr><td colSpan={6} className="text-muted">Belum ada ketetapan.</td></tr>}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default BiayaSppd;
