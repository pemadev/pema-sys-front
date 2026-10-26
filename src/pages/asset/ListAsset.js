import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import './Asset.scss';
import DataTable from 'react-data-table-component';
import { Button, Input, ButtonGroup, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import MaterialIcon from '@material/react-material-icon';
import { PDFDownloadLink } from '@react-pdf/renderer';
import XLSX from 'xlsx';
import { alert } from '../../components/atoms/Toast';
// import user1 from '../../assets/images/users/user1.jpg';
import PrintNumber from './PrintNumber';
import useAxios from '../../hooks/useAxios';


const ListAsset = ({ listAsset, loading, refetch }) => {
  const [selectedAsset, setSelectedAsset] = useState([]);
  const [clearSelection, setClearSelection] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState([]);
  const api = useAxios();

  const HCIS_URL = process.env.REACT_APP_HCIS_BE;

  const navigate = useNavigate();
  const [acet, setAcet] = useState([]);

  // Cari berdasarkan nama, nomor asset (induk/turunan) atau lokasi
  useEffect(() => {
    const q = search.trim().toLowerCase();
    const data = listAsset || [];
    setFilter(
      q
        ? data.filter(
            (item) =>
              item.name?.toLowerCase().includes(q) ||
              item.asset_number?.toLowerCase().includes(q) ||
              item.location?.toLowerCase().includes(q) ||
              item.child?.some((c) => c.asset_number?.toLowerCase().includes(q)),
          )
        : data,
    );
  }, [search, listAsset]);

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

  const askDelete = () => {
    if (!selectedAsset.length) {
      alert('error', 'Pilih asset yang akan dihapus');
      return;
    }
    setConfirmDelete(true);
  };

  const deleteAsset = async () => {
    setConfirmDelete(false);
    await api
      .post(`dapi/inven/delete`, { data: selectedAsset.map((a) => ({ id: a.id })) })
      .then((res) => {
        if (res?.data?.success) {
          alert('success', `${res?.data?.message}`);
          refetch();
          setSelectedAsset([]);
          setAcet([]);
          setClearSelection(!clearSelection);
        } else {
          alert('error', `${res?.data?.message}`);
        }
      })
      .catch((err) => {
        alert('error', err?.response?.data?.message || err.message);
      });
  };

  const go = (r) => {
    navigate(`${r.id}`);
  };

  const exportToXLS = () => {
    // Ekspor semua data asset, bukan hanya yang di halaman/filter
    const exportData = filter.map(row => ({
      'Asset Number': row.asset_number,
      'Asset Name': row.name,
      'type': row.type,
      'Amount': row.amount,
      'Child': row.child?.map(m => m?.asset_number).join(', '),
      'Responsible': row.responsible_list?.map(m => m?.first_name).join(', '),
      'Location':row.location,
      'Harga Beli':row.price,
      'vendor':row.vendor,
      
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
    XLSX.writeFile(workbook, `SysPEMA-Assets-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const columns = [
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
                src={`${HCIS_URL}employee/file?f=photo-profil&id=${m?.employe_id}`}
                className="rounded-circle"
                alt="avatar"
                width="35"
                height="35"
              />
            ) : (
              <img
                src={`${HCIS_URL}employee/file?f=photo-profil&id=${m?.employe_id}`}
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

  return (
    <>
      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{height:'300px'}}>
          <MaterialIcon icon="autorenew" style={{fontSize:48, color:'#aaa'}} className="spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filter}
          selectableRows
          onSelectedRowsChange={handleChange}
          clearSelectedRows={clearSelection}
          pagination
          paginationPerPage={20}
          subHeader
          subHeaderComponent={

            <div className="d-flex justify-content-end w-100">
              <ButtonGroup className="me-3">
                <Button color="danger" outline className="pb-0" onClick={askDelete}>
                  <MaterialIcon icon="delete_forever" />
                </Button>
                <Button color="warning" outline>
                  <PDFDownloadLink document={<PrintNumber {...{ acet }} />} fileName={`SysPEMA-${new Date()}`}>
                    <MaterialIcon icon="print" />
                  </PDFDownloadLink>
                </Button>
                <Button color="success" outline onClick={exportToXLS}>
                  <MaterialIcon icon="file_download" />
                </Button>
              </ButtonGroup>
              <Input
                type="text"
                value={search}
                placeholder="cari nama, nomor, lokasi . . ."
                className="w-25"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

          }
        />
      )}
      <Modal isOpen={confirmDelete} toggle={() => setConfirmDelete(false)}>
        <ModalHeader toggle={() => setConfirmDelete(false)}>Hapus Asset</ModalHeader>
        <ModalBody>
          Hapus {selectedAsset.length} asset beserta semua nomor turunannya? Tindakan ini tidak bisa dibatalkan.
          <ul className="mt-2 mb-0">
            {selectedAsset.slice(0, 10).map((a) => (
              <li key={a.id}>
                {a.asset_number} — {a.name}
              </li>
            ))}
            {selectedAsset.length > 10 && <li>dan {selectedAsset.length - 10} lainnya</li>}
          </ul>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" onClick={deleteAsset}>
            Hapus
          </Button>
          <Button color="secondary" outline onClick={() => setConfirmDelete(false)}>
            Batal
          </Button>
        </ModalFooter>
      </Modal>
      <style>
{`
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  100% { transform: rotate(360deg); }
}
`}
</style>
    </>
  );
};

ListAsset.propTypes = {
  listAsset: PropTypes.array,
  loading: PropTypes.bool,
  refetch: PropTypes.func,
};
export default ListAsset;

