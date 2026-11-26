import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import "dayjs/locale/id";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import PropTypes from 'prop-types';
import {
  UncontrolledPopover,
  PopoverHeader,
  PopoverBody,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Button as B,
} from 'reactstrap';

// import Checkbox from '@mui/joy/Checkbox';
// import List from '@mui/joy/List';
// import ListItem from '@mui/joy/ListItem';
// import ListItemDecorator from '@mui/joy/ListItemDecorator';
// import LaptopIcon from '@mui/icons-material/Laptop';
// import TvIcon from '@mui/icons-material/Tv';
// import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';

import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { confirmAlert } from 'react-confirm-alert';
import MaterialIcon from '@material/react-material-icon';
import Button from '@mui/material/Button';
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import DataTable from 'react-data-table-component';
import { alert } from '../../components/atoms/Toast';
import useAxios from '../../hooks/useAxios';
import 'react-confirm-alert/src/react-confirm-alert.css';
import './style.scss';
import { OPSI_TIKET, OPSI_HOTEL, OPSI_TRANSPORT } from './opsiSppd';

dayjs.locale("id");

// import { alert } from '../../components/atoms/Toast';

const Pengajuan = ({
  employes,
  pihaks,
  jeniss,
  kategoris,
  dasars,
  klasifikasi,
  sumberBiaya,
  renbis,
  closeForm,
  refetchSubmitted,
}) => {

  const [loading, setLoading] = React.useState(false)
  const [pihak, setPihak] = React.useState(1);
  const [modal, setModal] = useState(false);
  // variable sppd
  const [inarasi, setNarasi] = React.useState('');
  const [nama, setNama] = React.useState('');
  const [jabatan, setJabatan] = React.useState('');
  const [employeID, setEmployeID] = React.useState('');

  const [penomoran, setPenomoran] = React.useState();
  const [employe, setEmploye] = React.useState(null);
  const [gol, setGol] = React.useState();

  // VARIABLE TUJUAN PERJALANAN DINAS
  const [kategori, setKategori] = React.useState('');
  const [jenis, setJenis] = React.useState('');
  const [dasar, setDasar] = React.useState('');

  const [bisnis, setBisnis] = React.useState('');
  const [biaya, setBiaya] = React.useState('');
  const [rkap, setRkap] = React.useState('');
  const [rkapLainnya, setRkapLainnya] = React.useState('');
  const [alamat, setAlamat] = React.useState('');
  const [tugas, setTugas] = React.useState('');
  const [wb, setWb] = React.useState(dayjs());
  const [ws, setWs] = React.useState(dayjs().add(1, 'day'));
  const [undangan, setUndangan] = React.useState('');

  const [tujuans, setTujuans] = React.useState([]);

  // persentase
  const [makan, setMakan] = React.useState(50);
  const [tiket, setTiket] = React.useState(50);
  const [transport, setTransport] = React.useState(50);
  const [hotel, setHotel] = React.useState(50);
  const [uangSaku, setUangSaku] = React.useState(50);

  // tambahan
  const [bbm, setBbm] = React.useState(0);

  // const [value, setValue] = React.useState([]);
  // colums datatable

  const [cSelected, setCSelected] = useState([]);
  // perlu tiket: 1 = dipesan divisi umum (UmumSppd, bersamaan dengan KeuanganSppd), 2 = dipesan admin/mandiri, 0 = tidak perlu tiket
  const [perluTiket, setPerluTiket] = useState(1);
  // hotel: sendiri = dipesan yang berangkat, admin = dipesan admin (tidak masuk uang muka)
  const [hotelOleh, setHotelOleh] = useState('sendiri');
  // transportasi lokal: mandiri, atau vendor (tidak masuk uang muka)
  const [transportLokal, setTransportLokal] = useState('mandiri');
  // const [rSelected, setRSelected] = useState(null);

  const [listSppd, setListSppd] = useState([]);
  const [sId, setSId] = useState(null);
  const onCheckboxBtnClick = (selected) => {
    const index = cSelected.indexOf(selected);
    if (index < 0) {
      cSelected.push(selected);
    } else {
      cSelected.splice(index, 1);
    }
    setCSelected([...cSelected]);
    console.log(cSelected.length);
  };

  const columns = [
    {
      name: 'Action',
      selector: (row) => (
        <MaterialIcon
          icon="delete_forever"
          style={{ fontSize: 20, cursor: 'pointer' }}
          onClick={() => {
            setTujuans(tujuans.filter((_, i) => i !== tujuans.indexOf(row)));
          }}
        ></MaterialIcon>
      ),
    },
    {
      name: 'Dasar SPPD',
      selector: (row) => dasars?.filter((item) => item.id === row.dasar_sppd)[0]?.dasar_sppd,
    },
    {
      name: 'Tujuan',
      selector: (row) => row.detail_tujuan,
    },
    {
      name: 'Tugas',
      selector: (row) => row.tugas_sppd,
    },
    {
      name: 'Waktu Berangkat',
      selector: (row) => row.waktu_berangkat.format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      name: 'Tiba Kembali',
      selector: (row) => row.waktu_kembali.format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      name: 'Perlu Tiket',
      selector: (row) => OPSI_TIKET.find((o) => o.key === row.perlu_tiket)?.singkat || 'Ya',
    },
    {
      name: 'Hotel',
      selector: (row) => (OPSI_HOTEL.find((o) => o.key === row.hotel_oleh)?.singkat || 'Pemohon'),
    },
    {
      name: 'Transport Lokal',
      selector: (row) => (row.transport_lokal === 'vendor' ? 'Vendor' : 'Mandiri'),
    },
  ];

  const toggle = () => setModal(!modal);

  const handleChange = (event, newValue) => {
    if (event.target.name === 'makan') {
      setMakan(newValue);
    } else if (event.target.name === 'tiket') {
      setTiket(newValue);
    } else if (event.target.name === 'transport') {
      setTransport(newValue);
    } else if (event.target.name === 'hotel') {
      setHotel(newValue);
    } else if (event.target.name === 'uangSaku') {
      setUangSaku(newValue);
    }
  };

  const api = useAxios();
  const setDetail = async (emID) => {
    await api
      .get(`dapi/sppd/static/employee/${emID}`)
      .then((res) => {
        setEmployeID(emID);
        setNama(res?.data?.data?.first_name);
        setJabatan(res?.data?.data?.position_name);
        setGol(res?.data?.data?.rate_sppd);
        setPenomoran(res?.data?.data?.nomor_sppd);
      })
      .catch((err) => console.log(err));
  };

  const getListSppd = () => {
    api.get(`dapi/sppd/listsharing?wb=${wb.format('YYYY-MM-DD')}`).then((res) => {
      setListSppd(res.data.data);
      // console.log(res.data.data);
    });
  };

  useEffect(() => {
    getListSppd();
    setSId(null);
  }, [wb]);

  useEffect(() => {
    setNama(' ');
    setJabatan(' ');
    setEmployeID('-');
    setTujuans([]);
    if (pihaks) {
      setGol(pihaks?.filter((item) => item.id === pihak)[0].base_golongan[0]?.id);
      setPenomoran(pihaks?.filter((item) => item.id === pihak)[0].base_penomoran[0]?.id);
    }
  }, [pihak]);

  useEffect(() => {
    setDetail(employe?.value);
    setTujuans([]);
  }, [employe]);

  // set persen auto
  useEffect(() => {
    if (biaya === 1) {
      setMakan(100);
      setTiket(100);
      setTransport(100);
      setHotel(100);
      setUangSaku(100);
    } else if (biaya === 2) {
      setMakan(0);
      setTiket(0);
      setTransport(0);
      setHotel(0);
      setUangSaku(0);
    } else {
      setMakan(50);
      setTiket(50);
      setTransport(50);
      setHotel(50);
      setUangSaku(50);
    }
  }, [biaya]);

  const addTujuan = (e) => {
    e.preventDefault();

    if (nama && jabatan && nama !== ' ' && jabatan !== ' ') {
      toggle();
    } else {
      alert('error', 'Lengkapi data terlebih dahulu');
    }
  };

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

  const saveTujuan = (e) => {
    console.log(sId?.value);
    e.preventDefault();
    if (
      jenis !== '' &&
      dasar !== '' &&
      bisnis !== '' &&
      biaya !== '' &&
      kategori !== '' &&
      alamat !== '' &&
      tugas !== '' &&
      cSelected.length !== 0
    ) {
      const tujuan = {
        jenis_sppd: jenis,
        dasar_sppd: dasar,
        klasifikasi: bisnis,
        sumber_biaya: biaya,
        p_tiket: tiket,
        p_um: makan,
        p_tl: transport,
        p_us: uangSaku,
        p_hotel: hotel,
        kategori_sppd: kategori,
        detail_tujuan: alamat,
        tugas_sppd: tugas,
        waktu_berangkat: wb,
        waktu_kembali: ws,
        file_undangan: undangan || '-',
        renbis: rkap === 'lainnya' ? null : rkap || null,
        rkap_lainnya: rkap === 'lainnya' ? rkapLainnya.trim() || 'Lainnya' : null,
        moda: cSelected.toLocaleString(),
        perlu_tiket: perluTiket,
        hotel_oleh: hotelOleh,
        transport_lokal: transportLokal,
        ubbm: bbm || 0,
        shareWith: sId?.value || null,
      };

      tujuans.push(tujuan);
      setJenis('');
      setDasar('');
      setBisnis('');
      setBiaya('');
      setKategori('');
      setAlamat('');
      setRkap('');
      setRkapLainnya('');
      setUndangan('');
      setTugas('');
      setCSelected([]);
      setPerluTiket(1);
      setHotelOleh('sendiri');
      setTransportLokal('mandiri');
      setBbm(0);
      setSId(null);
      alert('success', 'Tujuan SPPD Berhasil ditambahkan');

      toggle();
    } else {
      alert('error', 'Lengkapi data terlebih dahulu');
    }
  };
  const savePengajuan = async () => {
    await confirmAlert({
      title: `Kamu Yakin ?`,
      message: `Silakan periksa kembali data yang anda masukkan`,
      buttons: [
        {
          label: 'Yes',
          onClick: () => {
            setLoading(true)
            console.log(tujuans);
            api
              .post('dapi/sppd/pengajuan', {
                employe_id: employeID,
                name: nama,
                jabatann: jabatan,
                rate: gol,
                nomor: penomoran,
                narasi: inarasi,
                tujuan_sppd: tujuans,
              })
              .then((res) => {
                setLoading(false);
                if (res.status === 200) {
                  alert('success', 'SPPD Berhasil diajukan !');
                  if (pihak === 1) {
                    setPihak(2);
                  } else {
                    setPihak(1);
                  }
                  closeForm();
                  refetchSubmitted();
                } else {
                  alert('error', 'SPPD Gagal diajukan, Hubungi Tim IT untuk problem selanjutnya !');
                }
              })
              .catch((err) => alert('error', `${err.message}`));
          },
        },
        {
          label: 'No',
          onClick: () => { },
        },
      ],
    });
  };
  if (!pihaks) return <>Loading ....</>;

  return (
    <>
      <section className="pj-seksi">
        <header className="pj-judul">
          <span className="pj-no">1</span>
          <div className="pj-judul-teks">
            <h6>Data pelaksana</h6>
            <p>Identitas pelaksana perjalanan dinas dan narasi penugasan.</p>
          </div>
        </header>
        <div className="pj-isi">
      <Box className="mb-3">
        <TextField
          select
          style={{ width: '100%' }}
          variant="outlined"
          value={pihak}
          onChange={(e) => setPihak(e.target.value)}
          label="Pihak Yang Melakukan SPPD"
        >
          {pihaks?.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.pihak_name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box className="mb-3">
        <TextField
          style={{ width: '100%' }}
          id="outlined-multiline-static"
          placeholder="Berdasarkan . . . . . . . Dengan ini memberi tugas kepada :"
          label="Narasi Tugas"
          multiline
          value={inarasi}
          onChange={(e) => setNarasi(e.target.value)}
          rows={4}
        />
      </Box>


      {pihak === 1 ? (
        // pihak internal
        <>
          <Box className="mb-3">
            <Autocomplete
              style={{ width: '100%' }}
              disablePortal
              id="combo-box-demo"
              options={employes || []}
              value={employe}
              onChange={(event, newValue) => {
                if (typeof newValue === 'string') {
                  setEmploye({
                    label: newValue,
                  });
                } else if (newValue && newValue.inputValue) {
                  setEmploye({
                    label: newValue.inputValue,
                  });
                } else {
                  setEmploye(newValue);
                }
              }}
              getOptionLabel={(option) => {
                if (typeof option === 'string') {
                  return option;
                }
                if (option.inputValue) {
                  return option.inputValue;
                }
                return option.label;
              }}
              renderOption={(props, option) => <li {...props}>{option.label}</li>}
              renderInput={(params) => <TextField {...params} label="Nama Karyawan" />}
            />
          </Box>
        </>
      ) : (
        ''
      )}

      {pihak === 2 && pihaks ? (
        <>
          <Box className="mb-3">
            <TextField
              id="outlined-basic"
              style={{ width: '100%' }}
              label="Nama"
              value={nama || ' '}
              onChange={(e) => setNama(e.target.value)}
              variant="outlined"
            />
          </Box>

          <Box
            className="mb-3"
            sx={{ p: 1, borderRadius: 2, marginTop: 2, border: '0.5px solid #C4C4C4' }}
          >
            <FormControl>
              {penomoran && pihak === 2 ? (
                <>
                  <RadioGroup
                    row
                    aria-labelledby="demo-controlled-radio-buttons-group"
                    name="controlled-radio-buttons-group"
                    value={
                      penomoran ||
                      pihaks?.filter((item) => item.id === pihak)[0].base_penomoran[0]?.id
                    }
                    onChange={(e) => setPenomoran(e.target.value)}
                  >
                    {pihaks
                      ?.filter((item) => item.id === pihak)[0]
                      .base_penomoran?.map((item) => (
                        <FormControlLabel
                          value={item.id}
                          key={item.id}
                          control={<Radio />}
                          label={item.name}
                          className="me-5"
                        />
                      ))}
                  </RadioGroup>
                </>
              ) : (
                ''
              )}
            </FormControl>
          </Box>

          <Box className="mb-3">
            <TextField
              id="outlined-basic"
              style={{ width: '100%' }}
              value={jabatan || ' '}
              onChange={(e) => setJabatan(e.target.value)}
              label="Jabatan / Instansi"
              variant="outlined"
            />
          </Box>
          <Box className="mb-3">
            {gol ? (
              <TextField
                style={{ width: '100%' }}
                variant="outlined"
                value={gol || pihaks?.filter((item) => item.id === pihak)[0].base_golongan[0]?.id}
                onChange={(e) => setGol(e.target.value)}
                select
                label="Golongan"
              >
                {pihaks
                  ?.filter((item) => item.id === pihak)[0]
                  .base_golongan?.map((item) => (
                    <MenuItem value={item.id} key={item.id}>
                      {item.golongan}
                    </MenuItem>
                  ))}
              </TextField>
            ) : (
              ''
            )}

            <a type="button" id="PopoverLegacy" className="text-muted float-end">
              {' '}
              <MaterialIcon icon="help" className="text-muted float-end" />
            </a>

            <UncontrolledPopover placement="bottom" target="PopoverLegacy" trigger="legacy">
              <PopoverHeader>Keterangan</PopoverHeader>
              <PopoverBody>
                <b>Gol 1</b> : Asisten Setda Aceh, Kepala Dinas, Kepala/Wakil Deputi <br />
                <b>Gol 2 </b>: Sekretaris Dinas, Kepala Bagian, Kepala Divisi
                <br />
                <b>Gol 3 </b>: Yang tidak termasuk dalam Golongan 1 dan Golongan 2<br />
              </PopoverBody>
            </UncontrolledPopover>
          </Box>
        </>
      ) : (
        // end pihak ekstenernal
        ''
      )}
        </div>
      </section>

      <section className="pj-seksi">
        <header className="pj-judul">
          <span className="pj-no">2</span>
          <div className="pj-judul-teks">
            <h6>Tujuan perjalanan dinas</h6>
            <p>Tambahkan satu atau lebih tujuan. Setiap tujuan memiliki jadwal, tiket, hotel, dan transportasi lokal sendiri.</p>
          </div>
          <Button variant="outlined" className="pj-tambah" startIcon={<MaterialIcon icon="add" />} onClick={addTujuan}>
            Tambah tujuan
          </Button>
        </header>
        {tujuans.length > 0 ? (
          <div className="pj-tabel">
            <DataTable columns={columns} data={tujuans} />
          </div>
        ) : (
          <div className="pj-kosong">
            <MaterialIcon icon="flight_takeoff" />
            <strong>Belum ada tujuan</strong>
            <span>Klik &quot;Tambah tujuan&quot; untuk mengisi tujuan perjalanan dinas.</span>
          </div>
        )}
      </section>
      {tujuans.length > 0 ? (
        <div className="pj-aksi">
          <Button color="primary" variant="contained" size="large" onClick={savePengajuan} disabled={loading}>
            {loading ? 'Loading . . .' : 'Submit Pengajuan'}
          </Button>
        </div>
      ) : null}

      {/* modal tujuan */}
      <Modal isOpen={modal} toggle={toggle} size="lg" scrollable className="modal-tujuan">
        <ModalHeader toggle={toggle}>Tujuan SPPD</ModalHeader>
        <ModalBody>
          <div className="tj-bagian">Informasi dasar</div>
          <div className="tj-grid">
          <Box className="mb-3">
            <TextField
              style={{ width: '100%' }}
              variant="outlined"
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              select
              label="Jenis Perjalanan Dinas"
            >
              {jeniss?.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.jenis_sppd}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box className="mb-3">
            <TextField
              style={{ width: '100%' }}
              variant="outlined"
              value={dasar}
              onChange={(e) => setDasar(e.target.value)}
              select
              label="Dasar Perjalanan Dinas"
            >
              {dasars?.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.dasar_sppd}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          </div>

          {dasar === 2 ? (
            <>
              {' '}
              <Box className="mb-3">
                <Button
                  style={{ width: '100%' }}
                  component="label"
                  size="large"
                  variant={undangan !== '' ? 'contained' : 'outlined'}
                  tabIndex={-1}
                  startIcon={<CloudUploadIcon />}
                  onClick={() => document.getElementById('input-file').click()}
                >
                  {undangan !== '' ? 'Upload Ulang' : 'Upload Undangan'}
                </Button>
              </Box>
              <input
                type="file"
                id="input-file"
                style={{ display: 'none' }}
                accept="application/pdf"
                onChange={(e) => {
                  getBase64(e.target.files[0])
                    .then((result) => {
                      setUndangan(result);
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                }}
              />
            </>
          ) : (
            <></>
          )}

          {/* biaya */}
          <div className="tj-bagian">Pembiayaan</div>
          <Box className="mb-3">
            <TextField
              style={{ width: '100%' }}
              variant="outlined"
              value={bisnis}
              onChange={(e) => setBisnis(e.target.value)}
              select
              label="Klasifikasi Bisnis"
            >
              {klasifikasi?.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.k_bisnis}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box className="mb-3">
            <TextField
              style={{ width: '100%' }}
              variant="outlined"
              value={biaya}
              onChange={(e) => setBiaya(e.target.value)}
              select
              label="Sumber Biaya"
            >
              {sumberBiaya?.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.sumber_biaya}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {biaya === 1 || biaya === 3 ? (
            <Box className="mb-3">
              <TextField
                style={{ width: '100%' }}
                variant="outlined"
                value={rkap}
                onChange={(e) => setRkap(e.target.value)}
                select
                label="RKAP PEMA"
              >
                {renbis?.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    <b>{item.renbis} </b> <i> &nbsp;tahun anggaran {item.tahun}</i>
                  </MenuItem>
                ))}
                <MenuItem value="lainnya">
                  <b>Lainnya</b> <i> &nbsp;tulis manual</i>
                </MenuItem>
              </TextField>
            </Box>
          ) : (
            <></>
          )}

          {(biaya === 1 || biaya === 3) && rkap === 'lainnya' ? (
            <Box className="mb-3">
              <TextField
                style={{ width: '100%' }}
                variant="outlined"
                label="RKAP lainnya (tulis manual)"
                placeholder="Tuliskan nama RKAP / proyek. Tulisan ini yang akan tampil di Surat Tugas"
                helperText="Akan tampil di Surat Tugas (ST) persis seperti yang ditulis. Bila dikosongkan, ST menampilkan 'Lainnya'."
                value={rkapLainnya}
                onChange={(e) => setRkapLainnya(e.target.value)}
                inputProps={{ maxLength: 255 }}
              />
            </Box>
          ) : null}

          {biaya === 3 ? (
            <>
              <Box sx={{ p: 2, borderRadius: 2, marginTop: 2, border: '0.5px solid #C4C4C4' }} className="tj-kartu">
                <h6 className="tj-sub">Ketentuan sharing</h6>
                <Slider
                  step={5}
                  name="tiket"
                  value={tiket}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  onChange={handleChange}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: -2 }}>
                  <Typography
                    variant="body2"
                    onClick={() => setTiket(100)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {tiket}% Pema
                  </Typography>
                  <Typography variant="body2" color="primary">
                    Tiket
                  </Typography>
                  <Typography
                    variant="body2"
                    onClick={() => setTiket(0)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {100 - tiket}% Sponsor
                  </Typography>
                </Box>

                {/* uang makan  */}
                <Slider
                  className="mt-4"
                  name="makan"
                  step={5}
                  value={makan}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  onChange={handleChange}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: -2 }}>
                  <Typography
                    variant="body2"
                    onClick={() => setMakan(100)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {makan}% Pema
                  </Typography>
                  <Typography variant="body2" color="primary">
                    Uang Makan
                  </Typography>
                  <Typography
                    variant="body2"
                    onClick={() => setMakan(0)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {100 - makan}% Sponsor
                  </Typography>
                </Box>

                {/* transport */}
                <Slider
                  className="mt-4"
                  step={5}
                  name="transport"
                  value={transport}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  onChange={handleChange}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: -2 }}>
                  <Typography
                    variant="body2"
                    onClick={() => setTransport(100)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {transport}% Pema
                  </Typography>
                  <Typography variant="body2" color="primary">
                    Transportasi Lokal
                  </Typography>
                  <Typography
                    variant="body2"
                    onClick={() => setTransport(0)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {100 - transport}% Sponsor
                  </Typography>
                </Box>

                {/* uang saku */}

                <Slider
                  step={5}
                  className="mt-4"
                  name="uangSaku"
                  value={uangSaku}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  onChange={handleChange}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: -2 }}>
                  <Typography
                    variant="body2"
                    onClick={() => setUangSaku(100)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {uangSaku}% Pema
                  </Typography>
                  <Typography variant="body2" color="primary">
                    Uang Saku
                  </Typography>
                  <Typography
                    variant="body2"
                    onClick={() => setUangSaku(0)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {100 - uangSaku}% Sponsor
                  </Typography>
                </Box>

                {/* hotel */}
                <Slider
                  name="hotel"
                  className="mt-4"
                  step={5}
                  style={{ width: '100%' }}
                  value={hotel}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  onChange={handleChange}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: -2 }}>
                  <Typography
                    variant="body2"
                    onClick={() => setHotel(100)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {hotel}% Pema
                  </Typography>
                  <Typography variant="body2" color="primary" className="text-bold">
                    Penginapan
                  </Typography>
                  <Typography
                    variant="body2"
                    onClick={() => setHotel(0)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {100 - hotel}% Sponsor
                  </Typography>
                </Box>
              </Box>
            </>
          ) : (
            <></>
          )}

          {/* tujuan */}
          <div className="tj-bagian">Tujuan &amp; jadwal</div>
          <Box className="mb-3">
            <TextField
              style={{ width: '100%' }}
              variant="outlined"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              select
              label="Tujuan Perjalanan Dinas"
            >
              {kategoris?.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.categori_sppd}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {kategori !== '' ? (
            <>
              <Box className="mb-3">
                <TextField
                  style={{ width: '100%' }}
                  id="outlined-multiline-static"
                  placeholder="Kantor Pusat Pertamina
Gedung Perwira 6 Lantai 2
Jl. Medan Merdeka Timur 1A,
Jakarta Pusat 10110"
                  label="Tujuan Perjalanan Dinas Lengkap"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  multiline
                  rows={4}
                />
              </Box>

              <Box className="mb-3">
                <TextField
                  style={{ width: '100%' }}
                  id="outlined-multiline-static"
                  placeholder="Sebutkan Tugas Yang harus dilakukan oleh Pelaku Perjalanan Dinas"
                  label="Tugas Dalam Perjalanan Dinas"
                  multiline
                  value={tugas}
                  onChange={(e) => setTugas(e.target.value)}
                  rows={4}
                />
              </Box>

              <Box>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
                  <div className="tj-grid">
                    <DateTimePicker
                      slotProps={{ textField: { fullWidth: true } }}
                      label="Waktu Keberangkatan"
                      ampm={false}
                      value={wb}
                      onChange={setWb}
                      viewRenderers={{
                        hours: renderTimeViewClock,
                        minutes: renderTimeViewClock,
                      }}
                    />
                    <DateTimePicker
                      slotProps={{ textField: { fullWidth: true } }}
                      ampm={false}
                      value={ws}
                      onChange={setWs}
                      label="Waktu Tiba Kembali"
                      viewRenderers={{
                        hours: renderTimeViewClock,
                        minutes: renderTimeViewClock,
                      }}
                    />
                  </div>
                </LocalizationProvider>
              </Box>

              <div className="tj-bagian">Layanan perjalanan</div>
              <Box
                sx={{ p: 2, borderRadius: 2, border: '0.5px solid #C4C4C4' }}
                className="tj-moda mb-3"
              >
                <B
                  className="btn-sm"
                  color="info"
                  outline
                  onClick={() => onCheckboxBtnClick('darat')}
                  active={cSelected.includes('darat')}
                >
                  Transportasi Jalur Darat
                </B>
                <B
                  className="btn-sm"
                  color="info"
                  outline
                  onClick={() => onCheckboxBtnClick('udara')}
                  active={cSelected.includes('udara')}
                >
                  Transportasi Jalur Udara
                </B>
                <B
                  className="btn-sm"
                  color="info"
                  outline
                  onClick={() => onCheckboxBtnClick('laut')}
                  active={cSelected.includes('laut')}
                >
                  Transportasi Jalur Laut
                </B>
              </Box>

              <Box
                sx={{ p: 2, borderRadius: 2, border: '0.5px solid #C4C4C4' }}
                className="tj-kartu mb-3"
                role="radiogroup"
                aria-label="Perlu tiket"
              >
                <div className="mb-2" style={{ fontWeight: 600 }}>
                  Perlu tiket?
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {OPSI_TIKET.map((o) => (
                    <B
                      key={o.key}
                      className="btn-sm"
                      color={o.warna}
                      outline
                      role="radio"
                      aria-checked={perluTiket === o.key}
                      active={perluTiket === o.key}
                      onClick={() => setPerluTiket(o.key)}
                    >
                      {o.label}
                    </B>
                  ))}
                </div>
                <small className="text-muted d-block mt-2">{OPSI_TIKET.find((o) => o.key === perluTiket)?.ket}</small>
              </Box>

              <Box sx={{ p: 2, borderRadius: 2, border: '0.5px solid #C4C4C4' }} className="tj-kartu mb-3" role="radiogroup" aria-label="Hotel">
                <div className="mb-2" style={{ fontWeight: 600 }}>
                  Hotel
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {OPSI_HOTEL.map((o) => (
                    <B key={o.key} className="btn-sm" color="success" outline role="radio" aria-checked={hotelOleh === o.key} active={hotelOleh === o.key} onClick={() => setHotelOleh(o.key)}>
                      {o.label}
                    </B>
                  ))}
                </div>
                <small className="text-muted d-block mt-2">{OPSI_HOTEL.find((o) => o.key === hotelOleh)?.ket}</small>
              </Box>

              <Box sx={{ p: 2, borderRadius: 2, border: '0.5px solid #C4C4C4' }} className="tj-kartu mb-3" role="radiogroup" aria-label="Transportasi lokal">
                <div className="mb-2" style={{ fontWeight: 600 }}>
                  Transportasi lokal
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {OPSI_TRANSPORT.map((o) => (
                    <B key={o.key} className="btn-sm" color="success" outline role="radio" aria-checked={transportLokal === o.key} active={transportLokal === o.key} onClick={() => setTransportLokal(o.key)}>
                      {o.label}
                    </B>
                  ))}
                </div>
                <small className="text-muted d-block mt-2">{OPSI_TRANSPORT.find((o) => o.key === transportLokal)?.ket}</small>
              </Box>

              <Box className="mb-3">
                <TextField
                  id="outlined-basic"
                  style={{ width: '100%' }}
                  label="Uang BBM (optional)"
                  placeholder="Diisi jika yang melakukan SPPD adalah driver atau pihak eksternal sesuai dengan aturan yang berlaku"
                  value={bbm}
                  onChange={(e) => setBbm(e.target.value)}
                  variant="outlined"
                />
              </Box>

              <Box className="mb-3">
                <Autocomplete
                  style={{ width: '100%' }}
                  disablePortal
                  id="combo-box-demo"
                  options={listSppd || []}
                  value={sId}
                  onChange={(event, newValue) => {
                    if (typeof newValue === 'string') {
                      setSId({
                        label: newValue,
                      });
                    } else if (newValue && newValue.inputValue) {
                      setSId({
                        label: newValue.inputValue,
                      });
                    } else {
                      setSId(newValue);
                    }
                  }}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                      return option;
                    }
                    if (option.inputValue) {
                      return option.inputValue;
                    }
                    return option.label;
                  }}
                  renderOption={(props, option) => <li {...props}>{option.label}</li>}
                  renderInput={(params) => <TextField {...params} label="Sharing Penginapan" />}
                />
              </Box>
            </>
          ) : (
            ''
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" variant="contained" onClick={saveTujuan}>
            Simpan Tujuan
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

Pengajuan.propTypes = {
  employes: PropTypes.array,
  pihaks: PropTypes.array,
  jeniss: PropTypes.array,
  kategoris: PropTypes.array,
  dasars: PropTypes.array,
  klasifikasi: PropTypes.array,
  sumberBiaya: PropTypes.array,
  renbis: PropTypes.array,
  closeForm: PropTypes.func,
  refetchSubmitted: PropTypes.func,
};

export default Pengajuan;
