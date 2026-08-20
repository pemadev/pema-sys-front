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
import { Card, CardBody, Col, Row } from 'reactstrap';
import React, { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import useAxios from '../../hooks/useAxios';
import NewKontrak from './NewKontrak';
import ListKontrak from './ListKontrak';
import { alert } from '../../components/atoms/Toast';

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
  const api = useAxios();
  const lastFiveYears = useMemo(() => getLastFiveYears(), []);

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
      const res = await api.delete(`dapi/kontrak/${row.id}`);
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
    return contracts;
  }, [contracts]);

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
    setValue(newValue);
  };

  const handleSuccess = () => {
    getContracts();
    setEditingContract(null);
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
          <Tab
            label={
              <Badge badgeContent={0} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} color="primary">
                <strong>ADD KONTRAK</strong> &nbsp;&nbsp;
              </Badge>
            }
            value="2"
          />
          <Tab
            label={
              <Badge badgeContent={contracts.length} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} color="primary">
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

      <TabPanel value="3" className="ps-0 pe-0">
        <Card>
          <CardBody>
            <ListKontrak
              contracts={contracts}
              employes={employes}
              onEdit={(row) => {
                setEditingContract(row);
                setValue('2');
              }}
              onDelete={handleDelete}
              onRefresh={getContracts}
            />
          </CardBody>
        </Card>
      </TabPanel>
    </TabContext>
  );
};

export default Dashboard;