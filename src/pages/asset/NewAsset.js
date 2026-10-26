import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import dayjs from 'dayjs';
import makeAnimated from 'react-select/animated';
import { Button, Modal, ModalHeader, ModalBody, FormGroup, Label, Input } from 'reactstrap';
import PropTypes from 'prop-types';
import { useQueries } from '@tanstack/react-query';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';

const animatedComponents = makeAnimated();

const NewAsset = ({ refetch }) => {
  const [modal, setModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [employees, setemployees] = useState([]);

  const [inName, setInName] = useState('');
  const [inType, setInType] = useState('');
  const [inPrice, setInPrice] = useState('');
  const [inLocation, setInLocation] = useState('');
  const [inAmount, setInAmount] = useState('');
  const [inImage, setInImage] = useState('');
  const [inVendor, setInVendor] = useState('');
  const [inAcquisition, setInAcquisition] = React.useState('');
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggle = () => {
    setModal(!modal);
  };

  const valueSubmit = {
    name: '',
    type: '',
    price: 0,
    vendor: '',
    acquisition: dayjs(),
    file: '',
    location: '',
    responsible: '',
    amount: 0,
  };
  const api = useAxios();

  const re = useQueries({
    queries: [
      {
        queryKey: ['category', 0],
        queryFn: () =>
          api.get(`dapi/inven/category`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['assigne', 1],
        queryFn: () =>
          api.get(`api/employe/assignment-list?search=all`).then((res) => {
            return res.data.data;
          }),
      },
    ],
  });

  useEffect(() => {
    setCategories(re[0].data);
    setemployees(re[1].data);
  }, [re[0].data, re[1].data]);

  const saveData = async () => {
    if (saving) return;
    if (inAmount !== '' && (+inAmount < 1 || !Number.isInteger(+inAmount))) {
      alert('error', 'Amount minimal 1');
      return;
    }
    if (
      inName !== '' &&
      inType !== '' &&
      inPrice !== '' &&
      inAcquisition !== '' &&
      inImage !== '' &&
      inAmount !== '' &&
      inLocation !== '' &&
      assignedEmployees?.length !== 0
    ) {
      const assigne = [];
      assignedEmployees.map((r) => assigne.push(`//${r?.value}//`));
      valueSubmit.name = inName;
      valueSubmit.type = inType;
      valueSubmit.price = inPrice;
      valueSubmit.vendor = inVendor;
      valueSubmit.acquisition = dayjs(inAcquisition);
      valueSubmit.file = inImage;
      valueSubmit.amount = inAmount;
      valueSubmit.location = inLocation;
      valueSubmit.responsible = assigne.toLocaleString();
      setSaving(true);
      await api
        .post(`dapi/inven/add`, valueSubmit)
        .then((res) => {
          console.log(res);
          if (res?.data?.success) {
            toggle();
            refetch();
            alert('success', res?.data?.message || `Submitted Succesfully !`);
            setInName('');
            setInType('');
            setInPrice('');
            setInVendor('');
            setInAcquisition('');
            setInImage('');
            setInAmount('');
            setInLocation('');
            setAssignedEmployees([]);
          } else {
            alert('error', res?.data?.message || 'Gagal menyimpan');
          }
        })
        .catch((err) => {
          // keep the form open so nothing typed is lost
          alert('error', err?.response?.data?.message || err.message);
        })
        .finally(() => setSaving(false));
    } else {
      alert('error', `Fields Can't Be Empty !!`);
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

  const handleFileChange = (e) => {
    getBase64(e.target.files[0])
      .then((result) => {
        setInImage(result);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const changeAssign = (choice) => {
    setAssignedEmployees(choice);
  };

  return (
    <>
      <Button color="dark" outline onClick={toggle}>
        + New Inventory
      </Button>

      <Modal isOpen={modal} toggle={toggle}>
        <ModalHeader toggle={toggle}>New Inventory Data</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="in_name">Inventory Name</Label>
            <Input
              id="in_name"
              name="in_name"
              type="text"
              onChange={(e) => setInName(e.target.value)}
              value={inName}
            />
          </FormGroup>

          <FormGroup>
            <Label for="typeselect">Inventory Type</Label>
            <Input
              id="typeselect"
              name="select"
              type="select"
              value={inType}
              onChange={(e) => setInType(e.target.value)}
            >
              <option>Choose Type</option>
              {categories?.map((c) => (
                <option key={c?.id} value={c?.code}>
                  {c?.name}
                </option>
              ))}
            </Input>
          </FormGroup>

          <FormGroup>
            <Label for="in_harga_beli">Purchase Price</Label>
            <Input
              id="in_harga_beli"
              name="in_harga_beli"
              type="number"
              onChange={(e) => setInPrice(e.target.value)}
              value={inPrice}
            />
          </FormGroup>

          <FormGroup>
            <Label for="in_vendor">
              Vendor <small>(optional)</small>
            </Label>
            <Input
              id="in_vendor"
              name="in_vendor"
              type="text"
              onChange={(e) => setInVendor(e.target.value)}
              value={inVendor}
            />
          </FormGroup>

          <FormGroup>
            <Label for="time">Acquisition Time</Label>
            <Input
              id="time"
              name="date"
              placeholder="date placeholder"
              type="date"
              // defaultValue={inAcquisition}
              onChange={(e) => setInAcquisition(e.target.value)}
              value={inAcquisition}
            />
          </FormGroup>

          <FormGroup>
            <Label for="in_amount">Amount</Label>
            <Input
              id="in_amount"
              name="in_amount"
              type="number"
              min="1"
              onChange={(e) => setInAmount(e.target.value)}
              value={inAmount}
            />
          </FormGroup>

          <FormGroup>
            <Label for="file">Inventory Image</Label>
            <Input
              id="file"
              name="file"
              type="file"
              onChange={(e) => handleFileChange(e)}
              accept="image/*"
            />
          </FormGroup>

          <FormGroup>
            <Label for="in_location">Detail Location</Label>
            <Input
              id="in_location"
              name="in_location"
              type="textarea"
              onChange={(e) => setInLocation(e.target.value)}
              value={inLocation}
            />
          </FormGroup>

          <FormGroup>
            <Label for="in_harga_beli">Responsible</Label>
            <Select
              // closeMenuOnSelect={true}
              components={animatedComponents}
              isMulti
              value={assignedEmployees}
              options={employees}
              onChange={changeAssign}
              //   isClearable={assignedEmployees.some((v) => !v.isFixed)}
            />
          </FormGroup>

          <FormGroup>
            <div className="d-grid gap-2 mt-4">
              <Button type="submit" onClick={() => saveData()} disabled={saving}>
                {saving ? 'Saving . . .' : 'Save Data'}
              </Button>
            </div>
          </FormGroup>
        </ModalBody>
      </Modal>
    </>
  );
};

NewAsset.propTypes = {
  refetch: PropTypes.func,
};

export default NewAsset;
