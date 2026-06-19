import React from "react";
import { Row, Col, ListGroup, ListGroupItem, ListGroupItemHeading, ListGroupItemText } from "reactstrap";
import Chart from 'react-apexcharts';
import { useQuery } from "@tanstack/react-query";
import BandwidthUsage from '../sppd/components/BandwidthUsage';
import '../sppd/Dasboard.scss';
import './DashboardAdm.scss';
import useAxios from "../../hooks/useAxios";
// import { Spinner } from "reactstrap";

// import Loader from "../../layouts/loader/Loader";



const DashboardAdm = () => {
    // const [dashView, setDashView] = useState([]);

    // const [s, setSk] = React.useState([]);

    const api = useAxios();
    const { data, isLoading: isChartLoaing } = useQuery({
        queryKey: ['dataDash2'],
        queryFn: () =>
            api.get(`/dapi/adm/dashboard/f`).then((res) => {
                return res.data.data;
            }),
    });

    // Query tambahan untuk surat keluar
    const { data: suratKeluar } = useQuery({
        queryKey: ['suratKeluar'],
        queryFn: () =>
            api.get(`/dapi/adm/dashboard/surat_keluar`).then((res) => res.data.data),
    });

    const { data: suratMasuk } = useQuery({
        queryKey: ['suratMasuk'],
        queryFn: () =>
            api.get(`/dapi/adm/dashboard/surat_masuk`).then((res) => res.data.data),
    });

    const { data: disposed } = useQuery({
        queryKey: ['disposed'],
        queryFn: () =>
            api.get(`/dapi/adm/dashboard/disposed`).then((res) => res.data.data),
    });

    const { data: tandaTangan } = useQuery({
        queryKey: ['tandaTangan'],
        queryFn: () =>
            api.get(`/dapi/adm/dashboard/document`).then((res) => res.data.data),
    });

    const { data: latestSurat, isLoading: isLatestSuratLoading } = useQuery({
        queryKey: ['latestSurat'],
        queryFn: () =>
            api.get(`/dapi/adm/dashboard/latest`).then((res) => res.data.data),
    });


    const optionsbar = {
        chart: {
            fontFamily: "'Rubik', sans-serif",
        },
        // colors: ['#000000'],
        dataLabels: {
            enabled: false,
        },
        xaxis: {
            categories: data?.chart?.divisi,
            labels: {
                show: false
            },
        },
        plotOptions: {
            bar: {
                distributed: true,
                horizontal: false,
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
            //   max: 100,
        },
        title: {
            text: `Grafik Surat PEMA ${new Date().getFullYear()} per Divisi`, // Judul chart
            align: 'left', // Penempatan judul ('left', 'center', 'right')
            style: {
                fontSize: '16px', // Ukuran font
                color: '#6c757d', // Warna font
            },
        },
        tooltip: {
            theme: 'dark',
        },
    };

    const seriesbar = [
        {
            name: 'Surat Masuk',
            data: data?.chart?.value,
        },
    ];

    return (
        <>
            <>
                <Row>

                    <Col md={3} className="mt-3" >
                        <BandwidthUsage
                            title='Surat Keluar'
                            sub='Tahun 2026'
                            count={suratKeluar?.toString() || '...'}
                            tipe='scatter'
                            color='bg-warning'
                        />
                    </Col>

                    <Col md={3} className="mt-3" >
                        <BandwidthUsage
                            title='Surat Masuk'
                            sub='Tahun 2026'
                            count={suratMasuk?.toString() || '...'}
                            tipe='bar'
                            color='bg-success'
                        />
                    </Col>
                    <Col md={3} className="mt-3" >
                        <BandwidthUsage
                            title='Disposisi'
                            sub='ke saya'
                            count={disposed?.toString() || '...'}
                            tipe='radar'
                            color='bg-secondary'
                        />
                    </Col>
                    <Col md={3} className="mt-3" >
                        <BandwidthUsage
                            title='Tanda Tangan'
                            sub='saya'
                            count={tandaTangan?.toString() || '...'}
                            tipe='line'
                            color='bg-primary'
                        />
                    </Col>



                </Row>

                <Row className="mt-4">
                    <Col md={4}>
                        <h3 className="list-group-title">Surat Keluar Terbaru</h3>
                        <ListGroup>
                            {isLatestSuratLoading ? (
                                // Skeleton placeholder, misal 3 item
                                <>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <ListGroupItem className="list-group-item-hover list-group-item-strip mb-3" key={i}>
                                            <div className="list-group-item-date skeleton" style={{ width: '60%', height: 16, background: '#eee', borderRadius: 4 }} />
                                            <ListGroupItemHeading>
                                                <div className="skeleton" style={{ width: '80%', height: 18, background: '#eee', borderRadius: 4, marginTop: 3 }} />
                                            </ListGroupItemHeading>
                                            <ListGroupItemText>
                                                <div className="skeleton" style={{ width: '90%', height: 14, background: '#eee', borderRadius: 4, marginTop: 3 }} />
                                            </ListGroupItemText>
                                        </ListGroupItem>
                                    ))}
                                </>
                            ) : latestSurat?.map((item) => (
                                <ListGroupItem className="list-group-item-hover list-group-item-strip mb-3" key={item.id}>
                                    <div className="list-group-item-date">{item.nomor_surat}</div>
                                    <ListGroupItemHeading>
                                        Kpd : {item.kepada}
                                    </ListGroupItemHeading>
                                    <ListGroupItemText>
                                        {item.perihal}
                                    </ListGroupItemText>
                                </ListGroupItem>
                            ))}
                            {latestSurat?.length === 0 && (
                                <ListGroupItem className=" mb-3">
                                    <div className="list-group-item-date">&nbsp;</div>
                                    <ListGroupItemHeading className="text-center">
                                        Belum ada Data
                                    </ListGroupItemHeading>
                                    <ListGroupItemText>
                                        &nbsp;
                                    </ListGroupItemText>
                                </ListGroupItem>
                            )}
                        </ListGroup>
                    </Col>
                    <Col md={8}>

                        {isChartLoaing ? (<>
                         <div className="skeleton" style={{ width: '70%', height: 20, background: '#eee', borderRadius: 4, marginTop: 3 }} />
                         <div className="skeleton" style={{ width: '60%', height: 4, background: '#eee', borderRadius: 4, marginTop: 3 }} />
                        <div className="chart-placeholder">
                            {[40, 60, 30, 70, 50,40, 60, 30, 70, 50].map((h) => (
                                <div key={h} className="bar" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                        <div className="skeleton" style={{ width: '100%', height: 20, background: '#eee', borderRadius: 4, marginTop: 3 }} />
                         <div className="skeleton" style={{ width: '100%', height: 4, background: '#eee', borderRadius: 4, marginTop: 3 }} /></>) : (<Chart
                            options={optionsbar}
                            series={seriesbar}
                            type="bar"
                            height="500"
                        />)}
                    </Col>
                </Row></>



        </>
    );
};

export default DashboardAdm;