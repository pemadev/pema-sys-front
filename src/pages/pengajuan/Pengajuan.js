import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from 'reactstrap';
import { TabContext, TabList } from '@mui/lab';
import TabPanel from '@mui/lab/TabPanel';
import Tab from '@mui/material/Tab';
import Badge from '@mui/material/Badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import HalamanPro from '../../components/HalamanPro';
import useAxios from '../../hooks/useAxios';
import Dashboard from './dashboard/Dashboard';
import PengajuanBiaya from './pengajuanBiaya/PengajuanBiaya';
import ApprovalPengajuan from './approvalPengajuan/ApprovalPengajuan';
import PengajuanSelesai from './pengajuanSelesai/PengajuanSelesai';

const Pengajuan = () => {
  const api = useAxios();
  const location = useLocation();

  const [dataPengajuan, setDataPengajuan] = useState([]);

  const { data } = useQuery(['dashboard-pengajuan'], () =>
    api.get('/api/pengajuan-dashboard').then((res) => {
      return res.data.data;
    }),
  );

  const { data: dataChart } = useQuery(['chart-pengajuan'], () =>
    api.get('/api/pengajuan-dashboard/chart').then((res) => {
      console.log('Data Chart', res.data.data);
      return res.data.data;
    }),
  );

  useEffect(() => {
    if (data) {
      setDataPengajuan(data);
    }
  }, [data]);

  const auth = JSON.parse(localStorage.getItem('auth'));
  const queryClient = useQueryClient();
  const [value, setValue] = useState('1');
  const [badgeCount, setBadgeCount] = useState(0); // State untuk menyimpan jumlah badge

  useEffect(() => {
    queryClient.invalidateQueries(['approval-pengajuan-all']);
  }, []);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Ambil tab dari URL, misalnya ?tab=3
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'approval') {
      setValue('3');
    }
  }, [location]);

  return (
    <HalamanPro judul="Pengajuan" keterangan="Pengajuan, approval dan status penyelesaian">
      <TabContext value={value}>
        <Card className="mb-1">
          <TabList onChange={handleChange} vertical="sm" variant="scrollable" scrollButtons="auto">
            <Tab
              label={
                <Badge
                  badgeContent={0} // Menampilkan badge count yang didapat dari PengajuanSelesai
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="primary"
                >
                  <strong>DASHBOARD</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="1"
            />
            {auth?.user.roles.includes('AdminPengajuan') && (
              <Tab
                label={
                  <Badge
                    badgeContent={0}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    color="primary "
                  >
                    <strong>PENGAJUAN</strong> &nbsp;&nbsp;
                  </Badge>
                }
                value="2"
              />
            )}
            {(auth?.user.roles.includes('ManagerUmum') ||
              auth?.user.roles.includes('DirekturUmumKeuangan') ||
              auth?.user.roles.includes('Presdir')) && (
              <Tab
                label={
                  <Badge
                    badgeContent={
                      (badgeCount > 99 ? '99+' : badgeCount) ||
                      (dataPengajuan?.total_pengajuan_belum_selesai > 99
                        ? '99+'
                        : dataPengajuan?.total_pengajuan_belum_selesai)
                    }
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    color="warning"
                    style={{ textTransform: 'capitalize' }}
                  >
                    <strong>APPROVAL PENGAJUAN</strong> &nbsp;&nbsp;
                  </Badge>
                }
                value="3"
              />
            )}
            <Tab
              label={
                <Badge
                  badgeContent={0} // Menampilkan jumlah badge dari PengajuanSelesai
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="primary"
                >
                  <strong>PENGAJUAN SELESAI</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="4"
            />
          </TabList>
        </Card>

        <TabPanel value="1" className="ps-0 pe-0">
          <Dashboard
            diproses={dataPengajuan?.total_pengajuan_belum_selesai}
            selesai={dataPengajuan?.total_pengajuan_selesai}
            totalPengajuan={dataPengajuan?.total_pengajuan}
            dataChart={dataChart}
          />
        </TabPanel>
        <TabPanel value="2" className="ps-0 pe-0">
          <PengajuanBiaya />
        </TabPanel>
        <TabPanel value="3" className="ps-0 pe-0">
          <ApprovalPengajuan setBadgeCount={setBadgeCount} />
        </TabPanel>
        <TabPanel value="4" className="ps-0 pe-0">
          <PengajuanSelesai /> {/* Passing setBadgeCount to PengajuanSelesai */}
        </TabPanel>
      </TabContext>
    </HalamanPro>
  );
};

export default Pengajuan;
