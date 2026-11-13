import { useEffect, useState } from 'react';
import { Container, Nav } from 'reactstrap';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import SidebarData from '../sidebardata/HorizontalSidebarData';
// import DirectorSidebarData from '../sidebardata/DirectorSidebarData';
import NavSubItem from './NavSubItem';
import NavSingleItem from './NavSingleItem';
import useAuth from '../../../hooks/useAuth';
import useAxios from '../../../hooks/useAxios';

const HorizontalSidebar = () => {
  const { auth } = useAuth();
  const activeBg = useSelector((state) => state.customizer.sidebarBg);
  const location = useLocation();
  const currentURL = location.pathname.split('/').slice(0, -1).join('/');
  const isFixed = useSelector((state) => state.customizer.isSidebarFixed);
  const isMobileSidebar = useSelector((state) => state.customizer.isMobileSidebar);
  const [sidebarData, setSidebarData] = useState();
  const api = useAxios();
  // menu Atur Renbis hanya untuk PUK divisi Keuangan; server yang menentukan
  const [aksesRenbis, setAksesRenbis] = useState(false);

  useEffect(() => {
    api
      .get('dapi/renbis/akses')
      .then((res) => setAksesRenbis(!!res.data?.data?.akses))
      .catch(() => setAksesRenbis(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSidebarData(SidebarData);
  }, []);

  return (
    <div
      className={`horizontalNav shadow bg-${activeBg}  ${isFixed ? 'fixedSidebar' : ''} ${
        isMobileSidebar ? 'showSidebar' : ''
      }`}
      style={{ zIndex: 4 }}
    >
      <Container>
        <Nav className={activeBg === 'white' ? '' : 'lightText'}>
          {sidebarData?.map((navi) => {
            if (navi.perluAksesRenbis && !aksesRenbis) return null;
            if (navi.caption === 'Keuangan' && !aksesRenbis) return null;
            if (navi.caption) {
              return (
                <div
                  className="navCaption fw-bold mt-4 d-none d-sm-block d-md-none"
                  key={navi.caption}
                >
                  {navi.caption}
                </div>
              );
            }
            if (navi.children) {
              return auth?.user.roles.find((role) => navi?.allowedRoles?.includes(role)) ? (
                <NavSubItem
                  key={navi.id}
                  icon={navi.icon}
                  title={navi.title}
                  items={navi.children}
                  suffix={navi.suffix}
                  ddType={navi.ddType}
                  activeBck={activeBg}
                  suffixColor={navi.suffixColor}
                  isUrl={currentURL === navi.href}
                  auth={auth}
                />
              ) : (
                ''
              );
            }
            return auth?.user?.roles.find((role) => navi?.allowedRoles?.includes(role)) ? (
              <NavSingleItem
                key={navi.id}
                className={location.pathname === navi.href ? 'activeLink' : ''}
                to={navi.href}
                title={navi.title}
                suffix={navi.suffix}
                suffixColor={navi.suffixColor}
                icon={navi.icon}
              />
            ) : (
              ''
            );
          })}
        </Nav>
      </Container>
    </div>
  );
};

export default HorizontalSidebar;
