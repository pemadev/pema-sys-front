import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { PDFDocument } from 'pdf-lib';
import { Button, Input, Label, Row, Col, Alert, FormGroup } from 'reactstrap';
import useAxios from '../../../hooks/useAxios';
import PdfPages from './PdfPages';

export const SIGNER_COLORS = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2', '#00796b'];
const BOX_W = 0.34;
const BOX_H = 0.09;
const EMPTY_SIGNER = { name: '', email: '', position: '', order: 1 };

const DocusignForm = ({ onDone, onCancel }) => {
  const api = useAxios();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [buffer, setBuffer] = useState(null);
  const [signers, setSigners] = useState([{ ...EMPTY_SIGNER }]);
  const [signMode, setSignMode] = useState('parallel');
  const [fields, setFields] = useState([]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onFile = async (e) => {
    const f = e.target.files[0];
    setError('');
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('File harus berformat PDF');
      return;
    }
    if (f.size > 125 * 1024 * 1024) {
      setError('Ukuran file maksimal 125 MB');
      return;
    }
    setFile(f);
    setFields([]);
    try {
      // Re-save as a classic (uncompressed xref) PDF so the server-side stamper can read it
      const raw = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(raw, { ignoreEncryption: true });
      const bytes = await pdfDoc.save({ useObjectStreams: false });
      const normalized = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      setFile(new File([normalized], f.name, { type: 'application/pdf' }));
      setBuffer(normalized);
    } catch (err) {
      setError('PDF tidak dapat dibaca. Pastikan file tidak rusak atau diproteksi password.');
      setFile(null);
      return;
    }
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const updateSigner = (i, key, val) => setSigners(signers.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));

  const removeSigner = (i) => {
    setSigners(signers.filter((_, idx) => idx !== i));
    setFields(fields.filter((f) => f.signer !== i).map((f) => (f.signer > i ? { ...f, signer: f.signer - 1 } : f)));
    setActive(0);
  };

  const placeField = (page, px, py) => {
    const x = Math.min(Math.max(px - BOX_W / 2, 0), 1 - BOX_W);
    const y = Math.min(Math.max(py - BOX_H / 2, 0), 1 - BOX_H);
    setFields([...fields, { signer: active, page, x, y, w: BOX_W, h: BOX_H }]);
  };

  const submit = async () => {
    setError('');
    if (!file || !title.trim()) return setError('Judul dan file PDF wajib diisi');
    if (signers.some((s) => !s.name.trim() || !/^\S+@\S+\.\S+$/.test(s.email))) {
      return setError('Nama dan email penanda tangan harus valid');
    }
    if (signers.some((s) => !s.position.trim())) return setError('Jabatan penanda tangan wajib diisi');
    if (signers.some((s) => !(Number(s.order) >= 1))) return setError('Urutan tanda tangan harus berupa angka minimal 1');
    const missing = signers.findIndex((_, i) => !fields.some((f) => f.signer === i));
    if (missing >= 0) return setError(`Tentukan posisi tanda tangan untuk ${signers[missing].name || `Penanda tangan ${missing + 1}`}`);

    const fd = new FormData();
    fd.append('title', title.trim());
    fd.append('file', file);
    fd.append('sign_mode', signers.length > 1 ? signMode : 'parallel');
    fd.append('signers', JSON.stringify(signers.map((s) => ({ ...s, order: Number(s.order) }))));
    fd.append('fields', JSON.stringify(fields));
    setSaving(true);
    try {
      const res = await api.post('dapi/docusign', fd);
      onDone(res.data.message);
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menyimpan dokumen');
    } finally {
      setSaving(false);
    }
    return null;
  };

  return (
    <Row>
      <Col md={4}>
        {error && <Alert color="danger">{error}</Alert>}
        <FormGroup>
          <Label>Dokumen (PDF)</Label>
          <Input type="file" accept="application/pdf" onChange={onFile} />
        </FormGroup>
        <FormGroup>
          <Label>Judul</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormGroup>
        <Label>Penanda tangan</Label>
        {signers.length > 1 && (
          <FormGroup className="mb-2">
            <Input type="select" value={signMode} onChange={(e) => setSignMode(e.target.value)}>
              <option value="parallel">Tidak berurutan (siapa cepat)</option>
              <option value="sequential">Berurutan (sesuai nomor urut)</option>
            </Input>
            {signMode === 'sequential' && (
              <small className="text-muted">
                Email hanya dikirim ke penanda tangan yang gilirannya tiba. Nomor urut yang sama boleh tanda tangan bersamaan.
              </small>
            )}
          </FormGroup>
        )}
        {signers.map((s, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="p-2 mb-2"
            style={{
              border: `2px solid ${i === active ? SIGNER_COLORS[i % SIGNER_COLORS.length] : '#dee2e6'}`,
              borderRadius: 4,
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Button
                size="sm"
                style={{ background: SIGNER_COLORS[i % SIGNER_COLORS.length], border: 0 }}
                onClick={() => setActive(i)}
              >
                {i === active ? 'Menandai posisi...' : 'Pilih untuk menandai'}
              </Button>
              {signers.length > 1 && (
                <Button size="sm" color="link" className="text-danger" onClick={() => removeSigner(i)}>
                  Hapus
                </Button>
              )}
            </div>
            <Input className="mb-1" placeholder="Nama" value={s.name} onChange={(e) => updateSigner(i, 'name', e.target.value)} />
            <Input className="mb-1" placeholder="Jabatan" value={s.position} onChange={(e) => updateSigner(i, 'position', e.target.value)} />
            <Input className="mb-1" placeholder="Email" type="email" value={s.email} onChange={(e) => updateSigner(i, 'email', e.target.value)} />
            {signers.length > 1 && signMode === 'sequential' && (
              <div className="d-flex align-items-center mb-1">
                <small className="me-2">Urutan ke-</small>
                <Input
                  type="number"
                  min={1}
                  style={{ width: 80 }}
                  value={s.order}
                  onChange={(e) => updateSigner(i, 'order', e.target.value)}
                />
              </div>
            )}
            <small className="text-muted">{fields.filter((f) => f.signer === i).length} posisi tanda tangan</small>
          </div>
        ))}
        {signers.length < 6 && (
          <Button size="sm" outline onClick={() => setSigners([...signers, { ...EMPTY_SIGNER, order: signers.length + 1 }])}>
            + Tambah penanda tangan
          </Button>
        )}
        <hr />
        <Button color="primary" disabled={saving} onClick={submit}>
          {saving ? 'Mengirim...' : 'Kirim untuk Ditandatangani'}
        </Button>{' '}
        <Button color="secondary" outline onClick={onCancel}>
          Batal
        </Button>
      </Col>
      <Col md={8}>
        {buffer ? (
          <>
            <Alert color="info" className="py-1">
              Klik halaman untuk menambahkan kotak tanda tangan. Tarik kotak untuk memindahkan, atau tarik sudut kanan bawah untuk mengubah ukurannya.
            </Alert>
            <PdfPages
              source={buffer}
              fields={fields}
              width={620}
              onPageClick={placeField}
              onFieldMove={(idx, x, y) => setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, x, y } : f)))}
              onFieldResize={(idx, w, h) => setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, w, h } : f)))}
              renderField={(f, idx, pageScale) => {
                const color = SIGNER_COLORS[f.signer % SIGNER_COLORS.length];
                return (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      border: `2px dashed ${color}`,
                      background: `${color}22`,
                      color,
                      fontSize: 10,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', height: '100%', alignItems: 'stretch', gap: 4, padding: 2, boxSizing: 'border-box' }}>
                      <div style={{ height: '100%', aspectRatio: '1', flexShrink: 0, background: color, opacity: 0.35 }} />
                      <div style={{ display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column', lineHeight: 1, fontSize: `${8.415 * pageScale}px`, color: '#000', overflow: 'hidden' }}>
                        <div style={{ overflow: 'hidden', overflowWrap: 'anywhere' }}>
                          Ditandatangani secara elektronik oleh:
                          <br />
                          <b>{(signers[f.signer]?.position || 'JABATAN').toUpperCase()}</b>
                        </div>
                        <b style={{ marginTop: 'auto', overflow: 'hidden', overflowWrap: 'anywhere' }}>
                          {signers[f.signer]?.name || `Penanda tangan ${f.signer + 1}`}
                        </b>
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setFields(fields.filter((_, i) => i !== idx))}
                      onKeyDown={() => {}}
                      style={{ position: 'absolute', right: 3, top: 0, cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ×
                    </span>
                  </div>
                );
              }}
            />
          </>
        ) : (
          <div className="text-muted p-5 text-center">Unggah PDF untuk mulai menentukan posisi tanda tangan.</div>
        )}
      </Col>
    </Row>
  );
};

DocusignForm.propTypes = {
  onDone: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default DocusignForm;
