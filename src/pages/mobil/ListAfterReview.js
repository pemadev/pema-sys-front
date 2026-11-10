import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

import useAxios from '../../hooks/useAxios';

const ListAfterReview = React.forwardRef((props, ref) => {
    const api = useAxios();
    const location = useLocation();
    const [data, setData] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    const fetchData = () => {
        api.get('dapi/mobil/get-permintaan-after')
            .then((response) => {
                if (response.data.success) {
                    setData(response.data.data);
                }
            })
            .catch((error) => {
                console.error('Error fetching after review data:', error);
            });
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Allow parent to trigger refresh
    React.useImperativeHandle(ref, () => ({
        refreshData: fetchData
    }));

    const handleRowClick = (row) => {
        setSelectedRow(row);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedRow(null);
    };

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

    const columns = [
        { name: 'Keperluan', selector: row => row.keperluan, sortable: true },
        { name: 'Dibuat', selector: row => row.created_by_name, sortable: true },
        { name: 'Dari', selector: row => new Date(row.mulai).toLocaleString(), sortable: true },
        { name: 'Sampai', selector: row => new Date(row.hingga).toLocaleString(), sortable: true },
        { name: 'Status', selector: row => row.status===1?'Disetujui':'Ditolak', sortable: true },
        { name: 'Direview', selector: row => row.review_by_name, sortable: true },
        { name: 'Keterangan', selector: row => row.ket, sortable: true },
        // Tambahkan kolom lain sesuai kebutuhan
    ];

    return (
        <>
            <DataTable
                title="Permintaan Setelah Review"
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
                                    <td style={{ width: 140, verticalAlign: 'top', fontWeight: 500 }}>Keperluan</td>
                                    <td style={{ width: 10, verticalAlign: 'top' }}>:</td>
                                    <td>{selectedRow.keperluan}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 500 }}>Dibuat</td>
                                    <td>:</td>
                                    <td>{selectedRow.created_by_name}</td>
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
                                    <td style={{ fontWeight: 500 }}>Status</td>
                                    <td>:</td>
                                    <td>{selectedRow.status === 1 ? 'Disetujui' : 'Ditolak'}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 500 }}>Direview</td>
                                    <td>:</td>
                                    <td>{selectedRow.review_by_name}</td>
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

export default ListAfterReview;
