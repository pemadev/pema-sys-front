import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalHeader, Table, Badge } from 'reactstrap';
import { Box } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Loader from '../../layouts/loader/Loader';
import rupiah from '../../utils/rupiah';
import useAxios from '../../hooks/useAxios';

const baseURL = process.env.REACT_APP_BASEURL;
const ModalDetail = ({ modalD, toggleDetail, sppdDetail }) => {
  const [detailSppd, setDetailSppd] = useState();

  dayjs.locale('id');
  const api = useAxios();

  useEffect(() => {
    if (modalD && sppdDetail) {
      api.get(`dapi/sppd/pengajuan/${sppdDetail?.id}`).then((res) => {
        setDetailSppd(res.data.data);
      });
    } else {
      setDetailSppd(null);
    }
  }, [modalD, sppdDetail]);

  return (
    <Modal isOpen={modalD} toggle={toggleDetail} size="xl">
      <ModalHeader toggle={toggleDetail}>Detail Pengajuan</ModalHeader>
      <ModalBody>
        {detailSppd ? (
          <>
            <Box sx={{ p: 2, borderRadius: 2, margin: 2, border: '0.5px solid #C4C4C4' }}>
              <Table striped borderless size="sm" className="small mb-0">
                <tbody>
                  <tr>
                    <td width="40%">Nomor Pengajuan</td>
                    <td width="60%">
                      <strong>{detailSppd?.nomor_sppd}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td width="40%">Internal / Eksternal</td>
                    <td width="60%">{detailSppd?.pihak_name}</td>
                  </tr>
                  <tr>
                    <td>ID Karyawan</td>
                    <td>{detailSppd?.employe_id}</td>
                  </tr>
                  <tr>
                    <td>Nama</td>
                    <td>
                      <strong>{detailSppd?.nama}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Jabatan</td>
                    <td>{detailSppd?.jabatan}</td>
                  </tr>
                  <tr>
                    <td>Golongan / Rate</td>
                    <td>{detailSppd?.golongan}</td>
                  </tr>
                  <tr>
                    <td>Diajukan pada</td>
                    <td>
                      {dayjs(detailSppd?.created_at)
                        .locale('id')
                        .format('dddd, DD MMMM YYYY HH:mm')}
                    </td>
                  </tr>
                  <tr>
                    <td>Aturan Perusahaan</td>
                    <td>{detailSppd?.dasar_ketetapan}</td>
                  </tr>
                </tbody>
              </Table>
            </Box>
            <Box sx={{ p: 2, borderRadius: 2, margin: 2, border: '0.5px solid #C4C4C4' }}>
              <h5>Tujuan Perjalanan Dinas</h5>
              <hr className="mt-2"></hr>
              <ul>
                {detailSppd?.tujuan_sppd?.map((t) => (
                  <li key={t.id}>
                    <Table striped borderless size="sm" className="small mb-0 mt-4">
                      <tbody>
                        <tr>
                          <td width="40%">Jenis</td>
                          <td width="60%">{t.jenis_sppd}</td>
                        </tr>
                        <tr>
                          <td width="40%">Dasar Sppd </td>
                          <td width="60%">
                            {t.dasar_sppd}{' '}
                            {t.file_undangan !== '-' ? (
                              <a
                                href={`${baseURL}sppd/${t.file_undangan}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {' '}
                                <Badge color="danger"> lihat</Badge>
                              </a>
                            ) : (
                              ''
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td width="40%">Sumber Biaya </td>
                          <td width="60%">{t.sumber_biaya}</td>
                        </tr>
                        <tr>
                          <td width="40%">RKAP </td>
                          <td width="60%">{t.renbis || '-'}</td>
                        </tr>
                        <tr>
                          <td width="40%">Klasifikasi Bisnis</td>
                          <td width="60%">{t.k_bisnis}</td>
                        </tr>
                        <tr>
                          <td width="40%">Tujuan SPPD </td>
                          <td width="60%">
                            <strong>{t.categori_sppd}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td width="40%">Alamat Tujuan </td>
                          <td width="60%">{t.detail_tujuan}</td>
                        </tr>
                        <tr>
                          <td width="40%">Moda Transportasi </td>
                          <td width="60%">{t.moda}</td>
                        </tr>
                        <tr>
                          <td width="40%">Waktu Berangkat</td>
                          <td width="60%">
                            {dayjs(t.waktu_berangkat).format('dddd, DD MMMM YYYY HH:mm')} ({(t.rate_wb*100)}%)
                          </td>
                        </tr>
                        <tr>
                          <td width="40%">Waktu Tiba Kembali</td>
                          <td width="60%">
                            {dayjs(t.waktu_kembali).format('dddd, DD MMMM YYYY HH:mm')} ({(t.rate_wt*100)}%)
                          </td>
                        </tr>
                        <tr>
                          <td width="40%">Jumlah Hari</td>
                          <td width="60%">{t.jumlah_hari} hari</td>
                        </tr>
                        <tr>
                          <td width="40%">Tugas </td>
                          <td width="60%">{t.tugas}</td>
                        </tr>
                        <tr>
                          <td width="40%">Tiket </td>
                          <td width="60%">aktual**</td>
                        </tr>
                        <tr>
                          <td width="40%">Uang Makan</td>
                          <td width="60%">{rupiah(t.fix_um)}</td>
                        </tr>
                        <tr>
                          <td width="40%">Transportasi Lokal  </td>
                          <td width="60%">{rupiah(t.fix_tl)}</td>
                        </tr>
                        <tr>
                          <td width="40%">Uang Saku </td>
                          <td width="60%">{rupiah(t.fix_us)}</td>
                        </tr>
                        <tr>
                          <td width="40%">Hotel </td>
                          <td width="60%">{` ${t?.fix_hotel>0?(rupiah(t?.fix_hotel,)): `Sharing dengan SPPD No. ${t?.share_label}`}`}</td>
                        </tr>
                        <tr>
                          <td width="40%">
                            <strong>Total Perkiraan Biaya</strong>{' '}
                          </td>
                          <td width="60%">
                            <strong>{rupiah(t.total_biaya)}</strong>
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                    <br></br>
                  </li>
                ))}
              </ul>

              <p className=" text-dark ">
                <strong>
                  <u>TOTAL PERKIRAAN BIAYA : {rupiah(detailSppd?.perkiraan_total)}</u>
                </strong><br/>
                <i>Uang Muka : {rupiah(detailSppd?.uang_muka)}</i>
              </p>

              <br />
              <i className="small">** sesuai dengan rate golongan yang telah ditetapkan</i>
            </Box>
          </>
        ) : (
          <Loader style={{ height: '50px!important' }} />
        )}
      </ModalBody>
    </Modal>
  );
  // alert('error', 'Network Error');
};

ModalDetail.propTypes = {
  modalD: PropTypes.bool,
  toggleDetail: PropTypes.func,
  sppdDetail: PropTypes.object,
};
export default ModalDetail;
