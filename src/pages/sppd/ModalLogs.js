import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Badge, Modal, ModalBody, ModalHeader } from 'reactstrap';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Loader from '../../layouts/loader/Loader';
import useAxios from '../../hooks/useAxios';
import './ModalLogs.scss';


const ModalLogs = ({ modalLog, toggleLog, sppdDetail }) => {
  const [detailSppd, setDetailSppd] = useState();

  dayjs.locale('id');
  const api = useAxios();

  useEffect(() => {
    if (modalLog && sppdDetail) {
      api.get(`dapi/sppd/pengajuan/${sppdDetail?.id}`).then((res) => {
        setDetailSppd(res.data.data.log_pengajuan);
      });
    } else {
      setDetailSppd(null);
    }
   
  }, [modalLog, sppdDetail]);
  return (
    <>
      <Modal isOpen={modalLog} toggle={toggleLog} size="lg">
        <ModalHeader toggle={toggleLog}>Log Pengajuan</ModalHeader>
        <ModalBody className="p-3">
          {detailSppd ? (
            <>
              <ul className="timeline">
                {detailSppd.map((item) => (
                  <li key={item.id}>
                    <h5
                      style={{ marginBottom: '-1px' }}
                      className='fw-bold'
                    >
                      {item.first_name}
                    </h5>
                    <Badge
                      className="text-dark"
                      color="light"
                      style={{paddingLeft: '2px', paddingRight: '2px'}}
                    >
                      {item.position_name}
                    </Badge>
                    <span className="float-end small fw-lighter">{dayjs(item.created_at).locale('id').format('dddd, DD MMMM YYYY HH:mm')}</span>
                    <p className='mt-2 small' >
                      {item.activity}
                    </p>
                  </li>
                ))}
              </ul>
            </>

          ) : (
            <Loader style={{ height: '50px!important' }} />
          )}
        </ModalBody>
      </Modal>
    </>
  );
};

ModalLogs.propTypes = {
  modalLog: PropTypes.bool,
  toggleLog: PropTypes.func,
  sppdDetail: PropTypes.object,
};

export default ModalLogs;
