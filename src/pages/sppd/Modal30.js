import PropTypes from 'prop-types';
import { Modal, ModalBody, FormGroup, Label, Row, Col, Input } from 'reactstrap';
import { useEffect, useState } from 'react';
import * as pdfMake from 'pdfmake/build/pdfmake';
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';

import 'dayjs/locale/id';
import './ModalDocs.scss';


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

  const handleSubmitAction = async () => {
    if (!sppdDetail?.id) {
      alert('error', 'SPPD tidak valid');
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
    const payload = { sppd_id: sppdDetail.id, id_tujuan: Number(tujuan) };
    // include tanggal mulai dan berakhir
    payload.start_date = mulai.format('YYYY-MM-DD');
    payload.end_date = hingga.format('YYYY-MM-DD');
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
  const handleSelectChange = (e) => setTujuan(e.target.value);

  useEffect(() => {
    if (modal3 && sppdDetail?.id) {
      api.get(`dapi/sppd/tujuan/${sppdDetail.id}`).then((res) => {
        setDetailSppd(res.data.data || []);
        console.log('detail tujuan sppd modal 30%', res.data.data || []);
      });
    } else {
      setDetailSppd([]);
    }
  }, [modal3, sppdDetail]);
  //  console.log('sppdDetail modal 30%', sppdDetail);

  return (
    <Modal isOpen={modal3} toggle={toggle3} size="md" className="modal1" centered>
      <ModalBody className="p-4 ">
        <h4>Pengajuan Biaya Hotel 30%</h4>
        <hr />
        <p>Pelaku Perjalanan Dinas yang tidak menginap di Hotel/Penginapan atau tidak memiliki bill hotel bisa mengajukan 30% dari rate hotel yang disedikan oleh perusahaan. Silakan pilih tujuan Perjalanan Dinas di bawah ini untuk mengajukan</p>
        <FormGroup>
          <Label>Tujuan SPPD</Label>
          
            <div className="tujuan-select">
              {(!detailSppd || detailSppd.length === 0) ? (
                <div>Tidak ada tujuan</div>
              ) : (
                <Input id="tujuan" type="select" value={tujuan} onChange={handleSelectChange}>
                  <option value="">Pilih tujuan</option>
                  {detailSppd.map((item) => (
                    <option key={item.id} value={String(item.id)} disabled={Boolean(item?.tigapuluh != null)}>
                      {item.detail_tujuan}{item?.tigapuluh != null ? ' (sudah diajukan)' : ''}
                    </option>
                  ))}
                </Input>
              )}
            </div>

           

          <div className="mt-3">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Row>
                  <Col md={6} className="mb-2">
                    <FormGroup>
                      <Label for="mulai" className="d-block mb-1">Mulai</Label>
                      <DatePicker
                        value={mulai}
                        onChange={setMulai}
                        renderInput={(params) => (
                          <Input
                            {...params}
                            id="mulai"
                            type="text"
                            className="bg-white w-100"
                            style={{ width: '100%' }}
                            placeholder="Pilih tanggal mulai"
                            readOnly
                          />
                        )}
                      />
                    </FormGroup>
                  </Col>

                  <Col md={6} className="mb-2">
                    <FormGroup>
                      <Label for="hingga" className="d-block mb-1">Hingga</Label>
                      <DatePicker
                        value={hingga}
                        onChange={setHingga}
                        renderInput={(params) => (
                          <Input
                            {...params}
                            id="hingga"
                            type="text"
                            className="bg-white w-100"
                            style={{ width: '100%' }}
                            placeholder="Pilih tanggal hingga"
                            readOnly
                          />
                        )}
                      />
                    </FormGroup>
                  </Col>
                </Row>
              </LocalizationProvider>
            </div>
        </FormGroup>
        <div className="d-flex justify-content-end mt-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmitAction}
            disabled={submitting}
          >
            {submitting ? 'Mengirim...' : 'Ajukan 30%'}
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
