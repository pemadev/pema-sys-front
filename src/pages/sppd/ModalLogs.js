import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
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
        // log dobel (user, aktivitas, dan waktu sama sampai menit) hanya ditampilkan satu kali
        const lihat = new Set();
        setDetailSppd(
          (res.data.data.log_pengajuan || []).filter((l) => {
            const kunci = `${l.employe_id}|${l.activity}|${dayjs(l.created_at).format('YYYY-MM-DD HH:mm')}`;
            if (lihat.has(kunci)) return false;
            lihat.add(kunci);

            return true;
          }),
        );
      });
    } else {
      setDetailSppd(null);
    }
   
  }, [modalLog, sppdDetail]);
  return (
    <>
      <Modal isOpen={modalLog} toggle={toggleLog} size="lg" scrollable centered>
        <ModalHeader toggle={toggleLog}>Log Pengajuan</ModalHeader>
        <ModalBody className="p-3">
          {detailSppd ? (
            detailSppd.length ? (
              <ul className="log-sppd">
                {detailSppd.map((item) => (
                  <li key={item.id}>
                    <div className="log-kepala">
                      <h5 className="log-nama">{item.first_name}</h5>
                      <span className="log-waktu">{dayjs(item.created_at).locale('id').format('dddd, DD MMMM YYYY HH:mm')}</span>
                    </div>
                    {item.position_name ? <span className="log-jabatan">{item.position_name}</span> : null}
                    <p className="log-isi">{item.activity}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="log-kosong">Belum ada log</div>
            )
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
