import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import './HalamanPro.css';

// Pembungkus tampilan profesional: judul halaman opsional dan gaya seragam (tabel, tab, tombol, isian) untuk satu halaman
const HalamanPro = ({ judul, keterangan, aksi, children }) => {
  const gelap = useSelector((state) => state.customizer.isDark);

  return (
    <div className={`tampilan-pro${gelap ? ' gelap' : ''}`}>
      {judul && (
        <div className="judul-halaman">
          <div>
            <h4>{judul}</h4>
            {keterangan && <p>{keterangan}</p>}
          </div>
          {aksi}
        </div>
      )}
      {children}
    </div>
  );
};

HalamanPro.propTypes = {
  judul: PropTypes.string,
  keterangan: PropTypes.string,
  aksi: PropTypes.node,
  children: PropTypes.node,
};

export default HalamanPro;
