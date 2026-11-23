import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { PILIHAN_CHEQUE_GIRO } from './dokumenKeuangan';

// Dialog sebelum download voucher: pilih Petugas Transaksi (staf dan supervisor keuangan) dan Cheque / Giro.
const PilihanVoucher = ({ data, unit, onTutup, onUnduh, proses }) => {
  const daftar = data?.petugas || [];
  const [petugas, setPetugas] = useState('');
  const [chequeGiro, setChequeGiro] = useState(PILIHAN_CHEQUE_GIRO[0]);
  const [nomorCheque, setNomorCheque] = useState('');
  const [tanggal, setTanggal] = useState(dayjs().format('YYYY-MM-DD'));

  // bawaan: pengguna yang mengunduh bila ia staf/supervisor keuangan, jika tidak harus memilih
  useEffect(() => {
    if (!data) return;
    const sendiri = daftar.find((x) => x.employe_id === data.pencetak?.employe_id);
    setPetugas(sendiri ? sendiri.nama : '');
    setChequeGiro(PILIHAN_CHEQUE_GIRO[0]);
    setNomorCheque('');
    setTanggal(dayjs().format('YYYY-MM-DD'));
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
        <FormGroup>
          <Label for="pv-tanggal">Tanggal Voucher</Label>
          <Input id="pv-tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          <small className="text-muted">Tampil di kanan atas voucher. Bawaan: hari ini.</small>
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
          {chequeGiro === 'Cheque' ? (
            <div className="mt-2">
              <Label for="pv-nomor-cheque" className="mb-1">
                Nomor Cheque
              </Label>
              <Input
                id="pv-nomor-cheque"
                type="text"
                value={nomorCheque}
                onChange={(e) => setNomorCheque(e.target.value)}
                placeholder="Contoh: CH 123456"
                maxLength={60}
              />
              <small className="text-muted">Tercetak di voucher sebagai &quot;Cheque (nomor)&quot;. Kosongkan bila belum ada nomornya.</small>
            </div>
          ) : null}
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={onTutup} disabled={proses}>
          Batal
        </Button>
        <Button color="primary" onClick={() => onUnduh({ petugas, chequeGiro, nomorCheque, tanggal })} disabled={proses || !petugas}>
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
