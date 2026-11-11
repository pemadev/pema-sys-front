import React from 'react';
import JotformEmbed from 'react-jotform-embed';
import HalamanPro from '../../components/HalamanPro';
import './Report.scss';

const AtkReport = () => {
  return (
    <HalamanPro judul="Laporan ATK" keterangan="Rekap permintaan alat tulis kantor">
      <div className="card">
        <div className="card-body p-0 bingkai-laporan">
          <JotformEmbed src="https://www.jotform.com/tables/233041253562043" />
        </div>
      </div>
    </HalamanPro>
  );
};

export default AtkReport;
