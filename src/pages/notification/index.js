import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from 'reactstrap';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import relativeTime from 'dayjs/plugin/relativeTime';
import useAxios from '../../hooks/useAxios';
import HalamanPro from '../../components/HalamanPro';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';
import './notifikasi.css';

dayjs.extend(relativeTime);

const STATUS = [
  { nilai: '', label: 'Semua' },
  { nilai: 'belum', label: 'Belum dibaca' },
  { nilai: 'sudah', label: 'Sudah dibaca' },
];

const MODUL = [
  ['', 'Semua modul'],
  ['adm', 'Surat (ADM)'],
  ['sppd', 'SPPD'],
  ['mobil', 'Mobil operasional'],
  ['asset', 'Aset'],
  ['project', 'Project'],
  ['task', 'Task'],
  ['daily', 'Daily'],
  ['pengajuan', 'Pengajuan'],
  ['tender', 'Tender'],
  ['vendor', 'Vendor'],
];

// notifikasi tanpa pelaku dikirim otomatis oleh sistem
const dariSistem = (n) => !n.actor_id && (!n.actor || n.actor === '-');

const waktuRelatif = (v) => {
  const d = dayjs(v);
  if (dayjs().diff(d, 'day') < 7) return d.locale('id').fromNow();
  return d.locale('id').format('DD MMM YYYY, HH:mm');
};

// Riwayat semua notifikasi, yang sudah maupun belum dibaca
const Notifications = () => {
  const api = useAxios();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [modul, setModul] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [hasil, setHasil] = useState({ data: [], total: 0, halaman_terakhir: 1, belum_dibaca: 0 });
  const [loading, setLoading] = useState(true);

  const muat = useCallback(() => {
    setLoading(true);
    api
      .get('api/notification/semua', { params: { status, modul, page: halaman } })
      .then((res) => setHasil(res.data))
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [status, modul, halaman]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muat();
  }, [muat]);

  const ubahFilter = (set, nilai) => {
    set(nilai);
    setHalaman(1);
  };

  const buka = (n) => {
    const tujuan = n.url ? `/${String(n.url).replace(/^\//, '')}` : null;
    const lanjut = () => {
      if (tujuan) navigate(tujuan);
      else muat();
    };
    if (n.read_at) {
      lanjut();
      return;
    }
    api
      .post('api/notification/baca', { id: n.id })
      .catch((err) => console.log(err))
      .finally(lanjut);
  };

  const bacaSemua = () => {
    api
      .post('api/notification/baca')
      .catch((err) => console.log(err))
      .finally(muat);
  };

  const keterangan =
    hasil.belum_dibaca > 0 ? `${hasil.belum_dibaca} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca';

  return (
    <HalamanPro judul="Notifikasi" keterangan={keterangan}>
      <div className="nt-kartu">
        <div className="nt-alat">
          <div className="nt-kiri">
            <div className="segmen-pilihan" role="tablist">
              {STATUS.map((s) => (
                <button
                  key={s.nilai}
                  type="button"
                  role="tab"
                  aria-selected={status === s.nilai}
                  className={status === s.nilai ? 'aktif' : ''}
                  onClick={() => ubahFilter(setStatus, s.nilai)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <Input type="select" bsSize="sm" className="nt-modul" value={modul} onChange={(e) => ubahFilter(setModul, e.target.value)}>
              {MODUL.map(([nilai, label]) => (
                <option key={nilai} value={nilai}>
                  {label}
                </option>
              ))}
            </Input>
          </div>
          <button type="button" className="nt-baca-semua" disabled={hasil.belum_dibaca === 0} onClick={bacaSemua}>
            Tandai semua dibaca
          </button>
        </div>

        {loading ? (
          <div aria-busy="true">
            <div className="nt-skel" />
            <div className="nt-skel" />
            <div className="nt-skel" />
          </div>
        ) : null}

        {!loading && hasil.data.length === 0 ? (
          <div className="nt-kosong">
            <i className="bi bi-bell-slash" />
            Tidak ada notifikasi.
          </div>
        ) : null}

        {!loading &&
          hasil.data.map((n) => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => buka(n)}
              onKeyDown={(e) => e.key === 'Enter' && buka(n)}
              className={`nt-item${n.read_at ? '' : ' baru'}`}
            >
              {dariSistem(n) ? (
                <span className="nt-sistem" title="Sistem">
                  <i className="bi bi-gear-fill" />
                </span>
              ) : (
                <img className="nt-foto" src={fotoKaryawan(n.actor_id)} onError={onAvatarError} alt="" />
              )}
              <div className="nt-isi">
                <div className="nt-baris">
                  <div className="nt-judul">{n.judul}</div>
                  <time className="nt-waktu" dateTime={n.created_at} title={dayjs(n.created_at).format('DD/MM/YYYY HH:mm')}>
                    {waktuRelatif(n.created_at)}
                  </time>
                </div>
                {n.isi ? <p className="nt-pesan">{n.isi}</p> : null}
                <div className="nt-meta">
                  <span className="nt-tag">{String(n.modul).toUpperCase()}</span>
                  <span>{dariSistem(n) ? 'Sistem' : n.actor}</span>
                  {n.read_at ? null : <span style={{ color: 'var(--pro-aksen)', fontWeight: 600 }}>• Baru</span>}
                </div>
              </div>
            </div>
          ))}

        {hasil.halaman_terakhir > 1 ? (
          <div className="nt-halaman">
            <button type="button" disabled={halaman <= 1} onClick={() => setHalaman(halaman - 1)}>
              Sebelumnya
            </button>
            <span>
              Halaman {halaman} dari {hasil.halaman_terakhir} ({hasil.total} notifikasi)
            </span>
            <button type="button" disabled={halaman >= hasil.halaman_terakhir} onClick={() => setHalaman(halaman + 1)}>
              Berikutnya
            </button>
          </div>
        ) : null}
      </div>
    </HalamanPro>
  );
};

export default Notifications;
