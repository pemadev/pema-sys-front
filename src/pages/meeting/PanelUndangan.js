import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button } from 'reactstrap';
import Select from 'react-select';
import useAxios from '../../hooks/useAxios';

// Daftar peserta yang diundang pada detail rapat/Zoom. Pembuat rapat bisa menambah undangan (tag karyawan lagi);
// hanya peserta baru yang menerima notifikasi push dan WhatsApp.
const PanelUndangan = ({ tipe, rapatId, undangan, bolehTambah, pilihanPegawai, onUbah }) => {
  const api = useAxios();
  const [dipilih, setDipilih] = useState([]);
  const [mengirim, setMengirim] = useState(false);
  const [pesan, setPesan] = useState(null);

  const sudahDiundang = new Set((undangan || []).map((u) => String(u.employe_id)));
  const pilihanBaru = pilihanPegawai.filter((p) => !sudahDiundang.has(p.value));

  const [mencabut, setMencabut] = useState(null);

  const cabut = async (u) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Cabut undangan ${u.nama}? Peserta akan diberi tahu.`)) return;
    setMencabut(u.employe_id);
    setPesan(null);
    try {
      const res = await api.post(`dapi/meeting/${tipe}/${rapatId}/undangan/${encodeURIComponent(u.employe_id)}/hapus`);
      if (res?.data?.success === false) {
        setPesan({ color: 'danger', teks: res.data.message || 'Gagal mencabut undangan.' });
      } else {
        if (onUbah) onUbah(res?.data?.data?.undangan || []);
        setPesan({ color: 'success', teks: res?.data?.message || 'Undangan dicabut.' });
      }
    } catch (e) {
      setPesan({ color: 'danger', teks: e?.response?.data?.message || 'Gagal mencabut undangan.' });
    } finally {
      setMencabut(null);
    }
  };

  const kirim = async () => {
    if (!dipilih.length) return;
    setMengirim(true);
    setPesan(null);
    try {
      const res = await api.post(`dapi/meeting/${tipe}/${rapatId}/undangan`, { invitees: dipilih.map((o) => o.value) });
      if (res?.data?.success === false) {
        setPesan({ color: 'danger', teks: res.data.message || 'Gagal mengirim undangan.' });
      } else {
        setPesan({ color: 'success', teks: res?.data?.message || 'Undangan terkirim.' });
        setDipilih([]);
        if (onUbah) onUbah(res?.data?.data?.undangan || []);
      }
    } catch (e) {
      setPesan({ color: 'danger', teks: e?.response?.data?.message || 'Gagal mengirim undangan.' });
    } finally {
      setMengirim(false);
    }
  };

  return (
    <div className="panel-undangan">
      <div className="panel-undangan-judul">
        <strong>Peserta Diundang</strong>
        <span className="hitung">{(undangan || []).length}</span>
      </div>

      {(undangan || []).length ? (
        <div className="daftar-undangan">
          {undangan.map((u) => (
            <span key={u.employe_id} className="chip-undangan">
              {u.nama}
              {bolehTambah ? (
                <button
                  type="button"
                  className="cabut"
                  disabled={mencabut === u.employe_id}
                  onClick={() => cabut(u)}
                  title="Cabut undangan"
                  aria-label={`Cabut undangan ${u.nama}`}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-muted small">Belum ada peserta yang diundang.</div>
      )}

      {bolehTambah ? (
        <div className="tambah-undangan">
          <Select
            isMulti
            classNamePrefix="pilih-peserta"
            options={pilihanBaru}
            value={dipilih}
            onChange={(v) => setDipilih(v || [])}
            placeholder="Tag karyawan untuk diundang..."
            noOptionsMessage={() => 'Tidak ada nama'}
            closeMenuOnSelect={false}
            menuPlacement="auto"
          />
          <Button color="primary" size="sm" disabled={mengirim || !dipilih.length} onClick={kirim}>
            {mengirim ? 'Mengirim...' : `Kirim Undangan${dipilih.length ? ` (${dipilih.length})` : ''}`}
          </Button>
          <small className="text-muted">Peserta baru menerima undangan lewat notifikasi push dan WhatsApp (beserta link Zoom jika ada).</small>
        </div>
      ) : null}

      {pesan ? (
        <Alert color={pesan.color} className="mt-2 mb-0 py-2" toggle={() => setPesan(null)}>
          {pesan.teks}
        </Alert>
      ) : null}
    </div>
  );
};

PanelUndangan.propTypes = {
  tipe: PropTypes.oneOf(['room', 'zoom']).isRequired,
  rapatId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  undangan: PropTypes.array,
  bolehTambah: PropTypes.bool,
  pilihanPegawai: PropTypes.array,
  onUbah: PropTypes.func,
};

PanelUndangan.defaultProps = {
  rapatId: null,
  undangan: [],
  bolehTambah: false,
  pilihanPegawai: [],
  onUbah: undefined,
};

export default PanelUndangan;
