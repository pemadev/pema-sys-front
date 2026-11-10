import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css'; // Import CSS for react-confirm-alert
import PropTypes from 'prop-types';
import { alert } from '../../components/atoms/Toast';
import useAxios from '../../hooks/useAxios';
import useAuth from '../../hooks/useAuth'; // Import your authentication hook

const ListPermintaan = forwardRef((props, ref) => {
  const api = useAxios();
  const location = useLocation();
  const [data, setData] = useState([]);
  const {auth} = useAuth(); // Gunakan langsung jika hanya butuh auth.user
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // Tambahkan validasi props.afterReviewRef agar tidak ada warning
  const afterReviewRef = props.afterReviewRef || null;

  // Use useCallback to ensure fetchData is stable and doesn't cause unnecessary re-renders
  const fetchData = useCallback(() => {
    console.log(auth.user);
    const endpoint = auth.user?.roles?.includes('PICMobil') 
        ? 'dapi/mobil/get-permintaan-all' 
        : 'dapi/mobil/get-permintaan';

    api.get(endpoint)
        .then((response) => {
            const formattedData = response.data.data.map(item => ({
                ...item,
                displayMobil: `${item.brand} - ${item.plat}`, // Tambahkan tampilan brand - plat
            }));
            setData(formattedData);
        })
        .catch((error) => {
            console.error('Error fetching data:', error);
        });
  }, [auth.user, api]);

  const handleDelete = (id, status) => {
    if (status !== null) {
      alert('error', 'Tidak bisa dihapus, permintaan sudah direview.');
      return;
    }

    confirmAlert({
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus permintaan ini?',
      buttons: [
        {
          label: 'Ya',
          onClick: () => {
            api.post(`dapi/mobil/delete-permintaan/${id}`)
              .then(() => {
                alert('success', 'Permintaan berhasil dihapus.');
                fetchData(); // Refresh data after deletion
              })
              .catch((error) => {
                console.error('Error deleting data:', error);
                alert('error', 'Terjadi kesalahan saat menghapus permintaan.');
              });
          },
        },
        {
          label: 'Tidak',
          onClick: () => {},
        },
      ],
    });
  };

  const handleApprove = (id) => {
    api.post(`dapi/mobil/approve-permintaan/${id}`)
        .then(() => {
            alert('success', 'Permintaan berhasil disetujui.');
            fetchData(); // Refresh data after approval
            if (afterReviewRef && afterReviewRef.current && afterReviewRef.current.refreshData) {
                afterReviewRef.current.refreshData();
            }
        })
        .catch((error) => {
            console.error('Error approving request:', error);
            alert('error', 'Terjadi kesalahan saat menyetujui permintaan.');
        });
  };

  const handleReject = (id) => {
    let reason = '';

    confirmAlert({
        title: 'Konfirmasi Penolakan',
        message: 'Masukkan alasan penolakan:',
        customUI: ({ onClose }) => (
            <div className="custom-ui">
                <h1>Konfirmasi Penolakan</h1>
                <TextField
                    label="Alasan Penolakan"
                    fullWidth
                    multiline
                    rows={3}
                    onChange={(e) => {
                        reason = e.target.value;
                    }}
                />
                <div style={{ marginTop: '20px' }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            if (!reason.trim()) {
                                alert('error', 'Harap masukkan alasan penolakan.');
                                return;
                            }
                            api.post(`dapi/mobil/reject-permintaan/${id}`, { ket:reason })
                                .then(() => {
                                    alert('success', 'Permintaan berhasil ditolak.');
                                    fetchData(); // Refresh data after rejection
                                    if (afterReviewRef && afterReviewRef.current && afterReviewRef.current.refreshData) {
                                        afterReviewRef.current.refreshData();
                                    }
                                })
                                .catch((error) => {
                                    console.error('Error rejecting request:', error);
                                    alert('error', 'Terjadi kesalahan saat menolak permintaan.');
                                });
                            onClose();
                        }}
                    >
                        Submit
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={onClose}
                        style={{ marginLeft: '10px' }}
                    >
                        Batal
                    </Button>
                </div>
            </div>
        ),
    });
  };

  // Fungsi untuk membuka modal detail
  const handleRowClick = (row) => {
    setSelectedRow(row);
    setModalOpen(true);
  };

  // Fungsi untuk menutup modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRow(null);
  };

  useEffect(() => {
    fetchData(); // Fetch data only once when the component mounts
  }, []);

  // tautan dari notifikasi (?permintaan=<id>): buka detail permintaannya sekali saja
  const permintaanDariLink = new URLSearchParams(location.search).get('permintaan');
  const sudahDibuka = useRef(false);
  useEffect(() => {
    if (!permintaanDariLink || sudahDibuka.current || !data.length) return;
    const row = data.find((d) => String(d.id) === permintaanDariLink);
    if (!row) return;
    sudahDibuka.current = true;
    handleRowClick(row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permintaanDariLink, data]);

  useImperativeHandle(ref, () => ({
    refreshData: fetchData, // Expose the fetchData method to the parent
  }));

  // Define the columns
  const columns = [
    {
        name: 'Aksi',
        cell: row => (
            <>
                {auth.user?.roles?.includes('PICMobil') && (
                    <>
                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleApprove(row?.id)}
                            style={{ marginRight: '5px' }}
                        >
                            Approve
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => handleReject(row?.id)}
                            style={{ marginRight: '5px' }}
                        >
                            Reject
                        </Button>
                    </>
                )}
                {!auth.user?.roles?.includes('PICMobil') && (
                    <Button
                        variant="contained"
                        color="error"
                        size="small"
                        disabled={row?.status !== null}
                        onClick={() => handleDelete(row?.id, row?.status)}
                    >
                        Hapus
                    </Button>
                )}
            </>
        ),
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
        width: '250px', // Luaskan kolom aksi
    },
    {
        name: 'Tgl Pengajuan',
        selector: row => row?.created_at ? new Date(row?.created_at).toLocaleString() : 'Unknown',
        sortable: true,
    },
    {
        name: 'Keperluan',
        selector: row => row?.keperluan,
        sortable: true,
    },
    // {
    //     name: 'Mobil',
    //     selector: row => row?.displayMobil || '-',
    //     sortable: true,
    // },
    {
        name: 'Dari',
        selector: row => new Date(row?.mulai).toLocaleString(),
        sortable: true,
    },
    {
        name: 'Sampai',
        selector: row => new Date(row?.hingga).toLocaleString(),
        sortable: true,
    },
    {
        name: 'Perlu Sopir',
        selector: row => (row?.sopir === 1 ? 'Ya' : 'Tidak'),
        sortable: true,
    },
    {
        name: 'Status',
        selector: row => {
            if (row?.status === null) return 'Under Review';
            if (row?.status === 0) return 'Reject';
            if (row?.status === 1) return 'Approve';
            return 'Unknown';
        },
        sortable: true,
    },
    {
        name: 'Keterangan',
        selector: row => row?.ket || '-',
        sortable: false,
    },
  ];

  return (
    <>
      <DataTable
        title="List Permintaan Kendaraan"
        columns={columns}
        data={data}
        pagination
        highlightOnHover
        striped
        onRowClicked={handleRowClick}
        pointerOnHover
      />
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Detail Pengajuan</DialogTitle>
        <DialogContent dividers>
          {selectedRow && (
            <table style={{ width: '100%', fontSize: 15 }}>
              <tbody>
                <tr>
                  <td style={{ width: 140, verticalAlign: 'top', fontWeight: 500 }}>Tgl Pengajuan</td>
                  <td style={{ width: 10, verticalAlign: 'top' }}>:</td>
                  <td>{selectedRow.created_at ? new Date(selectedRow.created_at).toLocaleString() : '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Keperluan</td>
                  <td>:</td>
                  <td>{selectedRow.keperluan}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Dari</td>
                  <td>:</td>
                  <td>{selectedRow.mulai ? new Date(selectedRow.mulai).toLocaleString() : '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Sampai</td>
                  <td>:</td>
                  <td>{selectedRow.hingga ? new Date(selectedRow.hingga).toLocaleString() : '-'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Perlu Sopir</td>
                  <td>:</td>
                  <td>{selectedRow.sopir === 1 ? 'Ya' : 'Tidak'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Status</td>
                  <td>:</td>
                  <td>
                    {selectedRow.status === null
                      ? 'Under Review'
                      : selectedRow.status === 0
                      ? 'Reject'
                      : selectedRow.status === 1
                      ? 'Approve'
                      : 'Unknown'}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Keterangan</td>
                  <td>:</td>
                  <td>{selectedRow.ket || '-'}</td>
                </tr>
              </tbody>
            </table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary" variant="contained">
            Tutup
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

ListPermintaan.propTypes = {
  afterReviewRef: PropTypes.object, // Perbaiki propTypes agar sesuai warning
};

export default ListPermintaan;
