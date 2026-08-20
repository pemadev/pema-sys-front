import React, { useEffect, useState } from 'react';
import { TextField, Box, Button, Stack} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import PropTypes from 'prop-types';
import Autocomplete from '@mui/material/Autocomplete';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';

const jenisKontrakGroups = [
  {
    parent: 'Kontrak',
    children: [
      'Pengadaan Barang',
      'Pengadaan Jasa',
      'Kerja Sama',
      'Sewa',
      'Penjualan',
      'Proyek',
      'Konsultan',
      'Ketenagakerjaan',
      'Pembiayaan',
      'Lisensi',
      'Lainnya',
    ],
  },
  {
    parent: 'Perjanjian',
    children: ['PKS', 'MoU', 'NDA', 'Lainnya'],
  },
  {
    parent: 'Perubahan Kontrak',
    children: ['Addendum', 'Perubahan Nilai', 'Perpanjangan', 'Pengakhiran'],
  },
];

const jenisKontrakOptions = jenisKontrakGroups.flatMap((group) =>
  group.children.map((child) => ({
    label: child,
    parent: group.parent,
    value: `${group.parent} - ${child}`,
  })),
);

const getEmployeeName = (employee) => {
  if (!employee) return '';
  if (typeof employee === 'string') return employee;
  if (employee.label) return employee.label;
  if (employee.full_name) return employee.full_name;
  if (employee.name) return employee.name;
  const firstName = employee.first_name || employee.firstName || '';
  const lastName = employee.last_name || employee.lastName || '';
  return [firstName, lastName].filter(Boolean).join(' ') || employee.username || employee.email || 'PIC';
};

const getEmployeeId = (employee) => {
  if (!employee) return null;
  if (typeof employee === 'string' || typeof employee === 'number') return employee;
  return employee.employe_id || employee.employee_id || employee.id || employee.value || null;
};

const normalizeDate = (date) => {
  if (!date) return null;
  if (typeof date === 'string') return date.slice(0, 10);
  if (date.format) return date.format('YYYY-MM-DD');
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const normalizeSelectedPics = (selectedValues, employes = []) => {
  if (!selectedValues) return [];

  const items = Array.isArray(selectedValues) ? selectedValues : [selectedValues];

  return items.flatMap((item) => {
    if (!item && item !== 0) return [];

    if (typeof item === 'string' || typeof item === 'number') {
      const found = employes.find((emp) => String(getEmployeeId(emp)) === String(item));
      if (found) return [found];
      return [{ employe_id: item, label: item }];
    }

    if (typeof item === 'object') {
      const id = getEmployeeId(item);
      if (id) {
        const found = employes.find((emp) => String(getEmployeeId(emp)) === String(id));
        if (found) return [found];
        return [{ ...item, employe_id: id, label: getEmployeeName(item) }];
      }
    }

    return [];
  });
};

const NewKontrak = ({ employes = [], editData = null, onSuccess = () => {}, onCancelEdit = () => {} }) => {
  const [nomorKontrak, setNomorKontrak] = useState('');
  const [judul, setJudul] = useState('');
  const [partner, setPartner] = useState('');
  const [jenisKontrak, setJenisKontrak] = useState('');
  const [errors, setErrors] = useState({});
  const [dari, setDari] = useState(null);
  const [sampai, setSampai] = useState(null);
  const [selectedPics, setSelectedPics] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const api = useAxios();

  useEffect(() => {
    if (!editData) {
      setNomorKontrak('');
      setJudul('');
      setPartner('');
      setJenisKontrak('');
      setDari(null);
      setSampai(null);
      setSelectedPics([]);
      setSelectedFile(null);
      setErrors({});
      return;
    }

    setNomorKontrak(editData.no_contrac || editData.nomor_kontrak || editData.nomor || editData.no || '');
    setJudul(editData.vjudul || editData.judul || '');
    setPartner(editData.vpartner || editData.partner || '');
    setJenisKontrak(editData.jenis_kontrak || editData.jenis_dokumen || editData.jenis || '');
    setDari(editData.start || editData.dari || null);
    setSampai(editData.end || editData.sampai || null);
    setSelectedPics(normalizeSelectedPics(editData.pic || editData.pics || editData.employes || editData.personil, employes));
    setSelectedFile(null);
    setErrors({});
  }, [editData, employes]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = {};

    if (!nomorKontrak) validationErrors.nomorKontrak = 'Nomor kontrak tidak boleh kosong';
    if (!judul) validationErrors.judul = 'Judul Kontrak tidak boleh kosong';
    if (!partner) validationErrors.partner = 'Lengkapi Nama Perusahaan Partner';
    if (!jenisKontrak) validationErrors.jenisKontrak = 'Pilih jenis kontrak';
    if (!dari) validationErrors.dari = 'Lengkapi tgl Kontrak di mulai';
    if (!sampai) validationErrors.sampai = 'Isi Tgl Berakhir Kontrak';
    if (!selectedPics.length) validationErrors.employe = 'PIC kontrak tidak boleh kosong';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const selectedIds = selectedPics
      .map((person) => getEmployeeId(person))
      .filter(Boolean);

    const formData = new FormData();
    const finalNomorKontrak = nomorKontrak || editData?.no_contrac || `CNT-${Date.now()}`;
    formData.append('no_contrac', finalNomorKontrak);
    formData.append('nomor_kontrak', finalNomorKontrak);
    formData.append('vjudul', judul);
    formData.append('vpartner', partner);
    formData.append('jenis_kontrak', jenisKontrak);
    formData.append('jenis_dokumen', jenisKontrak);
    formData.append('start', normalizeDate(dari));
    formData.append('end', normalizeDate(sampai));
    selectedIds.forEach((id) => formData.append('pic[]', id));
    formData.append('created_by', (() => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        return user?.id || user?.employe_id || user?.employee_id || '';
      } catch (error) {
        return '';
      }
    })());

    if (selectedFile) {
      formData.append('file', selectedFile);
      formData.append('file_name', selectedFile.name);
    }

    if (editData?.id) {
      formData.append('id', editData.id);
    }

    try {
      const url = editData?.id ? `dapi/kontrak/${editData.id}` : 'dapi/kontrak/';
      const method = editData?.id ? 'put' : 'post';
      const config = selectedFile ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
      const res = await (method === 'put' ? api.put(url, formData, config) : api.post(url, formData, config));

      const isSuccess = res?.data?.success || res?.status === 200 || res?.status === 201;
      if (isSuccess) {
        alert('success', editData?.id ? 'Kontrak berhasil diperbarui' : 'Kontrak berhasil disimpan');
        setNomorKontrak('');
        setJudul('');
        setPartner('');
        setJenisKontrak('');
        setDari(null);
        setSampai(null);
        setSelectedPics([]);
        setSelectedFile(null);
        setErrors({});
        onSuccess();
        onCancelEdit();
      } else {
        alert('error', `Gagal menyimpan: ${res?.data?.message || JSON.stringify(res?.data)}`);
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Terjadi kesalahan';
      alert('error', `Error: ${msg}`);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        boxShadow: 'none',
        margin: 'auto',
        padding: 2,
      }}
    >
      <TextField
        label="Nomor Kontrak"
        variant="outlined"
        type="text"
        value={nomorKontrak}
        onChange={(e) => setNomorKontrak(e.target.value)}
        error={Boolean(errors.nomorKontrak)}
        helperText={errors.nomorKontrak}
        fullWidth
      />

      <TextField
        label="Judul Kontrak"
        variant="outlined"
        type="text"
        value={judul}
        onChange={(e) => setJudul(e.target.value)}
        error={Boolean(errors.judul)}
        helperText={errors.judul}
        fullWidth
      />

      <TextField
        label="Perusahaan Partner"
        variant="outlined"
        type="text"
        value={partner}
        onChange={(e) => setPartner(e.target.value)}
        error={Boolean(errors.partner)}
        helperText={errors.partner}
        fullWidth
      />

      <Autocomplete
        options={jenisKontrakOptions}
        value={
          jenisKontrakOptions.find((option) => option.value === jenisKontrak) || null
        }
        onChange={(event, newValue) => setJenisKontrak(newValue ? newValue.value : '')}
        groupBy={(option) => option.parent}
        getOptionLabel={(option) => option?.label || ''}
        isOptionEqualToValue={(option, currentValue) => option.value === currentValue.value}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Jenis Dokumen / Jenis Kontrak"
            error={Boolean(errors.jenisKontrak)}
            helperText={errors.jenisKontrak}
          />
        )}
      />

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Mulai Kontrak"
          ampm={false}
          value={dari || null}
          onChange={setDari}
          slotProps={{
            textField: {
              error: Boolean(errors.dari),
              helperText: errors.dari,
              fullWidth: true,
            },
          }}
        />

        <DatePicker
          label="Berakhir Kontrak"
          ampm={false}
          value={sampai || null}
          onChange={setSampai}
          slotProps={{
            textField: {
              error: Boolean(errors.sampai),
              helperText: errors.sampai,
              fullWidth: true,
            },
          }}
        />
      </LocalizationProvider>

      <Autocomplete
        multiple
        disablePortal
        options={employes || []}
        value={selectedPics}
        onChange={(event, newValue) => setSelectedPics(newValue || [])}
        getOptionLabel={(option) => getEmployeeName(option)}
        isOptionEqualToValue={(option, currentValue) =>
          String(getEmployeeId(option)) === String(getEmployeeId(currentValue))
        }
        renderOption={(props, option) => <li {...props}>{getEmployeeName(option)}</li>}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Nama PIC"
            error={Boolean(errors.employe)}
            helperText={errors.employe}
          />
        )}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          component="label"
          htmlFor="contract-upload-input"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            minHeight: 56,
            border: '1px solid rgba(0, 0, 0, 0.23)',
            borderRadius: 1,
            px: 2,
            py: 1,
            cursor: 'pointer',
            backgroundColor: '#fff',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <input
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            id="contract-upload-input"
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
          <Box sx={{ fontSize: 15, color: selectedFile ? 'text.primary' : 'text.disabled' }}>
            {selectedFile ? selectedFile.name : 'Upload Dokumen'}
          </Box>
          <Button variant="contained" size="small" component="span">
            Pilih File
          </Button>
        </Box>
      </Box>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        {editData?.id && (
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              setErrors({});
              onCancelEdit();
            }}
          >
            Batal Edit
          </Button>
        )}
        <Button type="submit" variant="contained" color="primary">
          {editData?.id ? 'Simpan Perubahan' : 'Tambah Dokumen'}
        </Button>
      </Stack>
    </Box>
  );
};

NewKontrak.propTypes = {
  employes: PropTypes.array,
  editData: PropTypes.object,
  onSuccess: PropTypes.func,
  onCancelEdit: PropTypes.func,
};

export default NewKontrak;
