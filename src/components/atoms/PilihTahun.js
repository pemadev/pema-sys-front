import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'reactstrap';
import { SEMUA_TAHUN, tahunBerjalan } from '../../utils/tahun';

// tombol pilihan tahun: 2024, 2025, ... (tahun berjalan ikut), dan Semua
const PilihTahun = ({ tahun, onChange, daftar }) => (
  <ButtonGroup size="sm" className="text-nowrap">
    {[...daftar, SEMUA_TAHUN].map((t) => (
      <Button
        key={t}
        type="button"
        color="primary"
        outline={tahun !== t}
        active={tahun === t}
        title={t === tahunBerjalan() ? 'Tahun berjalan' : undefined}
        onClick={() => onChange(t)}
      >
        {t === SEMUA_TAHUN ? 'Semua' : t}
      </Button>
    ))}
  </ButtonGroup>
);
PilihTahun.propTypes = {
  tahun: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  daftar: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default PilihTahun;
