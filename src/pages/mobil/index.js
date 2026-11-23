import React from 'react';
import Mobil from './Mobil';
import HalamanPro from '../../components/HalamanPro';


const Index = () => {
  return (
    <HalamanPro judul="Mobil" keterangan="Penggunaan dan pemesanan mobil operasional">
      <Mobil />
    </HalamanPro>
  );
};

export default Index;
