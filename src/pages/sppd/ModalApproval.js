import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalHeader, Row, Col, Badge } from 'reactstrap';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

import Loader from '../../layouts/loader/Loader';
import useAxios from '../../hooks/useAxios';
import './ModalApproval.scss';


const ModalApproval = ({ modalA, toggleApproval, sppdDetail }) => {
  const [detailSppd, setDetailSppd] = useState();

  dayjs.locale('id');
  const api = useAxios();

  useEffect(() => {
    if (modalA && sppdDetail) {
      api.get(`dapi/sppd/pengajuan/${sppdDetail?.id}`).then((res) => {
        setDetailSppd(res.data.data.approval);
      });
    } else {
      setDetailSppd(null);
    }
  }, [modalA, sppdDetail]);

  return (
    <Modal isOpen={modalA} toggle={toggleApproval} size="xl">
      <ModalHeader toggle={toggleApproval}>Status Pengajuan</ModalHeader>
      <ModalBody className="p-5">
        {detailSppd?.map((s) => (
          <div key={s.step}>
            {s.step % 2 !== 0 ? (
              <div >
                <Row >
                  <Col lg={5}>
                    <div
                      className="process-box process-left"
                    >
                      <Row>
                        <Col lg={5}>
                          <div className="process-step">
                            <p className="m-0 p-0">Step</p>
                            <h2 className="m-0 p-0">{s.step.toString().padStart(2, '0')}</h2>
                            <Badge
                              color="secondary"
                              className="badge-status"
                              style={{ width: '100%' }}
                            >
                              {s.type}
                            </Badge>
                          </div>
                        </Col>
                        <Col lg={7}>
                          <b>{s.first_name}</b>
                          <br></br>
                          <small>
                            <i>
                              {s.position_name.substring(0, 22)}
                              {s.position_name.length > 22 ? ' . . .' : ''}
                            </i>
                          </small>
                          <br></br>
                          <small
                            className={
                              s.status === 'approve'
                                ? 'text-success'
                                : s.status === 'rejected'
                                ? 'text-danger'
                                : 'text-muted'
                            }
                          >
                            {!s.status
                              ? 'Menunggu Persetujuan'
                              : s.status === 'approve'
                              ? 'Disetujui '
                              : 'Tidak Disetujui'}{' '}
                            <br></br>
                            {!s.status ? ' ' : dayjs(s.updated_at).locale('id').format('dddd, DD MMMM YYYY HH:mm')}
                          </small>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                  <Col lg={2}></Col>
                  <Col
                    lg={5}
                    className="d-none d-sm-none d-md-none d-lg-block"
                    style={{ position: 'relative' }}
                  >
                    <div
                      className={
                        s.step === detailSppd.length
                          ? 'process-point-right process-last'
                          : 'process-point-right'
                      }
                    ></div>
                  </Col>
                </Row>

                <br className="d-block d-md-block d-lg-none mt-5"></br>
                <br className="d-block d-md-block d-lg-none mt-5"></br>
              </div>
            ) : (
              <div >
                <Row >
                  <Col
                    lg={5}
                    className="d-none d-sm-none d-md-none d-lg-block"
                    style={{ position: 'relative' }}
                  >
                    {/* <div className="process-point-left"></div> */}
                    <div
                      className={
                        s.step === detailSppd.length
                          ? 'process-point-left process-last'
                          : 'process-point-left'
                      }
                    ></div>
                  </Col>
                  <Col lg={2}></Col>
                  <Col lg={5}>
                    <div
                      className="process-box process-right"
                    >
                      <Row>
                        <Col lg={5}>
                          <div className="process-step ">
                            <p className="m-0 p-0">Step</p>
                            <h2 className="m-0 p-0">{s.step.toString().padStart(2, '0')}</h2>
                            <Badge
                              color="secondary"
                              className="badge-status"
                              style={{ width: '100%' }}
                            >
                              {s.type}
                            </Badge>
                          </div>
                        </Col>
                        <Col lg={7}>
                          <b>{s.first_name}</b>
                          <br></br>
                          <small>
                            <i>
                              {s.position_name.substring(0, 22)}
                              {s.position_name.length > 22 ? ' . . .' : ''}
                            </i>
                          </small>
                          <br></br>

                          <small
                            className={
                              s.status === 'approve'
                                ? 'text-success'
                                : s.status === 'rejected'
                                ? 'text-danger'
                                : 'text-muted'
                            }
                          >
                            {!s.status
                              ? 'Menunggu Persetujuan'
                              : s.status === 'approve'
                              ? 'Disetujui '
                              : 'Tidak Disetujui'}{' '}
                            <br></br>
                            {!s.status ? ' ' : dayjs(s.updated_at).locale('id').format('dddd, DD MMMM YYYY HH:mm')}
                          </small>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
                <br className="d-block d-md-block d-lg-none mt-5"></br>
                <br className="d-block d-md-block d-lg-none mt-5"></br>
              </div>
            )}
          </div>
        ))}
        {detailSppd ? <></> : <Loader style={{ height: '50px!important' }} />}
      </ModalBody>
    </Modal>
  );
};

ModalApproval.propTypes = {
  modalA: PropTypes.bool,
  toggleApproval: PropTypes.func,
  sppdDetail: PropTypes.object,
};

export default ModalApproval;
