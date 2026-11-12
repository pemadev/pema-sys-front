import React, { useEffect, useState } from 'react';
import { Button, Input, ButtonGroup } from 'reactstrap';
import DataTable from 'react-data-table-component';
import PropTypes from 'prop-types';
import './Asset.scss';
import { useNavigate } from 'react-router-dom';
import MaterialIcon from '@material/react-material-icon';
// import { PDFDownloadLink } from '@react-pdf/renderer';
import useAxios from '../../hooks/useAxios';
// import PrintNumber from './PrintNumber';
import { alert } from '../../components/atoms/Toast';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';

const baseURL = process.env.REACT_APP_BASEURL;

// gsdgsdgsta
const ListAsset = ({ listAsset, refetch }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState([]);
  const [acet, setAcet] = useState([]);
  const navigate = useNavigate();
  const go = (r) => {
    console.log(r);
    console.log(acet);
    navigate(`${r.id}`);
  };

  const api = useAxios();

  const columns = [
    {
      name: 'Photo',
      selector: (row) => (
        <img
          className="img-thumbnail img-list mt-1 mb-1"
          alt={row.id}
          src={`${baseURL}inven${row?.file}?s=twe`}
        />
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
      name: 'Amount',
      selector: (row) => row.amount,
    },
    {
      name: 'Responsible',
      selector: (row) => (
        <div className="member">
          {row.responsible_list?.map((m, r) =>
            r < 3 ? (
              <img
                key={m?.employe_id}
                src={fotoKaryawan(m?.employe_id)}
                onError={onAvatarError}
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
    {
      name: 'Action',
      selector: (row) => (
        <Button color="primary" outline onClick={() => go(row)} size="sm">
          {' '}
          Check Detail
        </Button>
      ),
    },
  ];

  const handleChange = ({ selectedRows }) => {
    setSelectedAsset(selectedRows);
    const asetprint = [];
    for (let i = 0; i < selectedRows?.length; i++) {
      for (let j = 0; j < selectedRows[i].child?.length; j++) {
        asetprint.push({
          name: selectedRows[i].name,
          number: selectedRows[i].child[j].asset_number,
          id: selectedRows[i].child[j].id,
        });
      }
    }
    setAcet(asetprint);
  };

  const deleteAsset = async () => {
    await api
      .post(`dapi/inven/delete`, { data: selectedAsset })
      .then((res) => {
        if (res?.data?.success) {
          alert('success', `${res?.data?.message}`);
          refetch();
          setSelectedAsset([]);
          // console.log(res.data)
        } else {
          alert('error', `${res?.data?.message}`);
        }
      })
      .catch((err) => {
        setSelectedAsset([]);
        alert('error', err);
      });
  };

  const handlePage=(page)=>{
    console.log(page)
    localStorage.setItem('page', page);
    // console.log(totalRows)
  }

  useEffect(() => {
    setFilter(listAsset);
    // setSesImg(new Date());
    console.log('sdgsg')
  }, [listAsset]);

  useEffect(() => {
    const result = listAsset?.filter((p) =>
      p.name.toLocaleLowerCase().match(search.toLocaleLowerCase()),
    );
    setFilter(result);
    console.log(DataTable.c)
  }, [search]);

  return (
    <>
    <DataTable
        columns={columns}
        data={filter}
        selectableRows
        onSelectedRowsChange={handleChange}
        onChangePage={handlePage}
        pagination
        paginationDefaultPage={localStorage.getItem('page')}
        subHeader
        subHeaderComponent={
          <div className="d-flex justify-content-end w-100">
            <ButtonGroup className="me-3">
              <Button color="danger" outline className="pb-0" onClick={deleteAsset}>
                <MaterialIcon icon="delete_forever" />
              </Button>
              <Button color="warning" outline>
                {/* <PDFDownloadLink document={<PrintNumber {...{ acet }} />} fileName={`SysPEMA-${new Date()}`}>
                  <MaterialIcon icon="print" />
                </PDFDownloadLink> */}
              </Button>
            </ButtonGroup>
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
      
    </>
  );
};

ListAsset.propTypes = {
  listAsset: PropTypes.array,
  refetch: PropTypes.func,
};
export default ListAsset;
