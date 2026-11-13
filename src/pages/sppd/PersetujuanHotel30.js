import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Alert, Button, Card, CardBody, Container, Input } from 'reactstrap';

const base = `${process.env.REACT_APP_BASEURL}`.replace(/\/$/, '');

// Halaman publik (tanpa login): pelaksana SPPD non-karyawan menyetujui klaim hotel 30% lewat tautan email
const PersetujuanHotel30 = () => {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await axios.get(`${base}/dapi/sppd/public/hotel30/${token}`);
      setInfo(res.data.data);
    } catch (e) {
      setError('Tautan tidak valid.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const jawab = async (hasil) => {
    setSaving(true);
    setError('');
    try {
      const res = await axios.post(`${base}/dapi/sppd/public/hotel30/${token}`, { hasil, catatan });
      setPesan(res.data.message);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menyimpan jawaban');
    } finally {
      setSaving(false);
    }
  };

  const tanggal = (v) => (v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');

  return (
    <Container className="py-4" style={{ maxWidth: 640 }}>
      {error && <Alert color="danger">{error}</Alert>}
      {pesan && <Alert color="success">{pesan}</Alert>}
      {info && (
        <Card>
          <CardBody>
            <h5>Persetujuan Klaim Biaya Hotel 30%</h5>
            <table className="table table-sm mt-3">
              <tbody>
                <tr><td>Nama</td><td><b>{info.nama}</b></td></tr>
                <tr><td>Jabatan</td><td>{info.jabatan || '-'}</td></tr>
                <tr><td>Nomor SPPD</td><td>{info.nomor}</td></tr>
                <tr><td>Tujuan</td><td>{info.tujuan || '-'}</td></tr>
                <tr><td>Periode</td><td>{tanggal(info.mulai)} s.d. {tanggal(info.selesai)}</td></tr>
              </tbody>
            </table>
            <p>
              Dengan menyetujui, Anda menyatakan tidak menginap di hotel/penginapan atau tidak memiliki bill hotel pada periode tersebut,
              dan mengajukan 30% dari rate hotel yang disediakan perusahaan.
            </p>
            {info.sudah_dipakai ? (
              <Alert color="secondary" className="mb-0">Jawaban sudah tercatat: {info.hasil === 'setuju' ? 'disetujui' : 'ditolak'}.</Alert>
            ) : info.kedaluwarsa ? (
              <Alert color="warning" className="mb-0">Tautan sudah kedaluwarsa. Minta pengaju mengirim ulang.</Alert>
            ) : (
              <>
                <Input type="textarea" rows={2} maxLength={200} placeholder="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
                <div className="d-flex gap-2 mt-3">
                  <Button color="primary" disabled={saving} onClick={() => jawab('setuju')}>Setujui</Button>
                  <Button outline color="danger" disabled={saving} onClick={() => jawab('tolak')}>Tolak</Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </Container>
  );
};

export default PersetujuanHotel30;
