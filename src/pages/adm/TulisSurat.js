import React, { useEffect, useState, useRef } from 'react';
import Box from '@mui/material/Box';
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import { MenuItem } from '@mui/material';
import { Button, InputGroup, Badge, ButtonGroup } from 'reactstrap';
import { QRCode } from 'react-qrcode-logo';
// import { Navigate } from 'react-router-dom';
import useAxios from '../../hooks/useAxios';
import FMerge from './Fungsi/FMerge';
import GenerateSurat from './Fungsi/Generate';
import SuratEditor from './Fungsi/SuratEditor';
import Loader from '../../layouts/loader/Loader';
import PdfToBase64 from './Fungsi/PdfToBase64';
import { alert } from '../../components/atoms/Toast';

import logo from '../../assets/images/qrcode/qr-code-logo.png';
import toRoman from './Fungsi/toRoman';

const TulisSurat = ({ divisis, mydivisi, refresh, func1, detailSurat, updateForm }) => {
  const baseURL1 = process.env.REACT_APP_FRONTEND;
  const api = useAxios();
  const qrCodeRef = useRef();

  const dataSurat = JSON.parse(localStorage.getItem('dataSurat'));
  const id = dataSurat?.id ? dataSurat?.id : '';
  const tglSurat = dataSurat?.tglSurat ? dataSurat?.tglSurat : new Date().toISOString();
  const nomorSurat = dataSurat?.nomorSurat ? dataSurat?.nomorSurat : `. . . /PEMA/${toRoman(new Date().getMonth() + 1)}/${new Date().getFullYear()}`;
  const [ttdBys, setTtdBys] = useState(dataSurat?.ttdBys || []);

  const [kepada, setKepada] = useState(dataSurat?.kepada || '');
  const [perihal, setPerihal] = useState(dataSurat?.perihal || '');
  const [ttdBy, setTtdBy] = useState(dataSurat?.ttdBy || '');
  const [tembusan, setTembusan] = useState(dataSurat?.tembusan || '');
  const [tembusans, setTembusans] = useState(dataSurat?.tembusans || []);

  const [lampiran, setLampiran] = useState(dataSurat?.lampiran || '0');
  const [jenislampiran, setJenisLampiran] = useState(dataSurat?.jenislampiran || 'Eks');
  const [fileLampiran, setFileLampiran] = useState(detailSurat?.fileLampiran
    || '');

  const [divisi, setDivisi] = useState(dataSurat?.divisi || mydivisi);

  const [berang, setBerang] = useState(dataSurat?.berang || 'form1');

  const [isiSurat, setIsiSurat] = useState(dataSurat?.isiSurat || 'Dengan Hormat');
  const [mergedSurat, setMergedSurat] = useState('');

  const [loading, setLoading] = useState(false);

  const [bhs, setBhs]=useState(dataSurat?.bhs || 'id');

  const saveDataLocal = () => {
    localStorage.setItem(
      'dataSurat',
      JSON.stringify({
        id,
        kepada,
        perihal,
        ttdBy,
        tembusans,
        lampiran,
        jenislampiran,
        divisi,
        berang,
        ttdBys,
        isiSurat,
        signer: ttdBys?.find((s) => s.employe_id === ttdBy),
        tglSurat,
        nomorSurat,
        draft: true,
        bhs,
      }),
    );
  };

  useEffect(() => {
    saveDataLocal();
  }, [
    kepada,
    perihal,
    ttdBy,
    tembusans,
    lampiran,
    jenislampiran,
    divisi,
    berang,
    ttdBys,
    isiSurat,
    bhs,
  ]);

  const addTembusan = () => {
    if (tembusan === '') return;
    setTembusans([...tembusans, tembusan]);
    setTembusan('');
  };

  const deleteTembusan = (tmb) => {
    setTembusans(tembusans.filter((tmbus) => tmbus !== tmb));
  };


  useEffect(() => {
    api.get(`dapi/adm/signers/${divisi}`).then((res) => {
      setTtdBys(res.data.data);
      console.log(res.data.data);
      // const ttd=res.data.data.find(s => s.employe_id === ttdBy);
      // setTtdBy(dataSurat?.ttdBy||'');
      // console.log(res.data.data.find(s => s.employe_id === ttdBy)?.length);
      if (res.data.data?.find(s => s?.employe_id === ttdBy)) {
        setTtdBy(dataSurat?.ttdBy)
      } else {
        setTtdBy('')
      }

    });
  }, [divisi]);

  useEffect(() => {
    const dt = JSON.parse(localStorage.getItem('dataSurat'));
    setMergedSurat('');
    async function fetchData() {
      try {
        const pdf = await GenerateSurat(dt, qrCodeRef);

        FMerge(pdf, fileLampiran.replace('data:application/pdf;base64,', '')).then((res) => {
          setMergedSurat(res);
        });
      } catch (e) {
        console.log(e);
      }
    }

    if (berang === 'form3') {


      if (lampiran !== '' && fileLampiran === '' && Number(lampiran) > 0) {
        alert('error', 'Lampiran harus 0 jika tidak ada File');
        setBerang('form1');
      } else {
        setTimeout(fetchData, 1000);
      }

    }

    if (berang === 'form2') {
      if (divisi === '' || kepada === '' || perihal === '' || ttdBy === '') {
        setBerang('form1');
        alert('error', 'Silakan Lengkapi Data !!!')
      }
    }
  }, [berang]);


  const afterSubmit = () => {
    refresh();
    func1(false)
    localStorage.removeItem('dataSurat');

  }

  const submit = async () => {

    setLoading(true);
    const allData = {
      ...dataSurat, fileLampiran, type: 'main'
    }

    await api.post(`dapi/adm/insert`, allData).then((res) => {
      console.log(res?.data);
      if (res.status === 200) {
        alert('success', 'Dokumen Berhasil submit !');
        afterSubmit();
      } else {
        alert('error', 'Dokumen Gagal submit, Hubungi Tim IT untuk problem selanjutnya !');
      }
      setLoading(false);
    }).catch((err) => {
      alert('error', `${err.message}`);
      setLoading(false);
    });
  };

  const update = async () => {
    setLoading(true);
    const allData = {
      ...dataSurat, fileLampiran, type: 'main'
    }
    await api.post(`dapi/adm/update`, allData).then((res) => {
      console.log(res?.data);
      if (res.status === 200) {
        alert('success', 'Dokumen Berhasil diupdate !');
        afterSubmit();
      } else {
        alert('error', 'Dokumen Gagal diupdate, Hubungi Tim IT untuk problem selanjutnya !');
      }
      setLoading(false);
    }).catch((err) => {
      alert('error', `${err.message}`);
      setLoading(false);
    });
  };

  return (
    <>
      <div ref={qrCodeRef} style={{ display: 'none' }}>
        <QRCode
          value={`${baseURL1}verification/${dataSurat?.doc_number}`}
          size={400}
          qrStyle="dots"
          logoImage={logo} // Ganti dengan URL logo kamu
          logoWidth={100}
          logoHeight={100}
          eyeRadius={20}
          fgColor="#0F52BA"
        />
      </div>
      {berang === 'form1' ? (
        <Box className="pe-4 ps-4 mt-5">
          {divisis?.length > 0 && (
            <Box className="mb-3">
              <TextField
                select
                style={{ width: '100%' }}
                variant="outlined"
                value={divisi}
                onChange={(e) => setDivisi(e.target.value)}
                label="Pilih Divisi"
              >
                {divisis?.map((item) => (
                  <MenuItem key={item?.organization_id} value={item?.organization_id}>
                    {item?.organization_name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
          <Box className="mb-3">
            <TextField
              id="outlined-basic"
              style={{ width: '100%' }}
              label="Surat ini Ditujukan Kepada"
              value={kepada}
              onChange={(e) => setKepada(e.target.value)}
              variant="outlined"
            />
          </Box>

          <Box className="mb-3">
            <TextField
              id="outlined-basic"
              style={{ width: '100%' }}
              label="Perihal Surat"
              value={perihal}
              onChange={(e) => setPerihal(e.target.value)}
              variant="outlined"
            />
          </Box>

          {
            ttdBys?.length > 0 && (
              <Box className="mb-3">
                <TextField
                  select
                  style={{ width: '100%' }}
                  variant="outlined"
                  value={ttdBy}
                  onChange={(e) => setTtdBy(e.target.value)}
                  label="Ditandatangani Oleh"
                >
                  {ttdBys?.map((item) => (
                    <MenuItem key={item?.employe_id} value={item?.employe_id}>
                      {item?.first_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            )
          }

          <Box className="mb-3">
            <TextField
              type="number"
              id="outlined-basic"
              style={{ width: '100%' }}
              label="Jumlah Lampiran"
              value={lampiran}
              placeholder="3"
              inputProps={{ min: 0 }}
              onChange={(e) => setLampiran(e.target.value)}
              variant="outlined"
            />
          </Box>

          {lampiran > 0 ? (
            <Box className="mb-3">
              <InputGroup>
                <TextField
                  id="outlined-basic"
                  style={{ width: '80%' }}
                  label="Jenis Lampiran"
                  value={jenislampiran}
                  placeholder="Dokumen"
                  onChange={(e) => setJenisLampiran(e.target.value)}
                  variant="outlined"
                />
                <Button
                  color="secondary"
                  outline
                  style={{ width: '20%' }}
                  onClick={() => document.getElementById('input-file').click()}
                >
                  {fileLampiran ? 'Ubah Lampiran' : 'Upload Lampiran'}
                </Button>
                {fileLampiran === '' && lampiran !== '' ? (
                  <small className="text-danger">
                    Silakan Upload File Lampiran dalam bentuk PDF dan tentukan jenis lampiran
                  </small>
                ) : (
                  ''
                )}
              </InputGroup>

              <input
                type="file"
                id="input-file"
                style={{ display: 'none' }}
                accept="application/pdf"
                onChange={(e) => {
                  PdfToBase64(e.target.files[0])
                    .then((result) => {
                      setFileLampiran(result);
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                }}
              />
            </Box>
          ) : (
            ''
          )}

          <Box className="mb-3">
            <InputGroup>
              <Button style={{ width: '10%' }} onClick={addTembusan}>
                +
              </Button>
              <TextField
                id="outlined-basic"
                style={{ width: '90%' }}
                label="Tembusan"
                value={tembusan}
                placeholder="PJ Gubernur Aceh"
                onChange={(e) => setTembusan(e.target.value)}
                variant="outlined"
              />
            </InputGroup>
          </Box>

          {tembusans?.length > 0 ? (
            <Box sx={{ p: 2, borderRadius: 1, border: '0.5px solid #C4C4C4' }} className="mb-3">
              Tembusan :
              <ul>
                {tembusans?.map((item) => (
                  <li key={item}>
                    {' '}
                    <Badge
                      color="danger"
                      style={{ cursor: 'pointer' }}
                      onClick={() => deleteTembusan(item)}
                    >
                      Hapus
                    </Badge>{' '}
                    {item}
                  </li>
                ))}
              </ul>
            </Box>
          ) : (
            ''
          )}

          <Box className="mb-3">
            <TextField
              select
              style={{ width: '100%' }}
              variant="outlined"
              value={bhs}
              onChange={(e) => setBhs(e.target.value)}
              label="Bahasa Surat"
            >

              <MenuItem key="id" value="id">
                Bahasa Indonesia
              </MenuItem>
              <MenuItem key="en" value="en">
                Bahasa Inggris
              </MenuItem>

            </TextField>
          </Box>


          <Box className="mb-3 mt-5" style={{ display: 'flex' }}>
            <Button
              style={{ marginLeft: 'auto' }}
              color="success"
              onClick={() => setBerang('form2')}
            >
              Selanjutnya
            </Button>
          </Box>
        </Box>
      ) : (
        ''
      )}

      {berang === 'form2' ? (
        <Box className="pe-4 ps-4 mt-5">
          {isiSurat !== '' && (
            <SuratEditor
              apiKey="wsaajswvlat7i5hpef2b0yqpalytaz042xu9j0djrz6sbpwr"
              value={isiSurat}
              onChange={(content) =>
                content === '' ? setIsiSurat(' ') : setIsiSurat(content.replace(/(<br\s*\/?>\s*)+<table/gi, '<table'))
              }
            />
          )}
          <Box className="mb-3 mt-5" style={{ display: 'flex' }}>
            <ButtonGroup style={{ marginLeft: 'auto' }}>
              <Button color="warning" onClick={() => setBerang('form1')}>
                Sebelumnya
              </Button>
              <Button color="success" onClick={() => setBerang('form3')}>
                Selanjutnya
              </Button>
            </ButtonGroup>
          </Box>
        </Box>
      ) : (
        ''
      )}

      {berang === 'form3' ? (
        <Box className="pe-4 ps-4 mt-5">
          {mergedSurat !== '' ? (
            <object
              data={`${mergedSurat}#navpanes=0`}
              type="application/pdf"
              width="100%"
              height="580"
            >
              Load
            </object>
          ) : (
            <Loader />
          )}

          <Box className="mb-3 mt-5" style={{ display: 'flex' }}>
            <ButtonGroup style={{ marginLeft: 'auto' }}>
              <Button color="warning" onClick={() => setBerang('form2')}>
                Sebelumnya
              </Button>
              {updateForm ?
                <Button color="success" onClick={() => update()} disabled={loading}>
                  {loading ? 'Loading...' : 'Update'}
                </Button>
                :
                <Button color="success" onClick={() => submit()} disabled={loading}>
                  {loading ? 'Loading...' : 'Submit'}
                </Button>}
            </ButtonGroup>
          </Box>
        </Box>
      ) : (
        ''
      )}
    </>
  );
};

TulisSurat.propTypes = {
  divisis: PropTypes.array,
  mydivisi: PropTypes.string,
  refresh: PropTypes.func,
  func1: PropTypes.func,
  detailSurat: PropTypes.object,
  updateForm: PropTypes.bool
};

export default TulisSurat;
