import React, { useContext, useState } from 'react';
import MaterialIcon from '@material/react-material-icon';
import {
  Navbar,
  Nav,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  // DropdownItem,
  Button,
  Container,
  // import { Bell } from 'react-feather';
} from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
// import SimpleBar from 'simplebar-react';
// import { useQuery } from '@tanstack/react-query';
// import NotificationDD from './NotificationDD';
import MegaDD from './MegaDD';

// import MessageDD from './MessageDD';
import { ToggleMobileSidebar } from '../../store/customizer/CustomizerSlice';
import ProfileDD from './ProfileDD';
// import useAxios from '../../hooks/useAxios';

import HorizontalLogo from '../logo/HorizontalLogo';
import { AuthContext } from '../../context/AuthContext';
import './Header.scss';
import { Toast } from '../../components/atoms/Toast';
import { onAvatarError } from '../../utils/defaultAvatar';

const HR_URL = process.env.REACT_APP_HR_URL;
const SYS_URL = process.env.REACT_APP_SYS_URL;
const HCIS_URL = process.env.REACT_APP_HCIS_BE;

const HorizontalHeader = () => {
  const isDarkMode = useSelector((state) => state.customizer.isDark);
  const topbarColor = useSelector((state) => state.customizer.topbarBg);
  const isMobileSidebar = useSelector((state) => state.customizer.isMobileSidebar);
  const toggleDispatch = useDispatch();
  const { auth, dispatch } = useContext(AuthContext);
  const [showApps, setShowApps] = useState(false);

  // const [isNotifOpen, setIsNotifOpen] = useState(false);

  const navigate = useNavigate();

  // const api = useAxios();

  // const { isLoading, error, data, refetch } = useQuery({
  //   queryKey: ['notification'],
  //   queryFn: () =>
  //     api.get(`api/employe/notification/list`).then((res) => {
  //       return res.data.data;
  //     }),
  // });

  const handleShowApps = () => {
    setShowApps(!showApps);
  };

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/auth/login');
  };

  return (
    <>
      <Toast />
      <Navbar
        color={topbarColor}
        dark={!isDarkMode}
        light={isDarkMode}
        expand="lg"
        className="shadow HorizontalTopbar p-0"
      >
        <Container className="d-flex align-items-center">
          {/******************************/}
          {/**********Logo**********/}
          {/******************************/}
          <div className="pe-4 py-3 ">
            <HorizontalLogo />
          </div>
          {/******************************/}
          {/**********Toggle Buttons**********/}
          {/******************************/}

          <Nav className="me-auto flex-row" navbar>
            <Button
              color={topbarColor}
              className="d-sm-block d-lg-none"
              onClick={() => toggleDispatch(ToggleMobileSidebar())}
            >
              <i className={`bi ${isMobileSidebar ? 'bi-x' : 'bi-list'}`} />
            </Button>

            {/******************************/}
            {/**********Mega DD**********/}
            {/******************************/}
            <UncontrolledDropdown className="mega-dropdown mx-1">
              <DropdownToggle className="bg-transparent border-0" color={topbarColor}>
                {/* <Icon.Grid size={18} /> */}
              </DropdownToggle>
              <DropdownMenu>
                <MegaDD />
              </DropdownMenu>
            </UncontrolledDropdown>
          </Nav>
          <div className="d-flex align-items-center">
            {/******************************/}
            {/**********Notification DD**********/}
            {/******************************/}
            <UncontrolledDropdown>
              {/* <DropdownToggle
                className="border-0"
                color={topbarColor}
                onClick={() => setIsNotifOpen(true)}
              >
                <div className="notif">
                  <Bell size={18} />
                  {data?.length > 0 && <div className="notif-count">{data?.length}</div>}
                </div>
              </DropdownToggle> */}
              {/* {isNotifOpen && (
                <DropdownMenu className="notif-view">
                  <DropdownItem header>
                    <span className="mb-0 fs-5">Notifications</span>
                  </DropdownItem>
                  <DropdownItem divider />
                  <SimpleBar style={{ maxHeight: '350px' }}>
                    {isLoading ? (
                      <span style={{ padding: '0px 20px' }}>Loading...</span>
                    ) : error ? (
                      <span style={{ padding: '0px 20px' }}>Something went wrong.</span>
                    ) : (
                      <NotificationDD {...{ data, refetch, setIsNotifOpen }} />
                    )}
                  </SimpleBar>
                  <DropdownItem divider />
                  <div className="p-2 px-3">
                    <Button color="primary" size="sm" block>
                      Check All
                    </Button>
                  </div>
                </DropdownMenu>
              )} */}
            </UncontrolledDropdown>
            {/******************************/}
            {/**********Message DD**********/}
            {/******************************/}
            {/* <UncontrolledDropdown className="mx-1">
            <DropdownToggle className="bg-transparent border-0" color={topbarColor}>
              <MessageSquare size={18} />
            </DropdownToggle>
            <DropdownMenu className="ddWidth" end>
              <DropdownItem header>
                <span className="mb-0 fs-5">Messages</span>
              </DropdownItem>
              <DropdownItem divider />
              <SimpleBar style={{ maxHeight: '350px' }}>
                <MessageDD />
              </SimpleBar>
              <DropdownItem divider />
              <div className="p-2 px-3">
                <Button color="primary" size="sm" block>
                  Check All
                </Button>
              </div>
            </DropdownMenu>
          </UncontrolledDropdown> */}
            {/******************************/}
            {/**********Profile DD**********/}
            {/******************************/}
            <div className="apps-button">
              <div className="click" onClick={handleShowApps}>
                <MaterialIcon icon="apps" />
              </div>
              {showApps && (
                <>
                  <div className="app-lay" onClick={handleShowApps} />
                  <div className="app-container">
                    <div className="app-body">
                      <Link to={`${SYS_URL}`} target="blank" className="item">
                        <span className="circle-box md-box text-dark-white bg-success">
                          <i className="fs-2 bi bi-building" />
                        </span>
                        <span>Sys</span>
                        <div className="desc">
                          <span>Daily, Project Management, Asset, Administrasi, SPPD</span>
                        </div>
                      </Link>
                      <Link
                        to={`${HR_URL}?source=sys&token=${auth?.token}`}
                        target="blank"
                        className="item"
                      >
                        <span className="circle-box md-box text-dark-white bg-success">
                          <i className="fs-2 bi bi-person-lines-fill" />
                        </span>
                        <span>HR</span>
                        <div className="desc">
                          <span>Profil Karyawan, Penggajian, Pengajuan Cuti & Absensi</span>
                        </div>
                      </Link>
                      <Link to="https://ivds.ptpema.co.id" target="blank" className="item">
                        <span className="circle-box md-box text-dark-white bg-success">
                          <i className="fs-2 bi bi-wallet2" />
                        </span>
                        <span>Vendor</span>
                        <div className="desc">
                          <span>Sistem Terintregasi Vendor</span>
                        </div>
                      </Link>
                      <Link to="https://ptpema.co.id" target="blank" className="item">
                        <span className="circle-box md-box text-dark-white bg-success">
                          <i className="fs-2 bi bi-globe" />
                        </span>
                        <span>Website</span>
                        <div className="desc">
                          <span>Website Resmi PT Pema</span>
                        </div>
                      </Link>
                      {/* <Link to="https://ptpema.co.id" target="blank" className="item">
                        <span className="circle-box md-box text-dark-white bg-success">
                          <i className="fs-2 bi bi-phone" />
                        </span>
                        <span>Mobile</span>
                        <div className="desc">
                          <span>Installer aplikasi presensi Android & IOS</span>
                        </div>
                      </Link> */}
                    </div>
                  </div>
                </>
              )}
            </div>

            <UncontrolledDropdown>
              <DropdownToggle tag="span" className="p-2 cursor-pointer ">
                <img
                  src={`${HCIS_URL}employee/file?f=photo-profil&id=${auth.user.employe_id}`}
                  alt="profile"
                  className="rounded-circle"
                  width="30"
                  onError={onAvatarError}
                />
              </DropdownToggle>
              <DropdownMenu className="account-view">
                <ProfileDD />

                <div className="p-2 px-3">
                  <Button color="danger" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </DropdownMenu>
            </UncontrolledDropdown>
          </div>
        </Container>
      </Navbar>
    </>
  );
};

export default HorizontalHeader;
