import React, { useEffect } from "react";
import PropTypes from 'prop-types';
import { Row, Col, Badge } from 'reactstrap';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import './Approval.scss';
import Loader from "../../../layouts/loader/Loader";

const Approval = ({ data }) => {
    useEffect(() => {
        console.log(data);
    })

    return (
        <>
            {data?.length > 0 ?
                (<div className=" p-5">
                    {data?.map((s) => (
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
                                                                {s.position_name?.substring(0, 22)}
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
                                                    s.step === data.length
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
                                                    s.step === data.length
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
                                                                {s.position_name?.substring(0, 22)}
                                                                {s.position_name?.length > 22 ? ' . . .' : ''}
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
                </div>) : <Loader></Loader>}

        </>
    );
}

Approval.propTypes = {
    data: PropTypes.array
}

export default Approval;