import React, { useState } from 'react';
import { Card, CardBody, Nav, NavItem, NavLink } from 'reactstrap';
import HalamanPro from '../../components/HalamanPro';
import RoleUser from './RoleUser';
import Whatsapp from './Whatsapp';
import Pengiriman from './Pengiriman';

const TAB = [
  ['role', 'Role & User'],
  ['wa', 'WhatsApp'],
  ['kirim', 'Daftar Notifikasi'],
];

// Halaman Setting, hanya untuk role SuperAdmin (dijaga di Router dan di API)
const Setting = () => {
  const [tab, setTab] = useState('role');

  return (
    <HalamanPro judul="Setting" keterangan="Kelola role pengguna, status WhatsApp dan pengiriman notifikasi">
      <Card>
        <CardBody>
          <Nav tabs className="mb-4">
            {TAB.map(([kode, label]) => (
              <NavItem key={kode}>
                <NavLink
                  href="#"
                  active={tab === kode}
                  onClick={(e) => {
                    e.preventDefault();
                    setTab(kode);
                  }}
                >
                  {label}
                </NavLink>
              </NavItem>
            ))}
          </Nav>
          {tab === 'role' && <RoleUser />}
          {tab === 'wa' && <Whatsapp />}
          {tab === 'kirim' && <Pengiriman />}
        </CardBody>
      </Card>
    </HalamanPro>
  );
};

export default Setting;
