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

  const names = values.flatMap((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      const cleaned = String(item).trim();
      if (!cleaned) return [];

      const matched = employes.find(
        (employee) => String(employee.employe_id || employee.employee_id || employee.id || employee.value) === cleaned,
      );

      if (matched) {
        return [getEmployeeName(matched)];
      }

      if (cleaned.includes(',')) {
        return cleaned.split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
          const nestedMatch = employes.find(
            (employee) => String(employee.employe_id || employee.employee_id || employee.id || employee.value) === part,
          );
          return nestedMatch ? getEmployeeName(nestedMatch) : part;
        });
      }

      return [cleaned];
    }

    if (typeof item === 'object') {
      const matched = employes.find(
        (employee) => String(employee.employe_id || employee.employee_id || employee.id || employee.value) === String(item.employe_id || item.employee_id || item.id || item.value),
      );
      return [matched ? getEmployeeName(matched) : getEmployeeName(item)];
    }

    return [];
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

const getContractCreatorName = (row, employes = []) => {
  const directValue = row?.created_by_name || row?.creator_name || row?.user_name || row?.name || row?.full_name || row?.created_by || row?.pemohon || row?.created_by_name || row?.createdName;

  if (typeof directValue === 'string' && directValue.trim()) {
    return directValue;
  }

  if (typeof directValue === 'object' && directValue !== null) {
    return getEmployeeName(directValue) || '-';
  }

  const creatorId = row?.created_by_id || row?.created_by_employe_id || row?.employee_id || row?.employe_id;
  if (creatorId) {
    const matched = employes.find((employee) => String(employee.employe_id || employee.employee_id || employee.id || employee.value) === String(creatorId));
    return matched ? getEmployeeName(matched) : String(creatorId);
  }

  return '-';
};

const getContractFileDownload = (row) => {
  const candidate = [
    row?.file_url,
    row?.fileUrl,
    row?.download_url,
    row?.downloadUrl,
    row?.dokumen_url,
    row?.dokumenUrl,
    row?.document_url,
    row?.documentUrl,
    row?.url,
    row?.link,
    row?.file,
    row?.file_path,
    row?.filePath,
  ].find((value) => value !== undefined && value !== null && value !== '');

  if (!candidate) {
    return null;
  }

  const fileName = row?.file_name || row?.document_name || row?.name || 'dokumen-kontrak';
  return {
    url: candidate,
    fileName,
  };
};

const ListKontrak = ({ contracts = [], employes = [], onEdit, onDelete, onRefresh }) => {
  const columns = [
    {
      name: 'Aksi',
      cell: (row) => {
        const downloadInfo = getContractFileDownload(row);

        return (
          <Stack direction="row" spacing={1}>
            {downloadInfo ? (
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={() => {
                  if (downloadInfo.url) {
                    const newWindow = window.open(downloadInfo.url, '_blank', 'noopener,noreferrer');
                    if (newWindow) {
                      Object.defineProperty(newWindow, 'opener', { value: null, configurable: true });
                    }
                  }
                }}
              >
                Unduh
              </Button>
            ) : null}
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => {
                if (onEdit) {
                  onEdit(row);
                }
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => {
                // eslint-disable-next-line no-alert
                if (window.confirm(`Hapus kontrak ${row.no_contrac || row.vjudul || 'ini'}?`)) {
                  if (onDelete) {
                    onDelete(row);
                  }
                }
              }}
            >
              Hapus
            </Button>
          </Stack>
        );
      },
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: '250px',
    },
    {
      name: 'Nama',
      selector: (row) => getContractCreatorName(row, employes),
      sortable: true,
      grow: 1.5,
    },
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