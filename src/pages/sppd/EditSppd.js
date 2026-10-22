import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import { Box, TextField, Button } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button as B } from 'reactstrap';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import MenuItem from '@mui/material/MenuItem';
import DataTable from 'react-data-table-component';
import MaterialIcon from '@material/react-material-icon';
import { confirmAlert } from 'react-confirm-alert';
import { alert } from '../../components/atoms/Toast';
import useAxios from '../../hooks/useAxios';

const EditSppd = ({
  wannaEdit,
  dasars,
  jeniss,
  kategoris,
  renbis,
  klasifikasi,
  sumberBiaya,
  setEditForm,
  refetchSubmitted,
}) => {
  const [loading, setLoading]=useState(false);
  const [modal, setModal] = useState(false);
  const [nama, setNama] = React.useState('');
  const [isDisabled, setIsDisabled] = useState(false);
  const [jabatan, setJabatan] = useState('');
  const [golongan, setGolongan] = useState('');
  const [id, setId] = useState();
  const [gol, setGol] = useState();

  const [tujuans, setTujuans] = React.useState([]);

  const [kategori, setKategori] = React.useState('');
  const [jenis, setJenis] = React.useState('');
  const [dasar, setDasar] = React.useState('');

  const [bisnis, setBisnis] = React.useState('');
  const [biaya, setBiaya] = React.useState('');
  const [rkap, setRkap] = React.useState('');
  const [alamat, setAlamat] = React.useState('');
  const [tugas, setTugas] = React.useState('');
  const [wb, setWb] = React.useState(dayjs());
  const [ws, setWs] = React.useState(dayjs().add(1, 'day'));
  const [undangan, setUndangan] = React.useState('');

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
  // const [rSelected, setRSelected] = useState(null);

  const [listSppd, setListSppd] = useState([]);
  const [sId, setSId] = useState(null);

  const [inarasi, setNarasi] = React.useState('');

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

  const toggle = () => setModal(!modal);

  const api = useAxios();

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
      selector: (row) => row.waktu_berangkat?.format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      name: 'Tiba Kembali',
      selector: (row) => row.waktu_kembali?.format('DD/MM/YYYY HH:mm:ss'),
    },
  ];

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

  const addTujuan = (e) => {
    e.preventDefault();

    if (nama && jabatan && nama !== ' ' && jabatan !== ' ') {
      toggle();
    } else {
      alert('error', 'Lengkapi data terlebih dahulu');
    }
  };

  const saveTujuan = (e) => {
    e.preventDefault();
    if (
      jenis !== '' &&
      dasar !== '' &&
      bisnis !== '' &&
      biaya !== '' &&
      kategori !== '' &&
      alamat !== '' &&
      tugas !== ''
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
        renbis: rkap,
        moda: cSelected.toLocaleString(),
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
      setUndangan('');
      setTugas('');
      alert('success', 'Tujuan SPPD Berhasil ditambahkan');
      toggle();
    } else {
      alert('error', 'Lengkapi data terlebih dahulu');
    }
  };

  useEffect(() => {
    setId(wannaEdit?.id);
    setNama(wannaEdit?.nama);
    if (wannaEdit.id_pihak === 1) {
      setIsDisabled(true);
    } else {
      setIsDisabled(false);
    }
    setJabatan(wannaEdit?.jabatan);
    setGolongan(wannaEdit?.golongan);
    setGol(wannaEdit?.golongan_rate);
    setNarasi(wannaEdit?.narasi_st);

    api.get(`dapi/sppd/pengajuan/${wannaEdit?.id}?file=1`).then((res) => {
      const tujuanssss = [];
      res.data.data.tujuan_sppd.forEach((item) => {
        const tujuan = {
          jenis_sppd: item.id_jenis,
          dasar_sppd: item.id_dasar,
          klasifikasi: item.id_k_bisnis,
          sumber_biaya: item.id_sumber,
          p_tiket: item.p_tiket,
          p_um: item.p_um,
          p_tl: item.p_tl,
          p_us: item.p_us,
          p_hotel: item.p_hotel,
          kategori_sppd: item.id_kategori,
          detail_tujuan: item.detail_tujuan,
          tugas_sppd: item.tugas,
          waktu_berangkat: dayjs(item.waktu_berangkat),
          waktu_kembali: dayjs(item.waktu_kembali),
          file_undangan: item.base64_undangan,
          renbis: item.id_rkap,
          moda: item.moda,
          ubbm: item.bbm,
          shareWith: item.share_with,
        };
        tujuanssss.push(tujuan);
      });

      setTujuans(tujuanssss);
      //   setTujuans(res.data.data.tujuan_sppd);
    });
  }, [wannaEdit]);

  useEffect(() => {
    if (biaya === 1) {
      setTiket(100);
      setHotel(100);
      setTransport(100);
      setUangSaku(100);
      setMakan(100);
    } else if (biaya === 3) {
      setTiket(50);
      setHotel(50);
      setTransport(50);
      setUangSaku(50);
      setMakan(50);
    } else if (biaya === 2) {
      setTiket(0);
      setHotel(0);
      setTransport(0);
      setUangSaku(0);
      setMakan(0);
    }
  }, [biaya]);

  const updatePengajuan = async () => {
    await confirmAlert({
      title: `Kamu Yakin ?`,
      message: `Proses approval dokumen akan kembali ke step pertama setelah melakukan update`,
      buttons: [
        {
          label: 'Yes',
          onClick: () => {
            setLoading(true);
            console.log(tujuans);
            api
              .post(`dapi/sppd/pengajuan/update/${id}`, {
                name: nama,
                jabatann: jabatan,
                rate: gol,
                narasi:inarasi,
                tujuan_sppd: tujuans,
              })
              .then((res) => {
                setLoading(false)
                if (res.status === 200) {
                  alert('success', 'SPPD Berhasil diupdate !');
                  setEditForm(false);
                  refetchSubmitted();
                } else {
                  alert('error', 'SPPD Gagal diajukan, Hubungi Tim IT untuk problem selanjutnya !');
                }
              })
              .catch((err) => {
                alert('error', `${err.message}`);
              });
          },
        },
        {
          label: 'No',
          onClick: () => {},
        },
      ],
    });
  };

  return (
    <>
      {wannaEdit ? (
        <>
          <Box className="mb-3">
            <TextField
              id="outlined-basic"
              style={{ width: '100%' }}
              label="Nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              variant="outlined"
              disabled={isDisabled}
            />
          </Box>

          <Box className="mb-3">
            <TextField
              id="outlined-basic"
              style={{ width: '100%' }}
              label="Jabatan"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              variant="outlined"
              disabled={isDisabled}
            />
          </Box>

          <Box className="mb-3">
            <TextField
              id="outlined-basic"
              style={{ width: '100%' }}
              label="Golongan Rate"
              value={golongan}
              onChange={(e) => setGolongan(e.target.value)}
              variant="outlined"
              disabled
            />
          </Box>

          <Box className="mb-5">
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

          <Box className="mt-5">
            <Button
              variant="outlined"
              size="large"
              style={{ width: tujuans.length === 0 ? '100%' : '30%' }}
              className="float-end"
              onClick={addTujuan}
            >
              Tambah Tujuan SPPD
            </Button>
          </Box>

          {tujuans.length > 0 ? (
            <>
              <Box sx={{ p: 2, borderRadius: 2, marginTop: 15, border: '0.5px solid #C4C4C4' }}>
                <DataTable columns={columns} data={tujuans} />
              </Box>
              <Box className="mt-5">
                <Button
                  color="primary"
                  variant="contained"
                  size="large"
                  style={{ width: '100%' }}
                  className="float-end"
                  onClick={updatePengajuan}
                  disabled={loading}
                >
                  {loading?'Loading . . .':'Update Pengajuan'}
                </Button>
              </Box>
            </>
          ) : (
            ''
          )}
        </>
      ) : (
        'loading . . . '
      )}

      {/* modal tujuan */}
      <Modal isOpen={modal} toggle={toggle} size="lg">
        <ModalHeader toggle={toggle}>Tujuan SPPD</ModalHeader>
        <ModalBody>
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

          <Box className="mt-5 mb-3">
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
              </TextField>
            </Box>
          ) : (
            <></>
          )}

          {biaya === 3 ? (
            <>
              <Box sx={{ p: 2, borderRadius: 2, marginTop: 2, border: '0.5px solid #C4C4C4' }}>
                <h5>Ketentuan Sharing</h5>
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
          <Box className="mt-5 mb-3">
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
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DemoContainer components={['DateTimePicker', 'DateTimePicker']}>
                    <DateTimePicker
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
                      ampm={false}
                      value={ws}
                      onChange={setWs}
                      label="Waktu Tiba Kembali"
                      viewRenderers={{
                        hours: renderTimeViewClock,
                        minutes: renderTimeViewClock,
                      }}
                    />
                  </DemoContainer>
                </LocalizationProvider>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  border: '0.5px solid #C4C4C4',
                }}
                className=" mt-3 mb-3"
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

EditSppd.propTypes = {
  wannaEdit: PropTypes.object,
  dasars: PropTypes.array,
  jeniss: PropTypes.array,
  renbis: PropTypes.array,
  klasifikasi: PropTypes.array,
  kategoris: PropTypes.array,
  sumberBiaya: PropTypes.array,
  setEditForm: PropTypes.func,
  refetchSubmitted: PropTypes.func,
};

export default EditSppd;
