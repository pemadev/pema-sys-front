import React from 'react';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';
import Mobil from './Mobil';
import HalamanPro from '../../components/HalamanPro';


const Index = () => {
  return (
    <HalamanPro>
      <BreadCrumbs />
      <Mobil />
    </HalamanPro>
  );
};

export default Index;
