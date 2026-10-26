import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from 'reactstrap';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
// import { Box } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { alert } from '../../components/atoms/Toast';
import Loader from '../../layouts/loader/Loader';
// import rupiah from '../../utils/rupiah';
import useAxios from '../../hooks/useAxios';

const ModalRealisasi = ({ modalRe, toggleRe, sppdDetail }) => {
  const [detailSppd, setDetailSppd] = useState();
  const [idSppd, setIdSppd] = useState();
  const [loading, setLoading] = useState(false);

  //   const [wb, setWb] = useState();
  //   const [ws, setWs] = useState();

  const [doc, setDoc] = useState('');
  const [docName, setDocName] = useState();

  const [tujuan, setTujuan] = useState([]);

  dayjs.locale('id');
  const api = useAxios();

  const getBase64 = (file) => {
    return new Promise((resolve) => {
      let baseURL = '';
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        baseURL = reader.result;
        resolve(baseURL);
      };
    });
  };

  useEffect(() => {
    console.log(doc);
  }, [doc]);

  useEffect(() => {
    if (modalRe && sppdDetail) {
      setIdSppd(sppdDetail.id);
      api.get(`dapi/sppd/pengajuan/${sppdDetail?.id}`).then((res) => {
        setDetailSppd(res.data.data);

        const tj = res.data.data?.tujuan_sppd;
        for (let i = 0; i < tj?.length; i++) {

          tj[i].rill_wb = dayjs(tj[i].waktu_berangkat);
          tj[i].rill_wt = dayjs(tj[i].waktu_kembali);
        }
        setTujuan(res.data.data?.tujuan_sppd);
        // console
      });
    } else {
      setDetailSppd(null);
    }
  }, [modalRe, sppdDetail]);



  const submit = async () => {
    setLoading(true);

    if (doc !== '') {
      console.log()
      await api.post(`dapi/sppd/pengajuan/realisasi`, { doc_file: doc, tujuan_realisasi: tujuan, id_sppd: idSppd }).then((res) => {
        if (res.data.success) {
          alert('success', 'Realisasi SPPD Berhasil');
          toggleRe();
          setDoc('');
          setDocName('');
        }
        setLoading(false);
      }).catch((err) => {
        alert('error', `${err.message}`);
        setLoading(false);
      });
    } else {
      alert('error', 'Lengkapi data terlebih dahulu !');
    }

  }

  useEffect(() => {
    console.log(tujuan);
  }, [tujuan]);

  return (
    <>
      <Modal isOpen={modalRe} toggle={toggleRe} size="lg" className="modal1" centered>
        <ModalHeader>FORM REALISASI SPPD</ModalHeader>
        {detailSppd ? (
          <ModalBody className="p-3 ">
            <ol>
              {tujuan?.map((t, i) => (
                <li key={t?.id} className="mb-3">
                  Tujuan : {t?.detail_tujuan}
                  <Box sx={{ p: 2, borderRadius: 2, border: '0.5px solid #C4C4C4' }}>
                    <Box className="mb-4">
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DemoContainer components={['DateTimePicker', 'DateTimePicker']}>
                          <DateTimePicker
                            label="Waktu Keberangkatan"
                            ampm={false}
                            // defaultValue={dayjs(tujuan[i].waktu_berangkat)}
                            value={tujuan[i].rill_wb}
                            onChange={(e) => { tujuan[i].rill_wb = e }}
                            viewRenderers={{
                              hours: renderTimeViewClock,
                              minutes: renderTimeViewClock,
                            }}
                          />
                          <DateTimePicker
                            ampm={false}
                            // defaultValue={dayjs(tujuan[i].waktu_kembali)}
                            value={tujuan[i].rill_wt}
                            onChange={(e) => { tujuan[i].rill_wt = e }}
                            label="Waktu Tiba Kembali"
                            viewRenderers={{
                              hours: renderTimeViewClock,
                              minutes: renderTimeViewClock,
                            }}
                          />
                        </DemoContainer>
                      </LocalizationProvider>
                    </Box>

                    <Box className="mb-4">
                      <TextField
                        id="outlined-basic"
                        style={{ width: '100%' }}
                        value={tujuan[i].rill_tiket}
                        type="number"
                        onChange={(e) => {
                          const tTiket = tujuan.map((item, index) =>
                            index === i
                              ? { ...item, rill_tiket: e.target.value }
                              : item
                          );
                          setTujuan(tTiket);
                        }}
                        label="Tiket Pesawat"
                        variant="outlined"
                        placeholder="Sesuai dengan Total Tiket PP (isi 0 jika tidak ada)"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">Rp</InputAdornment>, // Menambahkan "Rp" di belakang
                        }}
                      />
                    </Box>

                    <Box className="mb-4">
                      <TextField
                        id="outlined-basic"
                        style={{ width: '100%' }}
                        value={tujuan[i].rill_hotel}
                        type="number"
                        onChange={(e) => {
                          const tHotel = tujuan.map((item, index) =>
                            index === i
                              ? { ...item, rill_hotel: e.target.value }
                              : item
                          );
                          setTujuan(tHotel);
                        }}
                        label="Bill Hotel"
                        variant="outlined"
                        placeholder="Sesuai dengan Total Hotel yang digunakan (isi 0 jika tidak ada)"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">Rp</InputAdornment>, // Menambahkan "Rp" di belakang
                        }}
                      />
                    </Box>

                    <Box className="mb-4">
                      <TextField
                        id="outlined-basic"
                        style={{ width: '100%' }}
                        type="number"
                        value={tujuan[i].rill_t_lokal}
                        onChange={(e) => {
                          const tLokal = tujuan.map((item, index) =>
                            index === i
                              ? { ...item, rill_t_lokal: e.target.value }
                              : item
                          );
                          setTujuan(tLokal);
                        }}
                        label="Transport Lokal"
                        variant="outlined"
                        placeholder="Sesuai dengan Total Nota Transport Lokal Yang digunakan (isi 0 jika tidak ada)"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">Rp</InputAdornment>, // Menambahkan "Rp" di belakang
                        }}
                      />
                    </Box>

                    <Box className="mb-4">
                      <TextField
                        id="outlined-basic"
                        type='number'
                        style={{ width: '100%' }}
                        value={tujuan[i].rill_t_umum}
                        onChange={(e) => {
                          const tUmum = tujuan.map((item, index) =>
                            index === i
                              ? { ...item, rill_t_umum: e.target.value }
                              : item
                          );
                          setTujuan(tUmum);
                        }}
                        label="Transport Umum"
                        variant="outlined"
                        placeholder="Sesuai dengan Total Nota Transport Umum Yang digunakan (isi 0 jika tidak ada)"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">Rp</InputAdornment>, // Menambahkan "Rp" di belakang
                        }}
                      />
                    </Box>

                    <Box className="mb-4">
                      <TextField
                        id="outlined-basic"
                        type='number'
                        style={{ width: '100%' }}
                        value={tujuan[i].rill_bbm}
                        onChange={(e) => {
                          const tBbm = tujuan.map((item, index) =>
                            index === i
                              ? { ...item, rill_bbm: e.target.value }
                              : item
                          );
                          setTujuan(tBbm);
                        }}
                        label="BBM"
                        variant="outlined"
                        placeholder="Sesuai dengan bill bbm (isi 0 jika tidak ada)"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">Rp</InputAdornment>, // Menambahkan "Rp" di belakang
                        }}
                      />
                    </Box>
{/* 
                    <TextField
                      id="outlined-basic"
                      type="number"
                      style={{ width: '100%' }}
                      value={tujuan[i].rill_bbm}
                      onChange={(e) => {
                        const tBbm = tujuan.map((item, index) =>
                          index === i
                            ? { ...item, rill_bbm: e.target.value }
                            : item
                        );
                        setTujuan(tBbm);
                      }}
                      label="BBM"
                      variant="outlined"
                      placeholder="Sesuai dengan bill bbm (isi 0 jika tidak ada)"
                      
                      InputProps={{
                        startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
                        inputProps:{
                          min: 0,    // Batas minimum
                          max: 100,  // Batas maksimum
                        } // Menambahkan "Rp" di depan
                      }}
                    /> */}


                    {/* <Box className="mb-4">
                      <FormControl fullWidth>
                        <InputLabel htmlFor="outlined-adornment-amount">BBM</InputLabel>
                        <OutlinedInput
                          id="outlined-adornment-amount"
                          type="number"
                          value={tujuan[i].rill_bbm}
                          onChange={(e) => { tujuan[i].rill_bbm = e.target.value; console.log(tujuan)}}
                          startAdornment={<InputAdornment position="start">Rp</InputAdornment>}
                          label="Amount"
                          placeholder="Sesuai dengan bill bbm (isi 0 jika tidak ada)"
                        />
                      </FormControl>
                    </Box> */}
                  </Box>
                </li>
              ))}
            </ol>
            <Box className="mb-4">
              <FormControl fullWidth>
                <InputLabel htmlFor="outlined-adornment-amount">Docs</InputLabel>
                <OutlinedInput
                  id="outlined-adornment-amount"
                  startAdornment={
                    <InputAdornment position="start">
                      <CloudUploadIcon
                        className="text-primary"
                        onClick={() => document.getElementById('input-file').click()}
                        style={{ cursor: 'pointer' }}
                      />
                    </InputAdornment>
                  }
                  label="Amount"
                  value={docName || ''}
                  disabled
                  placeholder="Berisi Laporan dan dokumen pendukung lainnya dalam bentuk pdf "
                />
              </FormControl>
              <input
                type="file"
                id="input-file"
                style={{ display: 'none' }}
                accept="application/pdf"
                onChange={(e) => {
                  setDocName(e.target.files[0]?.name);
                  getBase64(e.target.files[0])
                    .then((result) => {
                      setDoc(result);
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                }}
              />
            </Box>
          </ModalBody>
        ) : (
          <Loader />
        )}
        <ModalFooter>
          <Button color="primary" style={{ width: '100%' }} onClick={submit} disabled={loading}>{loading ? 'Loading...' : 'SUBMIT REALISASI'}</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

ModalRealisasi.propTypes = {
  modalRe: PropTypes.bool,
  toggleRe: PropTypes.func,
  sppdDetail: PropTypes.object,
};

export default ModalRealisasi;
