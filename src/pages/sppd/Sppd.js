import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import Tab from '@mui/material/Tab';
import Badge from '@mui/material/Badge';
import { Card, CardBody } from 'reactstrap';
import { useQueries } from '@tanstack/react-query';
import MaterialIcon from '@material/react-material-icon';
import { Button } from '@mui/material';
import { useLocation } from 'react-router-dom';
import AOS from 'aos';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { alert } from '../../components/atoms/Toast';
import useAxios from '../../hooks/useAxios';
import useAuth from '../../hooks/useAuth';
import Pengajuan from './Pengajuan';
import ListPengajuan from './ListPengajuan';
import EditSppd from './EditSppd';
import 'aos/dist/aos.css';
import ModalDetail from './ModalDetail';
import ModalApproval from './ModalApproval';
import ModalLogs from './ModalLogs';
import ModalReview from './ModalReview';
import ModalDocs from './ModalDocs';
import ModalRealisasi from './ModalRealisasi';
import ListApproved from './ListApproved';
import DashboardDirek from './DashboardDirek';
import RekapSppd from './RekapSppd';
import ModalExtend from './ModalExtend';
import Modal30 from './Modal30';
import ModalProses from './ModalProses';
import ringkasUangMuka from './ringkasUangMuka';

const Sppd = () => {
  const [doc, setDoc] = useState('');
  const [docName, setDocName] = useState('');
  // proses UmumSppd: sumber tiket + daftar tiket per tujuan (pergi/pulang)
  const [sumberTiket, setSumberTiket] = useState('');
  const [tikets, setTikets] = useState([]);
  const [tujuanSppd, setTujuanSppd] = useState([]);
  // tab PERLU DIPROSES (UmumSppd): daftar SPPD yang sudah diproses, dan mode lembar proses (proses baru atau ubah tiket)
  const [selesai, setSelesai] = useState([]);
  const [selesaiKeuangan, setSelesaiKeuangan] = useState([]);
  const [modeUbah, setModeUbah] = useState(false);
  // lembar proses KeuanganSppd (uang muka): ringkasan biaya per kategori dan unduhan dokumen perhitungan uang muka
  const [ringkasan, setRingkasan] = useState(null);
  const [memuatRingkasan, setMemuatRingkasan] = useState(false);
  const [unduhBiaya, setUnduhBiaya] = useState(null);
  // bukti transfer yang dipilih per termin: { "idTujuan:no": { file (data URL), fileName } }
  const [buktiTermin, setBuktiTermin] = useState({});

  const [detailSppd, setDetailSppd] = useState();

  const { auth } = useAuth();
  const { hash, search } = useLocation();

  const [employes, setemployees] = useState();
  const [pihaks, setPihaks] = useState();
  const [jeniss, setJeniss] = useState();
  const [kategoris, setKategoris] = useState();
  const [dasars, setDasars] = useState();
  const [klasifikasi, setKlasfikasi] = useState();
  const [sumberBiaya, setSumberBiaya] = useState();
  const [renbis, setRenbis] = useState();
  const [submitted, setSubmitted] = useState();
  const [approved, setApproved] = useState();

  const [value, setValue] = useState('1');
  // sub-daftar pada tab PENGAJUAN: 'saya' (yang saya ajukan, default) atau 'tim' (diajukan tim satu divisi)
  const [subPengajuan, setSubPengajuan] = useState('saya');
  const [editForm, setEditForm] = useState(false);
  const [sppdForm, setSppdForm] = useState(false);
  const [wannaEdit, setWannaEdit] = useState(false);

  // modaldetail
  const [modalD, setModalD] = useState(false);
  const [sppdDetail, setSppdDetail] = useState();

  // modalApporval
  const [modalA, setModalA] = useState(false);

  // modalLog
  const [modalLog, setModalLog] = useState(false);

  // modalR
  const [modalR, setModalR] = useState(false);

  // modalDoc
  const [modalDoc, setModalDoc] = useState(false);

  // modalRealisasi
  const [modalRe, setModalRe] = useState(false);

  // jumlah review
  const [jMine, setJMine] = useState(0);
  const [jReview, setJReview] = useState(0);
  const [jProses, setJProses] = useState(0);

  // modall proses
  const [modalProses, setModalProses] = useState(false);
  const toggleProses = () => {
    setModalProses(!modalProses);
  };

  // modalExtend
  const [modalExtend, setModalExtend] = useState(false);
  const [sppdExtend, setSppdExtend] = useState();

  // modal
  const [modal3, setModal3] = useState(false);

  const api = useAxios();

  const toggle3 = (row) => {
    if (modal3 === false) {
      setSppdDetail(row);
    } else {
      setSppdDetail(null);
    }
    setModal3(!modal3);
  };

  const getBase64 = (file) => {
    return new Promise((resolve) => {
      let baseURL = '';
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        baseURL = reader.result;
        resolve(baseURL);
      };
    });
  };

  useEffect(() => {
    if (auth?.user.roles.includes('AdminSPPD')) {
      setValue('1');
    }
    else if(auth?.user.roles.includes('Director')|| auth?.user.roles.includes('Manager')) {
      setValue('99');
    } 
    else {
      setValue('2');
    }
  }, [auth]);

  const toggleRe = (row) => {
    if (modalRe === false) {
      setSppdDetail(row);
    } else {
      setSppdDetail(null);
    }

    setModalRe(!modalRe);
  };
  const toggleR = (row) => {
    if (modalR === false) {
      setSppdDetail(row);
    } else {
      setSppdDetail(null);
    }

    setModalR(!modalR);
  };

  const toggleDoc = (row) => {
    if (modalDoc === false) {
      setSppdDetail(row);
    } else {
      setSppdDetail(null);
    }
    setModalDoc(!modalDoc);
  };
  const toggleLog = (row) => {
    if (modalLog === false) {
      setSppdDetail(row);
    } else {
      setSppdDetail(null);
    }

    setModalLog(!modalLog);
  };

  const toggleApproval = (row) => {
    if (modalA === false) {
      setSppdDetail(row);
    } else {
      setSppdDetail(null);
    }
    AOS.init();
    AOS.refresh();
    setModalA(!modalA);
  };

  const toggleDetail = (row) => {
    console.log(row);
    if (modalD === false) {
      setSppdDetail(row);
    } else {
      setSppdDetail(null);
    }

    setModalD(!modalD);
  };

  const handleChange = (event, newValue) => {
    setSubmitted([]);
    setValue(newValue);
  };

  const getData = (val) => {
    if (val === '1') {
      api.get(subPengajuan === 'tim' ? `dapi/sppd/pengajuan?ref=divisi` : `dapi/sppd/pengajuan`).then((res) => {
        setSubmitted(res.data.data);
      });
    } else if (val === '2') {
      api.get(`dapi/sppd/pengajuan?ref=mine`).then((res) => {
        setSubmitted(res.data.data);
      });
    } else if (val === '3') {
      api.get(`dapi/sppd/pengajuan?ref=review`).then((res) => {
        setSubmitted(res.data.data);
      });
      api.get(`dapi/sppd/pengajuan?ref=approved_by`).then((res) => {
        setApproved(res.data.data);
        // console.log(res.data.data);
      });
    } else if (val === '4') {
      api
        .get(
          `dapi/sppd/pengajuan?ref=${
            auth?.user.roles.includes('UmumSppd') ? 'by_umum' : 'by_keuangan'
          }`,
        )
        .then((res) => {
          setSubmitted(res.data.data);
        });
      if (auth?.user.roles.includes('UmumSppd')) {
        api.get(`dapi/sppd/pengajuan?ref=by_umum_selesai`).then((res) => {
          setSelesai(res.data.data);
        });
      }
      if (auth?.user.roles.includes('KeuanganSppd')) {
        api.get(`dapi/sppd/pengajuan?ref=by_keuangan_selesai`).then((res) => {
          setSelesaiKeuangan(res.data.data);
        });
      }
    }
  };

  useEffect(() => {
    getData(value);
  }, [value, subPengajuan]);

  // muat ulang daftar tab yang sedang aktif (dipakai setelah void SPPD)
  const refresh = () => getData(value);

  useEffect(() => {
    if (hash === '#1') {
      setValue('1');
    } else if (hash === '#2') {
      setValue('2');
    } else if (hash === '#3') {
      setValue('3');
    } else if (hash === '#4') {
      setValue('4');

    }
  }, [hash]);

  // tautan dari notifikasi (?dok=<nomor dokumen>#<tab>): buka dokumennya sekali saja setelah daftar pada tab yang dituju termuat.
  // Tab review (#3) membuka layar Review, tab lain membuka Detail.
  const dokDariLink = new URLSearchParams(search).get('dok');
  const sudahDibuka = useRef(false);
  useEffect(() => {
    const tabTujuan = hash.replace('#', '');
    if (!dokDariLink || sudahDibuka.current || !tabTujuan || value !== tabTujuan) return;
    const row = (submitted || []).find((p) => p.nomor_dokumen === dokDariLink);
    if (!row) return;
    sudahDibuka.current = true;
    if (tabTujuan === '3') {
      toggleR(row);
    } else {
      toggleDetail(row);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dokDariLink, hash, value, submitted]);

  const closeForm = () => {
    setSppdForm(!sppdForm);
  };

  const updateForm = (row) => {
    setWannaEdit(row);
    setEditForm(true);
    setSppdForm(false);
    window.scrollTo({
      top: 0,
      behavior: 'smooth', // Optional: 'smooth' for smooth scrolling
    });
  };

  const re = useQueries({
    queries: [
      {
        queryKey: ['assigne', 0],
        queryFn: () =>
          api.get(`api/employe/assignment-list?search=all`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['pihak', 1],
        queryFn: () =>
          api.get(`dapi/sppd/static/pihak`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['jenis', 2],
        queryFn: () =>
          api.get(`dapi/sppd/static/jenis`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['kategori', 3],
        queryFn: () =>
          api.get(`dapi/sppd/static/category`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['dasar', 4],
        queryFn: () =>
          api.get(`dapi/sppd/static/dasar`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['klasifikasi', 5],
        queryFn: () =>
          api.get(`dapi/sppd/static/klasifikasi`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['sumberbiaya', 6],
        queryFn: () =>
          api.get(`dapi/sppd/static/sumber`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['renbis', 7],
        queryFn: () =>
          api.get(`dapi/sppd/static/renbis`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['list', 8],
        queryFn: () =>
          api.get(`dapi/sppd/pengajuan?ref=mine`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['list-review', 9],
        queryFn: () =>
          api.get(`dapi/sppd/pengajuan?ref=review`).then((res) => {
            return res.data.data;
          }),
      },
      {
        queryKey: ['list-review', 10],
        // Only used for the PERLU DIPROSES badge, which only these roles see
        enabled: !!(auth?.user.roles.includes('UmumSppd') || auth?.user.roles.includes('KeuanganSppd')),
        queryFn: () =>
          api
            .get(
              `dapi/sppd/pengajuan?ref=${
                auth?.user.roles.includes('UmumSppd') ? 'by_umum' : 'by_keuangan'
              }`,
            )
            .then((res) => {
              return res.data.data;
            }),
      },
    ],
  });

  const refetchNumber = useCallback(
    () => {
      re[8].refetch();
      re[9].refetch();
      if (auth?.user.roles.includes('UmumSppd') || auth?.user.roles.includes('KeuanganSppd')) {
        re[10].refetch();
      }
    },
    [re[8], re[9]],
    re[10],
  );

  const refetchSubmitted = () => {
    getData(value);
    refetchNumber();
  };

  useEffect(() => {
    setemployees(re[0].data);
    setPihaks(re[1].data);
    setJeniss(re[2].data);
    setKategoris(re[3].data);
    setDasars(re[4].data);
    setKlasfikasi(re[5].data);
    setSumberBiaya(re[6].data);
    setRenbis(re[7].data);
    setJMine(re[8].data?.length);
    setJReview(re[9].data?.length);
    setJProses(re[10].data?.length);
  }, [re]);

  // ubah tiket SPPD yang sudah diproses UmumSppd (tetap bisa walau KeuanganSppd sudah memproses)
  const bukaUbah = (row) => {
    setModeUbah(true);
    setDetailSppd(row);
    setDoc('');
    setDocName('');
    setSumberTiket(row.sumber_tiket || '');
    setTikets([]);
    setTujuanSppd([]);
    setModalProses(true);
    api.get(`dapi/sppd/tujuan/${row.id}`).then((res) => setTujuanSppd(res.data.data || []));
    api.get(`dapi/sppd/pengajuan/${row.id}`).then((res) => {
      setTikets(
        (res.data.data.proses_tiket || []).map((t) => ({
          uid: `t${t.id}`,
          id: t.id,
          id_tujuan: String(t.id_tujuan),
          arah: t.arah,
          keterangan: t.keterangan || '',
          file: '',
          fileName: '',
          fileUrl: t.file,
          harga: String(Number(t.harga)),
        })),
      );
    });
  };

  const tiketKosong = () => ({
    uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    id_tujuan: '',
    arah: 'pergi',
    keterangan: '',
    file: '',
    fileName: '',
    harga: '',
  });

  // ringkasan biaya + status bukti per termin (dimuat ulang setelah bukti disimpan)
  const muatRingkasan = (idSppd) =>
    api
      .get(`dapi/sppd/pengajuan/${idSppd}`)
      .then((res) => setRingkasan(ringkasUangMuka(res.data.data)))
      .catch(() => setRingkasan(null));

  const done = async (row) => {
    setModeUbah(false);
    setDetailSppd(row);
    setDoc('');
    setDocName('');
    setSumberTiket('');
    setTikets([]);
    setTujuanSppd([]);
    setRingkasan(null);
    setBuktiTermin({});
    setModalProses(true);
    if (row.type_proses === 'pemesanan_tiket') {
      api.get(`dapi/sppd/tujuan/${row.id}`).then((res) => {
        setTujuanSppd(res.data.data || []);
      });
    }
    if (row.type_proses === 'uangmuka') {
      setMemuatRingkasan(true);
      muatRingkasan(row.id).finally(() => setMemuatRingkasan(false));
    }
  };

  const BUKTI_MAKS_BYTE = 5 * 1024 * 1024;
  const pilihBuktiTermin = (kunci, file) => {
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      alert('error', 'Bukti transfer harus berupa file PDF, JPG, atau PNG');
      return;
    }
    if (file.size > BUKTI_MAKS_BYTE) {
      alert('error', 'Ukuran bukti transfer maksimal 5 MB');
      return;
    }
    getBase64(file).then((result) => setBuktiTermin((prev) => ({ ...prev, [kunci]: { file: result, fileName: file.name } })));
  };

  const simpanBuktiTermin = () => {
    const kunci = Object.keys(buktiTermin);
    if (kunci.length === 0) {
      alert('error', 'Pilih bukti transfer minimal untuk satu termin');
      return;
    }
    confirmAlert({
      title: 'Simpan bukti transfer?',
      message: `${kunci.length} bukti transfer akan disimpan. Bukti yang sudah disimpan tidak dapat diganti.`,
      buttons: [
        {
          label: 'Ya, simpan',
          onClick: () => {
            api
              .post('dapi/sppd/pengajuan/termin/bukti', {
                id_sppd: detailSppd?.id,
                bukti: kunci.map((k) => ({ id_tujuan: Number(k.split(':')[0]), termin: Number(k.split(':')[1]), file: buktiTermin[k].file })),
              })
              .then((res) => {
                const selesaiSemua = !!res.data?.data?.selesai;
                alert('success', selesaiSemua ? 'Seluruh termin uang muka sudah dibuktikan, SPPD selesai diproses' : 'Bukti transfer tersimpan');
                setBuktiTermin({});
                refetchSubmitted();
                if (selesaiSemua) setModalProses(false);
                else muatRingkasan(detailSppd?.id);
              })
              .catch((err) => {
                alert('error', err?.response?.data?.message || err.message);
                refetchSubmitted();
                muatRingkasan(detailSppd?.id);
              });
          },
        },
        { label: 'Batal', onClick: () => {} },
      ],
    });
  };

  const ubahTiket = (uid, patch) => setTikets((prev) => prev.map((t) => (t.uid === uid ? { ...t, ...patch } : t)));
  const hapusTiket = (uid) => setTikets((prev) => prev.filter((t) => t.uid !== uid));
  const tambahTiket = () => setTikets((prev) => [...prev, tiketKosong()]);
  const fileTiket = (uid, file) => {
    if (!file) return;
    getBase64(file).then((result) => ubahTiket(uid, { file: result, fileName: file.name }));
  };
  const fileBukti = (file) => {
    if (!file) return;
    setDocName(file.name);
    getBase64(file)
      .then((result) => setDoc(result))
      .catch(() => alert('error', 'Gagal membaca file'));
  };

  const pilihSumberTiket = (val) => {
    setSumberTiket(val);
    if (val === 'umum' && tikets.length === 0) {
      setTikets([{ ...tiketKosong(), id_tujuan: tujuanSppd.length === 1 ? tujuanSppd[0].id : '' }]);
    }
  };

  const doneProses = async () => {
    const isUmum = detailSppd.type_proses === 'pemesanan_tiket';
    if (isUmum) {
      if (!sumberTiket) {
        alert('error', 'Pilih sumber tiket terlebih dahulu');
        return;
      }
      if (sumberTiket === 'umum') {
        if (tikets.length === 0) {
          alert('error', 'Tambahkan minimal satu tiket');
          return;
        }
        const tidakLengkap = tikets.some((t) => !t.id_tujuan || !(t.file || t.id) || t.harga === '' || Number(t.harga) < 0);
        if (tidakLengkap) {
          alert('error', 'Setiap tiket wajib memilih tujuan, mengunggah file PDF (tiket baru), dan mengisi total harga');
          return;
        }
      }
    }
    setModalProses(false);
    let whoU = '';
    if (detailSppd.type_proses === 'pemesanan_tiket') {
      whoU = 'umum';
    } else if (detailSppd.type_proses === 'realisasi') {
      whoU = 'keuangan';
    } else {
      whoU = 'uangmuka';
    }
    await confirmAlert({
      title: `Kamu Yakin ?`,
      message: modeUbah ? `Simpan perubahan tiket SPPD ini?` : `Jika Belum Jangan ya dek ya `,
      buttons: [
        {
          label: 'Yes',
          onClick: () => {
            const tiketKirim = tikets.map((t) => ({
              ...(t.id ? { id: t.id } : {}),
              id_tujuan: t.id_tujuan,
              arah: t.arah,
              keterangan: t.keterangan,
              ...(t.file ? { file: t.file } : {}),
              harga: t.harga,
            }));
            const permintaan = modeUbah
              ? api.post(`dapi/sppd/pengajuan/umum/ubah`, {
                  id_sppd: detailSppd?.id,
                  sumber_tiket: sumberTiket,
                  tikets: sumberTiket === 'umum' ? tiketKirim : [],
                })
              : api.post(
                  `dapi/sppd/pengajuan/done`,
                  isUmum
                    ? {
                        id_sppd: detailSppd?.id,
                        who: whoU,
                        sumber_tiket: sumberTiket,
                        tikets: sumberTiket === 'umum' ? tiketKirim : [],
                      }
                    : { id_sppd: detailSppd?.id, who: whoU, file: doc },
                );
            permintaan
              .then((res) => {
                if (res.status === 200) {
                  alert('success', modeUbah ? 'Perubahan tiket tersimpan' : 'Berhasil ditandai sudah di proses');
                  refetchSubmitted();
                }
              })
              .catch((err) => {
                alert('error', err?.response?.data?.message || err.message);
                // mis. sudah diproses KeuanganSppd (409): muat ulang supaya statusnya terbarui
                refetchSubmitted();
              });
          },
        },
        {
          label: 'No',
          onClick: () => {},
        },
      ],
    });
  };

  // Tambahkan fungsi extend
  const extend = (row) => {
    setSppdExtend(row);
    setModalExtend(true);
  };

  const toggleExtend = () => {
    setModalExtend(!modalExtend);
    if (!modalExtend) setSppdExtend(null);
  };

  // Handler submit extend
  const handleSubmitExtend = async(data) => {
    
   await api.post(`dapi/sppd/ekstend`, { id_tujuan: data.tujuan, alasan: data.alasan, start:data.mulai ,end:data.hingga }).then((res) => {
      if (res.status === 200) {
        alert('success', 'Penambahan Hari Berhasil diajukan');
        toggleExtend();
        refetchSubmitted();
      }
    });
  };

  return (
    <>
      <TabContext value={value}>
        <Card className="mb-1">
          <TabList
            onChange={handleChange}
            aria-label="lab API tabs example"
            vertical="sm"
            variant="scrollable"
            scrollButtons="auto"
          >
            {auth?.user.roles.includes('AdminSPPD') ? (
              <Tab
                label={
                  <Badge
                    badgeContent={0}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    color="primary"
                  >
                    <strong>PENGAJUAN</strong> &nbsp;&nbsp;
                  </Badge>
                }
                value="1"
              />
            ) : (
              ''
            )}

            {auth?.user.roles.includes('Director') ||auth?.user.roles.includes('Manager') ?( <Tab
              label={
                <Badge
                  badgeContent={0}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="primary"
                >
                  <strong>DASHBOARD</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="99"
            />):''}

            <Tab
              label={
                <Badge
                  badgeContent={jMine}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="primary"
                >
                  <strong>SPPD SAYA</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="2"
            />

            <Tab
              label={
                <Badge
                  badgeContent={jReview}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="warning"
                >
                  <strong>PERSETUJUAN SPPD</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="3"
            />
            {auth?.user.roles.includes('UmumSppd') || auth?.user.roles.includes('KeuanganSppd') ? (
              <Tab
                label={
                  <Badge
                    badgeContent={jProses}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    color="warning"
                  >
                    <strong>PERLU DIPROSES</strong> &nbsp;&nbsp;
                  </Badge>
                }
                value="4"
              />
            ) : (
              ''
            )}
            {auth?.user.roles.includes('RekapSppd') ? (
              <Tab label={<strong>REKAP SPPD</strong>} value="5" />
            ) : (
              ''
            )}
          </TabList>
        </Card>

        <TabPanel value="1" className="ps-0 pe-0">
          <Card>
            <CardBody>
              {sppdForm ? (
                <>
                  <MaterialIcon
                    icon="close"
                    className="mb-3 float-end"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSppdForm(!sppdForm)}
                  />
                  <Pengajuan
                    {...{
                      employes,
                      pihaks,
                      jeniss,
                      kategoris,
                      dasars,
                      klasifikasi,
                      sumberBiaya,
                      renbis,
                      closeForm,
                      refetchSubmitted,
                    }}
                  />
                </>
              ) : (
                <>
                  <Button
                    color="primary"
                    variant="contained"
                    style={{ width: '100%' }}
                    size="large"
                    onClick={() => {
                      setSppdForm(!sppdForm);
                      setEditForm(false);
                    }}
                  >
                    Pengajuan Baru
                  </Button>
                </>
              )}
            </CardBody>
          </Card>
          {editForm ? (
            <>
              <Card>
                <CardBody>
                  <MaterialIcon
                    icon="close"
                    className="mb-3 float-end"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setEditForm(!editForm)}
                  />
                  <EditSppd
                    {...{
                      wannaEdit,
                      dasars,
                      jeniss,
                      kategoris,
                      renbis,
                      klasifikasi,
                      sumberBiaya,
                      setEditForm,
                      refetchSubmitted,
                    }}
                  />
                </CardBody>
              </Card>
            </>
          ) : (
            ''
          )}
          <Card>
            <CardBody>
              <div className="segmen-pilihan mb-3" role="tablist" aria-label="Daftar pengajuan SPPD">
                {[
                  ['saya', 'SPPD yang saya ajukan'],
                  ['tim', 'SPPD yang tim ajukan'],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={subPengajuan === k}
                    className={subPengajuan === k ? 'aktif' : ''}
                    onClick={() => {
                      if (subPengajuan !== k) {
                        setSubmitted([]);
                        setSubPengajuan(k);
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <ListPengajuan
                {...{
                  submitted,
                  refresh,
                  updateForm,
                  toggleDetail,
                  toggleApproval,
                  toggleLog,
                  value,
                  toggleR,
                  toggleDoc,
                  toggleRe,
                  extend,
                  toggle3
                }}
              ></ListPengajuan>
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel value="2" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <ListPengajuan
                {...{
                  submitted,
                  refresh,
                  updateForm,
                  toggleDetail,
                  toggleApproval,
                  toggleLog,
                  value,
                  toggleR,
                  toggleDoc,
                  approved,
                  extend,
                  toggle3
                }}
              ></ListPengajuan>
            </CardBody>
          </Card>
        </TabPanel>
        <TabPanel value="3" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <ListPengajuan
                {...{
                  submitted,
                  refresh,
                  updateForm,
                  toggleDetail,
                  toggleApproval,
                  toggleLog,
                  value,
                  toggleR,
                  toggleDoc,
                  extend,
                  toggle3
                }}
              ></ListPengajuan>
            </CardBody>
          </Card>
          {approved?.length > 0 ? (
            <Card>
              <CardBody>
                <ListApproved
                  {...{
                    approved,
                    toggleDetail,
                    toggleApproval,
                    toggleLog,
                    value,
                    toggleR,
                    toggleDoc,
                  }}
                ></ListApproved>
              </CardBody>
            </Card>
          ) : (
            ''
          )}
        </TabPanel>
        <TabPanel value="4" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <ListPengajuan
                {...{
                  submitted,
                  refresh,
                  updateForm,
                  toggleDetail,
                  toggleApproval,
                  toggleLog,
                  value,
                  toggleR,
                  toggleDoc,
                  done,
                  extend,
                  toggle3
                }}
              ></ListPengajuan>
            </CardBody>
          </Card>
          {auth?.user.roles.includes('UmumSppd') ? (
            <Card>
              <CardBody>
                <h6 className="mb-1">Sudah diproses divisi umum</h6>
                <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                  Sumber dan daftar tiket tetap bisa diubah atau ditambah (mis. tiket pulang yang telat diupload), juga setelah divisi keuangan memproses.
                </p>
                <ListPengajuan
                  {...{
                    submitted: selesai,
                    refresh,
                    updateForm,
                    toggleDetail,
                    toggleApproval,
                    toggleLog,
                    value,
                    toggleR,
                    toggleDoc,
                    extend,
                    toggle3,
                  }}
                  modeSelesai
                  ubah={bukaUbah}
                ></ListPengajuan>
              </CardBody>
            </Card>
          ) : null}
          {auth?.user.roles.includes('KeuanganSppd') ? (
            <Card>
              <CardBody>
                <h6 className="mb-1">Sudah diproses divisi keuangan</h6>
                <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                  Uang muka yang seluruh termin sudah dibuktikan transfer dan realisasi yang sudah dibayar.
                </p>
                <ListPengajuan
                  {...{
                    submitted: selesaiKeuangan,
                    refresh,
                    updateForm,
                    toggleDetail,
                    toggleApproval,
                    toggleLog,
                    value,
                    toggleR,
                    toggleDoc,
                    extend,
                    toggle3,
                  }}
                  modeKeuangan
                ></ListPengajuan>
              </CardBody>
            </Card>
          ) : null}
        </TabPanel>

        <TabPanel value="5" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <RekapSppd />
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel value="99" className="ps-0 pe-0">
          <Card>
            <CardBody>
             <DashboardDirek />
            </CardBody>
          </Card>
        </TabPanel>
      </TabContext>
      <ModalDetail {...{ modalD, toggleDetail, sppdDetail }} />
      <ModalApproval {...{ modalA, toggleApproval, sppdDetail }} />
      <ModalLogs {...{ modalLog, toggleLog, sppdDetail }} />
      <ModalReview {...{ modalR, toggleR, sppdDetail, refetchNumber, refetchSubmitted }} />
      <ModalDocs {...{ modalDoc, toggleDoc, sppdDetail }} />
      <ModalRealisasi {...{ modalRe, toggleRe, sppdDetail }} />
       <Modal30 {...{ modal3, toggle3, sppdDetail }} />
      <ModalExtend
        modalExtend={modalExtend}
        toggleExtend={toggleExtend}
        sppdDetail={sppdExtend}
        onSubmit={handleSubmitExtend}
      />
      <ModalProses
        isOpen={modalProses}
        toggle={toggleProses}
        sppd={detailSppd}
        tujuan={tujuanSppd}
        sumber={sumberTiket}
        onSumber={pilihSumberTiket}
        tikets={tikets}
        onUbahTiket={ubahTiket}
        onTambahTiket={tambahTiket}
        onHapusTiket={hapusTiket}
        onFileTiket={fileTiket}
        docName={docName}
        onDoc={fileBukti}
        onSelesai={detailSppd?.type_proses === 'uangmuka' ? simpanBuktiTermin : doneProses}
        buktiPilihan={buktiTermin}
        onPilihBukti={pilihBuktiTermin}
        jumlahBukti={Object.keys(buktiTermin).length}
        mode={modeUbah ? 'ubah' : 'proses'}
        baseUrl={process.env.REACT_APP_BASEURL}
        ringkasan={ringkasan}
        memuatRingkasan={memuatRingkasan}
        onUnduhHitungan={() => setUnduhBiaya(detailSppd)}
        menyiapkanUnduh={!!unduhBiaya}
      />
      {/* unduh dokumen perhitungan uang muka (tanpa membuka jendela dokumen) */}
      <ModalDocs
        modalDoc={!!unduhBiaya}
        toggleDoc={() => setUnduhBiaya(null)}
        sppdDetail={unduhBiaya ? { id: unduhBiaya.id } : null}
        namaUnduh={unduhBiaya ? `Perhitungan Uang Muka ${String(unduhBiaya.nomor_sppd || unduhBiaya.id).replace(/[\\\\/:*?"<>|]+/g, '-')}.pdf` : ''}
        jenisUnduh="biaya"
        selesaiUnduh={() => setUnduhBiaya(null)}
      />
    </>
  );
};
export default Sppd;
