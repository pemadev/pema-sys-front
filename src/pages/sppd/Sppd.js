import React, { useState, useEffect, useCallback } from 'react';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import Tab from '@mui/material/Tab';
import Badge from '@mui/material/Badge';
import { Card, CardBody, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useQueries } from '@tanstack/react-query';
import MaterialIcon from '@material/react-material-icon';
import { Button, Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import AOS from 'aos';
import { confirmAlert } from 'react-confirm-alert';
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
import ModalExtend from './ModalExtend';
import Modal30 from './Modal30';

const Sppd = () => {
  const [doc, setDoc] = useState('');
  const [docName, setDocName] = useState('');

  const [detailSppd, setDetailSppd] = useState();

  const { auth } = useAuth();
  const { hash } = useLocation();

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
      api.get(`dapi/sppd/pengajuan`).then((res) => {
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
    }
  };

  useEffect(() => {
    getData(value);
  }, [value]);

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

  const done = async (row) => {
    setDetailSppd(row);
    setModalProses(true);
    console.log(row);
  };

  const doneProses = async () => {
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
      message: `Jika Belum Jangan ya dek ya `,
      buttons: [
        {
          label: 'Yes',
          onClick: () => {
            api
              .post(`dapi/sppd/pengajuan/done`, { id_sppd: detailSppd?.id, who: whoU, file: doc })
              .then((res) => {
                if (res.status === 200) {
                  alert('success', 'Berhasil ditandai sudah di proses');
                  refetchSubmitted();
                }
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
              <ListPengajuan
                {...{
                  submitted,
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
      <Modal isOpen={modalProses} toggle={toggleProses}>
        <ModalHeader toggle={toggleProses}>Lembar Proses</ModalHeader>
        <ModalBody>
          <Box className="mb-4">
            <FormControl fullWidth>
              <InputLabel htmlFor="outlined-adornment-amount">Docs</InputLabel>
              <OutlinedInput
                id="outlined-adornment-amount"
                startAdornment={
                  <InputAdornment position="start">
                    <CloudUploadIcon
                      className="text-primary"
                      onClick={() => document.getElementById('input-file').click()}
                      style={{ cursor: 'pointer' }}
                    />
                  </InputAdornment>
                }
                label="Amount"
                value={docName || ''}
                disabled
                placeholder={
                  auth?.user.roles.includes('UmumSppd')
                    ? 'Tiket atau surat dokumen lainnya'
                    : 'Bukti Bayar'
                }
              />
            </FormControl>
            <input
              type="file"
              id="input-file"
              style={{ display: 'none' }}
              accept="application/pdf"
              onChange={(e) => {
                setDocName(e.target.files[0]?.name);
                getBase64(e.target.files[0])
                  .then((result) => {
                    setDoc(result);
                    console.log(result);
                    console.log(doc);
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              }}
            />
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={doneProses}>
            Done
          </Button>{' '}
        </ModalFooter>
      </Modal>
    </>
  );
};
export default Sppd;
