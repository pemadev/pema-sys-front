import React from 'react';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';
import Asset from './Asset';
import HalamanPro from '../../components/HalamanPro';

const index = () => {
  return (
    <HalamanPro>
      <BreadCrumbs />
      <Asset></Asset>
    </HalamanPro>
  );
};

export default index;
