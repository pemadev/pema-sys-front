import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import DataTable from 'react-data-table-component';
import { Badge, Button, ModalBody, ModalHeader, Modal, Col, Row, ModalFooter, Input, FormGroup, Label } from 'reactstrap';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import useAuth from '../../hooks/useAuth';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';


const Request = ({ reqser, refetch2 }) => {
  const inputRef = useRef(null);
  const { auth } = useAuth();
  const location = useLocation();
  const [modal, setModal] = useState(false);
  const [modal2, setModal2] = useState(false);
  const [dat, setDat] = useState();
  const [inCost, setInCost] = useState();
  const [fileName, setFileName] = useState();
  const api = useAxios();

  const toggle = () => setModal(!modal);
  const toggle2 = () => setModal2(!modal2);
  const setData = (row) => {
    setDat(row);
    console.log(row);
  };

  // tautan dari notifikasi (?servis=<id>): PIC aset langsung melihat permintaan yang masih menunggu (Check), sekali saja
  const servisDariLink = new URLSearchParams(location.search).get('servis');
  const sudahDibuka = useRef(false);
  useEffect(() => {
    if (!servisDariLink || sudahDibuka.current || !reqser?.length || !auth.user.roles.includes('PicAsset')) return;
    const row = reqser.find((r) => String(r.id) === servisDariLink && r.status === 'submit');
    if (!row) return;
    sudahDibuka.current = true;
    setDat(row);
    setModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servisDariLink, reqser]);

  const openFile = () => {
    inputRef.current.click();
  };

  const getBase64 = (file) => {
    return new Promise((resolve) => {
      let bUrl = '';
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        bUrl = reader.result;
        resolve(bUrl);
      };
    });
  };

  const upload = async (r) => {
    const vupload = { id: dat.id, base64file: r.slice(r.lastIndexOf(',') + 1), asset_number: dat.asset_number }
    console.log(vupload)
    await api.post(`dapi/inven/service/upload`, vupload).then((res) => {
      if (res?.data?.success) {
        setFileName(res?.data?.data.filename)
      }
    }).catch((err) => {
      alert('error', err);
    });
  }


  const handleFileChange = (e) => {
    getBase64(e.target.files[0])
      .then((r) => {
        upload(r);
      })
      .catch((err) => {
        console.log(err);
      });
  }



  const processButton = async () => {
    const vprocess = { id: dat.id, status: 'progress' };
    await api.post(`dapi/inven/service/update`, vprocess).then((res) => {
      if (res?.data?.success) {
        alert('success', `service status changed succesfully !`);
        refetch2();
        toggle();
      }
    }).catch((err) => {
      alert('error', err);
    });
  }

  const rejectButton = async() => {
    toggle();
    await confirmAlert({
      title: `Are you sure ?`,
      message: `Be careful, what has gone will not come back`,
      buttons: [
        {
          label: 'Yes',
          onClick: () => {
            const vprocess = { id: dat.id, status: 'reject' };
           api.post(`dapi/inven/service/update`, vprocess).then((res) => {
              if (res?.data?.success) {
                alert('success', `service status changed succesfully !`);
                refetch2();
                toggle();
              }
            }).catch((err) => {
              alert('error', err);
            });
          },
        },
        {
          label: 'No',
          onClick: () => { },
        },
      ],
    });
  


}

const reportButton = () => {
  toggle2()
}

const doneButton = async () => {
  const vdone = { cost: inCost, proof: fileName, id: dat.id };

  await api.post(`dapi/inven/service/done`, vdone).then((res) => {
    if (res?.data?.success) {
      alert('success', `service done !`);
      refetch2();
      toggle2();
    }
  }).catch((err) => {
    alert('error', err);
  });
}


const columns = [
  {
    name: 'Asset Number',
    selector: (row) => row.asset_number,
  },
  {
    name: 'Asset Name',
    selector: (row) => row.asset_name,
  },
  {
    name: 'Complaint',
    selector: (row) => row.complaint,
  },
  {
    name: 'Request By',
    selector: (row) => row.requester,
  },
  {
    name: 'Requested at',
    selector: (row) => new Date(row.created_at).toLocaleString(),
  },
  {
    name: <>{auth.user.roles.includes('PicAsset') ? 'Action' : 'Status'}</>,
    selector: (row) => (
      <>
        {auth.user.roles.includes('PicAsset') ? (
          <>
            {row.status === 'submit' ? (
              <Button
                size="sm"
                onClick={() => {
                  toggle();
                  setData(row);
                }}
              >
                Check
              </Button>
            ) : (
              <>{row.status === 'progress' ? <Button size="sm" color='success' onClick={() => { setData(row); reportButton(); }}>Report</Button> : ''}</>
            )}
          </>
        ) : (
          <Badge color="secondary">{row.status}</Badge>
        )}
      </>
    ),
  },
];
return (
  <>
    <DataTable columns={columns} data={reqser} pagination />

    <Modal isOpen={modal} toggle={toggle}>
      <ModalHeader toggle={toggle}>{dat?.asset_name}</ModalHeader>
      <ModalBody>
        <Row>
          <Col xs={5}>Nomor Aset</Col>
          <Col xs={7}>: {dat?.asset_number}</Col>
          <Col xs={5}>Keluhan</Col>
          <Col xs={7}>: {dat?.complaint}</Col>
          <Col xs={5}>Location</Col>
          <Col xs={7}>: {dat?.location}</Col>
          <Col xs={5}>Detail</Col>
          <Col xs={7}>
            :{' '}
            <a href={`/asset/${dat?.asset_id}`} target="_blank" rel="noreferrer">
              view
            </a>
          </Col>
        </Row>
      </ModalBody>
      <ModalFooter>
        <Button className="btn btn-warning" size="sm" onClick={processButton}>Process</Button>
        <Button className="btn btn-danger" size="sm" onClick={() => rejectButton()}>Reject</Button>
      </ModalFooter>
    </Modal>

    <Modal isOpen={modal2} toggle={toggle2}>
      <ModalHeader toggle={toggle2}>{dat?.asset_name}</ModalHeader>
      <ModalBody>
        <FormGroup>
          <Label for="in_name">Biaya Service (dalam rupiah)</Label>
          <Input
            id="in_cost"
            name="in_cost"
            type="number"
            onChange={(e) => setInCost(e.target.value)}
            value={inCost}
          />
        </FormGroup>
        <FormGroup>
          <Label for="in_name">Bukti Service (dalam pdf)</Label>
          <Input
            id="in_file"
            name="in_file"
            type="text"
            value={fileName}
            onClick={() => { openFile() }}
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button className="btn btn-success" onClick={doneButton}>Done</Button>
      </ModalFooter>
    </Modal>

    <input
      style={{ display: 'none' }}
      ref={inputRef}
      type="file"
      accept="application/pdf"
      onChange={(e) => handleFileChange(e)}
    />
  </>
);
};

Request.propTypes = {
  reqser: PropTypes.array,
  refetch2: PropTypes.func,
};

export default Request;
