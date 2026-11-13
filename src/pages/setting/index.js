import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Card, CardBody } from 'reactstrap';
import HalamanPro from '../../components/HalamanPro';
import RoleUser from './RoleUser';
import Whatsapp from './Whatsapp';
import Pengiriman from './Pengiriman';
import AlurApproval from './AlurApproval';

// Halaman yang dipilih dari menu dropdown Setting di sidebar (/setting/:tab)
const HALAMAN = {
  role: { judul: 'Role & User', Komponen: RoleUser },
  wa: { judul: 'WhatsApp', Komponen: Whatsapp },
  kirim: { judul: 'Daftar Notifikasi', Komponen: Pengiriman },
  alur: { judul: 'Alur Approval', Komponen: AlurApproval },
};

// Halaman Setting, hanya untuk role SuperAdmin (dijaga di Router dan di API)
const Setting = () => {
  const { tab } = useParams();
  if (!tab) return <Navigate to="/setting/role" replace />;
  const h = HALAMAN[tab];
  if (!h) return <Navigate to="/setting/role" replace />;
  const { Komponen } = h;

  return (
    <HalamanPro judul={`Setting: ${h.judul}`} keterangan="Kelola role pengguna, status WhatsApp, pengiriman notifikasi dan alur approval">
      <Card>
        <CardBody>
          <Komponen />
        </CardBody>
      </Card>
    </HalamanPro>
  );
};

export default Setting;
