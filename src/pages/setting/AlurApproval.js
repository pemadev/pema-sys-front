import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Badge,
  Button,
  Col,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
} from 'reactstrap';
import { confirmAlert } from 'react-confirm-alert';
import useAxios from '../../hooks/useAxios';
import AlurTambahan from './AlurTambahan';

const pesanGalat = (err) => err?.response?.data?.message || 'Terjadi kesalahan, coba lagi.';

const TIPE = {
  verifikasi_biaya: { label: 'Verifikasi biaya', warna: 'info' },
  paraf: { label: 'Paraf', warna: 'primary' },
  sign: { label: 'Tanda tangan', warna: 'success' },
};

const SUMBER = {
  sppd: [
    ['posisi', 'Jabatan tertentu'],
    ['id_base', 'Pemegang jenjang (urutan ke-n)'],
    ['puk', 'PUK divisi pegawai tujuan'],
    ['direktur_divisi', 'Direktur divisi pegawai tujuan'],
    ['dir_terkait', 'Direktur terkait pengaju'],
  ],
  surat: [
    ['posisi', 'Jabatan tertentu'],
    ['id_base', 'Pemegang jenjang (urutan ke-n)'],
    ['puk', 'PUK divisi surat'],
    ['direktur_divisi', 'Direktur divisi surat'],
    ['penandatangan', 'Penandatangan surat'],
  ],
};

const MODUL = {
  sppd: {
    judul: 'SPPD',
    kunci: 'Jenjang pegawai tujuan SPPD',
    khusus: ['-', 'SPPD tanpa pegawai tujuan'],
    lewati: ['pengaju', 'Lewati bila orangnya sama dengan pengaju (pegawai tujuan)'],
    ket: 'Alur persetujuan SPPD dipilih menurut jenjang (id_base) pegawai tujuan.',
  },
  surat: {
    judul: 'Surat (ADM)',
    kunci: 'Jenjang penandatangan surat',
    khusus: ['*', 'Penandatangan lainnya (bila tidak ada aturan khusus)'],
    lewati: ['penandatangan', 'Lewati bila orangnya sama dengan penandatangan'],
    ket: 'Alur paraf dan tanda tangan surat dipilih menurut divisi dan jenjang penandatangan. Aturan khusus divisi didahulukan.',
  },
};

// alur tambahan SPPD (diatur di AlurTambahan): realisasi, klaim hotel 30% dan penambahan hari
const TAMBAHAN = {
  real_baru: { judul: 'Realisasi (baru)' },
  real_ubah: { judul: 'Realisasi (diubah)' },
  hotel30: { judul: 'Hotel 30%' },
  tambah_hari: { judul: 'Tambah hari' },
};

const langkahBaru = () => ({
  tipe: 'paraf',
  sumber: 'posisi',
  nilai: '',
  urutan_sumber: 0,
  cadangan_sumber: '',
  cadangan_nilai: '',
  lewati_jika_sama: '',
  lewati_ganda: false,
  nama_hr: false,
  notif: false,
});

const css = `
.al-kartu{border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:16px 18px;margin-bottom:14px;background:#fff}
.al-kartu.al-mati{opacity:.65}
.al-kepala{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:10px}
.al-judul{font-weight:700;font-size:1.02rem;margin:0}
.al-ket{color:#6c757d;font-size:.85rem;margin:2px 0 0}
.al-alur{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;margin-top:14px}
.al-langkah{display:flex;flex-direction:column;gap:3px;min-width:150px;max-width:230px;border-radius:10px;padding:8px 12px;background:#f6f8fb;border:1px solid rgba(0,0,0,.07)}
.al-langkah small{color:#6c757d;line-height:1.25}
.al-panah{align-self:center;color:#9aa5b1;font-size:1.1rem}
.al-edit-langkah{border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:12px;margin-bottom:10px;background:#fafbfc}
.al-edit-atas{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.al-no{display:inline-flex;width:26px;height:26px;border-radius:50%;background:#e8eef7;align-items:center;justify-content:center;font-weight:700;font-size:.8rem}
.al-chip{display:inline-block;margin:0 6px 6px 0}
.al-uji-hasil{border-left:3px solid #28a745;padding-left:12px;margin-top:12px}
@media (max-width:767.98px){
  .al-langkah{min-width:100%;max-width:100%}
  .al-panah{transform:rotate(90deg);width:100%;text-align:center}
  .al-aksi .btn{flex:1}
}
`;

// satu langkah dalam alur (tampilan baca)
const RingkasLangkah = ({ l, opsi, modul }) => {
  const jab = (id) => opsi.jabatan.find((j) => j.id === id);
  const base = (id) => opsi.base.find((b) => b.id === id);
  const teks = (sumber, nilai, off) => {
    if (sumber === 'posisi') return jab(nilai)?.nama || `Jabatan #${nilai}`;
    if (sumber === 'id_base') return `${base(nilai)?.nama || `Jenjang ${nilai}`} ke-${off + 1}`;
    if (sumber === 'puk') return modul === 'sppd' ? 'PUK divisi pegawai tujuan' : 'PUK divisi surat';
    if (sumber === 'direktur_divisi') return 'Direktur divisi';
    if (sumber === 'dir_terkait') return 'Direktur terkait pengaju';
    return 'Penandatangan surat';
  };
  const catatan = [];
  if (l.cadangan_sumber) catatan.push(`bila tidak ada: ${teks(l.cadangan_sumber, l.cadangan_nilai, 0)}`);
  if (l.lewati_jika_sama) catatan.push(l.lewati_jika_sama === 'pengaju' ? 'dilewati bila sama dengan pengaju' : 'dilewati bila sama dengan penandatangan');
  if (l.lewati_ganda) catatan.push('dilewati bila sudah ada di alur');
  return (
    <>
      <Badge color={TIPE[l.tipe].warna} className="align-self-start">
        {TIPE[l.tipe].label}
      </Badge>
      <strong>{teks(l.sumber, l.nilai, l.urutan_sumber)}</strong>
      {catatan.map((c) => (
        <small key={c}>{c}</small>
      ))}
    </>
  );
};
RingkasLangkah.propTypes = {
  l: PropTypes.object.isRequired,
  opsi: PropTypes.object.isRequired,
  modul: PropTypes.string.isRequired,
};

// pilihan orang untuk satu sumber (jabatan atau jenjang)
const PilihNilai = ({ sumber, nilai, off, opsi, onNilai, onOff, label }) => {
  if (sumber === 'posisi') {
    return (
      <FormGroup>
        <Label className="small mb-1">{label}</Label>
        <Input type="select" bsSize="sm" value={nilai} onChange={(e) => onNilai(e.target.value)}>
          <option value="">- pilih jabatan -</option>
          {opsi.jabatan.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nama} ({j.pemegang.join(', ') || 'kosong'})
            </option>
          ))}
        </Input>
      </FormGroup>
    );
  }
  if (sumber === 'id_base') {
    return (
      <Row className="g-2">
        <Col xs="8">
          <FormGroup>
            <Label className="small mb-1">{label}</Label>
            <Input type="select" bsSize="sm" value={nilai} onChange={(e) => onNilai(e.target.value)}>
              <option value="">- pilih jenjang -</option>
              {opsi.base.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id}. {b.nama} ({b.jumlah} orang)
                </option>
              ))}
            </Input>
          </FormGroup>
        </Col>
        <Col xs="4">
          <FormGroup>
            <Label className="small mb-1">Pemegang ke-</Label>
            <Input type="number" min="1" max="21" bsSize="sm" value={off + 1} onChange={(e) => onOff(Math.max(0, (parseInt(e.target.value, 10) || 1) - 1))} />
          </FormGroup>
        </Col>
      </Row>
    );
  }
  return null;
};
PilihNilai.propTypes = {
  sumber: PropTypes.string,
  nilai: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  off: PropTypes.number,
  opsi: PropTypes.object.isRequired,
  onNilai: PropTypes.func.isRequired,
  onOff: PropTypes.func,
  label: PropTypes.string,
};
PilihNilai.defaultProps = { sumber: '', nilai: '', off: 0, onOff: () => {}, label: 'Jabatan' };

const AlurApproval = () => {
  const api = useAxios();
  const [modul, setModul] = useState('sppd');
  const [opsi, setOpsi] = useState(null);
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState(null);
  const [edit, setEdit] = useState(null);
  const [simpan, setSimpan] = useState(false);
  const [uji, setUji] = useState(false);
  const [ujiForm, setUjiForm] = useState({ employe_id: '', pengaju: '', sign_by: '', id_divisi: '' });
  const [ujiHasil, setUjiHasil] = useState(null);
  const [ujiJalan, setUjiJalan] = useState(false);
  const tambahan = Object.prototype.hasOwnProperty.call(TAMBAHAN, modul);
  const m = MODUL[modul] || MODUL.sppd;

  const muat = useCallback(() => {
    if (tambahan) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`api/pengaturan/alur/${modul}`)
      .then((res) => setDaftar(res.data.data))
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }))
      .finally(() => setLoading(false));
  }, [modul]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api
      .get('api/pengaturan/alur/opsi')
      .then((res) => setOpsi(res.data.data))
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muat();
  }, [muat]);

  const namaJenjang = useCallback(
    (id) => {
      if (id === '-') return 'Tanpa pegawai tujuan';
      if (id === '*') return 'Penandatangan lainnya';
      return opsi?.base.find((b) => String(b.id) === String(id))?.nama || `Jenjang ${id}`;
    },
    [opsi],
  );

  const bukaBaru = () => {
    setEdit({
      id: null,
      nama: '',
      keterangan: '',
      aktif: true,
      id_base: [],
      id_divisi: '',
      langkah: modul === 'sppd' ? [{ ...langkahBaru(), tipe: 'verifikasi_biaya', nama_hr: false }, { ...langkahBaru(), tipe: 'sign' }] : [{ ...langkahBaru(), tipe: 'sign', sumber: 'penandatangan' }],
    });
  };

  const bukaEdit = (a) => {
    setEdit({
      id: a.id,
      nama: a.nama,
      keterangan: a.keterangan || '',
      aktif: a.aktif,
      id_base: a.id_base,
      id_divisi: a.id_divisi === null ? '' : String(a.id_divisi),
      langkah: a.langkah.map((l) => ({
        ...l,
        nilai: l.nilai === null ? '' : l.nilai,
        cadangan_sumber: l.cadangan_sumber || '',
        cadangan_nilai: l.cadangan_nilai === null ? '' : l.cadangan_nilai,
        lewati_jika_sama: l.lewati_jika_sama || '',
      })),
    });
  };

  const ubahLangkah = (i, perubahan) => setEdit((e) => ({ ...e, langkah: e.langkah.map((l, n) => (n === i ? { ...l, ...perubahan } : l)) }));

  const pindah = (i, arah) =>
    setEdit((e) => {
      const j = i + arah;
      if (j < 0 || j >= e.langkah.length) return e;
      const baru = [...e.langkah];
      [baru[i], baru[j]] = [baru[j], baru[i]];
      return { ...e, langkah: baru };
    });

  // langkah baru disisipkan sebelum tanda tangan bila tanda tangan sudah ada di akhir
  const tambahLangkah = () =>
    setEdit((e) => {
      const akhirSign = e.langkah.length > 0 && e.langkah[e.langkah.length - 1].tipe === 'sign';
      const baru = langkahBaru();
      return { ...e, langkah: akhirSign ? [...e.langkah.slice(0, -1), baru, e.langkah[e.langkah.length - 1]] : [...e.langkah, baru] };
    });

  const hapusLangkah = (i) => setEdit((e) => ({ ...e, langkah: e.langkah.filter((_, n) => n !== i) }));

  const toggleBase = (id) =>
    setEdit((e) => ({ ...e, id_base: e.id_base.includes(id) ? e.id_base.filter((b) => b !== id) : [...e.id_base, id] }));

  const kirim = () => {
    setSimpan(true);
    const num = (v) => (v === '' || v === null ? null : Number(v));
    const payload = {
      nama: edit.nama,
      keterangan: edit.keterangan,
      aktif: edit.aktif,
      id_base: edit.id_base,
      id_divisi: modul === 'surat' && edit.id_divisi !== '' ? Number(edit.id_divisi) : null,
      langkah: edit.langkah.map((l) => ({
        ...l,
        nilai: num(l.nilai),
        cadangan_sumber: l.cadangan_sumber || null,
        cadangan_nilai: l.cadangan_sumber ? num(l.cadangan_nilai) : null,
        lewati_jika_sama: l.lewati_jika_sama || null,
      })),
    };
    const req = edit.id ? api.put(`api/pengaturan/alur/aturan/${edit.id}`, payload) : api.post(`api/pengaturan/alur/${modul}`, payload);
    req
      .then((res) => {
        setDaftar(res.data.data);
        setPesan({ warna: 'success', teks: res.data.message });
        setEdit(null);
      })
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }))
      .finally(() => setSimpan(false));
  };

  const hapus = (a) =>
    confirmAlert({
      title: 'Hapus aturan alur?',
      message: `Aturan "${a.nama}" akan dihapus. Dokumen berikutnya yang cocok dengan aturan ini tidak akan punya alur approval sampai ada aturan lain.`,
      buttons: [
        {
          label: 'Hapus',
          onClick: () =>
            api
              .delete(`api/pengaturan/alur/aturan/${a.id}`)
              .then((res) => {
                setDaftar(res.data.data);
                setPesan({ warna: 'success', teks: res.data.message });
              })
              .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) })),
        },
        { label: 'Batal', onClick: () => {} },
      ],
    });

  const jalankanUji = () => {
    setUjiJalan(true);
    setUjiHasil(null);
    api
      .post(`api/pengaturan/alur/${modul}/simulasi`, ujiForm)
      .then((res) => setUjiHasil(res.data.data))
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }))
      .finally(() => setUjiJalan(false));
  };

  const pegawaiOpsi = useMemo(() => opsi?.pegawai || [], [opsi]);

  if (!opsi) {
    return (
      <div className="text-center py-5">
        <Spinner size="sm" /> Memuat . . .
      </div>
    );
  }

  return (
    <div>
      <style>{css}</style>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          {[...Object.keys(MODUL), ...Object.keys(TAMBAHAN)].map((k) => (
            <Button
              key={k}
              size="sm"
              color={modul === k ? 'primary' : 'light'}
              onClick={() => {
                setModul(k);
                setUji(false);
                setUjiHasil(null);
              }}
            >
              {(MODUL[k] || TAMBAHAN[k]).judul}
            </Button>
          ))}
        </div>
        {!tambahan && (
          <div className="d-flex gap-2 al-aksi">
            <Button size="sm" outline color="secondary" onClick={() => { setUji(!uji); setUjiHasil(null); }}>
              Uji alur
            </Button>
            <Button size="sm" color="primary" onClick={bukaBaru}>
              + Tambah aturan
            </Button>
          </div>
        )}
      </div>
      {tambahan ? (
        <AlurTambahan key={modul} modul={modul} opsi={opsi} />
      ) : (
        <>
      <p className="text-muted small mb-3">{m.ket} Perubahan berlaku untuk {modul === 'sppd' ? 'pengajuan SPPD' : 'surat'} yang dibuat atau diedit sesudahnya; dokumen yang sudah berjalan tidak berubah.</p>

      {pesan && (
        <Alert color={pesan.warna} toggle={() => setPesan(null)}>
          {pesan.teks}
        </Alert>
      )}

      {uji && (
        <div className="al-kartu">
          <h6 className="al-judul mb-2">Uji alur ({m.judul})</h6>
          <p className="al-ket mb-3">Mensimulasikan alur yang akan terbentuk dengan aturan saat ini. Tidak ada data yang disimpan dan tidak ada notifikasi terkirim.</p>
          <Row className="g-2">
            {modul === 'sppd' ? (
              <>
                <Col md="6">
                  <Label className="small mb-1">Pegawai tujuan</Label>
                  <Input type="select" bsSize="sm" value={ujiForm.employe_id} onChange={(e) => setUjiForm({ ...ujiForm, employe_id: e.target.value })}>
                    <option value="">- pilih -</option>
                    <option value="-">(tanpa pegawai tujuan)</option>
                    {pegawaiOpsi.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} - {p.jabatan}
                      </option>
                    ))}
                  </Input>
                </Col>
                {ujiForm.employe_id === '-' && (
                  <Col md="6">
                    <Label className="small mb-1">Pengaju SPPD</Label>
                    <Input type="select" bsSize="sm" value={ujiForm.pengaju} onChange={(e) => setUjiForm({ ...ujiForm, pengaju: e.target.value })}>
                      <option value="">- pilih -</option>
                      {pegawaiOpsi.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} - {p.jabatan}
                        </option>
                      ))}
                    </Input>
                  </Col>
                )}
              </>
            ) : (
              <>
                <Col md="6">
                  <Label className="small mb-1">Penandatangan</Label>
                  <Input type="select" bsSize="sm" value={ujiForm.sign_by} onChange={(e) => setUjiForm({ ...ujiForm, sign_by: e.target.value })}>
                    <option value="">- pilih -</option>
                    {pegawaiOpsi.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} - {p.jabatan}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md="6">
                  <Label className="small mb-1">Divisi surat</Label>
                  <Input type="select" bsSize="sm" value={ujiForm.id_divisi} onChange={(e) => setUjiForm({ ...ujiForm, id_divisi: e.target.value })}>
                    <option value="">- pilih -</option>
                    {opsi.divisi.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama}
                      </option>
                    ))}
                  </Input>
                </Col>
              </>
            )}
          </Row>
          <Button className="mt-3" size="sm" color="success" disabled={ujiJalan} onClick={jalankanUji}>
            {ujiJalan ? 'Menguji . . .' : 'Jalankan uji'}
          </Button>
          {ujiHasil && (
            <div className="al-uji-hasil">
              {ujiHasil.length === 0 && <span className="text-muted">Tidak ada langkah: tidak ada aturan yang cocok.</span>}
              {ujiHasil.map((h) => (
                <div key={h.step} className="mb-1">
                  <Badge color={TIPE[h.tipe]?.warna || 'secondary'} className="me-2">
                    {h.step}. {TIPE[h.tipe]?.label || h.tipe}
                  </Badge>
                  <strong>{h.nama}</strong> <span className="text-muted">({h.jabatan})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <Spinner size="sm" /> Memuat . . .
        </div>
      )}
      {!loading && daftar.length === 0 && <div className="text-muted text-center py-4">Belum ada aturan alur.</div>}

      {daftar.map((a) => (
        <div key={a.id} className={`al-kartu ${a.aktif ? '' : 'al-mati'}`}>
          <div className="al-kepala">
            <div>
              <p className="al-judul">
                {a.nama} {!a.aktif && <Badge color="secondary">Nonaktif</Badge>}
              </p>
              {a.keterangan && <p className="al-ket">{a.keterangan}</p>}
              <div className="mt-2">
                {a.id_base.map((b) => (
                  <Badge key={b} color="light" className="al-chip text-dark border">
                    {namaJenjang(b)}
                  </Badge>
                ))}
                {modul === 'surat' && <Badge color={a.id_divisi === null ? 'secondary' : 'warning'} className="al-chip">{a.id_divisi === null ? 'Semua divisi' : a.nama_divisi}</Badge>}
              </div>
            </div>
            <div className="d-flex gap-2 al-aksi">
              <Button size="sm" outline color="primary" onClick={() => bukaEdit(a)}>
                Ubah
              </Button>
              <Button size="sm" outline color="danger" onClick={() => hapus(a)}>
                Hapus
              </Button>
            </div>
          </div>
          <div className="al-alur">
            {a.langkah.map((l, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <React.Fragment key={i}>
                {i > 0 && <span className="al-panah">&rarr;</span>}
                <div className="al-langkah">
                  <RingkasLangkah l={l} opsi={opsi} modul={modul} />
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}

        </>
      )}

      <Modal isOpen={!!edit} toggle={() => !simpan && setEdit(null)} size="xl" scrollable>
        {edit && (
          <>
            <ModalHeader toggle={() => !simpan && setEdit(null)}>
              {edit.id ? 'Ubah aturan alur' : 'Tambah aturan alur'} - {m.judul}
            </ModalHeader>
            <ModalBody>
              <Row>
                <Col md="7">
                  <FormGroup>
                    <Label>Nama aturan</Label>
                    <Input value={edit.nama} maxLength={150} onChange={(e) => setEdit({ ...edit, nama: e.target.value })} placeholder="mis. Supervisor dan Staf" />
                  </FormGroup>
                </Col>
                <Col md="5">
                  <FormGroup>
                    <Label>Status</Label>
                    <Input type="select" value={edit.aktif ? '1' : '0'} onChange={(e) => setEdit({ ...edit, aktif: e.target.value === '1' })}>
                      <option value="1">Aktif</option>
                      <option value="0">Nonaktif (diabaikan trigger)</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <FormGroup>
                <Label>Keterangan (opsional)</Label>
                <Input value={edit.keterangan} maxLength={255} onChange={(e) => setEdit({ ...edit, keterangan: e.target.value })} />
              </FormGroup>
              {modul === 'surat' && (
                <FormGroup>
                  <Label>Berlaku untuk divisi</Label>
                  <Input type="select" value={edit.id_divisi} onChange={(e) => setEdit({ ...edit, id_divisi: e.target.value })}>
                    <option value="">Semua divisi</option>
                    {opsi.divisi.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              )}
              <FormGroup>
                <Label>{m.kunci}</Label>
                <div className="d-flex flex-wrap gap-3">
                  {opsi.base.map((b) => (
                    <FormGroup check key={b.id} className="mb-0">
                      <Input type="checkbox" id={`base-${b.id}`} checked={edit.id_base.includes(String(b.id))} onChange={() => toggleBase(String(b.id))} />
                      <Label check for={`base-${b.id}`}>
                        {b.id}. {b.nama}
                      </Label>
                    </FormGroup>
                  ))}
                  <FormGroup check className="mb-0">
                    <Input type="checkbox" id="base-khusus" checked={edit.id_base.includes(m.khusus[0])} onChange={() => toggleBase(m.khusus[0])} />
                    <Label check for="base-khusus">
                      {m.khusus[1]}
                    </Label>
                  </FormGroup>
                </div>
              </FormGroup>

              <h6 className="mt-4">Langkah (berurutan)</h6>
              <p className="al-ket mb-3">Langkah paling akhir harus tanda tangan (satu saja). Langkah yang orangnya tidak ditemukan dilewati otomatis.</p>
              {edit.langkah.map((l, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div className="al-edit-langkah" key={i}>
                  <div className="al-edit-atas">
                    <span className="al-no">{i + 1}</span>
                    <div className="d-flex gap-1">
                      <Button size="sm" outline color="secondary" disabled={i === 0} onClick={() => pindah(i, -1)} title="Naikkan">
                        &uarr;
                      </Button>
                      <Button size="sm" outline color="secondary" disabled={i === edit.langkah.length - 1} onClick={() => pindah(i, 1)} title="Turunkan">
                        &darr;
                      </Button>
                      <Button size="sm" outline color="danger" onClick={() => hapusLangkah(i)} title="Hapus langkah">
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <Row className="g-2">
                    <Col md="3">
                      <FormGroup>
                        <Label className="small mb-1">Jenis langkah</Label>
                        <Input type="select" bsSize="sm" value={l.tipe} onChange={(e) => ubahLangkah(i, { tipe: e.target.value })}>
                          {Object.keys(TIPE)
                            .filter((t) => t !== 'verifikasi_biaya' || modul === 'sppd')
                            .map((t) => (
                              <option key={t} value={t}>
                                {TIPE[t].label}
                              </option>
                            ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="4">
                      <FormGroup>
                        <Label className="small mb-1">Siapa orangnya</Label>
                        <Input
                          type="select"
                          bsSize="sm"
                          value={l.sumber}
                          onChange={(e) => ubahLangkah(i, { sumber: e.target.value, nilai: '', urutan_sumber: 0, nama_hr: e.target.value === 'posisi' ? l.nama_hr : false, cadangan_sumber: e.target.value === 'dir_terkait' ? l.cadangan_sumber : '', cadangan_nilai: '' })}
                        >
                          {SUMBER[modul].map(([k, t]) => (
                            <option key={k} value={k}>
                              {t}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="5">
                      <PilihNilai
                        sumber={l.sumber}
                        nilai={l.nilai}
                        off={l.urutan_sumber}
                        opsi={opsi}
                        label={l.sumber === 'posisi' ? 'Jabatan' : 'Jenjang'}
                        onNilai={(v) => ubahLangkah(i, { nilai: v })}
                        onOff={(v) => ubahLangkah(i, { urutan_sumber: v })}
                      />
                    </Col>
                  </Row>
                  {l.sumber === 'dir_terkait' && (
                    <Row className="g-2">
                      <Col md="4">
                        <FormGroup>
                          <Label className="small mb-1">Bila pengaju tidak punya direktur terkait</Label>
                          <Input type="select" bsSize="sm" value={l.cadangan_sumber} onChange={(e) => ubahLangkah(i, { cadangan_sumber: e.target.value, cadangan_nilai: '' })}>
                            <option value="">Lewati langkah ini</option>
                            {SUMBER[modul].filter(([k]) => k !== 'dir_terkait').map(([k, t]) => (
                              <option key={k} value={k}>
                                Gunakan: {t}
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                      {(l.cadangan_sumber === 'posisi' || l.cadangan_sumber === 'id_base') && (
                        <Col md="5">
                          <PilihNilai
                            sumber={l.cadangan_sumber}
                            nilai={l.cadangan_nilai}
                            opsi={opsi}
                            label={l.cadangan_sumber === 'posisi' ? 'Jabatan pengganti' : 'Jenjang pengganti'}
                            onNilai={(v) => ubahLangkah(i, { cadangan_nilai: v })}
                          />
                        </Col>
                      )}
                    </Row>
                  )}
                  <div className="d-flex flex-wrap gap-4 mt-1">
                    <FormGroup check className="mb-0">
                      <Input type="checkbox" id={`lw-${i}`} checked={!!l.lewati_jika_sama} onChange={(e) => ubahLangkah(i, { lewati_jika_sama: e.target.checked ? m.lewati[0] : '' })} />
                      <Label check for={`lw-${i}`} className="small">
                        {m.lewati[1]}
                      </Label>
                    </FormGroup>
                    <FormGroup check className="mb-0">
                      <Input type="checkbox" id={`gd-${i}`} checked={l.lewati_ganda} onChange={(e) => ubahLangkah(i, { lewati_ganda: e.target.checked })} />
                      <Label check for={`gd-${i}`} className="small">
                        Lewati bila orang yang sama sudah ada di alur
                      </Label>
                    </FormGroup>
                    {l.sumber === 'posisi' && (
                      <FormGroup check className="mb-0">
                        <Input type="checkbox" id={`hr-${i}`} checked={l.nama_hr} onChange={(e) => ubahLangkah(i, { nama_hr: e.target.checked })} />
                        <Label check for={`hr-${i}`} className="small">
                          Nama jabatan dari master HR
                        </Label>
                      </FormGroup>
                    )}
                  </div>
                </div>
              ))}
              <Button size="sm" outline color="primary" disabled={edit.langkah.length >= 15} onClick={tambahLangkah}>
                + Tambah langkah
              </Button>
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" outline disabled={simpan} onClick={() => setEdit(null)}>
                Batal
              </Button>
              <Button color="primary" disabled={simpan} onClick={kirim}>
                {simpan ? 'Menyimpan . . .' : 'Simpan'}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
};

export default AlurApproval;
