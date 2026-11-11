import React from 'react';
import { Alert } from 'reactstrap';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';
import HalamanPro from '../../components/HalamanPro';
import Adm from './Adm';

const Index = () => {
  const [visible, setVisible] = React.useState(true);

  const onDismiss = () => setVisible(false);

  return (
    <HalamanPro judul="Surat Menyurat" keterangan="Surat keluar, surat masuk, approval dan tanda tangan digital">
      <Alert color="info" isOpen={visible} toggle={onDismiss} className="py-2">
        Panduan penggunaan aplikasi tersedia{' '}
        <a href="https://api.ptpema.co.id/adm/dokumentasi/adm.pdf" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', fontWeight: 600 }}>
          di sini
        </a>
        .
      </Alert>
      <BreadCrumbs />
      <Adm />
    </HalamanPro>
  );
};

export default Index;
