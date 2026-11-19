import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Input, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';
import './PanelEkstend.css';

const tgl = (v) => (v && dayjs(v).isValid() ? dayjs(v).locale('id').format('DD MMM YYYY') : '-');

// Pilih extend mana yang dibatalkan (admin SPPD / pengaju). Hanya extend yang belum diproses divisi umum/keuangan bisa dipilih.
const ModalBatalEkstend = ({ row, onTutup, onUbah }) => {
  const api = useAxios();
  const [daftar, setDaftar] = useState(null);
  const [pilihan, setPilihan] = useState(null);
  const [alasan, setAlasan] = useState('');
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    setDaftar(null);
    setPilihan(null);
    setAlasan('');
    if (!row) return;
    api
      .get(`dapi/sppd/pengajuan/${row.id}`)
      .then((res) => setDaftar((res.data.data?.ekstend || []).filter((x) => x.status_approval !== 'dibatalkan')))
      .catch(() => setDaftar([]));
  }, [row]);

  const kirim = () => {
    if (!pilihan) {
      alert('error', 'Pilih extend yang akan dibatalkan.');
      return;
    }
    if (alasan.trim().length < 5) {
      alert('error', 'Alasan pembatalan wajib diisi (minimal 5 karakter).');
      return;
    }
    setMengirim(true);
    api
      .post(`dapi/sppd/ekstend/${pilihan.id}/batal`, { alasan: alasan.trim() })
      .then(() => {
        alert('success', `Extend ${pilihan.no_urut || ''} dibatalkan`);
        if (onUbah) onUbah();
        onTutup();
      })
      .catch((err) => alert('error', err?.response?.data?.message || err.message))
      .finally(() => setMengirim(false));
  };

  const alasanTidak = (x) => (x.status_approval === 'ditolak' ? 'Sudah ditolak' : !x.no_urut ? 'Extend lama yang sudah selesai' : 'Sudah diproses divisi umum/keuangan');

  return (
    <Modal isOpen={!!row} toggle={onTutup} centered>
      <ModalHeader toggle={onTutup}>
        Batalkan Extend
        <div className="small fw-normal text-muted">
          {row?.nomor_sppd} · {row?.nama}
        </div>
      </ModalHeader>
      <ModalBody>
        {daftar === null ? <div className="text-muted small">Memuat extend . . .</div> : null}
        {daftar && daftar.length === 0 ? <div className="text-muted small">Tidak ada extend yang bisa dibatalkan (belum ada, atau sudah dibatalkan).</div> : null}
        {daftar && daftar.length > 0 ? (
          <>
            <div className="pe-sub">Pilih extend yang dibatalkan</div>
            <div className="bx-daftar">
              {daftar.map((x) => {
                const bisa = !!x.bisa_batal;
                const aktif = pilihan?.id === x.id;
                const judul = x.tipe === 'tujuan_baru' ? `Tujuan baru: ${x.nama_tujuan_baru || '-'}` : `Tambah hari: ${x.detail_tujuan || '-'}`;

                return (
                  <label key={x.id} className={`bx-opsi${aktif ? ' aktif' : ''}${bisa ? '' : ' mati'}`} htmlFor={`bx-${x.id}`}>
                    <input id={`bx-${x.id}`} type="radio" name="bx-pilih" disabled={!bisa} checked={aktif} onChange={() => setPilihan(x)} />
                    <span className="pe-nomor">{x.no_urut || 'L'}</span>
                    <span className="bx-teks">
                      <span className="pe-judul">{judul}</span>
                      <span className="pe-meta">
                        {tgl(x.start)} - {tgl(x.end)} · {bisa ? 'Bisa dibatalkan' : alasanTidak(x)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="pe-sub mt-3">Alasan pembatalan</div>
            <Input type="textarea" rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Tulis alasan pembatalan extend (wajib)" />
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={onTutup}>
          Tutup
        </Button>
        <Button color="danger" disabled={mengirim || !pilihan} onClick={kirim}>
          {mengirim ? 'Memproses...' : pilihan ? `Batalkan Extend ${pilihan.no_urut || ''}` : 'Batalkan Extend'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

ModalBatalEkstend.propTypes = {
  row: PropTypes.object,
  onTutup: PropTypes.func.isRequired,
  onUbah: PropTypes.func,
};

export default ModalBatalEkstend;
