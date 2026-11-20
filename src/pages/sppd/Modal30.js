import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, Label, Input, Alert, Button } from 'reactstrap';
import { useEffect, useState } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';

import 'dayjs/locale/id';
import './ModalDocs.scss';
import './Modal30.css';


const pdfFonts = require('../../assets/vfs_fonts');

pdfMake.vfs = pdfFonts.pdfMake.vfs;
pdfMake.fonts = {
  Archivo: {
    normal: 'Archivo-Regular.ttf',
    bold: 'Archivo-SemiBold.ttf',
    italics: 'Archivo-Italic.ttf',
    bolditalics: 'Archivo-SemiBoldItalic.ttf',
  },
};

const Modal30 = ({ modal3, toggle3, sppdDetail }) => {
  const api = useAxios();

  const [detailSppd, setDetailSppd] = useState();
  const [tujuan, setTujuan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mulai, setMulai] = useState(null);
  const [hingga, setHingga] = useState(null);
  const [pelaksana, setPelaksana] = useState(null); // info pelaksana tujuan terpilih (bukan karyawan => approval lewat email)
  const [email, setEmail] = useState('');
  const [tertunda, setTertunda] = useState([]); // klaim pelaksana non-karyawan yang masih menunggu persetujuan

  // rentang tanggal yang boleh dipilih (dari server): tanggal tujuan sampai akhir extend yang sudah disetujui
  const itemTujuan = (detailSppd || []).find((d) => String(d.id) === String(tujuan));
  const jendela = itemTujuan?.hotel30_mulai && itemTujuan?.hotel30_akhir ? { min: dayjs(itemTujuan.hotel30_mulai), max: dayjs(itemTujuan.hotel30_akhir) } : null;
  const sudahDiajukan = itemTujuan?.tigapuluh != null; // hanya sekali; pengajuan berikutnya = ubah tanggal
  const sudahDisetujui = sppdDetail?.current_status === 'signed';
  const fmt = (v) => dayjs(v).locale('id').format('DD MMM YYYY');

  const handleSubmitAction = async () => {
    if (!sppdDetail?.id) {
      alert('error', 'SPPD tidak valid');
      return;
    }
    if (!sudahDisetujui) {
      alert('error', 'Hotel 30% hanya bisa diajukan setelah SPPD disetujui');
      return;
    }
    if (!tujuan) {
      alert('error', 'Pilih tujuan');
      return;
    }
    if (!mulai || !hingga) {
      alert('error', 'Pilih tanggal mulai dan tanggal berakhir');
      return;
    }
    if (jendela && (mulai.isBefore(jendela.min, 'day') || hingga.isAfter(jendela.max, 'day'))) {
      alert('error', `Tanggal harus dalam ${fmt(jendela.min)} s.d. ${fmt(jendela.max)}`);
      return;
    }
    if (hingga.isBefore(mulai, 'day')) {
      alert('error', 'Tanggal berakhir tidak boleh sebelum tanggal mulai');
      return;
    }
    const payload = { sppd_id: sppdDetail.id, id_tujuan: Number(tujuan) };
    // include tanggal mulai dan berakhir
    payload.start_date = mulai.format('YYYY-MM-DD');
    payload.end_date = hingga.format('YYYY-MM-DD');
    if (pelaksana?.tamu && !sudahDiajukan) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        alert('error', 'Isi email pelaksana yang valid untuk permintaan persetujuan');
        return;
      }
      payload.email = email.trim();
    }
    setSubmitting(true);
    console.log('payload 30%', payload);
    try {
      const res = await api.post('dapi/sppd/tiga-puluh', payload);
      if (res?.data?.success) {
        alert('success', res?.data?.message || 'Pengajuan berhasil');
        if (typeof toggle3 === 'function') toggle3();
      } else {
        alert('error', res?.data?.message || 'Gagal mengajukan');
      }
    } catch (err) {
      alert('error', err?.message || err);
    } finally {
      setSubmitting(false);
    }
  };

  // const handleToggle = (id) => {
  //   // prevent toggling if the tujuan item already has a tigapuluh value (null/undefined = not submitted)
  //   const item = detailSppd?.find((d) => d.id === id);
  //   if (item?.tigapuluh != null) return;

  //   setTujuan((prev) => {
  //     if (!prev) return [id];
  //     if (prev.includes(id)) return prev.filter((v) => v !== id);
  //     return [...prev, id];
  //   });
  // };

  // single select change handler
  const handleSelectChange = (e) => {
    setTujuan(e.target.value);
    setPelaksana(null);
    // tanggal bawaan = seluruh rentang yang diizinkan; admin bisa mempersempit ke beberapa hari saja
    const item = (detailSppd || []).find((d) => String(d.id) === String(e.target.value));
    if (item?.tigapuluh?.mulai && item?.tigapuluh?.selesai) {
      // sudah pernah diajukan: tampilkan tanggal pengajuan sebelumnya untuk diubah
      setMulai(dayjs(item.tigapuluh.mulai));
      setHingga(dayjs(item.tigapuluh.selesai));
    } else if (item?.hotel30_mulai && item?.hotel30_akhir) {
      setMulai(dayjs(item.hotel30_mulai));
      setHingga(dayjs(item.hotel30_akhir));
    } else {
      setMulai(null);
      setHingga(null);
    }
    if (e.target.value) {
      api.get(`dapi/sppd/tiga-puluh/${e.target.value}/pelaksana`).then((res) => setPelaksana(res.data.data)).catch(() => setPelaksana(null));
    }
  };

  const kirimUlang = async (id, emailTujuan) => {
    // eslint-disable-next-line no-alert
    const alamat = window.prompt('Kirim permintaan persetujuan ke email:', emailTujuan || '');
    if (!alamat) return;
    try {
      const res = await api.post(`dapi/sppd/tiga-puluh/${id}/kirim`, { email: alamat.trim() });
      alert('success', res?.data?.message || 'Terkirim');
    } catch (err) {
      alert('error', err?.response?.data?.message || 'Gagal mengirim');
    }
  };

  const tandaiManual = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Catat bahwa pelaksana sudah menandatangani secara manual?')) return;
    try {
      const res = await api.post(`dapi/sppd/tiga-puluh/${id}/manual`);
      alert('success', res?.data?.message || 'Tercatat');
      setTertunda((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      alert('error', err?.response?.data?.message || 'Gagal mencatat');
    }
  };

  useEffect(() => {
    if (modal3 && sppdDetail?.id) {
      api.get(`dapi/sppd/tujuan/${sppdDetail.id}`).then((res) => {
        const daftar = res.data.data || [];
        setDetailSppd(daftar);
        // klaim yang sudah diajukan: tampilkan yang pelaksananya bukan karyawan dan belum menjawab
        Promise.all(daftar.filter((d) => d?.tigapuluh != null).map((d) => api.get(`dapi/sppd/tiga-puluh/${d.id}/pelaksana`).then((r) => ({ id: d.id, nama: d.detail_tujuan, ...r.data.data })).catch(() => null)))
          .then((hasil) => setTertunda(hasil.filter((x) => x && x.tamu && !x.dipakai_at)));
      });
    } else {
      setDetailSppd([]);
      setTertunda([]);
      setPelaksana(null);
      setEmail('');
      setTujuan('');
      setMulai(null);
      setHingga(null);
    }
  }, [modal3, sppdDetail]);
  //  console.log('sppdDetail modal 30%', sppdDetail);

  return (
    <Modal isOpen={modal3} toggle={toggle3} size="md" className="m30" centered scrollable>
      <ModalHeader toggle={toggle3}>Pengajuan Biaya Hotel 30%</ModalHeader>
      <ModalBody>
        {!sudahDisetujui ? <Alert color="warning">Hotel 30% hanya bisa diajukan setelah SPPD disetujui.</Alert> : null}
        <p className="m30-intro">
          Pelaku perjalanan dinas yang tidak menginap di hotel/penginapan atau tidak punya bill hotel bisa mengajukan 30% dari rate hotel yang disediakan perusahaan.
        </p>

        <div className="m30-kartu">
          <span className="m30-label">Tujuan SPPD</span>
          {!detailSppd || detailSppd.length === 0 ? (
            <div className="text-muted">Tidak ada tujuan</div>
          ) : (
            <Input id="tujuan" type="select" value={tujuan} onChange={handleSelectChange}>
              <option value="">Pilih tujuan</option>
              {detailSppd.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.detail_tujuan}
                  {item?.tigapuluh != null ? ' (sudah diajukan, bisa diubah)' : ''}
                </option>
              ))}
            </Input>
          )}
        </div>

        <div className="m30-kartu">
          <span className="m30-label">Tanggal Hotel 30%</span>
          {sudahDiajukan ? <div className="m30-hint mb-2">Tujuan ini sudah pernah diajukan. Hotel 30% hanya bisa diajukan sekali, jadi pengajuan kedua hanya mengubah tanggal pengajuan sebelumnya.</div> : null}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="m30-tanggal">
              <div>
                <Label for="mulai" className="small text-muted mb-1">
                  Mulai
                </Label>
                <DatePicker
                  value={mulai}
                  onChange={setMulai}
                  disabled={!jendela}
                  minDate={jendela?.min}
                  maxDate={hingga && jendela && hingga.isBefore(jendela.max) ? hingga : jendela?.max}
                  renderInput={(params) => <Input {...params} id="mulai" type="text" className="bg-white w-100" placeholder="Pilih tanggal mulai" readOnly />}
                />
              </div>
              <div>
                <Label for="hingga" className="small text-muted mb-1">
                  Hingga
                </Label>
                <DatePicker
                  value={hingga}
                  onChange={setHingga}
                  disabled={!jendela}
                  minDate={mulai && jendela && mulai.isAfter(jendela.min) ? mulai : jendela?.min}
                  maxDate={jendela?.max}
                  renderInput={(params) => <Input {...params} id="hingga" type="text" className="bg-white w-100" placeholder="Pilih tanggal hingga" readOnly />}
                />
              </div>
            </div>
          </LocalizationProvider>
          {jendela ? (
            <div className="m30-rentang">
              <span>Bisa dipilih:</span>
              <span className="m30-chip">{fmt(jendela.min)}</span>
              <span>s.d.</span>
              <span className="m30-chip">{fmt(jendela.max)}</span>
              <span className="m30-hint">
                {itemTujuan?.hotel30_ekstend_akhir
                  ? `SPPD sampai ${fmt(itemTujuan.waktu_kembali)}, extend yang sudah disetujui sampai ${fmt(itemTujuan.hotel30_ekstend_akhir)}. `
                  : 'Sesuai tanggal SPPD. '}
                Boleh dipilih beberapa hari saja.
              </span>
            </div>
          ) : (
            <div className="m30-rentang">
              <span className="m30-hint">Pilih tujuan dulu untuk melihat tanggal yang bisa dipilih.</span>
            </div>
          )}
        </div>

        {pelaksana?.tamu && !sudahDiajukan && (
          <div className="m30-info">
            <div>
              Pelaksana bukan karyawan: <b>{pelaksana.nama}</b>
              {pelaksana.jabatan ? `, ${pelaksana.jabatan}` : ''}. Persetujuannya dikirim lewat email.
            </div>
            <Input className="mt-2" type="email" placeholder="Email pelaksana" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}

        {tertunda.length > 0 && (
          <div className="mb-2">
            <span className="m30-label">Menunggu persetujuan pelaksana</span>
            {tertunda.map((x) => (
              <div key={x.id} className="m30-tunggu">
                <small>
                  <b>{x.nama}</b> — {x.jabatan || ''}
                  {x.email ? ` (${x.email})` : ' (email belum dikirim)'}
                </small>
                <span className="d-flex gap-1 flex-wrap">
                  <Button size="sm" outline color="primary" onClick={() => kirimUlang(x.id, x.email)}>
                    Kirim ulang email
                  </Button>
                  <Button size="sm" outline color="secondary" onClick={() => tandaiManual(x.id)}>
                    Tanda tangan manual
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="m30-aksi">
          <button type="button" className="btn btn-light" onClick={toggle3}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmitAction} disabled={submitting || !sudahDisetujui}>
            {submitting ? 'Mengirim...' : sudahDiajukan ? 'Simpan Perubahan' : 'Ajukan 30%'}
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
};

Modal30.propTypes = {
  modal3: PropTypes.bool,
  toggle3: PropTypes.func,
  sppdDetail: PropTypes.object,
};

export default Modal30;
