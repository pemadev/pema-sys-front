import React from 'react';
import JotformEmbed from 'react-jotform-embed';
import HalamanPro from '../../components/HalamanPro';
import './Report.scss';

const PentryReport = () => {
  return (
    <HalamanPro judul="Laporan Pentry" keterangan="Rekap permintaan pentry">
      <div className="card">
        <div className="card-body p-0 bingkai-laporan">
          <JotformEmbed src="https://www.jotform.com/tables/233040333516040" />
        </div>
      </div>
    </HalamanPro>
  );
};

export default PentryReport;
