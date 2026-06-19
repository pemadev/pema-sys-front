import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalHeader, Row, Col } from 'reactstrap';
import { RadioGroup, FormControlLabel, Radio, Box, TextField, Button } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import useAxios from '../../hooks/useAxios';
import Loader from '../../layouts/loader/Loader';
import { alert } from '../../components/atoms/Toast';
// import useAxios from '../../hooks/useAxios';

const baseURL = process.env.REACT_APP_BASEURL;
const ModalReview = ({ modalR, toggleR, sppdDetail, refetchNumber, refetchSubmitted }) => {
  const [detailSppd, setDetailSppd] = useState();
  const [stat, setStat] = useState('approve');
  const [catatan, setCatatan] = useState('');
  const [chekList, setChekList] = useState([]);

  const api = useAxios();

  dayjs.locale('id');
  //   const api = useAxios();

  useEffect(() => {
    if (sppdDetail) {
      api.get(`dapi/sppd/pengajuan/${sppdDetail?.id}`).then((res) => {
        setDetailSppd(res.data.data);
        console.log(res.data.data);
        setChekList(res.data.data?.check_doc);
      });
    } else {
      setDetailSppd(null);
    }
  }, [sppdDetail]);

  const submit = async () => {
    if (stat !== 'approve' && catatan === '') {
      alert('error', 'Catatan harus diisi !');
    } else {
      await api
        .post(`dapi/sppd/pengajuan/review/${detailSppd?.nomor_dokumen}`, {
          status: stat,
          catatan_persetujuan: catatan,
          check_doc: chekList,
          type: detailSppd?.current_type,
        })
        .then((res) => {
          console.log(res);
          if (res.status === 200) {
            alert('success', 'Lembar Persetujuan Berhasil');
            refetchNumber();
            refetchSubmitted();
            toggleR();
            setStat('approve');
            setCatatan('');
          }
        })
        .catch((err) => {
          alert('error', `${err.message}`);
        });
    }
  };

  useEffect(() => {
    console.log(chekList);
  }, [chekList]);

  return (
    <>
      <Modal isOpen={modalR} toggle={toggleR} size="lg">
        <ModalHeader toggle={toggleR}>
          Lembar Persetujuan <small className="fst-italic">({detailSppd?.current_type})</small>
        </ModalHeader>
        <ModalBody className="p-5">
          {detailSppd ? (
            <>
              {detailSppd?.current_type === 'check_document' ? (
                <>
                  {' '}
                  <Box
                    className="mb-3"
                    sx={{ p: 1, borderRadius: 2, padding: 2, border: '0.5px solid #C4C4C4' }}
                  >
                    <a
                      href={`${baseURL}sppd/${detailSppd?.realisasi?.doc_file}`}
                      target="
                "
                    >
                      Laporan Realisasi SPPD
                    </a>
                  </Box>
                  <Box
                    className="mb-3"
                    sx={{ p: 1, borderRadius: 2, padding: 2, border: '0.5px solid #C4C4C4' }}
                  >
                    {chekList?.map((c, i) => (
                      <div key={c?.id}>
                        <Row style={{ borderBottom: '0.5px dashed #C4C4C4', margin: '10px' }}>
                          <Col xs="6" className="small">
                            {c?.doc_name}
                          </Col>
                          <Col xs="6">
                            <RadioGroup
                              row
                              aria-labelledby="demo-controlled-radio-buttons-group"
                              name="controlled-radio-buttons-group"
                              value={chekList[i]?.status}
                              onChange={(e) => {
                                chekList[i].status = Number(e.target.value);
                                setChekList([...chekList]);
                              }}
                              className="d-flex justify-content-between"
                              size="sm"
                            >
                              <FormControlLabel
                                key="approve"
                                value="1"
                                control={<Radio />}
                                label="ada"
                              />
                              <FormControlLabel
                                key="rejected"
                                value="0"
                                control={<Radio />}
                                label="Tidak"
                              />
                            </RadioGroup>
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </Box>
                </>
              ) : (
                ''
              )}

              {detailSppd?.current_type === 'extend' ? (
                <Box
                  className="mb-3"
                  sx={{ p: 1, borderRadius: 2, padding: 2, border: '0.5px solid #C4C4C4' }}
                >
                  {Array.isArray(detailSppd?.ekstend) && detailSppd.ekstend.length > 0 ? (
                    detailSppd.ekstend.map((item, idx) => (
                      <Box key={item.id || idx} sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                        <div style={{ display: 'flex' }}>
                          <b style={{ minWidth: 110, display: 'inline-block' }}>Tujuan</b>
                          <span style={{ minWidth: 10, display: 'inline-block' }}>:</span>
                          <span>{item.detail_tujuan}</span>
                        </div>
                         <div style={{ display: 'flex' }}>
                          <b style={{ minWidth: 110, display: 'inline-block' }}>Mulai</b>
                          <span style={{ minWidth: 10, display: 'inline-block' }}>:</span>
                          <span>{item.start}</span>
                        </div>
                        <div style={{ display: 'flex' }}>
                          <b style={{ minWidth: 110, display: 'inline-block' }}>Hingga</b>
                          <span style={{ minWidth: 10, display: 'inline-block' }}>:</span>
                          <span>{item.end}</span>
                        </div>
                        <div style={{ display: 'flex' }}>
                          <b style={{ minWidth: 110, display: 'inline-block' }}>Alasan</b>
                          <span style={{ minWidth: 10, display: 'inline-block' }}>:</span>
                          <span>{item.alasan}</span>
                        </div>

                      </Box>
                    ))
                  ) : ''}
                </Box>
              ):''}

              {detailSppd?.current_type === 'verif_realisasi' ? (
                <Box
                  className="mb-3"
                  sx={{ p: 1, borderRadius: 2, padding: 2, border: '0.5px solid #C4C4C4' }}
                >
                  <a
                    href={`${baseURL}sppd/${detailSppd?.realisasi?.doc_file}`}
                    target="
            "
                  >
                    Laporan Realisasi SPPD
                  </a>
                </Box>
              ) : (
                ''
              )}
              <Box
                className="mb-3"
                sx={{ p: 1, borderRadius: 2, marginTop: 2, border: '0.5px solid #C4C4C4' }}
              >
                <RadioGroup
                  row
                  aria-labelledby="demo-controlled-radio-buttons-group"
                  name="controlled-radio-buttons-group"
                  value={stat}
                  onChange={(e) => setStat(e.target.value)}
                  className="d-flex justify-content-between"
                >
                  <FormControlLabel
                    key="approve"
                    value="approve"
                    control={<Radio />}
                    label="Terima"
                    className="me-5"
                  />
                  <FormControlLabel
                    key="rejected"
                    value="rejected"
                    control={<Radio />}
                    label="Tolak"
                    className="me-5"
                  />
                </RadioGroup>
              </Box>

              <TextField
                style={{ width: '100%' }}
                id="outlined-multiline-static"
                placeholder="Lorem ipsum dolor sit amet,
lorem ipsum dolo
Lorem ipsum,"
                label="Catatan Persetujuan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                multiline
                rows={4}
              />

              <Button
                color="secondary"
                variant="contained"
                style={{ width: '100%' }}
                className="mt-4"
                onClick={submit}
              >
                Submit Persetujuan
              </Button>
            </>
          ) : (
            <Loader style={{ height: '50px!important' }} />
          )}
        </ModalBody>
      </Modal>
    </>
  );
};

ModalReview.propTypes = {
  modalR: PropTypes.bool,
  toggleR: PropTypes.func,
  sppdDetail: PropTypes.object,
  refetchNumber: PropTypes.func,
  refetchSubmitted: PropTypes.func,
};

export default ModalReview;
