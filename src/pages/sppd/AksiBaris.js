import React from 'react';
import PropTypes from 'prop-types';
import MaterialIcon from '@material/react-material-icon';
import { Button, DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from 'reactstrap';
import './PanelEkstend.css';

// Action per baris untuk AdminSPPD: aksi pertama menjadi tombol utama, sisanya masuk menu "Action".
// aksi: [{ label, warna, ikon, jalan, pisah? }]
const AksiBaris = ({ aksi, semuaDiMenu }) => {
  // semuaDiMenu: tanpa tombol utama, seluruh aksi masuk ke menu Action
  const [utama, ...sisa] = aksi;
  const lain = semuaDiMenu ? aksi : sisa;
  if (!utama) return null;

  return (
    <div className="aksi-admin">
      {semuaDiMenu ? null : (
        <Button size="sm" color={utama.warna} outline className="aksi-utama" onClick={utama.jalan}>
          {utama.ikon ? <MaterialIcon icon={utama.ikon} /> : null}
          {utama.label}
        </Button>
      )}
      {lain.length > 0 ? (
        <UncontrolledDropdown>
          <DropdownToggle size="sm" color="light" className="aksi-lain" aria-label="Action lainnya">
            Action <MaterialIcon icon="expand_more" className="aksi-panah" />
          </DropdownToggle>
          <DropdownMenu end container="body" className="aksi-menu">
            <div className="aksi-judul">Pilih action</div>
            {lain.map((x) => (
              <React.Fragment key={x.label}>
                {x.pisah ? <DropdownItem divider /> : null}
                <DropdownItem onClick={x.jalan} className={`aksi-item aksi-${x.warna}`}>
                  <span className="aksi-ikon">
                    <MaterialIcon icon={x.ikon || 'chevron_right'} />
                  </span>
                  <span className="aksi-teks">{x.label}</span>
                </DropdownItem>
              </React.Fragment>
            ))}
          </DropdownMenu>
        </UncontrolledDropdown>
      ) : null}
    </div>
  );
};

AksiBaris.propTypes = {
  aksi: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      warna: PropTypes.string,
      ikon: PropTypes.string,
      jalan: PropTypes.func.isRequired,
      pisah: PropTypes.bool,
    }),
  ).isRequired,
  semuaDiMenu: PropTypes.bool,
};

export default AksiBaris;
