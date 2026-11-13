import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Badge, Button, Col, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner } from 'reactstrap';
import useAxios from '../../hooks/useAxios';

const pesanGalat = (err) => err?.response?.data?.message || 'Terjadi kesalahan, coba lagi.';

const TIPE = {
  check_document: { label: 'Cek dokumen', warna: 'info' },
  verif_document: { label: 'Verifikasi dokumen', warna: 'primary' },
  verif_realisasi: { label: 'Verifikasi realisasi', warna: 'success' },
  pemohon: { label: 'Pemohon', warna: 'secondary' },
  approval_hotel: { label: 'Persetujuan hotel 30%', warna: 'success' },
  extend: { label: 'Persetujuan penambahan hari', warna: 'success' },
};

const SUMBER = [
  ['posisi', 'Jabatan tertentu'],
  ['id_base', 'Pemegang jenjang (urutan ke-n)'],
  ['puk_divisi', 'PUK divisi tertentu'],
  ['ttd_dokumen', 'Penandatangan SPPD (dari alur dokumen)'],
  ['pemohon_sppd', 'Pegawai SPPD (pemohon)'],
];

const KET = {
  real_baru: 'Dipakai saat pegawai mengajukan laporan realisasi SPPD yang baru. Langkah realisasi lama dihapus, lalu langkah di bawah ditambahkan setelah langkah terakhir dokumen.',
  real_ubah: 'Dipakai saat laporan realisasi SPPD diperbarui. Langkah realisasi lama dihapus, lalu langkah di bawah ditambahkan setelah langkah terakhir dokumen.',
  hotel30: 'Dipakai saat pegawai mengajukan klaim biaya hotel 30%. Langkah di bawah ditambahkan setelah langkah terakhir dokumen SPPD.',
  tambah_hari: 'Dipakai saat pegawai mengajukan penambahan hari SPPD. Langkah lama dihapus, lalu langkah di bawah ditambahkan setelah langkah terakhir dokumen.',
};

const langkahBaru = () => ({ tipe: 'check_document', sumber: 'posisi', nilai: '', urutan_sumber: 0, lewati_ganda: false, nama_hr: false });

const css = `
.at-kartu{border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:16px 18px;margin-bottom:14px;background:#fff}
.at-kartu.at-mati{opacity:.65}
.at-kepala{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:10px}
.at-judul{font-weight:700;font-size:1.02rem;margin:0}
.at-ket{color:#6c757d;font-size:.85rem;margin:2px 0 0}
.at-alur{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;margin-top:14px}
.at-langkah{display:flex;flex-direction:column;gap:3px;min-width:150px;max-width:240px;border-radius:10px;padding:8px 12px;background:#f6f8fb;border:1px solid rgba(0,0,0,.07)}
.at-langkah small{color:#6c757d;line-height:1.25}
.at-panah{align-self:center;color:#9aa5b1;font-size:1.1rem}
.at-edit-langkah{border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:12px;margin-bottom:10px;background:#fafbfc}
.at-edit-atas{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.at-no{display:inline-flex;width:26px;height:26px;border-radius:50%;background:#e8eef7;align-items:center;justify-content:center;font-weight:700;font-size:.8rem}
.at-hasil{border-left:3px solid #28a745;padding-left:12px;margin-top:10px}
@media (max-width:767.98px){
  .at-langkah{min-width:100%;max-width:100%}
  .at-panah{transform:rotate(90deg);width:100%;text-align:center}
  .at-aksi .btn{flex:1}
}
`;

// aturan alur tambahan SPPD (realisasi baru/diubah, klaim hotel 30%, penambahan hari): satu aturan per jenis, hanya bisa diubah
const AlurTambahan = ({ modul, opsi }) => {
  const api = useAxios();
  const [aturan, setAturan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState(null);
  const [edit, setEdit] = useState(null);
  const [simpan, setSimpan] = useState(false);
  const [uji, setUji] = useState(false);
  const [idSppd, setIdSppd] = useState('');
  const [hasil, setHasil] = useState(null);
  const [menguji, setMenguji] = useState(false);

  const muat = useCallback(() => {
    setLoading(true);
    api
      .get(`api/pengaturan/alur/${modul}`)
      .then((res) => setAturan(res.data.data[0] || null))
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }))
      .finally(() => setLoading(false));
  }, [modul]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muat();
  }, [muat]);

  const jabatan = (id) => opsi.jabatan_semua.find((j) => j.id === id);
  const sumberLabel = (l) => {
    if (l.sumber === 'posisi') return jabatan(l.nilai)?.nama || `Jabatan #${l.nilai}`;
    if (l.sumber === 'id_base') return `${opsi.base.find((b) => b.id === l.nilai)?.nama || `Jenjang ${l.nilai}`} ke-${l.urutan_sumber + 1}`;
    if (l.sumber === 'puk_divisi') return `PUK ${opsi.divisi.find((d) => d.id === l.nilai)?.nama || `divisi ${l.nilai}`}`;
    if (l.sumber === 'ttd_dokumen') return 'Penandatangan SPPD';
    return 'Pegawai SPPD (pemohon)';
  };
  // jabatan yang saat ini tidak ada pemegangnya: pengajuan akan gagal sampai ada pemegangnya
  const kosong = (l) => l.sumber === 'posisi' && (jabatan(l.nilai)?.pemegang.length || 0) === 0;

  const bukaEdit = () =>
    setEdit({
      id: aturan.id,
      nama: aturan.nama,
      keterangan: aturan.keterangan || '',
      aktif: aturan.aktif,
      hapus_tipe: aturan.hapus_tipe,
      langkah: aturan.langkah.map((l) => ({ ...l, nilai: l.nilai === null ? '' : l.nilai })),
    });

  const ubahLangkah = (i, p) => setEdit((e) => ({ ...e, langkah: e.langkah.map((l, n) => (n === i ? { ...l, ...p } : l)) }));
  const pindah = (i, arah) =>
    setEdit((e) => {
      const j = i + arah;
      if (j < 0 || j >= e.langkah.length) return e;
      const baru = [...e.langkah];
      [baru[i], baru[j]] = [baru[j], baru[i]];
      return { ...e, langkah: baru };
    });
  const toggleHapus = (t) => setEdit((e) => ({ ...e, hapus_tipe: e.hapus_tipe.includes(t) ? e.hapus_tipe.filter((x) => x !== t) : [...e.hapus_tipe, t] }));

  const kirim = () => {
    setSimpan(true);
    const num = (v) => (v === '' || v === null ? null : Number(v));
    api
      .put(`api/pengaturan/alur/aturan/${edit.id}`, {
        nama: edit.nama,
        keterangan: edit.keterangan,
        aktif: edit.aktif,
        hapus_tipe: edit.hapus_tipe,
        langkah: edit.langkah.map((l) => ({ ...l, nilai: num(l.nilai) })),
      })
      .then((res) => {
        setAturan(res.data.data[0] || null);
        setPesan({ warna: 'success', teks: res.data.message });
        setEdit(null);
      })
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }))
      .finally(() => setSimpan(false));
  };

  const jalankanUji = () => {
    setMenguji(true);
    setHasil(null);
    api
      .post(`api/pengaturan/alur/${modul}/simulasi`, { id_sppd: idSppd })
      .then((res) => setHasil(res.data.data))
      .catch((err) => setHasil({ galat: pesanGalat(err) }))
      .finally(() => setMenguji(false));
  };

  const daftarLangkah = (rows) =>
    rows.length === 0 ? (
      <span className="text-muted small">(tidak ada langkah)</span>
    ) : (
      rows.map((h) => (
        <div key={`${h.step}-${h.tipe}`} className="mb-1">
          <Badge color={TIPE[h.tipe]?.warna || 'secondary'} className="me-2">
            {h.step}. {TIPE[h.tipe]?.label || h.tipe}
          </Badge>
          <strong>{h.nama}</strong> <span className="text-muted">({h.jabatan})</span>
        </div>
      ))
    );

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner size="sm" /> Memuat . . .
      </div>
    );
  }

  return (
    <div>
      <style>{css}</style>
      <p className="text-muted small mb-3">{KET[modul]} Perubahan berlaku untuk pengajuan berikutnya; dokumen yang sudah berjalan tidak berubah.</p>
      {pesan && (
        <Alert color={pesan.warna} toggle={() => setPesan(null)}>
          {pesan.teks}
        </Alert>
      )}
      {!aturan && <Alert color="warning">Aturan belum terpasang di database. Jalankan db/alur_approval_tambahan.sql lebih dulu.</Alert>}

      {aturan && (
        <div className={`at-kartu ${aturan.aktif ? '' : 'at-mati'}`}>
          <div className="at-kepala">
            <div>
              <p className="at-judul">
                {aturan.nama} {!aturan.aktif && <Badge color="secondary">Nonaktif</Badge>}
              </p>
              {aturan.keterangan && <p className="at-ket">{aturan.keterangan}</p>}
              {aturan.hapus_tipe.length > 0 && (
                <p className="at-ket mt-2">
                  Langkah yang dihapus lebih dulu: {aturan.hapus_tipe.map((t) => TIPE[t]?.label || t).join(', ')}
                </p>
              )}
            </div>
            <div className="d-flex gap-2 at-aksi">
              <Button size="sm" outline color="secondary" onClick={() => { setUji(!uji); setHasil(null); }}>
                Uji alur
              </Button>
              <Button size="sm" outline color="primary" onClick={bukaEdit}>
                Ubah
              </Button>
            </div>
          </div>
          <div className="at-alur">
            {aturan.langkah.map((l, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <React.Fragment key={i}>
                {i > 0 && <span className="at-panah">&rarr;</span>}
                <div className="at-langkah">
                  <Badge color={TIPE[l.tipe]?.warna || 'secondary'} className="align-self-start">
                    {TIPE[l.tipe]?.label || l.tipe}
                  </Badge>
                  <strong>{sumberLabel(l)}</strong>
                  {kosong(l) && <small className="text-danger">jabatan ini sedang kosong: pengajuan akan gagal sampai ada pemegangnya</small>}
                  {l.lewati_ganda && <small>dilewati bila sudah ada di alur</small>}
                </div>
              </React.Fragment>
            ))}
          </div>

          {uji && (
            <div className="mt-4">
              <h6 className="mb-1">Uji alur</h6>
              <p className="at-ket mb-2">Dijalankan pada SPPD yang sudah ada, lalu dibatalkan: langkah SPPD itu tidak berubah dan tidak ada data tersimpan.</p>
              <Row className="g-2 align-items-end">
                <Col md="8">
                  <Label className="small mb-1">SPPD contoh</Label>
                  <Input type="select" bsSize="sm" value={idSppd} onChange={(e) => setIdSppd(e.target.value)}>
                    <option value="">- pilih SPPD -</option>
                    {opsi.sppd_contoh.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nomor} - {s.nama}
                      </option>
                    ))}
                  </Input>
                </Col>
                <Col md="4">
                  <Button size="sm" color="success" disabled={menguji || !idSppd} onClick={jalankanUji}>
                    {menguji ? 'Menguji . . .' : 'Jalankan uji'}
                  </Button>
                </Col>
              </Row>
              {hasil?.galat && <Alert color="danger" className="mt-3 mb-0">{hasil.galat}</Alert>}
              {hasil && !hasil.galat && (
                <Row className="mt-3">
                  <Col md="6">
                    <h6 className="small text-muted">Sebelum</h6>
                    <div className="at-hasil">{daftarLangkah(hasil.sebelum)}</div>
                  </Col>
                  <Col md="6">
                    <h6 className="small text-muted">Sesudah</h6>
                    <div className="at-hasil">{daftarLangkah(hasil.sesudah)}</div>
                  </Col>
                </Row>
              )}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={!!edit} toggle={() => !simpan && setEdit(null)} size="xl" scrollable>
        {edit && (
          <>
            <ModalHeader toggle={() => !simpan && setEdit(null)}>Ubah aturan alur tambahan</ModalHeader>
            <ModalBody>
              <Row>
                <Col md="7">
                  <FormGroup>
                    <Label>Nama aturan</Label>
                    <Input value={edit.nama} maxLength={150} onChange={(e) => setEdit({ ...edit, nama: e.target.value })} />
                  </FormGroup>
                </Col>
                <Col md="5">
                  <FormGroup>
                    <Label>Status</Label>
                    <Input type="select" value={edit.aktif ? '1' : '0'} onChange={(e) => setEdit({ ...edit, aktif: e.target.value === '1' })}>
                      <option value="1">Aktif</option>
                      <option value="0">Nonaktif (tidak ada langkah ditambahkan)</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <FormGroup>
                <Label>Keterangan (opsional)</Label>
                <Input value={edit.keterangan} maxLength={255} onChange={(e) => setEdit({ ...edit, keterangan: e.target.value })} />
              </FormGroup>
              <FormGroup>
                <Label>Langkah yang dihapus dari dokumen lebih dulu</Label>
                <div className="d-flex flex-wrap gap-3">
                  {Object.keys(TIPE).map((t) => (
                    <FormGroup check key={t} className="mb-0">
                      <Input type="checkbox" id={`ht-${t}`} checked={edit.hapus_tipe.includes(t)} onChange={() => toggleHapus(t)} />
                      <Label check for={`ht-${t}`} className="small">
                        {TIPE[t].label}
                      </Label>
                    </FormGroup>
                  ))}
                </div>
              </FormGroup>

              <h6 className="mt-4">Langkah yang ditambahkan (berurutan, setelah langkah terakhir dokumen)</h6>
              {edit.langkah.map((l, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div className="at-edit-langkah" key={i}>
                  <div className="at-edit-atas">
                    <span className="at-no">{i + 1}</span>
                    <div className="d-flex gap-1">
                      <Button size="sm" outline color="secondary" disabled={i === 0} onClick={() => pindah(i, -1)}>
                        &uarr;
                      </Button>
                      <Button size="sm" outline color="secondary" disabled={i === edit.langkah.length - 1} onClick={() => pindah(i, 1)}>
                        &darr;
                      </Button>
                      <Button size="sm" outline color="danger" disabled={edit.langkah.length <= 1} onClick={() => setEdit({ ...edit, langkah: edit.langkah.filter((_, n) => n !== i) })}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <Row className="g-2">
                    <Col md="3">
                      <FormGroup>
                        <Label className="small mb-1">Jenis langkah</Label>
                        <Input type="select" bsSize="sm" value={l.tipe} onChange={(e) => ubahLangkah(i, { tipe: e.target.value })}>
                          {Object.keys(TIPE).map((t) => (
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
                        <Input type="select" bsSize="sm" value={l.sumber} onChange={(e) => ubahLangkah(i, { sumber: e.target.value, nilai: '', urutan_sumber: 0, nama_hr: e.target.value === 'posisi' ? l.nama_hr : false })}>
                          {SUMBER.filter(([k]) => k !== 'pemohon_sppd' || modul === 'hotel30').map(([k, t]) => (
                            <option key={k} value={k}>
                              {t}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md="5">
                      {l.sumber === 'posisi' && (
                        <FormGroup>
                          <Label className="small mb-1">Jabatan</Label>
                          <Input type="select" bsSize="sm" value={l.nilai} onChange={(e) => ubahLangkah(i, { nilai: e.target.value })}>
                            <option value="">- pilih jabatan -</option>
                            {opsi.jabatan_semua.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.nama} ({j.pemegang.join(', ') || 'kosong'})
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      )}
                      {l.sumber === 'id_base' && (
                        <Row className="g-2">
                          <Col xs="8">
                            <FormGroup>
                              <Label className="small mb-1">Jenjang</Label>
                              <Input type="select" bsSize="sm" value={l.nilai} onChange={(e) => ubahLangkah(i, { nilai: e.target.value })}>
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
                              <Input type="number" min="1" max="21" bsSize="sm" value={l.urutan_sumber + 1} onChange={(e) => ubahLangkah(i, { urutan_sumber: Math.max(0, (parseInt(e.target.value, 10) || 1) - 1) })} />
                            </FormGroup>
                          </Col>
                        </Row>
                      )}
                      {l.sumber === 'puk_divisi' && (
                        <FormGroup>
                          <Label className="small mb-1">Divisi</Label>
                          <Input type="select" bsSize="sm" value={l.nilai} onChange={(e) => ubahLangkah(i, { nilai: e.target.value })}>
                            <option value="">- pilih divisi -</option>
                            {opsi.divisi.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.nama}
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      )}
                    </Col>
                  </Row>
                  <div className="d-flex flex-wrap gap-4 mt-1">
                    <FormGroup check className="mb-0">
                      <Input type="checkbox" id={`tg-${i}`} checked={l.lewati_ganda} onChange={(e) => ubahLangkah(i, { lewati_ganda: e.target.checked })} />
                      <Label check for={`tg-${i}`} className="small">
                        Lewati bila orang yang sama sudah ada di alur
                      </Label>
                    </FormGroup>
                    {l.sumber === 'posisi' && (
                      <FormGroup check className="mb-0">
                        <Input type="checkbox" id={`th-${i}`} checked={l.nama_hr} onChange={(e) => ubahLangkah(i, { nama_hr: e.target.checked })} />
                        <Label check for={`th-${i}`} className="small">
                          Nama jabatan dari master HR
                        </Label>
                      </FormGroup>
                    )}
                  </div>
                </div>
              ))}
              <Button size="sm" outline color="primary" disabled={edit.langkah.length >= 10} onClick={() => setEdit({ ...edit, langkah: [...edit.langkah, langkahBaru()] })}>
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

AlurTambahan.propTypes = {
  modul: PropTypes.string.isRequired,
  opsi: PropTypes.object.isRequired,
};

export default AlurTambahan;
