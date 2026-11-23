import React from 'react';
import Asset from './Asset';
import HalamanPro from '../../components/HalamanPro';

const index = () => {
  return (
    <HalamanPro judul="Asset" keterangan="Data dan pengelolaan aset perusahaan">
      <Asset></Asset>
    </HalamanPro>
  );
};

export default index;
