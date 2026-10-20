import React, { useEffect, useState} from 'react';
import { Card, CardBody, Button, CardHeader } from 'reactstrap';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import Tab from '@mui/material/Tab';
import { useQueries } from '@tanstack/react-query';
import MaterialIcon from '@material/react-material-icon';
import Badge from '@mui/material/Badge';
import { useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useAxios from '../../hooks/useAxios';
import TulisSurat from './TulisSurat';
import ListSurat from './ListSurat';
import AddSuratMasuk from './AddSuratMasuk';
import DashboardAdm from './DashboardAdm';
import Docusign from './Docusign/Docusign';



const Adm = () => {
  const { auth } = useAuth();
  const api = useAxios();
  const { hash } = useLocation();

  const formData = JSON.parse(localStorage.getItem('formData'))
  const [value, setValue] = useState(`${hash!==''?hash.replace(/#/g, '').toString():'99'}`);
  const [tulisForm, setTulisForm] = useState(formData?.tulisForm || false);
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
                  <TulisSurat divisis={divisis} mydivisi={mydivisi} refresh={refreshData} func1={setTulisForm} detailSurat={detailSurat} updateForm={updateForm} />
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

          {tulisForm === false && listSurat?.length > 0 && (
            <Card>
              <CardBody>
                <ListSurat listSurat={listSurat} valueNow={value} update={updateSurat} refresh={refreshData} />
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
