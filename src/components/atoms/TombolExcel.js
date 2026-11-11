import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { unduhExcel } from '../../utils/excelTabel';

const TombolExcel = ({ kolom, data, namaFile }) => (
  <Button type="button" size="sm" color="success" outline className="text-nowrap" disabled={!data || data.length === 0} onClick={() => unduhExcel(kolom, data, namaFile)}>
    Unduh Excel
  </Button>
);
TombolExcel.propTypes = {
  kolom: PropTypes.array.isRequired,
  data: PropTypes.array,
  namaFile: PropTypes.string.isRequired,
};
TombolExcel.defaultProps = { data: [] };

export default TombolExcel;
