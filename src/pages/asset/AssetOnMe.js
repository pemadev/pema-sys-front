import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, ModalBody, ModalHeader, FormGroup, Label } from 'reactstrap';
import DataTable from 'react-data-table-component';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import './Asset.scss';
import user1 from '../../assets/images/users/user1.jpg';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';


const AssetOnMe = ({ onMe, handleChange, refetch1, refetch2 }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState([]);
  const [modal, setModal] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [assetId, setAssetId] = useState();
  const navigate = useNavigate();

  const api = useAxios();
  const toggle = (id) => {
    setModal(!modal);
    if (!modal) {
      setAssetId(id);
    }
  };
  const go = (r) => {
    console.log(r);
    navigate(`${r.id}`);
  };
  const columns = [
    {
      name: 'Action',
      width: '250px',
      selector: (row) => (
        <>
          <Button
            color="info"
            outline
            size="sm"
            className='me-2'
            style={{ width: '130px' }}
            onClick={() => toggle(row.id)}
            disabled={row.request_service}
          >
            {row.request_service ? 'Requested' : 'Request Service'}
          </Button>
          <Button color="primary" outline onClick={() => go(row)} size="sm">
            {' '}
            Detail
          </Button></>

      ),
    },
    {
      name: 'Asset Number',
      selector: (row) => row.asset_number,
    },
    {
      name: 'Asset Name',
      selector: (row) => row.name,
    },
    {
      name: 'Responsible',
      selector: (row) => (
        <div className="member">
          {row.res_list?.map((m, r) =>
            r < 3 ? (
              <img
                key={m?.employe_id}
                src={m?.img ? m?.img : user1}
                className="rounded-circle"
                alt="avatar"
                width="35"
                height="35"
              />
            ) : (
              <img
                src="https://cdn5.vectorstock.com/i/1000x1000/38/64/color-circle-with-plus-icon-vector-13503864.jpg"
                className="rounded-circle img-pluss"
                alt="avatar"
                width="20"
                height="20"
              />
            ),
          )}
        </div>
      ),
    },

  ];

  const submit = async () => {
    const vadd = { complaint, asset_child: assetId };
    if (complaint === '') {
      alert('error', 'Complaint is required !');
    } else {
      await api
        .post(`dapi/inv/rservice`, vadd)
        .then((res) => {
          if (res?.data?.success) {
            toggle();
            handleChange('', '3');
            alert('success', `Request Submitted succesfully !`);
            refetch2();
            refetch1();
          }
        })
        .catch((err) => {
          toggle();

          alert('error', err?.response?.data?.message || err.message);
        });
    }

  };

  useEffect(() => {
    setFilter(onMe);
    // setSesImg(new Date());
  }, [onMe]);

  useEffect(() => {
    const q = search.toLocaleLowerCase();
    const result = onMe?.filter(
      (p) => p.name?.toLocaleLowerCase().includes(q) || p.asset_number?.toLocaleLowerCase().includes(q),
    );
    setFilter(result);
  }, [search]);

  return (
    <>
      <DataTable
        columns={columns}
        data={filter}
        pagination
        subHeader
        subHeaderComponent={
          <div className="d-flex justify-content-end w-100">
            <Input
              type="text"
              value={search}
              placeholder="search . . . . "
              className="w-25"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <Modal isOpen={modal} toggle={toggle}>
        <ModalHeader toggle={toggle}>Request Service Form</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="in_location">Your Complaint</Label>
            <Input
              id="in_location"
              name="in_location"
              type="textarea"
              onChange={(e) => setComplaint(e.target.value)}
              value={complaint}
            />
          </FormGroup>
          <FormGroup>
            <div className="d-grid gap-2 mt-4">
              <Button type="submit" onClick={submit}>
                Save Data
              </Button>
            </div>
          </FormGroup>
        </ModalBody>
      </Modal>
    </>
  );
};

AssetOnMe.propTypes = {
  onMe: PropTypes.array,
  handleChange: PropTypes.func,
  refetch1: PropTypes.func,
  refetch2: PropTypes.func
};

export default AssetOnMe;
