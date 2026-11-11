import React from 'react';
import { Alert } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';
import HalamanPro from '../../components/HalamanPro';
import Sppd from './Sppd';

const Index = () => {
  const [visible, setVisible] = React.useState(true);

  const onDismiss = () => setVisible(false);
  return (
    <HalamanPro judul="SPPD" keterangan="Pengajuan, approval dan realisasi perjalanan dinas">
      <Alert color="info" isOpen={visible} toggle={onDismiss} className="py-2">
        Panduan penggunaan aplikasi tersedia{' '}
        <a href="https://api.ptpema.co.id/sppd/dokumentasi/SPPD.pdf" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', fontWeight: 600 }}>
          di sini
        </a>
        .
      </Alert>
      <BreadCrumbs />
      <Sppd />
    </HalamanPro>
  );
};

export default Index;
