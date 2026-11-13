import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, CardBody, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Progress } from 'reactstrap';
import { confirmAlert } from 'react-confirm-alert';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';
import useAxios from '../../hooks/useAxios';
import rupiah from '../../utils/rupiah';
import { alert } from '../../components/atoms/Toast';

const kosong = { id: null, renbis: '', rkap: '', tahun: new Date().getFullYear() };

const persen = (nilai, rkap) => (rkap > 0 ? (nilai / rkap) * 100 : 0);
const warna = (p) => (p >= 100 ? 'danger' : p >= 80 ? 'warning' : 'success');
const fmtPersen = (p) => `${p.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;

// Gaya halaman: kartu ringkasan, bar pemakaian, dan tabel yang berubah menjadi kartu di layar kecil
const gaya = `
.rb-judul{font-size:1.35rem;font-weight:700;margin:0}
.rb-sub{color:#6c757d;margin:.25rem 0 0;font-size:.9rem}
.rb-tahun{display:flex;gap:.5rem;overflow-x:auto;padding-bottom:.25rem;align-items:center;-webkit-overflow-scrolling:touch}
.rb-tahun .btn{white-space:nowrap;border-radius:999px}
.rb-ringkas{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:.9rem;margin:1.1rem 0}
.rb-kartu{border:1px solid rgba(128,128,128,.22);border-radius:14px;padding:.95rem 1.1rem;background:rgba(128,128,128,.04)}
.rb-kartu small{display:block;color:#6c757d;font-size:.78rem;letter-spacing:.02em;text-transform:uppercase}
.rb-kartu strong{display:block;font-size:1.25rem;margin:.2rem 0;word-break:break-word}
.rb-kartu span{font-size:.8rem;color:#6c757d}
.rb-kartu.minus strong{color:#dc3545}
.rb-tabel{width:100%;border-collapse:separate;border-spacing:0}
.rb-tabel th{font-size:.75rem;text-transform:uppercase;letter-spacing:.03em;color:#6c757d;font-weight:600;padding:.7rem .75rem;border-bottom:2px solid rgba(128,128,128,.25);white-space:nowrap}
.rb-tabel td{padding:.85rem .75rem;border-bottom:1px solid rgba(128,128,128,.18);vertical-align:middle}
.rb-tabel tfoot th{border-top:2px solid rgba(128,128,128,.25);border-bottom:0;font-size:.82rem;color:inherit}
.rb-tabel .num{text-align:right;white-space:nowrap}
.rb-nama{font-weight:600}
.rb-meta{font-size:.76rem;color:#6c757d}
.rb-bar{min-width:150px}
.rb-bar .progress{height:7px;border-radius:99px;margin-top:.3rem}
.rb-aksi{white-space:nowrap}
@media (max-width:767.98px){
  .rb-tabel,.rb-tabel tbody,.rb-tabel tr,.rb-tabel td,.rb-tabel tfoot,.rb-tabel tfoot th{display:block;width:100%}
  .rb-tabel thead{display:none}
  .rb-tabel tbody tr{border:1px solid rgba(128,128,128,.22);border-radius:14px;padding:.4rem .9rem;margin-bottom:.8rem;background:rgba(128,128,128,.03)}
  .rb-tabel td{border:0;padding:.45rem 0;display:flex;justify-content:space-between;align-items:center;gap:1rem;text-align:right}
  .rb-tabel td::before{content:attr(data-label);color:#6c757d;font-size:.75rem;text-transform:uppercase;letter-spacing:.03em;text-align:left;flex:0 0 38%}
  .rb-tabel td.rb-judulbaris{display:block;text-align:left;font-size:1rem;border-bottom:1px solid rgba(128,128,128,.18);padding-bottom:.6rem;margin-bottom:.2rem}
  .rb-tabel td.rb-judulbaris::before{display:none}
  .rb-tabel td.rb-bar-sel{display:block;text-align:left}
  .rb-tabel td.rb-bar-sel::before{display:block;margin-bottom:.15rem}
  .rb-tabel td.rb-aksi{justify-content:flex-end;padding-top:.7rem}
  .rb-tabel td.rb-aksi::before{display:none}
  .rb-tabel tfoot{border:1px solid rgba(128,128,128,.22);border-radius:14px;padding:.6rem .9rem;background:rgba(128,128,128,.05)}
  .rb-tabel tfoot tr{display:flex;flex-wrap:wrap;justify-content:space-between}
  .rb-tabel tfoot th{width:auto;border:0;padding:.2rem 0}
  .rb-atas .btn-tambah{width:100%}
}
`;

// Atur renbis (RKAP PEMA) per tahun: tambah, ubah, hapus, beserta pemakaiannya. Hanya untuk PUK divisi Keuangan (dicek di server).
const AturRenbis = () => {
  const api = useAxios();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [tahunTersedia, setTahunTersedia] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ditolak, setDitolak] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(kosong);
  const [saving, setSaving] = useState(false);
  const [tahunBaru, setTahunBaru] = useState('');
  const [jumlahTanpa, setJumlahTanpa] = useState(0);
  // 'tanpa' = tab renbis yang belum punya tahun
  const tanpaTahun = tahun === 'tanpa';

  const muat = useCallback(
    (t) => {
      setLoading(true);
      api
        .get(`dapi/renbis?tahun=${t}`)
        .then((res) => {
          setRows(res.data.data.data);
          setTahunTersedia(res.data.data.tahun_tersedia);
          setJumlahTanpa(res.data.data.jumlah_tanpa_tahun || 0);
        })
        .catch((err) => {
          if (err?.response?.status === 403) setDitolak(true);
          else alert('error', err?.response?.data?.message || 'Gagal memuat data renbis');
        })
        .finally(() => setLoading(false));
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    muat(tahun);
  }, [tahun, muat]);

  const buka = (row) => {
    // renbis baru: tahun bawaan tahun saat ini (bisa diganti); ubah: tahun renbis itu
    setForm(row ? { id: row.id, renbis: row.renbis, rkap: String(row.rkap), tahun: row.tahun || new Date().getFullYear() } : { ...kosong, tahun: new Date().getFullYear() });
    setModal(true);
  };

  const simpan = async () => {
    if (!form.renbis.trim()) {
      alert('error', 'Nama renbis wajib diisi.');
      return;
    }
    if (form.rkap === '' || Number(form.rkap) < 0) {
      alert('error', 'Nilai RKAP wajib diisi dan tidak boleh negatif.');
      return;
    }
    setSaving(true);
    try {
      const payload = { renbis: form.renbis, tahun: form.tahun, rkap: form.rkap };
      const res = form.id ? await api.post(`dapi/renbis/${form.id}/update`, payload) : await api.post('dapi/renbis', payload);
      alert('success', res.data?.message || 'Tersimpan');
      setModal(false);
      // tampilkan tahun tempat renbis disimpan
      if (form.tahun !== tahun) setTahun(form.tahun);
      else muat(tahun);
    } catch (err) {
      const pesan = err?.response?.data?.errors ? Object.values(err.response.data.errors).flat()[0] : err?.response?.data?.message || err.message;
      alert('error', pesan);
    }
    setSaving(false);
  };

  const hapus = (row) => {
    confirmAlert({
      title: 'Hapus renbis?',
      message: `"${row.renbis}" (${tanpaTahun ? 'tanpa tahun' : tahun}) akan dihapus permanen.`,
      buttons: [
        {
          label: 'Hapus',
          onClick: () => {
            api
              .post(`dapi/renbis/${row.id}/hapus`)
              .then(() => {
                alert('success', 'Renbis dihapus');
                muat(tahun);
              })
              .catch((err) => alert('error', err?.response?.data?.message || err.message));
          },
        },
        { label: 'Batal', onClick: () => {} },
      ],
    });
  };

  const tambahTahun = () => {
    const t = Number(tahunBaru);
    if (!Number.isInteger(t) || t < 2000 || t > 2100) {
      alert('error', 'Masukkan tahun yang valid (2000-2100).');
      return;
    }
    if (!tahunTersedia.includes(t)) setTahunTersedia([t, ...tahunTersedia].sort((a, b) => b - a));
    setTahun(t);
    setTahunBaru('');
  };

  // pilihan tahun di form: tahun yang sudah ada, ditambah sekitar tahun berjalan
  const sekarang = new Date().getFullYear();
  const opsiTahunForm = [...new Set([...tahunTersedia, sekarang - 1, sekarang, sekarang + 1, sekarang + 2])].sort((a, b) => b - a);

  const total = useMemo(
    () => ({
      rkap: rows.reduce((j, r) => j + Number(r.rkap || 0), 0),
      realisasi: rows.reduce((j, r) => j + Number(r.realisasi || 0), 0),
      gabungan: rows.reduce((j, r) => j + Number(r.realisasi_pengajuan || 0), 0),
    }),
    [rows],
  );
  const sisa = total.rkap - total.gabungan;

  if (ditolak) {
    return (
      <>
        <BreadCrumbs />
        <Alert color="warning">Menu ini hanya untuk PUK divisi Keuangan.</Alert>
      </>
    );
  }

  return (
    <>
      <style>{gaya}</style>
      <BreadCrumbs />
      <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>
        <CardBody className="p-3 p-md-4">
          <div className="rb-atas d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
            <div>
              <h4 className="rb-judul">Atur Renbis</h4>
              <p className="rb-sub">Kelola renbis (RKAP PEMA) per tahun anggaran dan pantau pemakaiannya. Pengajuan SPPD memilih RKAP dari daftar tahun berjalan.</p>
            </div>
            <Button color="primary" className="btn-tambah" onClick={() => buka(null)}>
              + Tambah Renbis
            </Button>
          </div>

          <div className="rb-tahun">
            {tahunTersedia.map((t) => (
              <Button key={t} size="sm" color="primary" outline={t !== tahun} onClick={() => setTahun(t)}>
                {t}
              </Button>
            ))}
            {jumlahTanpa > 0 || tanpaTahun ? (
              <Button size="sm" color="warning" outline={!tanpaTahun} onClick={() => setTahun('tanpa')}>
                Tanpa Tahun ({jumlahTanpa})
              </Button>
            ) : null}
            <div className="d-flex gap-1 ms-1 flex-shrink-0">
              <Input type="number" bsSize="sm" placeholder="Tahun baru" value={tahunBaru} onChange={(e) => setTahunBaru(e.target.value)} style={{ width: '7.5rem' }} aria-label="Tahun baru" />
              <Button size="sm" color="secondary" outline onClick={tambahTahun}>
                Buka
              </Button>
            </div>
          </div>

          {!tanpaTahun && rows.length > 0 ? (
            <div className="rb-ringkas">
              <div className="rb-kartu">
                <small>Total RKAP {tahun}</small>
                <strong>{rupiah(total.rkap)}</strong>
                <span>{rows.length} renbis</span>
              </div>
              <div className="rb-kartu">
                <small>Realisasi SPPD</small>
                <strong>{rupiah(total.realisasi)}</strong>
                <span>{fmtPersen(persen(total.realisasi, total.rkap))} dari RKAP</span>
              </div>
              <div className="rb-kartu">
                <small>Realisasi + Pengajuan Approve</small>
                <strong>{rupiah(total.gabungan)}</strong>
                <span>{fmtPersen(persen(total.gabungan, total.rkap))} dari RKAP</span>
              </div>
              <div className={`rb-kartu${sisa < 0 ? ' minus' : ''}`}>
                <small>Sisa Anggaran</small>
                <strong>{rupiah(sisa)}</strong>
                <span>{sisa < 0 ? 'Melebihi RKAP' : 'Setelah realisasi dan pengajuan approve'}</span>
              </div>
            </div>
          ) : null}

          {tanpaTahun && rows.length > 0 ? (
            <Alert color="warning" className="mt-3">
              Renbis di bawah ini belum punya tahun anggaran sehingga tidak muncul di pilihan RKAP pengajuan SPPD. Klik <strong>Ubah</strong> lalu pilih tahunnya.
            </Alert>
          ) : null}

          {loading ? <p className="text-muted mt-3">Memuat...</p> : null}

          {!loading && rows.length === 0 ? (
            <Alert color="info" className="mt-3">
              {tanpaTahun ? 'Semua renbis sudah punya tahun.' : `Belum ada renbis untuk tahun ${tahun}. Klik "Tambah Renbis" untuk mengisi.`}
            </Alert>
          ) : null}

          {rows.length > 0 ? (
            <table className="rb-tabel">
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}>No</th>
                  <th>Renbis</th>
                  <th className="num">RKAP</th>
                  <th className="num">Realisasi SPPD</th>
                  <th>Realisasi + Pengajuan Approve</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const pReal = persen(r.realisasi, r.rkap);
                  const pGab = persen(r.realisasi_pengajuan, r.rkap);

                  return (
                    <tr key={r.id}>
                      <td data-label="No" className="d-none d-md-table-cell">
                        {i + 1}
                      </td>
                      <td className="rb-judulbaris" data-label="Renbis">
                        <div className="rb-nama">{r.renbis}</div>
                        <div className="rb-meta">{r.dipakai > 0 ? `${r.dipakai} tujuan SPPD` : 'Belum dipakai'}</div>
                      </td>
                      <td className="num" data-label="RKAP">
                        {rupiah(r.rkap)}
                      </td>
                      <td className="num" data-label="Realisasi SPPD">
                        <div>{rupiah(r.realisasi)}</div>
                        <div className="rb-meta">{fmtPersen(pReal)}</div>
                      </td>
                      <td className="rb-bar rb-bar-sel" data-label="Realisasi + Pengajuan Approve">
                        <div className="d-flex justify-content-between gap-2">
                          <span className="text-nowrap">{rupiah(r.realisasi_pengajuan)}</span>
                          <span className="rb-meta">{fmtPersen(pGab)}</span>
                        </div>
                        <Progress value={Math.min(pGab, 100)} color={warna(pGab)} />
                      </td>
                      <td className="rb-aksi">
                        <Button className="me-2" size="sm" outline color="primary" onClick={() => buka(r)}>
                          Ubah
                        </Button>
                        <Button size="sm" outline color="danger" onClick={() => hapus(r)}>
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {tanpaTahun ? null : (
                <tfoot>
                  <tr>
                    <th colSpan={2} className="text-md-end">
                      Total {tahun}
                    </th>
                    <th className="num">{rupiah(total.rkap)}</th>
                    <th className="num">{rupiah(total.realisasi)}</th>
                    <th className="text-nowrap">{rupiah(total.gabungan)}</th>
                    <th />
                  </tr>
                </tfoot>
              )}
            </table>
          ) : null}
          {rows.length > 0 ? (
            <p className="rb-meta mt-3 mb-0">
              Realisasi = biaya riil yang sudah dicatat. Pengajuan approve = perkiraan biaya SPPD yang sudah disetujui dan belum direalisasi (SPPD void dan SPPD yang sudah
              punya realisasi tidak dihitung dua kali).
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Modal isOpen={modal} toggle={() => setModal(false)} centered>
        <ModalHeader toggle={() => setModal(false)}>{form.id ? 'Ubah Renbis' : 'Tambah Renbis'}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="renbis-tahun">Tahun Anggaran</Label>
            <Input id="renbis-tahun" type="select" value={form.tahun} onChange={(e) => setForm({ ...form, tahun: Number(e.target.value) })}>
              {opsiTahunForm.map((t) => (
                <option key={t} value={t}>
                  {t}
                  {t === sekarang ? ' (tahun ini)' : ''}
                </option>
              ))}
            </Input>
          </FormGroup>
          <FormGroup>
            <Label for="renbis-nama">Nama Renbis</Label>
            <Input id="renbis-nama" value={form.renbis} maxLength={255} onChange={(e) => setForm({ ...form, renbis: e.target.value })} autoFocus />
          </FormGroup>
          <FormGroup className="mb-0">
            <Label for="renbis-rkap">Nilai RKAP (Rp)</Label>
            <Input id="renbis-rkap" type="number" min="0" value={form.rkap} onChange={(e) => setForm({ ...form, rkap: e.target.value })} />
            {form.rkap !== '' ? <small className="text-muted">{rupiah(Number(form.rkap) || 0)}</small> : null}
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setModal(false)} disabled={saving}>
            Batal
          </Button>
          <Button color="primary" onClick={simpan} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default AturRenbis;
