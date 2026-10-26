import React, { useEffect } from 'react';
import { Col, Row, Table } from 'reactstrap';
import Chart from 'react-apexcharts';
import { useQuery } from '@tanstack/react-query';
import useAxios from '../../hooks/useAxios';
import BandwidthUsage from './components/BandwidthUsage';
import user1 from '../../assets/images/users/user1.jpg';
import rupiah from '../../utils/rupiah';
import './Dasboard.scss';
// import { set } from 'react-hook-form';

const DashboardDirek = () => {
  const [pengajuan, setPengajuan] = React.useState('0');
  const [aktif, setAktif] = React.useState('0');
  const [done, setDone] = React.useState('0');
  const [aktual, setAktual] = React.useState(0);

  const [dataKar, setDataKar] = React.useState([]);

  const [lebel, setLebel] = React.useState([]);
  const [val, setVal] = React.useState([]);
  const [status, setStatus] = React.useState(false);

  const api = useAxios();

  const dataDash = useQuery({
    queryKey: ['dataDash'],
    queryFn: () =>
      api.get(`/dapi/sppd/dashboard`).then((res) => {
        return res.data.data;
      }),
  });

  useEffect(() => {
    console.log(dataDash.data);
    setStatus(true);
    setPengajuan(dataDash?.data?.dashboard?.pengajuan);
    setAktif(dataDash?.data?.dashboard?.aktif);
    setDone(dataDash?.data?.dashboard?.selesai);
    setAktual(dataDash?.data?.dashboard?.total_aktual);

    setDataKar(dataDash?.data?.groupKar);
    setLebel(dataDash?.data?.label);
    setVal(dataDash?.data?.value);
  }, [dataDash]);

  useEffect(() => {
    console.log(dataKar);
  }, [dataKar]);
  const optionsbar = {
    chart: {
      fontFamily: "'Rubik', sans-serif",
    },
    colors: ['#4fc3f7', '#42f54e', '#f542ef'],
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: lebel,
      labels: {
        style: {
          cssClass: 'grey--text lighten-2--text fill-color',
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
      },
    },
    grid: {
      borderColor: 'rgba(0,0,0,0.1)',
    },
    yaxis: {
      labels: {
        style: {
          cssClass: 'grey--text lighten-2--text fill-color',
        },
      },
      max: 100,
    },
    tooltip: {
      theme: 'dark',
    },
  };

  const seriesbar = [
    {
      data: val,
    },
  ];

  return (
    <>
      {status ? (
        <>
          <Row>
            <Col md={3} className="mt-3">
              <BandwidthUsage
                title="Perjalanan Dinas"
                sub="aktif"
                count={aktif ?? '-'}
                tipe="scatter"
                color="bg-info"
              />
            </Col>
            <Col md={3} className="mt-3">
              <BandwidthUsage
                title="Pengajuan"
                sub="Perjalanan Dinas"
                count={pengajuan ?? '-'}
                tipe="bar"
                color="bg-dark"
              />
            </Col>
            <Col md={3} className="mt-3">
              <BandwidthUsage
                title="Perjalanan Dinas"
                sub="selesai"
                count={done ?? '-'}
                tipe="radar"
                color="bg-danger"
              />
            </Col>
            <Col md={3} className="mt-3">
              <BandwidthUsage
                title="Aktual Biaya"
                sub={
                  aktual === undefined || aktual === null
                    ? '-'
                    : (+aktual).toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })
                }
                count="IDR"
                tipe="line"
                color="bg-success"
              />
            </Col>
          </Row>

          <Row>
            <Col md={7} className="mt-3">
              <h4 className="mb-3">
                Aktual Penggunaan Biaya SPPD sesuai RKAP {dataDash?.data?.tahun_rkap}
              </h4>
              <hr />
              {dataDash.isLoading && 'Loading Chart . . . . '}
              {!dataDash.isLoading && lebel?.length ? (
                <Chart options={optionsbar} series={seriesbar} type="bar" height="500" />
              ) : (
                !dataDash.isLoading && 'Belum ada data RKAP'
              )}
            </Col>
            <Col md={5} className="mt-3">
              <div>
                <Table
                  className="dash-table text-nowrap mt-n3 mb-0 align-middle custom-table"
                  borderless
                >
                  <thead>
                    <tr>
                      <th width="60%"></th>
                      <th width="10%">Qty</th>
                      <th width="30%">Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataKar?.map((tdata) => (
                      <tr key={tdata.nama} className="border-top">
                        <td width="60%" style={{ overflow: 'elipsis' }}>
                          <div className="d-flex align-items-center">
                            <img
                              src={user1}
                              className="rounded-circle"
                              alt="avatar"
                              width="45"
                              height="45"
                            />
                            <div className="ms-3">
                              <h6 className="mb-0 fw-bold">{tdata.nama}</h6>
                              <span className="text-muted fs-7">{tdata.jabatan}</span>
                            </div>
                          </div>
                        </td>
                        <td width="10%">{tdata.qty}</td>
                        <td width="30%">{rupiah(tdata.budget)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Col>
          </Row>
        </>
      ) : (
        ''
      )}
    </>
  );
};

export default DashboardDirek;
