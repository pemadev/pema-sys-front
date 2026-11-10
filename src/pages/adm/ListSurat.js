import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import DataTable from "react-data-table-component";
import { QRCode } from 'react-qrcode-logo';
import { Input, Badge, Button, Modal, ModalBody, ModalHeader } from 'reactstrap';
import dayjs from "dayjs";
import 'dayjs/locale/id';
import { confirmAlert } from "react-confirm-alert";
import { alert } from "../../components/atoms/Toast";
import GenerateSurat from "./Fungsi/Generate";
import FMerge from "./Fungsi/FMerge";
import signSuratPdf from "./Fungsi/signSuratPdf";
import '../sppd/style.scss';
import logo from '../../assets/images/qrcode/qr-code-logo.png';
import useAxios from "../../hooks/useAxios";
import ViewLogs from "./Layuots/ViewLogs";
import Approval from "./Layuots/Approval";
import Review from "./Layuots/Review";
import useAuth from "../../hooks/useAuth";
import Disposisi from "./Layuots/Diposisi";
import GenerateDispo from "./Fungsi/GenerateDispo";
// import { width } from "@mui/system";
// import { set } from "react-hook-form";



// Lebar kolom tombol mengikuti baris dengan tombol terbanyak pada tab atau sub-tab yang sedang tampil. Teks tombol diukur dengan canvas;
// tiap tombol kecil Bootstrap menambah padding 2x8px + border 2px + margin kanan 8px, sel tabel menambah padding 2x16px.
let konteksUkur;
const ukurTeks = (teks) => {
    if (!konteksUkur) konteksUkur = document.createElement('canvas').getContext('2d');
    // font tombol kecil Bootstrap: 0,875rem dengan font-family turunan dari body (sama dengan yang dirender)
    const akar = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    konteksUkur.font = `${akar * 0.875}px ${window.getComputedStyle(document.body).fontFamily}`;
    return Math.ceil(konteksUkur.measureText(teks).width);
};
// untuk tombol yang labelnya berganti (mis. "Lihat Surat" menjadi "Loading . . ."), pakai label yang terlebar agar lebar kolom tidak bergeser
const terlebar = (...labels) => labels.reduce((a, b) => (ukurTeks(b) > ukurTeks(a) ? b : a));
const lebarKolomTombol = (rows, labelsOf, ekstra = 0) => {
    const maks = Math.max(0, ...(rows || []).map((r) => labelsOf(r).reduce((s, l) => s + ukurTeks(l) + 26, 0)));

    return `${Math.max(maks + ekstra + 32 + 6, 110)}px`;
};

const ListSurat = ({ listSurat, valueNow, refresh, type, update, status }) => {
    const qrCodeRef = useRef();
    const api = useAxios();
    const auth = useAuth();
    const baseURL1 = process.env.REACT_APP_FRONTEND;

    const [loadingView, setLoadingView] = useState('');
    const [loadingUpdate, setLoadingUpdate] = useState('');
    const [loadingViewSM, setLoadingViewSM] = useState('');

    const [search, setSearch] = React.useState('');
    const [listP, setListP] = React.useState([]);
    const [detail, setDetail] = React.useState();
    const [isiModal, setIsiModal] = useState('');
    const [dataIsi, setDataIsi] = useState();
    const [pdfmerge, setPdfmerge] = useState();

    const [modal, setModal] = useState(false);

    const [typeLog, setTypeLog] = useState('');

    const toggleModal = () => setModal(!modal);

    useEffect(() => {
        setSearch('');
        setListP(listSurat);
        console.log(listSurat);
    }, [listSurat]);

    useEffect(() => {

        if (type === 'masuk') {
            const resultsm = listSurat?.filter((p) =>
                p?.pengirim?.toLocaleLowerCase().match(search?.toLocaleLowerCase()) || p?.nomor?.toLocaleLowerCase().match(search?.toLocaleLowerCase()) || p?.perihal?.toLocaleLowerCase().match(search?.toLocaleLowerCase()),
            );
            setListP(resultsm);
        } else {
            const result = listSurat?.filter((p) =>
                p?.kepada?.toLocaleLowerCase().match(search?.toLocaleLowerCase()) || p?.nomor_surat?.toLocaleLowerCase().match(search?.toLocaleLowerCase()),
            );
            setListP(result);
        }

    }, [search]);

    // surat tanda tangan basah: unggah dan buka berkas surat yang sudah ditandatangani (PDF, JPG, atau PNG, maksimal 10 MB)
    const ttdFileRef = useRef();
    const [ttdUploadId, setTtdUploadId] = useState(null);

    const pilihBerkasTtd = (row) => {
        setTtdUploadId(row.id);
        if (ttdFileRef.current) {
            ttdFileRef.current.value = '';
            ttdFileRef.current.click();
        }
    };

    const unggahTtd = (e) => {
        const file = e.target.files?.[0];
        if (!file || !ttdUploadId) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('error', 'Ukuran berkas maksimal 10 MB.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            api.post(`dapi/adm/surat/${ttdUploadId}/ttd-basah`, { file: reader.result })
                .then((res) => {
                    alert('success', res.data?.message || 'Berkas tersimpan');
                    refresh();
                })
                .catch((err) => alert('error', err?.response?.data?.message || err.message));
        };
        reader.readAsDataURL(file);
    };

    const lihatTtd = (row) => {
        api.get(`dapi/adm/surat/${row.id}/ttd-basah`)
            .then((res) => {
                const { file, mime } = res.data.data;
                const bytes = Uint8Array.from(atob(file), (c) => c.charCodeAt(0));
                window.open(URL.createObjectURL(new Blob([bytes], { type: mime })));
            })
            .catch((err) => alert('error', err?.response?.data?.message || err.message));
    };

    const viewSurat = (id) => {
        // surat tanda tangan basah yang berkas ber-ttd-nya sudah diunggah: buka berkas itu, bukan PDF buatan sistem
        const baris = listSurat?.find((p) => p.id === id);
        if (baris?.ttd_basah && baris?.file_ttd) {
            lihatTtd(baris);
            return;
        }
        setLoadingView(id);

        setDetail(listSurat?.find((p) => p.id === id));
        // console.log(listSurat?.find((p) => p.id === id));
        async function fetchData(deta) {
            try {
                const pdf = await GenerateSurat(deta, qrCodeRef);

                FMerge(pdf, deta?.fileLampiran)
                    .then((merged) => signSuratPdf(api, id, merged, deta?.tteCode))
                    .then((res) => {
                        window.open(res);
                        console.log(res);
                    });
            } catch (e) {
                console.log(e);
            }
        }
        api
            .get(`dapi/adm/surat/detail/${id}`).then((res) => {
                fetchData(res.data.data);
                console.log(res.data.data)
                setLoadingView('');
            });
    }


    const openLog = (id) => {
        setDataIsi([])
        const dt = listSurat?.find((p) => p.id === id);
        api
            .get(`dapi/eSign/logs/${dt?.no_document}`).then((res) => {
                console.log(res.data.data);
                setDataIsi(res.data.data);
            });
        toggleModal();
        setIsiModal('log');
    }

    const openApproval = (id) => {
        setDataIsi([])
        const dt = listSurat?.find((p) => p.id === id);
        api
            .get(`dapi/eSign/approval/${dt?.no_document}`).then((res) => {
                console.log(res.data.data);
                setDataIsi(res.data.data);
            });
        toggleModal();
        setIsiModal('approval');
    }


    const startReview = (id) => {
        const dt = listSurat?.find((p) => p.id === id);
        console.log(dt);
        console.log(dt);
        toggleModal();
        setDataIsi(dt);
        setIsiModal('review');
    }

    const lihatparaf = async (id) => {
        setLoadingView(id);
        try {
            const res = await api.get(`dapi/adm/surat/detail/${id}`);
            const dt = listSurat?.find((p) => p.id === id);
            const deta = res.data.data;
            console.log(deta);
            const pdf = await GenerateSurat(deta, qrCodeRef);
            const merged = await signSuratPdf(api, id, await FMerge(pdf, deta?.fileLampiran), deta?.tteCode);
            setDataIsi(dt);
            setPdfmerge(merged);
            setIsiModal('paraf');
            toggleModal();
        } catch (err) {
            console.error(err);
            alert('error', err?.message || 'Gagal membuka surat');
        } finally {
            setLoadingView('');
        }
        return null;
    }

    // const handleParaf = async () => {
    //     if (!dataIsi?.detail?.no_document) return alert('error', 'No document tidak tersedia');
    //     try {
    //         const no = dataIsi.detail.no_document;
    //         const res = await api.post(`dapi/eSign/paraf/${no}`);
    //         if (res?.data?.success) {
    //             alert('success', res.data.message || 'Berhasil paraf');
    //             toggleModal();
    //             refresh();
    //         } else {
    //             alert('error', res?.data?.message || 'Gagal paraf');
    //         }
    //     } catch (err) {
    //         alert('error', err?.message || 'Gagal paraf');
    //     }
    //     return null;
    // };

    // const handleReject = async () => {
    //     if (!dataIsi?.detail?.no_document) return alert('error', 'No document tidak tersedia');
    //     try {
    //         const no = dataIsi.detail.no_document;
    //         const res = await api.post(`dapi/eSign/reject/${no}`);
    //         if (res?.data?.success) {
    //             alert('success', res.data.message || 'Berhasil reject');
    //             toggleModal();
    //             refresh();
    //         } else {
    //             alert('error', res?.data?.message || 'Gagal reject');
    //         }
    //     } catch (err) {
    //         alert('error', err?.message || 'Gagal reject');
    //     }
    //     return null;
    // };

    const updateSurat = async (id) => {
        setLoadingUpdate(id);
        await update(id).then(() => {
            setLoadingUpdate('');
        });
        return null;
    }

    // tandai void: surat tidak terpakai lagi dan belum ada yang menyetujui; nomornya bisa dipakai PICAdm untuk backdate
    const voidSurat = (row) => {
        // eslint-disable-next-line no-alert
        const alasan = window.prompt(`Tandai surat ${row.nomor_surat} sebagai VOID?
Nomornya bisa dipakai lagi untuk backdate dan surat tidak bisa diproses lagi.

Alasan (boleh kosong):`);
        if (alasan === null) return;
        api.post(`dapi/adm/void/${row.id}`, { alasan })
            .then((res) => {
                alert('success', res.data?.message || 'Surat ditandai void');
                refresh();
            })
            .catch((err) => alert('error', err?.response?.data?.message || err.message));
    };

    const detailSm = async (id) => {
        setLoadingViewSM(id);
        await api.get(`dapi/adm/suratmasuk/detail/${id}`).then((res) => {


            FMerge(res.data.data.file_surat, '').then((t) => {
                const newWindow = window.open(t);

                if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
                    // Fallback untuk Safari atau jika popup diblokir
                    // alert("Tidak dapat membuka tab baru. File akan diunduh.");
                    const link = document.createElement("a");
                    link.href = t;
                    link.download = "file.txt"; // Nama file
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                URL.revokeObjectURL(t);

                // window.open(t);
                setLoadingViewSM('');
            });

        })
        return null;
    }

    const dispoSurat = (id) => {
        const dt = listP.find((p) => p.id === id);
        console.log(dt);
        setDataIsi(dt)
        setIsiModal('dispo');
        toggleModal();
    }

    const deleteSurat = (id) => {
        confirmAlert({
            title: `Are you sure ?`,
            message: `Be careful, what has gone will not come back`,
            buttons: [
                {
                    label: 'Yes',
                    onClick: async () => {
                        await api.post(`dapi/adm/suratmasuk/delete/${id}`).then(() => {
                            refresh();
                            alert('success', `Surat Deleted !`);
                        });
                    },
                },
                {
                    label: 'No',
                    onClick: () => { },
                },
            ],
        })
    }

    const tinjut = (id) => {
        confirmAlert({
            title: `Attention !`,
            message: `Tombol Tindak Lanjut ini untuk menandakan dokumen sudah mulai ditindaklanjuti`,
            buttons: [
                {
                    label: 'Lanjutkan',
                    onClick: async () => {
                        await api.post(`dapi/adm/suratmasuk/diposisi/${id}`, { what: 'tinjut' }).then(() => {
                            refresh();
                            alert('success', `Surat Tinjut !`);
                        });
                    },
                },
                {
                    label: 'Batal',
                    onClick: () => { },
                },
            ],
        })
    }
    const openRiwayat = (id) => {
        setDataIsi([])
        setTypeLog('sm');
        api
            .get(`dapi/adm/suratmasuk/riwayat/${id}`).then((res) => {
                console.log(res.data.data);
                setDataIsi(res.data.data);
                // setLoadingViewSM('');
            });
        toggleModal();
        setIsiModal('log');
    }

    const readCc = async (row) => {
        setLoadingViewSM(row.id);
        await api.post(`dapi/adm/suratmasuk/read/${row?.id}`).then((res) => {
            if (res.status === 200) {
                refresh();
                detailSm(row.id_surat);

            }
        }).catch((err) => {
            alert('error', `${err.message}`);
        })
        return null;
    }

    const handleRowClick = (row) => {
        if (valueNow === `2` && type === 'review') {
            api.post(`dapi/adm/read/${row.no_document}`).then((res) => {
                console.log(res?.data);
                refresh();
            });
            lihatparaf(row.id);
        } else {
            console.log("Row clicked:", row);
        }

    };


    const labelsMasuk = () => {
        const { roles } = auth.auth.user;
        const l = [terlebar('Lihat Surat', 'Loading . . .')];
        if (!roles.includes('SuperAdminAdm') && status !== 'done') {
            if (roles.includes('Presdir') || roles.includes('Director') || roles.includes('ManagerEksekutif')) l.push('Dispo');
            l.push('Tinjut');
        }
        l.push('Riwayat');
        if (roles.includes('SuperAdminAdm')) l.push('Delete');
        return l;
    };
    const labelsCc = () => [terlebar('Lihat Surat', 'Loading . . .'), 'Riwayat'];

    const columsMasuk = [
        {
            name: 'Action',
            width: lebarKolomTombol(listSurat, labelsMasuk),
            selector: (row) =>
                <>
                    <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="info"
                        tag="input"
                        type="button"
                        value={auth.auth.user.roles.includes('SuperAdminAdm') ? loadingViewSM === row.id ? 'Loading . . .' : 'Lihat Surat' : loadingViewSM === row.id_surat ? 'Loading . . .' : 'Lihat Surat'}
                        onClick={() => detailSm(auth.auth.user.roles.includes('SuperAdminAdm') ? row.id : row.id_surat)}
                    />
                    {!auth.auth.user.roles.includes('SuperAdminAdm') &&
                        status !== 'done' ? <>
                        {
                            auth.auth.user.roles.includes('Presdir') || auth.auth.user.roles.includes('Director') || auth.auth.user.roles.includes('ManagerEksekutif') ? <Button
                                className="me-2"
                                size="sm"
                                outline
                                color="dark"
                                tag="input"
                                type="button"
                                value="Dispo"
                                onClick={() => dispoSurat(row.id)}
                            /> : ''
                        }
                        <Button
                            className="me-2"
                            size="sm"
                            outline
                            color="danger"
                            tag="input"
                            type="button"
                            onClick={() => tinjut(row.id_surat)}
                            value="Tinjut"
                        />
                    </> : ''

                    }

                    <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="success"
                        tag="input"
                        type="button"
                        value="Riwayat"
                        onClick={() => openRiwayat(auth.auth.user.roles.includes('SuperAdminAdm') ? row.id : row.id_surat)}
                    />

                    {auth.auth.user.roles.includes('SuperAdminAdm') && <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="danger"
                        tag="input"
                        type="button"
                        disabled={row.diproses > 1}
                        value="Delete"
                        onClick={() => deleteSurat(row.id)}
                    />}



                </>

        },
        {
            name: 'Tindak Lanjut',
            selector: (row) => row?.tindak_lanjut === 'dispo' ? 'Didisposisi' : 'Tidak Didisposisi',
            omit: status !== 'done'
        },
        {
            name: 'Pada',
            selector: (row) => dayjs(row?.ditinjut).locale('id').format("dddd, DD/MM/YY HH:mm"),
            omit: status !== 'done'
        },
        {
            name: 'Nomor',
            selector: (row) => row?.nomor,
        },
        {
            name: 'Perihal',
            selector: (row) => row?.perihal,
        },
        {
            name: 'Pengirim',
            selector: (row) => row?.pengirim,
        },
        {
            name: 'Tanggal Surat',
            selector: (row) => dayjs(row?.tgl_surat).format("YYYY-MM-DD"),
        },
        {
            name: 'Diterima Via',
            selector: (row) => row.via,
        },
        {
            name: 'Tanggal Terima',
            selector: (row) => dayjs(row?.diterima).format("YYYY-MM-DD HH:mm:ss"),
            omit: auth.auth.user.roles.includes('SuperAdminAdm')
        },
        {
            name: 'Masuk Sistem',
            selector: (row) => dayjs(row?.created_at).locale('id').format("dddd, DD/MM/YY HH:mm"),
            omit: !auth.auth.user.roles.includes('SuperAdminAdm')
        },
        {
            name: 'Diinput oleh',
            selector: (row) => row?.by_name,
            omit: !auth.auth.user.roles.includes('SuperAdminAdm')
        },

    ];

    const ccRowStyles = [
        {
            when: row => row.read_by === null,
            style: {
                backgroundColor: "#d7e9f7", // Light red for inactive users
            },
        },
    ];

    const columsCC = [
        {
            name: 'Action',
            width: lebarKolomTombol(listSurat, labelsCc),
            selector: (row) =>
                <>
                    <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="info"
                        tag="input"
                        type="button"
                        value={auth.auth.user.roles.includes('SuperAdminAdm') ? loadingViewSM === row.id ? 'Loading . . .' : 'Lihat Surat' : loadingViewSM === row.id_surat ? 'Loading . . .' : 'Lihat Surat'}
                        onClick={() => readCc(row)}
                    />
                    <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="success"
                        tag="input"
                        type="button"
                        value="Riwayat"
                        onClick={() => openRiwayat(auth.auth.user.roles.includes('SuperAdminAdm') ? row.id : row.id_surat)}
                    />
                </>
        },
        {
            name: 'Nomor Surat',
            selector: (row) => row.nomor,
        },
        {
            name: 'Pengirim',
            selector: (row) => row.pengirim,
        },
        {
            name: 'Perihal',
            selector: (row) => row.perihal,
        },
        {
            name: 'Tanggal Surat',
            selector: (row) => dayjs(row?.tgl_surat).format("YYYY-MM-DD"),
        },
        {
            name: 'dicc oleh',
            selector: (row) => row.position,
        },
        {
            name: 'cc at',
            selector: (row) => dayjs(row?.cc_at).locale('id').format("dddd, DD/MM/YY HH:mm"),
        },
    ];

    const pointerRowStyles = [
        {
            when: () => valueNow === '2' && type === 'review',
            style: {
                cursor: 'pointer'
            }
        }
    ];

    // Tambahkan style gelap untuk row review jika baca=0
    const reviewRowStyles = [
        {
            when: row => valueNow === '2' && type === 'review' && row.baca === 0,
            style: {
                fontWeight: 'bold', // warna abu gelap
                cursor: 'pointer'
            }
        }
    ];

    // syarat tampil tiap tombol kolom Actions; dipakai juga untuk menghitung lebar kolom
    const tampilUpdate = (row) => valueNow === '1' && !row.void && !row.file_ttd;
    const tampilUnggah = (row) => valueNow === '1' && !!row.ttd_basah && !row.void;
    const tampilLihatTtd = (row) => valueNow === '1' && !!row.ttd_basah && !!row.file_ttd;
    const tampilVoid = (row) => valueNow === '1' && !row.void && !row.file_ttd && row.status !== 'signed';
    const tampilApproval = (row) => !row.ttd_basah;
    const labelsAksi = (row) => {
        const l = [];
        if (tampilUpdate(row)) l.push(terlebar('Update', 'Loading . . .'));
        if (tampilUnggah(row)) l.push(row.file_ttd ? 'Ganti Berkas Ber-TTD' : 'Unggah Surat Ber-TTD');
        if (tampilLihatTtd(row)) l.push('Lihat Surat Ber-TTD');
        if (tampilVoid(row)) l.push('Void');
        l.push(terlebar('Lihat Surat', 'Loading . . .'));
        if (tampilApproval(row)) l.push('Approval');
        l.push('Logs');
        return l;
    };
    // kolom Logs dan Lihat & ... pada daftar review (titik biru 12px + margin 2x8px di depannya)
    const labelsReview = (row) => ['Logs', terlebar(`Lihat & ${row.current_type}`, 'Loading . . .')];

    const columns = [
        {
            name: 'Actions',
            width: lebarKolomTombol(listSurat, labelsAksi),
            omit: valueNow === '2' && type === 'review',
            selector: (row) => (
                <>
                    {tampilUpdate(row) && <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="danger"
                        tag="input"
                        type="button"
                        value={loadingUpdate === row.id ? 'Loading . . .' : 'Update'}
                        onClick={() => updateSurat(row.id)}
                    />}
                    {tampilUnggah(row) && <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="primary"
                        tag="input"
                        type="button"
                        value={row.file_ttd ? 'Ganti Berkas Ber-TTD' : 'Unggah Surat Ber-TTD'}
                        onClick={() => pilihBerkasTtd(row)}
                    />}
                    {tampilLihatTtd(row) && <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="success"
                        tag="input"
                        type="button"
                        value="Lihat Surat Ber-TTD"
                        onClick={() => lihatTtd(row)}
                    />}
                    {tampilVoid(row) && <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="secondary"
                        tag="input"
                        type="button"
                        value="Void"
                        onClick={() => voidSurat(row)}
                    />}
                    <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="info"
                        tag="input"
                        type="button"
                        value={loadingView === row.id ? 'Loading . . .' : 'Lihat Surat'}
                        onClick={() => viewSurat(row.id)}
                    />
                    {tampilApproval(row) && <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="dark"
                        tag="input"
                        type="button"
                        value="Approval"
                        onClick={() => openApproval(row.id)}
                    />}

                    <Button
                        className="me-2"
                        size="sm"
                        outline
                        color="success"
                        tag="input"
                        type="button"
                        value="Logs"
                        onClick={() =>
                            openLog(row.id)
                        }
                    />

                    {valueNow === `2` && type === 'review' &&
                        <><Button
                            className="me-2"
                            size="sm"
                            outline
                            color="warning"
                            tag="input"
                            type="button"
                            value={row.current_type}

                            onClick={() => startReview(row.id)}
                        />

                            <Button
                                className="me-2"
                                size="sm"
                                outline
                                color="info"
                                tag="input"
                                type="button"
                                value={loadingView === row.id ? 'Loading . . .' : `Lihat & ${row.current_type}`}
                                onClick={() => lihatparaf(row.id)}
                            />

                        </>}
                </>
            ),
        },
        // Kolom status baca (titik biru)
        {
            name: '',
            width: lebarKolomTombol(listSurat, labelsReview, 28),
            omit: !(valueNow === '2' && type === 'review'),

            selector: (row) => <>
                {row.baca === 0 ? (
                    <span style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#2196f3',
                        marginLeft: 8,
                        marginRight: 8,
                        verticalAlign: 'middle'
                    }} />
                ) : <span style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: 'transparent',
                        marginLeft: 8,
                        marginRight: 8,
                        verticalAlign: 'middle'
                    }} />
                }

                <Button
                    className="me-2"
                    size="sm"
                    outline
                    color="success"
                    tag="input"
                    type="button"
                    value="Logs"
                    onClick={() =>
                        openLog(row.id)
                    }
                />

                <Button
                    className="me-2"
                    size="sm"
                    outline
                    color="warning"
                    tag="input"
                    type="button"
                    value={loadingView === row.id ? 'Loading . . .' : `Lihat & ${row.current_type}`}
                    onClick={() =>
                        handleRowClick(row)
                    }
                />

            </>
        },
        {
            name: 'Nomor Surat',
            selector: (row) => row.nomor_surat,
        },
        {
            name: 'Kepada',
            selector: (row) => row.kepada,
        },
        {
            name: 'Perihal',
            selector: (row) => row.perihal,
        },
        {
            name: 'Divisi',
            selector: (row) => row.divisi_name,
        },
        {
            name: 'Status',
            selector: (row) => row.void ? (
                <Badge color="dark" style={{ width: '100px' }}>
                    Void
                </Badge>
            ) : row.ttd_basah ? (
                <Badge color="info" style={{ width: '100px' }}>
                    {row.file_ttd ? 'TTD Manual (sudah ada berkas)' : 'TTD Manual'}
                </Badge>
            ) : row.status === 'signed' ? (
                <Badge color="success" style={{ width: '100px' }}>
                    Approved
                </Badge>
            ) : row.status === 'rejected' ? (
                <Badge color="danger" style={{ width: '100px' }}>
                    Rejected
                </Badge>
            ) : (
                <Badge color="warning" style={{ width: '100px' }}>
                    Under Review
                </Badge>
            ),
            omit: valueNow !== '1' && true
        },
        {
            name: 'Dokumen dibuat',
            selector: (row) => dayjs(row.created_at).format('DD/MM/YYYY HH:mm'),
        },
        {
            name: `${valueNow === '3' ? 'Ditandatangani' : 'Direview'}`,
            selector: (row) => dayjs(row.updated_at).format('DD/MM/YYYY HH:mm'),
            omit: type === 'review' && true
        },
        {
            name: `${type === 'approved' ? 'Jenis Persetujuan' : 'Persetujuan saat ini'}`,
            selector: (row) => `${type === 'approved' ? row.type || '-' : row.current_type || '-'}`,
            omit: valueNow === '3' && true
        },

        {
            name: 'Ditandatangani oleh',
            selector: (row) => row.reviewer || '-',
            omit: valueNow !== '3' && true
        },
        {
            name: 'Jabatan',
            selector: (row) => row.position_reviewer || '-',
            omit: valueNow !== '3' && true
        },



    ];



    const openLembarDispo = (item) => {
        GenerateDispo(item)
    }






    return (
        <>
            <input ref={ttdFileRef} type="file" accept="application/pdf,image/jpeg,image/png" style={{ display: 'none' }} onChange={unggahTtd} />
            <div ref={qrCodeRef} style={{ display: 'none' }}>
                <QRCode
                    value={`${baseURL1}verification/${detail?.no_document}?type=sign`}
                    size={400}
                    qrStyle="dots"
                    logoImage={logo} // Ganti dengan URL logo kamu
                    logoWidth={100}
                    logoHeight={100}
                    eyeRadius={20}
                    fgColor="#0F52BA"
                />
            </div>
            <DataTable
                keyField={type === 'approved' ? 'unique_id' : 'id'}
                columns={type === 'masuk' ? columsMasuk : type === 'cc' ? columsCC : columns}
                data={listP}
                pagination
                onRowClicked={handleRowClick}
                subHeader
                conditionalRowStyles={
                    type === 'cc' ? ccRowStyles :
                        (valueNow === '2' && type === 'review' ? [...pointerRowStyles, ...reviewRowStyles] : undefined)
                }
                subHeaderComponent={
                    <div className="d-flex justify-content-end w-100">
                        <Input
                            type="text"
                            value={search}
                            placeholder="search . . . . "
                            className="w-25"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                }
            />

            <Modal isOpen={modal} toggle={toggleModal} size="xl">
                <ModalHeader toggle={toggleModal}></ModalHeader>
                <ModalBody >
                    {isiModal === 'log' ? (
                        <ViewLogs type={typeLog} data={dataIsi} func1={openLembarDispo} />
                    ) : isiModal === 'approval' ? (
                        <Approval data={dataIsi} />
                    ) : isiModal === 'review' ? (
                        <Review data={dataIsi} refresh={refresh} closeModal={toggleModal} />
                    ) : isiModal === 'dispo' ? (
                        <Disposisi data={dataIsi} refresh={refresh} closeModal={toggleModal} />
                    ) : isiModal === 'paraf' ? (
                        <div>
                            <div style={{ height: '60vh' }}>
                                <iframe src={`${pdfmerge}#toolbar=0&navpanes=0`} title="Surat" width="100%" height="100%" style={{ border: 'none' }} />
                            </div>
                            <Review data={dataIsi} className="mt-3" refresh={refresh} closeModal={toggleModal} />


                        </div>
                    ) : (
                        'te'
                    )}
                </ModalBody>
            </Modal>
        </>
    )
}

ListSurat.propTypes = {
    listSurat: PropTypes.array,
    valueNow: PropTypes.string,
    refresh: PropTypes.func,
    type: PropTypes.string,
    update: PropTypes.func,
    status: PropTypes.string
}
export default ListSurat;