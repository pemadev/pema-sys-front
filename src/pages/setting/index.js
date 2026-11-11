import React, { useState } from 'react';
import { Card, CardBody, Nav, NavItem, NavLink } from 'reactstrap';
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
    <>
      <h4 className="mb-3">Setting</h4>
      <Card>
        <CardBody>
          <Nav tabs className="mb-3">
            {TAB.map(([kode, label]) => (
              <NavItem key={kode}>
                <NavLink href="#" active={tab === kode} onClick={(e) => { e.preventDefault(); setTab(kode); }}>
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
    </>
  );
};

export default Setting;
