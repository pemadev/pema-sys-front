import React, { useEffect, useState, useRef } from 'react';
import {
  Row,
  Col,
  Badge,
  CardBody,
  Card,
  Modal,
  ModalBody,
  ModalHeader,
  Button,
  ButtonGroup,
  Input,
  FormGroup,
  Label,
} from 'reactstrap';
import Select from 'react-select';
import MaterialIcon from '@material/react-material-icon';
import makeAnimated from 'react-select/animated';
import DataTable from 'react-data-table-component';
import { useQueries } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import useAxios from '../../hooks/useAxios';
import useAuth from '../../hooks/useAuth';
import rupiah from '../../utils/rupiah';
import './Asset.scss';
import { alert } from '../../components/atoms/Toast';

const animatedComponents = makeAnimated();

const DetailAsset = () => {  
  const { auth } = useAuth();

  const inputRef = useRef(null);
  const detailRef = useRef(null);
  // const baseURL = process.env.REACT_APP_BASEURL;
  const { assetId } = useParams();
  const [modal, setModal] = useState(false);
  const [modal1, setModal1] = useState(false);
  const [modal2, setModal2] = useState(false);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [idChild, setIdChild] = useState();
  const [selectedAsset, setSelectedAsset] = useState([]);
  const [numberChild, setNumberChild] = useState('');

  const [inName, setInName] = useState('');
  const [inPrice, setInPrice] = useState('');
  const [inVendor, setInVendor] = useState('');
  const [inAcquisition, setInAcquisition] = useState('');
  const [inLocation, setInLocation] = useState('');
  const [, setSesImg] = useState(new Date());
  const [imgLoaded, setImgLoaded] = useState(false);

  const api = useAxios();

  const result = useQueries({
    queries: [
      {
        queryKey: ['assetDetail', assetId],
        queryFn: () =>
          api.get(`dapi/inven/${assetId}`).then((res) => {
            console.log(res.data.data);
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

  const { refetch } = result[0];

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

  const toggle1 = () => {
    setModal1(!modal1);
  };
  const toggle2 = () => {
    setModal2(!modal2);
    if (!modal2) {
      setInName(result[0].data.name);
      setInPrice(result[0].data.price);
      setInVendor(result[0].data.vendor);
      setInAcquisition(result[0].data.acquisition);
      setInLocation(result[0].data.location);
      const dataMember = [];
      result[0]?.data?.responsible_list?.map((s) =>
        dataMember.push({ label: s.first_name, value: s.employe_id }),
      );
      setAssignedEmployees(dataMember);
    }
  };

  const toggle = (idd, p) => {
    setModal(!modal);
    if (!modal) {
      setIdChild(idd);
      const dataMember = [];
      p?.map((s) => dataMember.push({ label: s.first_name, value: s.employe_id }));
      setAssignedEmployees(dataMember);
    }
  };

  const changeAssign = (choice) => {
    setAssignedEmployees(choice);
  };

  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  const columns = [
    {
      name: 'Asset Number',
      selector: (row) => row.asset_number,
    },
    {
      name: 'Responsible',
      selector: (row) => (
        <>
          {auth.user.roles.includes('PicAsset') ? (
            <Badge color="warning" onClick={() => toggle(row?.id, row?.res_list)} className="ms-2">
              + add
            </Badge>
          ) : ''}
          {row?.res_list?.map((r) => (
            <Badge color="primary" key={r?.employe_id} className="ms-2">
              {r?.first_name}
            </Badge>
          ))}
        </>
      ),
    },
    {
      name: 'Last Udpate',
      selector: (row) =>
        `${new Date(row.updated_at).toLocaleDateString('en-us', options)} ${new Date(
          row.updated_at,
        ).toLocaleTimeString()} `,
    },
  ];
  useEffect(() => {
    refetch();
    console.log(result[0]?.data);
  }, [assetId]);

  const valueChild = {
    id: 0,
    responsible: '',
  };

  const addChild = async () => {
    const vadd = { id_parent: +assetId, amount: +numberChild };
    console.log(vadd);
    await api
      .post(`dapi/inven/child/add`, vadd)
      .then((res) => {
        if (res?.data?.success) {
          toggle1();
          refetch();
          alert('success', `added succesfully !`);
        } else {
          alert('error', res?.data?.message || 'failed !!');
        }
      })
      .catch((err) => {
        toggle1();
        alert('error', err?.response?.data?.message || err.message);
      });
  };

  const updateData = async () => {
    const responsible = [];
    assignedEmployees?.map((r) => responsible.push(`//${r.value}//`));

    valueChild.id = idChild;
    valueChild.responsible = responsible.toLocaleString();

    await api
      .post(`dapi/inven/child/update`, valueChild)
      .then((res) => {
        if (res?.data?.success) {
          toggle();
          refetch();
        }
      })
      .catch((err) => {
        toggle();
        alert('error', err?.response?.data?.message || err.message);
      });
  };

  const handleChange = ({ selectedRows }) => {
    setSelectedAsset(selectedRows);
  };

  const deleteChild = async () => {
    await api
      .post(`dapi/inven/child/del`, { data: selectedAsset })
      .then((res) => {
        if (res?.data?.success) {
          alert('success', `${res?.data?.message}`);
          refetch();
          setSelectedAsset([]);
        } else {
          alert('error', `${res?.data?.message}`);
        }
      })
      .catch((err) => {
        toggle();
        setSelectedAsset([]);
        alert('error', err?.response?.data?.message || err.message);
      });
  };

  const update = async () => {
    const responsible = [];
    assignedEmployees?.map((r) => responsible.push(`//${r.value}//`));
    const dataUpdate = {
      id: assetId,
      name: inName,
      price: inPrice,
      vendor: inVendor,
      acquisition: inAcquisition,
      location: inLocation,
      responsible: responsible.toLocaleString(),
    };

    await api
      .post(`dapi/inven/update`, dataUpdate)
      .then((res) => {
        toggle2();
        if (res?.data?.success) {
          alert('success', `${res?.data?.message}`);
          refetch();
        } else {
          alert('error', `${res?.data?.message}`);
        }
      })
      .catch((err) => {
        toggle2();
        alert('error', err?.response?.data?.message || err.message);
      });

    console.log(dataUpdate);
  };

  const openFile = () => {
    inputRef.current.click();
  };

  const updateImage = async (r) => {
    const dataFile = { id: assetId, file: r };
    await api
      .post(`dapi/inven/update/image`, dataFile)
      .then((rr) => {
        if (rr?.data?.success) {
          alert('success', `${rr?.data?.message}`);
          refetch();
          setSesImg(new Date());
        } else {
          alert('error', rr?.data?.message || `failed !!`);
        }
      })
      .catch((err) => {
        alert('error', err?.response?.data?.message || err.message);
      });
  };

  const handleFileChange = (e) => {
    getBase64(e.target.files[0])
      .then((r) => {
        updateImage(r);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <>
      <Card>        <CardBody>
          <Row className="content flex-column flex-lg-row">              <Col
                xs="12"
                className="py-4 image position-relative order-1"
                lg={{ size: 5, order: 1 }}
                style={{ minHeight: '1px' }}
              >
                {!imgLoaded && (
                  <div className="d-flex align-items-center justify-content-center w-100 h-100" style={{height: '100%', background: '#f0f0f0'}}>
                    <MaterialIcon icon="image" style={{fontSize: 64, color: '#ccc'}} />
                  </div>
                )}
                <img 
                  src={result[0]?.data?.file_image} 
                  alt={result[0]?.data?.name || 'Asset Image'}
                  className="img-fluid rounded w-100 h-100"
                  style={{
                    objectFit: 'cover',
                    height: '100%',
                    minHeight: '250px',
                    display: imgLoaded ? 'block' : 'none',
                  }}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgLoaded(false)}
                />
                {auth.user.roles.includes('PicAsset') ? (
                  <div className="position-absolute top-50 start-50 translate-middle" style={{zIndex:2}}>
                    <Button
                      color="link"
                      className="p-0 border-0 bg-transparent"
                      style={{boxShadow:'none'}}
                      onClick={() => openFile()}
                    >
                      <MaterialIcon icon="photo_camera" style={{fontSize:40, color:'#222'}} />
                    </Button>
                  </div>
                ) : ''}
              </Col>
              <Col
                xs="12"
                className="py-4 text order-2"
                lg={{ size: 7, order: 2 }}
                ref={detailRef}
              >
                <div className="d-flex justify-content-between">
                  <h2 className="text-bold mb-0">{result[0].data?.name}</h2>
                  {auth.user.roles.includes('PicAsset') ? (
                    <Button color="dark" size="sm" outline className="pb-0" onClick={toggle2}>
                      <MaterialIcon icon="mode_edit" />
                    </Button>
                  ) : ''}
                </div>

                <hr />

                <table className="w-100">
                  <tbody>
                    <tr>
                      <td>Parent Asset Number</td>
                      <td className="text-end">{result[0].data?.asset_number}</td>
                    </tr>
                    <tr>
                      <td>Type</td>
                      <td className="text-end">{result[0].data?.type_name}</td>
                    </tr>
                    <tr>
                      <td>Acquisition Price</td>
                      <td className="text-end">{rupiah(result[0].data?.price)}</td>
                    </tr>
                    <tr>
                      <td>Current Asset Value</td>
                      <td className="text-end">{rupiah(result[0].data?.current)}</td>
                    </tr>

                    <tr>
                      <td>Vendor</td>
                      <td className="text-end">{result[0].data?.vendor}</td>
                    </tr>
                    <tr>
                      <td>Acquisition Time</td>
                      <td className="text-end">{result[0].data?.acquisition}</td>
                    </tr>
                    <tr>
                      <td>Age </td>
                      <td className="text-end">{result[0].data?.old}</td>
                    </tr>

                    <tr>
                      <td>Amount </td>
                      <td className="text-end">{result[0].data?.amount} items</td>
                    </tr>
                    <tr>
                      <td>Location </td>
                      <td className="text-end">{result[0].data?.location}</td>
                    </tr>
                    <tr>
                      <td>Last Update</td>
                      <td className="text-end">
                        {`${new Date(result[0].data?.updated_at).toLocaleDateString(
                          'en-us',
                          options,
                        )} ${new Date(result[0].data?.updated_at).toLocaleTimeString()}`}
                      </td>
                    </tr>
                    <tr>
                      <td>Responsible </td>
                      <td className="text-end">
                        {result[0].data?.responsible_list?.map((r) => (
                          <Badge color="primary" key={r?.employe_id} className="ms-2">
                            {r?.first_name}
                          </Badge>
                        ))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
          </Row>
          <DataTable
            className="mt-0"
            columns={columns}
            data={result[0].data?.child}
            pagination
            selectableRows={ auth.user.roles.includes('PicAsset') ? (true):''}
            onSelectedRowsChange={handleChange}
            subHeader
            subHeaderComponent={
            auth.user.roles.includes('PicAsset') ? (
              <ButtonGroup className="me-auto mt-5" size="sm">
                <Button
                  className="pb-0"
                  outline
                  disabled={selectedAsset?.length === 0}
                  onClick={deleteChild}
                >
                  <MaterialIcon icon="delete_forever" />
                </Button>
                <Button outline color="success" onClick={toggle1}>
                  + Add Child
                </Button>
              </ButtonGroup>):''
            }
          />
        </CardBody>
      </Card>

      <Modal isOpen={modal} toggle={toggle}>
        <ModalHeader toggle={toggle}>Add Another Employee</ModalHeader>
        <ModalBody>
          <Select
            components={animatedComponents}
            isMulti
            value={assignedEmployees}
            options={result[1].data}
            onChange={changeAssign}
            isClearable={assignedEmployees.some((v) => !v.isFixed)}
          />

          <div className="d-grid gap-2 mt-3">
            <Button onClick={() => updateData()}>Update Data</Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={modal1} toggle={toggle1}>
        <ModalHeader toggle={toggle1}>Set Number Of Child</ModalHeader>
        <ModalBody>
          <Input type="number" min="1" onChange={(e) => setNumberChild(e.target.value)} />

          <div className="d-grid gap-2 mt-3">
            <Button onClick={() => addChild()}>Add Childs</Button>
          </div>
        </ModalBody>
      </Modal>

      {/* modal edit */}
      <Modal isOpen={modal2} toggle={toggle2}>
        <ModalHeader toggle={toggle2}>New Inventory Data</ModalHeader>
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
              accept="image/*"
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
              onChange={(e) => setInAcquisition(e.target.value)}
              value={inAcquisition}
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
              components={animatedComponents}
              isMulti
              value={assignedEmployees}
              options={result[1].data}
              onChange={changeAssign}
            />
          </FormGroup>

          <FormGroup>
            <div className="d-grid gap-2 mt-4">
              <Button type="submit" onClick={update}>
                Save Data
              </Button>
            </div>
          </FormGroup>
        </ModalBody>
      </Modal>

      <input
        style={{ display: 'none' }}
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e)}
      />
    </>
  );
};

export default DetailAsset;
