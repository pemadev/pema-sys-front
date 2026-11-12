import React, { useEffect, useState} from 'react';
import { Alert, Card, CardBody, Button, CardHeader } from 'reactstrap';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useQueries } from '@tanstack/react-query';
import MaterialIcon from '@material/react-material-icon';
import Badge from '@mui/material/Badge';
import { useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';
import TulisSurat from './TulisSurat';
import ListSurat from './ListSurat';
import AddSuratMasuk from './AddSuratMasuk';
import DashboardAdm from './DashboardAdm';
import Docusign from './Docusign/Docusign';
import BackdateSurat from './BackdateSurat';
import DraftSurat from './DraftSurat';



const Adm = () => {
  const { auth } = useAuth();
  const api = useAxios();
  const { hash, search } = useLocation();

  const formData = JSON.parse(localStorage.getItem('formData'))
  const [value, setValue] = useState(`${hash!==''?hash.replace(/#/g, '').toString():'99'}`);
  const [tulisForm, setTulisForm] = useState(formData?.tulisForm || false);
  // daftar surat milik admin dipisah: belum di-approve, sudah di-approve, void
  // ?sub=backdate dari tautan notifikasi membuka sub-tab Backdate pada tab Surat Saya
  const [subTab, setSubTab] = useState(new URLSearchParams(search).get('sub') || 'belum');
  const [backdateReq, setBackdateReq] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [divisis, setDivisis] = useState([]);
  const [mydivisi, setMyDivisi] = useState('');
  const [listSurat, setListSurat] = useState([]);
  const [approvedSurat, setApprovedSurat] = useState([]);
  const [detailSurat, setDetailSurat] = useState({});
  const [updateForm, setUpdateForm] = useState(false);

  const [cReview, setCReview] = useState(0);
  const [cMasuk, setCMasuk] = useState(0);
  const [cCc, setCCc] = useState(0);
  const [cSk, setCSk]=useState(0);

  const [listMasuk, setListMasuk] = useState([]);
  const [listMDone, setListMDone] = useState([]);
  const [listMcc, setListMcc] = useState([]);

  const [formSuratMasuk, setFormSuratMasuk] = useState(false);

  console.log(hash.replace(/#/g, ''));

  useEffect(() => {
    if(hash !== ''){
      setValue(`${hash.replace(/#/g, '').toString()}`);
    }else{
      setValue('99');
    }
   
  }, [hash]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  useEffect(() => {
    localStorage.setItem('formData', JSON.stringify({ tulisForm }));
  }, [tulisForm])

  const dataStatic = useQueries({
    queries: [
      {
        queryKey: ['divisi', 0],
        queryFn: () =>
          api.get(`dapi/adm/divisi`).then((res) => {
            return res.data.data;
          }),
      }
    ],
  });

  const getData = (val) => {
    api.get(`dapi/adm/surat/review`).then((res) => {
      setCReview(res.data.data.length);
    });

    api.get(`dapi/adm/suratmasuk/to_me`).then((res) => {
      setCMasuk(res.data.data.length);
    });
    api.get(`dapi/adm/suratmasuk/cc`).then((res) => {
      setCCc(res.data.data.filter((p) => p.read_by=== null).length);

    });
    api.get(`dapi/adm/surat/signed`).then((res) => {
      setCSk(res.data.data.length);
    });

    if (val === '1') {
      api.get(`dapi/adm/surat/all`).then((res) => {
        setListSurat(res.data.data);
      });
      // permintaan backdate yang belum mendapatkan nomor (yang sudah mendapat nomor tampil sebagai surat biasa)
      api.get(`dapi/adm/backdate/daftar`).then((res) => {
        setBackdateReq(res.data.data.filter((r) => r.status !== 'selesai'));
      }).catch(() => setBackdateReq([]));
      // draft: belum bernomor, tidak ada di daftar surat
      api.get(`dapi/adm/draft/daftar`).then((res) => {
        setDrafts(res.data.data);
      }).catch(() => setDrafts([]));
    } else if (val === '2') {
      api.get(`dapi/adm/surat/review`).then((res) => {
        setListSurat(res.data.data);
        setCReview(res.data.data.length);
      });
      api.get(`dapi/adm/surat/approved`).then((res) => {
        setApprovedSurat(res.data.data);
      })
    } else if (val === '3') {
      api.get(`dapi/adm/surat/signed`).then((res) => {
        setListSurat(res.data.data);
      });
    } else if (val === '4') {
      api.get(`dapi/adm/suratmasuk/${auth?.user.roles.includes('SuperAdminAdm') ? 'all' : 'to_me'}`).then((res) => {
        setListMasuk(res.data.data);
      });
      api.get(`dapi/adm/suratmasuk/tinjut`).then((res) => {
        setListMDone(res.data.data);
      });
    }else if(val==='5'){
      api.get(`dapi/adm/suratmasuk/cc`).then((res) => {
        setListMcc(res.data.data);
      })
    }
  };

  const refreshData = () => {
    // setListSurat([]);
    getData(value);
  }

  useEffect(() => {
    setListSurat([]);
    refreshData();
   
  }, [value]);

  useEffect(() => {
    setDivisis(dataStatic[0].data?.other_divisis);
    setMyDivisi(dataStatic[0].data?.my_divisi?.organization_id?.toString());
  }, [dataStatic]);

  useEffect(() => {
    console.log(listSurat);
  }, [listSurat]);


  // lanjutkan draft: isi form dari draft; surat tetap belum bernomor sampai di-submit
  const lanjutDraft = async (id) => {
    try {
      const res = await api.get(`dapi/adm/draft/${id}`);
      const { fileLampiran, ...isi } = res.data.data;
      const { id: draftId, ...form } = isi;
      localStorage.setItem('dataSurat', JSON.stringify({ ...form, draftId, tembusans: form.tembusans || [] }));
      setDivisis(dataStatic[0].data?.other_divisis);
      if (form.divisi) setMyDivisi(String(form.divisi));
      setDetailSurat({ fileLampiran: fileLampiran || '', isiSurat: form.isiSurat });
      setUpdateForm(false);
      setTulisForm(true);
    } catch (err) {
      alert('error', err?.response?.data?.message || err.message);
    }
  };

  const updateSurat = async (id) => {
    localStorage.removeItem('dataSurat');
    setDivisis(dataStatic[0].data?.other_divisis);
    await api
      .get(`dapi/adm/surat/detail/${id}`).then((res) => {
        console.log(res.data.data);
        setMyDivisi(res.data.data?.divisi?.toString());
        setDetailSurat(res.data.data);
        setUpdateForm(true);
        const { fileLampiran, ...dataSuratNew } = res.data.data;
        localStorage.setItem('dataSurat', JSON.stringify(dataSuratNew));
        setTulisForm(true);
      });

    console.log(updateForm)

  }


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
                  <strong>Dashboard</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="99"
            />
            {auth?.user.roles.includes('AdminAdm') && (<Tab
              label={
                <Badge
                  badgeContent={0}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="primary"
                >
                  <strong>TULIS SURAT</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="1"
            />)}

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
                  <strong>DOCUSIGN</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="6"
            />

            {auth?.user.roles.includes('Manager') || auth?.user.roles.includes('Director') || auth?.user.roles.includes('Supervisor') || auth?.user.roles.includes('Staff') ? (<Tab
              label={
                <Badge
                  badgeContent={cReview}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="warning"
                >
                  <strong>REVIEW</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="2"
            />) : ''}

            {auth?.user.roles.includes('SuperAdminAdm') || auth?.user.roles.includes('Director') ? <Tab
              label={
                <Badge
                  badgeContent={cSk}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="warning"
                  max={9999}
                >
                  <strong>SURAT KELUAR</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="3"
            /> : ''}


            <Tab
              label={
                <Badge
                  badgeContent={cMasuk}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="primary"
                >
                  <strong>SURAT MASUK</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="4"
            />

            {auth?.user.roles.includes('PICAdm') ? (<Tab
              label={
                <Badge
                  badgeContent={0}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="primary"
                >
                  <strong>BACKDATE</strong> &nbsp;&nbsp;
                </Badge>
              }
              value="7"
            />) : ''}

            <Tab
              label={
                <Badge
                  badgeContent={cCc}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  color="primary"
                >
                  <strong>SURAT MASUK (CC) </strong> &nbsp;&nbsp;
                </Badge>
              }
              value="5"
            />

          </TabList>
        </Card>

        {auth?.user.roles.includes('AdminAdm') && (
          <TabPanel value="1" className="ps-0 pe-0">
          <Card>
            <CardBody>
              {tulisForm ? (
                <>
                  <MaterialIcon
                    icon="close"
                    className="mb-3 float-end"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setTulisForm(!tulisForm)}
                  />
                  <TulisSurat divisis={divisis} mydivisi={mydivisi} refresh={refreshData} func1={setTulisForm} detailSurat={detailSurat} updateForm={updateForm} onSubmitted={setSubTab} />
                </>
              ) : (
                <Button
                  color="primary"
                  size="lg"
                  style={{ width: '100%' }}
                  onClick={() => { setTulisForm(!tulisForm); localStorage.removeItem('dataSurat'); setUpdateForm(false) }}
                >
                  Buat Surat Baru
                </Button>
              )}
            </CardBody>
          </Card>

          {tulisForm === false && (listSurat?.length > 0 || backdateReq.length > 0 || drafts.length > 0) && (
            <Card>
              <CardBody>
                {listSurat.filter((s) => s.status !== 'signed' && !s.void && !s.ttd_basah).length > 0 && (
                  <Alert color="warning">
                    <strong>Jaga keselarasan nomor surat.</strong> Anda punya {listSurat.filter((s) => s.status !== 'signed' && !s.void && !s.ttd_basah).length} surat yang
                    belum di-approve. Surat yang sudah tidak digunakan lagi sebaiknya segera ditandai <strong>Void</strong> (tombol Void di kolom
                    Actions) agar nomornya kosong kembali dan bisa dipakai untuk surat backdate, serta data penomoran tetap sesuai dengan surat yang
                    benar-benar terpakai.
                  </Alert>
                )}
                <Tabs value={subTab} onChange={(e, v) => setSubTab(v)} className="mb-3" variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                  <Tab value="belum" label={`Belum di-approve (${listSurat.filter((s) => s.status !== 'signed' && !s.void && !s.ttd_basah).length})`} />
                  <Tab value="draft" label={`Draft (${drafts.length})`} />
                  <Tab value="sudah" label={`Sudah di-approve (${listSurat.filter((s) => s.status === 'signed' && !s.void && !s.ttd_basah).length})`} />
                  <Tab value="basah" label={`TTD Manual (${listSurat.filter((s) => s.ttd_basah && !s.void).length + backdateReq.filter((r) => r.ttd_basah).length})`} />
                  <Tab value="void" label={`Void (${listSurat.filter((s) => s.void).length})`} />
                  <Tab value="backdate" label={`Backdate (${backdateReq.length})`} />
                </Tabs>
                {subTab === 'backdate' ? (
                  <BackdateSurat hideDone refresh={refreshData} />
                ) : subTab === 'draft' ? (
                  <DraftSurat drafts={drafts} onLanjut={lanjutDraft} refresh={refreshData} />
                ) : (
                  <>
                    {/* permintaan backdate yang sekaligus TTD manual juga tampil di sini selama belum bernomor */}
                    {subTab === 'basah' && <BackdateSurat hideDone hanyaTtdManual refresh={refreshData} />}
                    <ListSurat
                      listSurat={listSurat.filter((s) => (subTab === 'void' ? s.void : subTab === 'basah' ? s.ttd_basah && !s.void : subTab === 'sudah' ? s.status === 'signed' && !s.void && !s.ttd_basah : s.status !== 'signed' && !s.void && !s.ttd_basah))}
                      valueNow={value}
                      update={updateSurat}
                      refresh={refreshData}
                    />
                  </>
                )}
              </CardBody>
            </Card>
          )}
        </TabPanel>
        )}
        <TabPanel value="6" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <Docusign />
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel value="2" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <ListSurat listSurat={listSurat} valueNow={value} refresh={refreshData} type="review" />
            </CardBody>
          </Card>

          {approvedSurat?.length > 0 && (
            <Card>
              <CardHeader><strong>Dokumen yang telah direview</strong></CardHeader>
              <CardBody>
                <ListSurat listSurat={approvedSurat} valueNow={value} refresh={refreshData} type="approved" />
              </CardBody>
            </Card>
          )}
        </TabPanel>

        <TabPanel value="3" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <ListSurat listSurat={listSurat} valueNow={value} refresh={refreshData} />
            </CardBody>
          </Card>

        </TabPanel>

        <TabPanel value="4" className="ps-0 pe-0">

          {auth?.user.roles.includes('SuperAdminAdm') &&
            <Card>
              <CardBody>

                {formSuratMasuk ?
                  <>
                    <MaterialIcon
                      icon="close"
                      className="mb-3 float-end"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setFormSuratMasuk(!formSuratMasuk)}
                    />
                    <AddSuratMasuk refresh={refreshData} func1={setFormSuratMasuk} />
                  </> :
                  <Button
                    color="primary"
                    size="lg"
                    style={{ width: '100%' }}
                    onClick={() => setFormSuratMasuk(!formSuratMasuk)}
                  >
                    Tambah Surat Masuk
                  </Button>
                }
              </CardBody>
            </Card>}



          {
            formSuratMasuk === false &&
            <>
              <Card>
                <CardBody>
                  <ListSurat listSurat={listMasuk} valueNow={value} refresh={refreshData} type="masuk" status="progress" />
                </CardBody>
              </Card>


              {listMDone?.length > 0 && (<Card>
                <CardHeader>Surat Masuk Yang Telah ditindaklanjuti</CardHeader>
                <CardBody>
                  <ListSurat listSurat={listMDone} valueNow={value} refresh={refreshData} type="masuk" status="done" />
                </CardBody>
              </Card>)}

            </>


          }
        </TabPanel>

        <TabPanel value="7" className="ps-0 pe-0">
          <BackdateSurat pic refresh={refreshData} />
        </TabPanel>

        <TabPanel value="5" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <ListSurat listSurat={listMcc} valueNow={value} refresh={refreshData} type='cc' />
            </CardBody>
          </Card>

        </TabPanel>

        <TabPanel value="99" className="ps-0 pe-0">
          <Card>
            <CardBody>
              <DashboardAdm />
             </CardBody>
          </Card>

        </TabPanel>

      </TabContext>
    </>
  );
};
export default Adm;
