import React from 'react';
import DataTable from 'react-data-table-component';
import { Button, Stack } from '@mui/material';
import PropTypes from 'prop-types';

const getEmployeeName = (employee) => {
  if (!employee) return '-';
  if (typeof employee === 'string') return employee;
  if (employee.label) return employee.label;
  if (employee.full_name) return employee.full_name;
  if (employee.name) return employee.name;
  const firstName = employee.first_name || employee.firstName || '';
  const lastName = employee.last_name || employee.lastName || '';
  return [firstName, lastName].filter(Boolean).join(' ') || employee.username || employee.email || '-';
};

const getPicDisplay = (picValue, employes = []) => {
  if (!picValue) return '-';

  const values = Array.isArray(picValue) ? picValue : [picValue];

  const names = values.map((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      const matched = employes.find(
        (employee) => String(employee.employe_id || employee.employee_id || employee.id || employee.value) === String(item),
      );
      return matched ? getEmployeeName(matched) : item;
    }

    if (typeof item === 'object') {
      const matched = employes.find(
        (employee) => String(employee.employe_id || employee.employee_id || employee.id || employee.value) === String(item.employe_id || item.employee_id || item.id || item.value),
      );
      return matched ? getEmployeeName(matched) : getEmployeeName(item);
    }

    return '-';
  });

  return names.filter(Boolean).join(', ') || '-';
};

const formatDate = (value) => {
  if (!value) return '-';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value.format) return value.format('YYYY-MM-DD');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const ListKontrak = ({ contracts = [], employes = [], onEdit, onDelete, onRefresh }) => {
  const columns = [
    {
      name: 'No Kontrak',
      selector: (row) => row.no_contrac || '-',
      sortable: true,
      width: '180px',
    },
    {
      name: 'Judul',
      selector: (row) => row.vjudul || row.judul || '-',
      sortable: true,
      grow: 2,
    },
    {
      name: 'Partner',
      selector: (row) => row.vpartner || row.partner || '-',
      sortable: true,
      grow: 1.5,
    },
    {
      name: 'Jenis',
      selector: (row) => row.jenis_kontrak || row.jenis_dokumen || row.jenis || '-',
      sortable: true,
      grow: 1.5,
    },
    {
      name: 'Mulai',
      selector: (row) => formatDate(row.start || row.dari),
      sortable: true,
      width: '120px',
    },
    {
      name: 'Berakhir',
      selector: (row) => formatDate(row.end || row.sampai),
      sortable: true,
      width: '130px',
    },
    {
      name: 'PIC',
      selector: (row) => getPicDisplay(row.pic || row.pics || row.employes || row.personil, employes),
      sortable: true,
      grow: 2,
    },
    {
      name: 'Aksi',
      cell: (row) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" color="primary" onClick={() => onEdit?.(row)}>
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => {
              // eslint-disable-next-line no-alert
              if (window.confirm(`Hapus kontrak ${row.no_contrac || row.vjudul || 'ini'}?`)) {
                onDelete?.(row);
              }
            }}
          >
            Hapus
          </Button>
        </Stack>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: '220px',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={contracts}
      pagination
      highlightOnHover
      responsive
      striped
      subHeader
      subHeaderComponent={
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Daftar Kontrak</strong>
          {onRefresh && (
            <Button size="small" variant="text" color="primary" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      }
      noDataComponent="Belum ada data kontrak"
    />
  );
};

ListKontrak.propTypes = {
  contracts: PropTypes.array,
  employes: PropTypes.array,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onRefresh: PropTypes.func,
};

export default ListKontrak;