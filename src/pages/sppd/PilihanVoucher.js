import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { PILIHAN_CHEQUE_GIRO } from './dokumenKeuangan';

// Dialog sebelum download voucher: pilih Petugas Transaksi (staf dan supervisor keuangan) dan Cheque / Giro.
const PilihanVoucher = ({ data, unit, onTutup, onUnduh, proses }) => {
  const daftar = data?.petugas || [];
  const [petugas, setPetugas] = useState('');
  const [chequeGiro, setChequeGiro] = useState(PILIHAN_CHEQUE_GIRO[0]);

  // bawaan: pengguna yang mengunduh bila ia staf/supervisor keuangan, jika tidak harus memilih
  useEffect(() => {
    if (!data) return;
    const sendiri = daftar.find((x) => x.employe_id === data.pencetak?.employe_id);
    setPetugas(sendiri ? sendiri.nama : '');
    setChequeGiro(PILIHAN_CHEQUE_GIRO[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <Modal isOpen={!!data} toggle={proses ? undefined : onTutup} centered>
      <ModalHeader toggle={proses ? undefined : onTutup}>Download Voucher{unit ? ` - Termin ${unit.no}` : ''}</ModalHeader>
      <ModalBody>
        <FormGroup>
          <Label for="pv-petugas">Petugas Transaksi</Label>
          <Input id="pv-petugas" type="select" value={petugas} onChange={(e) => setPetugas(e.target.value)}>
            <option value="">- pilih petugas -</option>
            {daftar.map((x) => (
              <option key={x.employe_id} value={x.nama}>
                {x.nama} ({x.jabatan})
              </option>
            ))}
          </Input>
        </FormGroup>
        <FormGroup className="mb-0">
          <Label className="d-block">Cheque / Giro</Label>
          {PILIHAN_CHEQUE_GIRO.map((p) => (
            <FormGroup check inline key={p}>
              <Input id={`pv-cek-${p}`} type="radio" name="pv-cek" checked={chequeGiro === p} onChange={() => setChequeGiro(p)} />
              <Label check for={`pv-cek-${p}`}>
                {p}
              </Label>
            </FormGroup>
          ))}
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={onTutup} disabled={proses}>
          Batal
        </Button>
        <Button color="primary" onClick={() => onUnduh({ petugas, chequeGiro })} disabled={proses || !petugas}>
          {proses ? 'Menyiapkan...' : 'Download'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

PilihanVoucher.propTypes = {
  data: PropTypes.object,
  unit: PropTypes.object,
  onTutup: PropTypes.func.isRequired,
  onUnduh: PropTypes.func.isRequired,
  proses: PropTypes.bool,
};
PilihanVoucher.defaultProps = { data: null, unit: null, proses: false };

export default PilihanVoucher;
