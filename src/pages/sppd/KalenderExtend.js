import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import './KalenderExtend.css';

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const FMT = 'YYYY-MM-DD';
const LABEL_STATUS = { menunggu: 'Menunggu persetujuan', disetujui: 'Disetujui', lama: 'Extend lama' };

// Kalender pilih tanggal extend. Menandai hari SPPD, extend yang sudah diajukan, dan hari yang melewati batas maksimal.
// Klik pertama = tanggal mulai, klik kedua = tanggal hingga.
const KalenderExtend = ({ sppdMulai, sppdAkhir, batasAkhir, ekstend, mulaiMinimal, mulai, hingga, onPilih }) => {
  const acuan = sppdAkhir || sppdMulai || dayjs().format(FMT);
  const [bulan, setBulan] = useState(dayjs(acuan).startOf('month'));

  useEffect(() => {
    setBulan(dayjs(acuan).startOf('month'));
  }, [acuan]);

  // petakan tanggal -> extend yang menutupinya
  const peta = {};
  (ekstend || []).forEach((e) => {
    for (let d = dayjs(e.start); !d.isAfter(dayjs(e.end), 'day'); d = d.add(1, 'day')) {
      peta[d.format(FMT)] = e;
    }
  });

  const klik = (tgl) => {
    if (!mulai || (mulai && hingga) || dayjs(tgl).isBefore(dayjs(mulai), 'day')) {
      onPilih(tgl, '');
    } else {
      onPilih(mulai, tgl);
    }
  };

  const sel = [];
  const awalGrid = bulan.startOf('month');
  const geser = (awalGrid.day() + 6) % 7; // Senin = 0
  for (let i = 0; i < geser; i += 1) sel.push(null);
  for (let d = 0; d < bulan.daysInMonth(); d += 1) sel.push(awalGrid.add(d, 'day'));

  return (
    <div className="kx">
      <div className="kx-nav">
        <button type="button" className="kx-panah" onClick={() => setBulan(bulan.subtract(1, 'month'))} aria-label="Bulan sebelumnya">
          ‹
        </button>
        <strong>{bulan.locale('id').format('MMMM YYYY')}</strong>
        <button type="button" className="kx-panah" onClick={() => setBulan(bulan.add(1, 'month'))} aria-label="Bulan berikutnya">
          ›
        </button>
      </div>
      <div className="kx-grid">
        {HARI.map((h) => (
          <div key={h} className="kx-hari">
            {h}
          </div>
        ))}
        {sel.map((d, i) => {
          if (!d) return <div key={`kosong-${HARI[i % 7]}`} />;
          const t = d.format(FMT);
          const ex = peta[t];
          const dalamSppd = sppdMulai && sppdAkhir && !d.isBefore(dayjs(sppdMulai), 'day') && !d.isAfter(dayjs(sppdAkhir), 'day');
          const lewatBatas = batasAkhir && d.isAfter(dayjs(batasAkhir), 'day');
          const sebelumSppd = sppdMulai && d.isBefore(dayjs(sppdMulai), 'day');
          const sebelumMinimal = mulaiMinimal && d.isBefore(dayjs(mulaiMinimal), 'day');
          // hanya hari sesudah hari terakhir SPPD sampai batas maksimal yang bisa dipilih
          const mati = !!ex || lewatBatas || dalamSppd || sebelumSppd || sebelumMinimal;
          const terpilih = mulai && d.isSame(dayjs(mulai), 'day');
          const terpilihAkhir = hingga && d.isSame(dayjs(hingga), 'day');
          const dalamPilihan = mulai && hingga && !d.isBefore(dayjs(mulai), 'day') && !d.isAfter(dayjs(hingga), 'day');
          const kelas = ['kx-tgl'];
          if (dalamSppd) kelas.push('sppd');
          if (ex) kelas.push('ekstend', ex.status);
          if (lewatBatas) kelas.push('lewat');
          if (sebelumSppd) kelas.push('tutup');
          if (dalamPilihan) kelas.push('dalam');
          if (terpilih || terpilihAkhir) kelas.push('ujung');
          if (batasAkhir && t === batasAkhir) kelas.push('batas');
          const judul = ex
            ? `Extend ${ex.no_urut || ''} · ${ex.judul} · ${LABEL_STATUS[ex.status] || ex.status}`
            : dalamSppd
            ? 'Hari SPPD'
            : sebelumSppd
            ? 'Sebelum SPPD, tidak bisa dipilih'
            : lewatBatas
            ? 'Melewati batas maksimal extend'
            : t === batasAkhir
            ? 'Batas akhir extend'
            : '';

          return (
            <button key={t} type="button" className={kelas.join(' ')} disabled={mati} title={judul} onClick={() => klik(t)}>
              {d.date()}
              {ex ? <span className="kx-no">{ex.no_urut || 'L'}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="kx-legenda">
        <span>
          <i className="kx-kotak sppd" /> Hari SPPD
        </span>
        <span>
          <i className="kx-kotak menunggu" /> Extend menunggu
        </span>
        <span>
          <i className="kx-kotak disetujui" /> Extend disetujui
        </span>
        <span>
          <i className="kx-kotak dalam" /> Pilihan Anda
        </span>
        <span>
          <i className="kx-kotak lewat" /> Tutup (sebelum SPPD / lewat batas)
        </span>
      </div>
    </div>
  );
};

KalenderExtend.propTypes = {
  sppdMulai: PropTypes.string,
  sppdAkhir: PropTypes.string,
  batasAkhir: PropTypes.string,
  ekstend: PropTypes.array,
  mulaiMinimal: PropTypes.string,
  mulai: PropTypes.string,
  hingga: PropTypes.string,
  onPilih: PropTypes.func.isRequired,
};

export default KalenderExtend;
