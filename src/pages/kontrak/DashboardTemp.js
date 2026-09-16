import { TabContext, TabList, TabPanel } from '@mui/lab';
import Tab from '@mui/material/Tab';
import Badge from '@mui/material/Badge';
import { MenuItem, TextField } from '@mui/material';
import {
  CalendarMonthOutlined,
  CheckCircleOutlineOutlined,
  ScheduleOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import { Card, CardBody, Col, Modal, ModalBody, ModalHeader, Row } from 'reactstrap';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import useAxios from '../../hooks/useAxios';
import NewKontrak from './NewKontrak';
import ListKontrak from './ListKontrak';
import { alert } from '../../components/atoms/Toast';
import { AuthContext } from '../../context/AuthContext';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const getLastFiveYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, index) => currentYear - 4 + index);
};

const Dashboard = () => {
  const [value, setValue] = useState('1');
  const [selectedPeriod, setSelectedPeriod] = useState('bulanan');
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [employes, setEmployes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [editingContract, setEditingContract] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [contractHistory, setContractHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { auth } = useContext(AuthContext);
  const api = useAxios();
  const lastFiveYears = useMemo(() => getLastFiveYears(), []);
  const userRoles = auth?.user?.roles || [];
  const isPickKontrak = userRoles.some((role) => String(role).toLowerCase() === 'pickontrak');
  const currentEmployeeId = auth?.user?.employe_id || auth?.user?.employee_id || auth?.user?.id || auth?.user?.user_id || '';

  const normalizePicValues = (picValue) => {
    if (!picValue) return [];
    const items = Array.isArray(picValue) ? picValue : [picValue];

    return items.flatMap((item) => {
      if (!item && item !== 0) return [];

      if (typeof item === 'string' || typeof item === 'number') {
        return String(item)
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);
      }

      if (typeof item === 'object') {
        const employeeIdValue = item.employe_id || item.employee_id || item.id || item.value;
        return employeeIdValue ? [String(employeeIdValue)] : [];
      }

      return [];
    });
  };

  const isCurrentUserContractPic = (row) => {
    if (!currentEmployeeId) return false;
    const picValue = row?.pic || row?.pics || row?.employes || row?.personil;
    const picValues = normalizePicValues(picValue);

    return picValues.some((item) => String(item) === String(currentEmployeeId));
  };

  const getEmployes = async () => {
    try {
      const res = await api.get('api/employe/assignment-list?search=all');
      setEmployes(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (error) {
      setEmployes([]);
    }
  };

  const getContracts = async () => {
    try {
      const res = await api.get('dapi/kontrak/');
      const rows = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setContracts(rows);
    } catch (error) {
      setContracts([]);
    }
  };

  useEffect(() => {
    getEmployes();
    getContracts();
  }, []);

  const handleDelete = async (row) => {
    if (!row?.id) return;

    try {
      const res = await api.post(`dapi/kontrak/delete/${row.id}`);
      const isSuccess = res?.data?.success || res?.status === 200 || res?.status === 204;
      if (isSuccess) {
        alert('success', 'Kontrak berhasil dihapus');
        getContracts();
      } else {
        alert('error', `Gagal menghapus: ${res?.data?.message || 'Terjadi kesalahan'}`);
      }
    } catch (error) {
      alert('error', `Error: ${error?.response?.data?.message || error?.message || 'Gagal menghapus'}`);
    }
  };

  const filteredContracts = useMemo(() => {
    if (isPickKontrak) return contracts;
    return contracts.filter((contract) => isCurrentUserContractPic(contract));
  }, [contracts, isPickKontrak, currentEmployeeId]);

  const stats = useMemo(() => {
    const total = filteredContracts.length;
    const active = filteredContracts.filter((item) => {
      const today = new Date();
      const start = item.start || item.dari;
      const end = item.end || item.sampai;
      if (!start || !end) return false;
      const startDate = new Date(start);
      const endDate = new Date(end);
      return startDate <= today && endDate >= today;
    }).length;

    const expired = filteredContracts.filter((item) => {
      const endDateValue = item.end || item.sampai;
      if (!endDateValue) return false;
      return new Date(endDateValue) < new Date();
    }).length;

    const upcoming = filteredContracts.filter((item) => {
      const startDateValue = item.start || item.dari;
      if (!startDateValue) return false;
      return new Date(startDateValue) > new Date();
    }).length;

    return { total, active, expired, upcoming };
  }, [filteredContracts]);

  const monthlyData = useMemo(() => {
    return monthNames.map((month, index) => {
      const count = filteredContracts.filter((item) => {
        const contractDateValue = item.start || item.dari || item.created_at;
        if (!contractDateValue) return false;
        const date = new Date(contractDateValue);
        return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(chartYear) && date.getMonth() === index;
      }).length;

      return {
        month,
        total: count,
      };
    });
  }, [filteredContracts, chartYear]);

  const yearlyData = useMemo(() => {
    const years = lastFiveYears;

    return years.map((year) => ({
      year,
      total: contracts.filter((item) => {
        const contractDateValue = item.start || item.dari || item.created_at;
        if (!contractDateValue) return false;
        const date = new Date(contractDateValue);
        return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
      }).length,
    }));
  }, [contracts, lastFiveYears]);

  const monthlyChart = {
    series: [{
      name: 'Kontrak',
      data: monthlyData.map((item) => item.total),
    }],
    options: {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '40%',
        },
      },
      colors: ['#4f46e5'],
      dataLabels: { enabled: false },
      xaxis: {
        categories: monthNames,
        labels: {
          style: { colors: '#64748b', fontSize: '12px' },
        },
      },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
      tooltip: { theme: 'light' },
      fill: { opacity: 1 },
      noData: { text: 'Belum ada data' },
    },
  };

  const yearlyChart = {
    series: [{
      name: 'Total Kontrak',
      data: yearlyData.map((item) => item.total),
    }],
    options: {
      chart: {
        type: 'line',
        toolbar: { show: false },
        background: 'transparent',
      },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#10b981'],
      markers: { size: 5 },
      xaxis: {
        categories: yearlyData.map((item) => item.year),
        labels: {
          style: { colors: '#64748b', fontSize: '12px' },
        },
      },
      yaxis: { labels: { style: { colors: '#64748b' } } },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
      tooltip: { theme: 'light' },
      fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', opacityFrom: 0.7, opacityTo: 0.1 } },
      noData: { text: 'Belum ada data' },
    },
  };

  const handleChange = (event, newValue) => {
    if (!isPickKontrak && newValue === '2') {
      setValue('1');
      return;
    }
    setValue(newValue);
  };

  const handleSuccess = () => {
    getContracts();
    setEditingContract(null);
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return '-';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return String(dateValue);
    return parsed.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const resolveContractField = (row, keys) => {
    const resolvedValue = keys.map((key) => row?.[key]).find((item) => item !== undefined && item !== null && item !== '');
    return resolvedValue ?? '-';
  };

  const getPicListLabel = (row, employesList = []) => {
    const picValue = row?.pic || row?.pics || row?.employes || row?.personil;
    if (!picValue) return '-';

    const items = Array.isArray(picValue) ? picValue : [picValue];
    const names = items.flatMap((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        const text = String(item).trim();
        if (!text) return [];
        const matched = employesList.find(
          (employee) => String(employee.employe_id || employee.employee_id || employee.id || employee.value) === text,
        );
        return matched ? [matched.full_name || matched.name || `${matched.first_name || ''} ${matched.last_name || ''}`.trim()] : [text];
      }

      if (typeof item === 'object') {
        return [item.full_name || item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || String(item.employe_id || item.employee_id || item.id || item.value || '')];
      }

      return [];
    });

    return names.filter(Boolean).join(', ') || '-';
  };

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

  const resolveEmployeeName = (employeeValue) => {
    if (!employeeValue) return '-';

    if (typeof employeeValue === 'object') {
      return getEmployeeName(employeeValue);
    }

    const employeeIdValue = String(employeeValue).trim();
    if (!employeeIdValue) return '-';

    const matchedEmployee = employes.find(
      (employee) => String(employee.employe_id || employee.employee_id || employee.id || employee.value) === employeeIdValue,
    );

    return matchedEmployee ? getEmployeeName(matchedEmployee) : employeeIdValue;
  };

  const deriveContractHistory = (row) => {
    if (!row) return [{ label: 'Riwayat', value: 'Belum ada riwayat kontrak.' }];

    const rawHistory = contractHistory.length
      ? contractHistory
      : Array.isArray(row.history)
        ? row.history
        : Array.isArray(row.histories)
          ? row.histories
          : Array.isArray(row.logs)
            ? row.logs
            : [];

    if (rawHistory.length) {
      return rawHistory.map((item, index) => {
        const actionBy = item.action_by || item.actionBy || item.user_name || item.created_by_name || item.employee_name || item.name || item.full_name || item.user || item.actor;
        const actionName = item.action || item.type || item.label || item.title || item.detail || item.description || `Perubahan ${index + 1}`;
        const detail = item.detail || item.description || item.note || item.message || item.value || item.content || actionName || '';
        const title = item.label || item.title || item.action || item.type || `Perubahan ${index + 1}`;
        const actorName = resolveEmployeeName(actionBy);
        const historyDate = formatDateTime(item.action_time || item.actionTime || item.created_at || item.updated_at || item.date);

        return {
          label: actorName && actorName !== '-' ? `Action by: ${actorName}` : title,
          value: `${actionName || detail || 'Perubahan kontrak'}${historyDate !== '-' ? ` • ${historyDate}` : ''}`,
        };
      });
    }

    return [
      { label: 'Dibuat', value: formatDateTime(row.created_at || row.createdAt) },
      { label: 'Terakhir diubah', value: formatDateTime(row.updated_at || row.updatedAt || row.updated_at) },
      { label: 'Status', value: row.status || 'Aktif' },
    ];
  };

  const fetchContractHistory = async (row) => {
    if (!row?.id) {
      setContractHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      const res = await api.get(`dapi/kontrak/${row.id}/history`);
      const payload = res?.data?.data ?? res?.data?.history ?? res?.data ?? [];
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
      setContractHistory(rows);
    } catch (error) {
      setContractHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openContractDetail = async (row) => {
    setSelectedContract(row);
    setContractHistory([]);
    await fetchContractHistory(row);
    setDetailModalOpen(true);
  };

  const closeContractDetail = () => {
    setSelectedContract(null);
    setContractHistory([]);
    setDetailModalOpen(false);
  };

  const statCards = [
    { label: 'Total Kontrak', value: stats.total, color: '#4f46e5', bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', icon: CalendarMonthOutlined },
    { label: 'Aktif', value: stats.active, color: '#16a34a', bg: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', icon: CheckCircleOutlineOutlined },
    { label: 'Expired', value: stats.expired, color: '#dc2626', bg: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)', icon: WarningAmberOutlined },
    { label: 'Mendatang', value: stats.upcoming, color: '#0ea5e9', bg: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)', icon: ScheduleOutlined },
  ];

  return (
    <TabContext value={value}>
      <Card className="mb-1">
        <TabList
          onChange={handleChange}
          aria-label="kontrak tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={
              <Badge badgeContent={stats.total} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} color="primary">
                <strong>DASHBOARD</strong> &nbsp;&nbsp;
              </Badge>
            }
            value="1"
          />
          {isPickKontrak && (
            <Tab
              label={
                <Badge badgeContent={0} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} color="primary">
                  <strong>ADD KONTRAK</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="2"
            />
          )}
          <Tab
            label={
              <Badge badgeContent={filteredContracts.length} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} color="primary">
                <strong>LIST KONTRAK</strong> &nbsp;&nbsp;
              </Badge>
            }
            value="3"
          />
        </TabList>
      </Card>

      <TabPanel value="1" className="ps-0 pe-0">
        <Row>
          {statCards.map((item) => {
            const Icon = item.icon;

            return (
              <Col md={3} key={item.label} className="mb-3">
                <Card style={{ border: 'none', background: item.bg, color: '#fff', boxShadow: '0 14px 30px rgba(79, 70, 229, 0.25)' }}>
                  <CardBody style={{ padding: '20px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 12, letterSpacing: 0.5, opacity: 0.9 }}>{item.label}</div>
                      <div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.18)', borderRadius: 12 }}>
                        <Icon fontSize="small" />
                      </div>
                    </div>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: 32 }}>{item.value}</h3>
                  </CardBody>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Row>
          <Col lg={8} className="mb-3">
            <Card style={{ border: 'none', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)' }}>
              <CardBody style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
                  <h5 style={{ margin: 0, fontWeight: 700 }}>{selectedPeriod === 'bulanan' ? 'Kontrak per Bulan' : 'Trend Tahunan'}</h5>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                      select
                      size="small"
                      label="Periode"
                      value={selectedPeriod}
                      onChange={(event) => setSelectedPeriod(event.target.value)}
                      sx={{ minWidth: 140, backgroundColor: '#fff', borderRadius: 1 }}
                    >
                      <MenuItem value="bulanan">Bulanan</MenuItem>
                      <MenuItem value="tahunan">Tahunan</MenuItem>
                    </TextField>
                    <TextField
                      select
                      size="small"
                      label="Tahun"
                      value={chartYear}
                      onChange={(event) => setChartYear(event.target.value)}
                      sx={{ minWidth: 140, backgroundColor: '#fff', borderRadius: 1 }}
                    >
                      {lastFiveYears.map((year) => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </TextField>
                  </div>
                </div>
                {selectedPeriod === 'bulanan' ? (
                  <Chart options={monthlyChart.options} series={monthlyChart.series} type="bar" height={290} />
                ) : (
                  <Chart options={yearlyChart.options} series={yearlyChart.series} type="line" height={260} />
                )}
              </CardBody>
            </Card>
          </Col>

          <Col lg={4} className="mb-3">
            <Card style={{ border: 'none', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)' }}>
              <CardBody style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h5 style={{ margin: 0, fontWeight: 700 }}>Ringkasan</h5>
                </div>
                {contracts.length ? (
                  <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 2 }}>
                    {contracts.slice(0, 5).map((item) => (
                      <li key={item.id || item.no_contrac || item.vjudul} style={{ color: '#334155' }}>
                        <strong>{item.vjudul || item.judul}</strong>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{item.vpartner || item.partner}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted">Belum ada data kontrak.</div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

      </TabPanel>

      {isPickKontrak && (
        <TabPanel value="2" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <NewKontrak
                employes={employes}
                editData={editingContract}
                onSuccess={handleSuccess}
                onCancelEdit={() => setEditingContract(null)}
              />
            </CardBody>
          </Card>
        </TabPanel>
      )}

      <TabPanel value="3" className="ps-0 pe-0">
        <Card>
          <CardBody>
            <ListKontrak
              contracts={filteredContracts}
              employes={employes}
              canEdit={isPickKontrak}
              canDelete={isPickKontrak}
              onEdit={(row) => {
                if (!isPickKontrak) return;
                setEditingContract(row);
                setValue('2');
              }}
              onDelete={isPickKontrak ? handleDelete : undefined}
              onRefresh={getContracts}
              onRowClick={openContractDetail}
            />
          </CardBody>
        </Card>
      </TabPanel>
      <Modal isOpen={detailModalOpen} toggle={closeContractDetail} centered size="lg">
        <ModalHeader toggle={closeContractDetail}>Detail Kontrak</ModalHeader>
        <ModalBody>
          {selectedContract ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12 }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Nomor Kontrak</div>
                  <strong>{resolveContractField(selectedContract, ['no_contrac', 'nomor_kontrak', 'nomor', 'no'])}</strong>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12 }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Jenis</div>
                  <strong>{resolveContractField(selectedContract, ['jenis_kontrak', 'jenis_dokumen', 'jenis'])}</strong>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12 }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Judul</div>
                  <strong>{resolveContractField(selectedContract, ['vjudul', 'judul'])}</strong>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12 }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Partner</div>
                  <strong>{resolveContractField(selectedContract, ['vpartner', 'partner'])}</strong>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12 }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Mulai</div>
                  <strong>{formatDateTime(resolveContractField(selectedContract, ['start', 'dari']))}</strong>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12 }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Berakhir</div>
                  <strong>{formatDateTime(resolveContractField(selectedContract, ['end', 'sampai']))}</strong>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, gridColumn: '1 / -1' }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>PIC</div>
                  <strong>{getPicListLabel(selectedContract, employes)}</strong>
                </div>
              </div>

              <div>
                <h6 style={{ marginBottom: 12, fontWeight: 700 }}>History Kontrak</h6>
                {historyLoading ? (
                  <div style={{ color: '#64748b' }}>Memuat riwayat kontrak...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {deriveContractHistory(selectedContract).map((item) => (
                      <div key={`${item.label}-${String(item.value)}`} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', background: '#fff' }}>
                        <div style={{ color: '#64748b', fontSize: 12 }}>{item.label}</div>
                        <div style={{ fontWeight: 600, marginTop: 4 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </ModalBody>
      </Modal>
    </TabContext>
  );
};

export default Dashboard;