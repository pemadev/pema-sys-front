import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Spinner } from 'reactstrap';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import relativeTime from 'dayjs/plugin/relativeTime';
import useAxios from '../../hooks/useAxios';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';

dayjs.extend(relativeTime);

const SEGARKAN_MS = 30 * 1000;
const PUSAT_AWAL = [-2.5, 118]; // Indonesia

const css = `
.lu{--lu-card:#fff;--lu-garis:rgba(15,23,42,.09);--lu-teks:#0f172a;--lu-redup:#64748b;--lu-lembut:#f1f5f9;--lu-hover:#f8fafc;--lu-pilih:#eff6ff;
  --lu-live:#16a34a;--lu-off:#94a3b8;--lu-biru:#2563eb;--lu-bayang:0 1px 2px rgba(15,23,42,.05),0 4px 14px rgba(15,23,42,.05);color:var(--lu-teks)}
.gelap .lu{--lu-card:#0f2236;--lu-garis:rgba(255,255,255,.09);--lu-teks:#e2e8f0;--lu-redup:#94a3b8;--lu-lembut:rgba(255,255,255,.06);--lu-hover:rgba(255,255,255,.04);--lu-pilih:rgba(37,99,235,.18);--lu-bayang:none}

.lu-stat{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.lu-kartu-stat{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--lu-card);border:1px solid var(--lu-garis);border-radius:14px;box-shadow:var(--lu-bayang)}
.lu-ikon{flex:none;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.15rem}
.lu-angka{font-size:1.5rem;font-weight:700;line-height:1.1}
.lu-label{font-size:.78rem;color:var(--lu-redup);margin-top:2px}

.lu-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}
.lu-cari{position:relative;flex:1 1 240px;max-width:380px}
.lu-cari i{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--lu-redup);pointer-events:none}
.lu-cari input{width:100%;height:38px;padding:0 12px 0 36px;border:1px solid var(--lu-garis);border-radius:10px;background:var(--lu-card);color:var(--lu-teks);font-size:.9rem;outline:none;transition:border-color .15s,box-shadow .15s}
.lu-cari input:focus{border-color:var(--lu-biru);box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.lu-segmen{display:inline-flex;padding:3px;background:var(--lu-lembut);border-radius:10px}
.lu-segmen button{border:0;background:transparent;color:var(--lu-redup);padding:5px 14px;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;transition:all .15s}
.lu-segmen button.aktif{background:var(--lu-card);color:var(--lu-teks);box-shadow:0 1px 3px rgba(15,23,42,.12)}
.lu-sisi{margin-left:auto;display:flex;align-items:center;gap:10px;font-size:.8rem;color:var(--lu-redup)}
.lu-segar{border:1px solid var(--lu-garis);background:var(--lu-card);color:var(--lu-teks);height:34px;width:34px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
.lu-segar:hover{background:var(--lu-hover)}
.lu-segar:disabled{opacity:.6;cursor:default}

.lu-wrap{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
.lu-panel{background:var(--lu-card);border:1px solid var(--lu-garis);border-radius:16px;box-shadow:var(--lu-bayang);overflow:hidden}
.lu-peta-box{position:relative}
.lu-peta{height:calc(100vh - 330px);min-height:420px;background:#e6edf3;font-family:inherit}
.gelap .lu-peta{background:#0b1626}
.lu-tiles{filter:saturate(.55) contrast(.92) brightness(1.05) sepia(.06)}
.gelap .lu-tiles{filter:invert(1) hue-rotate(180deg) saturate(.45) brightness(.82) contrast(.92)}
.lu .leaflet-bar{border:0;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,.2)}
.lu .leaflet-bar a{width:34px;height:34px;line-height:34px;border:0;color:#334155;background:rgba(255,255,255,.96);transition:background .15s}
.lu .leaflet-bar a:hover{background:#f1f5f9;color:#0f172a}
.lu .leaflet-bar a+a{border-top:1px solid rgba(15,23,42,.08)}
.lu .leaflet-control-attribution{background:rgba(255,255,255,.75);backdrop-filter:blur(4px);border-radius:8px 0 0 0;font-size:.65rem;color:#64748b;padding:2px 8px}
.lu .leaflet-control-attribution a{color:#475569}
.lu .leaflet-tooltip{border:0;border-radius:8px;padding:4px 10px;font-weight:600;font-size:.76rem;color:#0f172a;box-shadow:0 3px 12px rgba(15,23,42,.22)}
.lu .leaflet-tooltip-top:before{border-top-color:#fff}
.lu .leaflet-popup-content-wrapper{border-radius:14px;box-shadow:0 8px 28px rgba(15,23,42,.25);padding:2px}
.lu .leaflet-popup-content{margin:12px 14px;line-height:1.45;font-size:.82rem}
.lu .leaflet-popup-tip{box-shadow:none}
.lu-atas-peta{position:absolute;right:12px;top:12px;z-index:500;display:flex;gap:8px}
.lu-tombol-peta{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border:0;border-radius:10px;background:rgba(255,255,255,.96);color:#334155;font-size:.78rem;font-weight:600;box-shadow:0 2px 10px rgba(15,23,42,.2);cursor:pointer;transition:background .15s}
.lu-tombol-peta:hover{background:#f1f5f9}
.lu-vinyet{pointer-events:none;position:absolute;inset:0;z-index:400;box-shadow:inset 0 0 40px rgba(15,23,42,.08)}
.lu-legenda{position:absolute;left:12px;bottom:12px;z-index:500;display:flex;flex-direction:column;gap:5px;padding:9px 12px;background:rgba(255,255,255,.94);backdrop-filter:blur(6px);border-radius:10px;box-shadow:0 2px 10px rgba(15,23,42,.18);font-size:.76rem;color:#334155}
.lu-legenda span{display:flex;align-items:center;gap:7px;white-space:nowrap}
.lu-detail{padding:14px 16px;border-top:1px solid var(--lu-garis);background:var(--lu-hover)}
.lu-detail-kepala{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.lu-detail-kepala img{width:38px;height:38px;border-radius:50%;object-fit:cover}
.lu-detail-kepala strong{display:block;font-size:.95rem;line-height:1.2}
.lu-detail-kepala small{color:var(--lu-redup)}
.lu-detail-tutup{margin-left:auto;border:0;background:transparent;color:var(--lu-redup);font-size:1.2rem;line-height:1;cursor:pointer;padding:4px 6px;border-radius:8px}
.lu-detail-tutup:hover{background:var(--lu-lembut)}
.lu-rinci-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 18px}
.lu-rinci{display:flex;gap:10px;align-items:flex-start}
.lu-rinci-ikon{flex:none;width:30px;height:30px;border-radius:9px;background:var(--lu-lembut);color:var(--lu-redup);display:flex;align-items:center;justify-content:center;font-size:.9rem}
.lu-rinci-judul{font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--lu-redup);font-weight:600}
.lu-rinci-isi{font-size:.84rem;font-weight:600;word-break:break-word}
.lu-rinci-isi small{display:block;font-weight:400;color:var(--lu-redup);font-size:.74rem}
@media (max-width:767.98px){.lu-rinci-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:420px){.lu-rinci-grid{grid-template-columns:1fr}}
.lu-kaki{padding:7px 14px;font-size:.72rem;color:var(--lu-redup);border-top:1px solid var(--lu-garis)}
.lu-kaki a{color:inherit;text-decoration:underline}

.lu-daftar-kepala{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--lu-garis);font-weight:700;font-size:.92rem}
.lu-daftar-kepala small{font-weight:500;color:var(--lu-redup)}
.lu-daftar{max-height:calc(100vh - 330px);min-height:420px;overflow-y:auto}
.lu-item{display:flex;align-items:center;gap:12px;width:100%;padding:11px 16px;border:0;border-bottom:1px solid var(--lu-garis);background:transparent;text-align:left;color:inherit;cursor:pointer;transition:background .12s}
.lu-item:last-child{border-bottom:0}
.lu-item:hover{background:var(--lu-hover)}
.lu-item.pilih{background:var(--lu-pilih)}
.lu-item.tanpa{opacity:.65}
.lu-foto{position:relative;flex:none;width:42px;height:42px}
.lu-foto img{width:42px;height:42px;border-radius:50%;object-fit:cover;background:var(--lu-lembut)}
.lu-foto .status{position:absolute;right:-1px;bottom:-1px;width:12px;height:12px;border-radius:50%;border:2px solid var(--lu-card);background:var(--lu-off)}
.lu-foto .status.live{background:var(--lu-live)}
.lu-info{min-width:0;flex:1}
.lu-nama{font-weight:600;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lu-sub{font-size:.76rem;color:var(--lu-redup);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lu-baris{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:4px}
.lu-pil{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:600;background:var(--lu-lembut);color:var(--lu-redup)}
.lu-pil.live{background:rgba(22,163,74,.12);color:var(--lu-live)}
.lu-pil.biru{background:rgba(37,99,235,.12);color:var(--lu-biru)}
.lu-kosong{padding:48px 20px;text-align:center;color:var(--lu-redup);font-size:.9rem}
.lu-kosong i{display:block;font-size:2rem;margin-bottom:8px;opacity:.6}

.lu-skel{background:linear-gradient(90deg,var(--lu-lembut) 25%,var(--lu-hover) 50%,var(--lu-lembut) 75%);background-size:200% 100%;animation:lu-kilau 1.3s infinite;border-radius:14px}
@keyframes lu-kilau{to{background-position:-200% 0}}

.lu-kantor .kotak{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:#0f172a;color:#fff;font-size:1rem;border:2px solid #fff;box-shadow:0 3px 10px rgba(15,23,42,.4)}
.lu-pin{position:relative}
.lu-pin .titik{position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:var(--pin,#94a3b8);border:3px solid #fff;box-shadow:0 1px 5px rgba(15,23,42,.45)}
.lu-pin.browser .titik{border-color:#2563eb;background:var(--pin)}
.lu-pin.live .titik::after{content:'';position:absolute;inset:-9px;border-radius:50%;border:2px solid #16a34a;opacity:0;animation:lu-gelombang 2s ease-out infinite}
@keyframes lu-gelombang{0%{transform:scale(.5);opacity:.8}100%{transform:scale(1.5);opacity:0}}
.lu .leaflet-popup-content-wrapper{border-radius:12px}
.lu-pop strong{font-size:.92rem}
.lu-pop small{color:#64748b}

@media (max-width:1199.98px){.lu-wrap{grid-template-columns:minmax(0,1fr) 300px}}
@media (max-width:991.98px){
  .lu-stat{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lu-wrap{grid-template-columns:1fr}
  .lu-peta{height:52vh;min-height:320px}
  .lu-daftar{max-height:46vh;min-height:0}
  .lu-sisi{margin-left:0;width:100%;justify-content:space-between}
  .lu-cari{max-width:none}
}
@media (max-width:575.98px){
  .lu-kartu-stat{padding:11px 12px;gap:10px}
  .lu-ikon{width:34px;height:34px;font-size:1rem}
  .lu-angka{font-size:1.25rem}
  .lu-legenda{font-size:.7rem;padding:7px 9px}
}
`;

const waktu = (v) => (v ? dayjs(v).locale('id').fromNow() : '-');
const jarak = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
const lokasiTeks = (u) => {
  if (u.sumber === 'browser') return `Lokasi browser${u.akurasi ? ` (±${jarak(u.akurasi)})` : ''}`;
  if (u.sumber === 'kantor') return 'Di kantor (IP kantor)';
  if (u.sumber === 'jaringan') return `Sekitar lokasi jaringan${u.akurasi ? ` (±${jarak(u.akurasi)})` : ''}`;
  return [u.kota, u.negara].filter(Boolean).join(', ') || 'Lokasi tidak diketahui';
};

const JENIS_JARINGAN = { seluler: 'Seluler', isp: 'Kabel / ISP', cloud: 'Cloud / VPN' };
const jaringanTeks = (u) => {
  if (!u.jaringan) return null;
  const jenis = JENIS_JARINGAN[u.jaringan.jenis];

  return `${u.jaringan.org}${jenis ? ` · ${jenis}` : ''}`;
};
const SUMBER_LOKASI = { browser: 'Lokasi browser pengguna (GPS)', jaringan: 'Lokasi browser rekan di jaringan yang sama', kantor: 'IP kantor', ip: 'Perkiraan dari IP' };

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const popup = (u) =>
  `<div class="lu-pop"><strong>${esc(u.nama)}</strong>${u.jabatan ? `<br/><small>${esc(u.jabatan)}</small>` : ''}<br/>` +
  `${u.live ? '<span style="color:#16a34a;font-weight:600">● Live</span>' : `<span style="color:#64748b">Terakhir aktif ${esc(waktu(u.terakhir_aktif))}</span>`}<br/>` +
  `<small>${esc(lokasiTeks(u))}<br/>${esc({ browser: 'Dari browser pengguna', jaringan: 'Dari lokasi browser rekan di jaringan yang sama', kantor: 'Mengakses dari IP kantor' }[u.sumber] || 'Perkiraan dari IP')}<br/>${esc(u.perangkat || '')}<br/>IP ${esc(u.ip || '-')}${jaringanTeks(u) ? `<br/>${esc(jaringanTeks(u))}` : ''}</small></div>`;

const ikonPin = (u) =>
  L.divIcon({
    className: `lu-pin ${u.live ? 'live' : ''} ${u.sumber === 'browser' ? 'browser' : ''}`,
    html: `<span class="titik" style="--pin:${u.live ? '#16a34a' : '#94a3b8'}"></span>`,
    iconSize: [0, 0],
  });

const ikonKantor = L.divIcon({
  className: 'lu-kantor',
  html: '<span class="kotak"><i class="bi bi-building"></i></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const KartuStat = ({ ikon, warna, angka, label }) => (
  <div className="lu-kartu-stat">
    <span className="lu-ikon" style={{ background: `${warna}1f`, color: warna }}>
      <i className={`bi ${ikon}`} />
    </span>
    <div>
      <div className="lu-angka">{angka}</div>
      <div className="lu-label">{label}</div>
    </div>
  </div>
);

const Rincian = ({ ikon, judul, children }) => (
  <div className="lu-rinci">
    <span className="lu-rinci-ikon">
      <i className={`bi ${ikon}`} />
    </span>
    <div className="min-w-0">
      <div className="lu-rinci-judul">{judul}</div>
      <div className="lu-rinci-isi">{children}</div>
    </div>
  </div>
);

Rincian.propTypes = {
  ikon: PropTypes.string.isRequired,
  judul: PropTypes.string.isRequired,
  children: PropTypes.node,
};
Rincian.defaultProps = { children: null };

KartuStat.propTypes = {
  ikon: PropTypes.string.isRequired,
  warna: PropTypes.string.isRequired,
  angka: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
};

// Setting > Lokasi User: pengguna live dan lokasi terakhir pengguna lain di peta (lokasi browser bila diizinkan, selain itu perkiraan dari IP)
const LokasiUser = () => {
  const api = useAxios();
  const [hasil, setHasil] = useState(null);
  const [galat, setGalat] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [cari, setCari] = useState('');
  const [hanyaLive, setHanyaLive] = useState(false);
  const [dipilih, setDipilih] = useState(null);
  const peta = useRef(null);
  const lapis = useRef(null);
  const penanda = useRef({});
  const elPeta = useRef(null);
  const sudahFit = useRef(false);
  const siapTampil = hasil !== null;

  const muat = useCallback(() => {
    setMemuat(true);
    api
      .get('api/pengaturan/lokasi-user')
      .then((res) => {
        setHasil(res.data);
        setGalat(null);
      })
      .catch((err) => setGalat(err?.response?.data?.message || 'Gagal memuat lokasi user.'))
      .finally(() => setMemuat(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muat();
    const t = setInterval(muat, SEGARKAN_MS);
    return () => clearInterval(t);
  }, [muat]);

  // peta dibuat sekali, setelah elemennya tampil (data pertama sudah datang)
  useEffect(() => {
    if (!siapTampil || !elPeta.current || peta.current) return undefined;
    const map = L.map(elPeta.current, { center: PUSAT_AWAL, zoom: 5, worldCopyJump: true, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, className: 'lu-tiles', attribution: '&copy; OpenStreetMap' }).addTo(map);
    lapis.current = L.layerGroup().addTo(map);
    peta.current = map;
    return () => {
      map.remove();
      peta.current = null;
      lapis.current = null;
      penanda.current = {};
      sudahFit.current = false;
    };
  }, [siapTampil]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();

    return (hasil?.data || []).filter((u) => (!hanyaLive || u.live) && (!q || `${u.nama} ${u.jabatan || ''} ${u.kota || ''}`.toLowerCase().includes(q)));
  }, [hasil, cari, hanyaLive]);

  // yang live digambar paling atas
  useEffect(() => {
    const map = peta.current;
    if (!map || !lapis.current) return;
    lapis.current.clearLayers();
    penanda.current = {};
    const titik = [];
    const kantor = hasil?.kantor;
    if (kantor) {
      L.marker([kantor.lat, kantor.lng], { icon: ikonKantor, zIndexOffset: 500, keyboard: false })
        .bindTooltip(esc(kantor.nama), { direction: 'top', offset: [0, -14] })
        .addTo(lapis.current);
    }
    [...tampil]
      .sort((a, b) => Number(a.live) - Number(b.live))
      .forEach((u) => {
        if (u.lat === null || u.lng === null) return;
        if ((u.sumber === 'browser' || u.sumber === 'jaringan') && u.akurasi) {
          L.circle([u.lat, u.lng], { radius: Math.min(u.akurasi, 5000), stroke: false, fillColor: '#2563eb', fillOpacity: u.sumber === 'browser' ? 0.1 : 0.06, interactive: false }).addTo(lapis.current);
        }
        const m = L.marker([u.lat, u.lng], { icon: ikonPin(u), zIndexOffset: u.live ? 1000 : 0 })
          .bindPopup(popup(u))
          .bindTooltip(esc(u.nama), { direction: 'top', offset: [0, -10] })
          .on('click', () => setDipilih(u.user_id));
        m.addTo(lapis.current);
        penanda.current[u.user_id] = m;
        titik.push([u.lat, u.lng]);
      });
    if (!sudahFit.current && titik.length > 0) {
      map.fitBounds(titik, { padding: [50, 50], maxZoom: 11 });
      sudahFit.current = true;
    }
  }, [tampil, siapTampil, hasil?.kantor]);

  // arahkan peta agar semua titik yang sedang ditampilkan terlihat
  const terpilih = useMemo(() => (hasil?.data || []).find((u) => u.user_id === dipilih) || null, [hasil, dipilih]);

  const tampilkanSemua = () => {
    const titik = tampil.filter((u) => u.lat !== null && u.lng !== null).map((u) => [u.lat, u.lng]);
    if (peta.current && titik.length > 0) peta.current.fitBounds(titik, { padding: [50, 50], maxZoom: 11, animate: true });
  };

  const fokus = (u) => {
    setDipilih(u.user_id);
    if (u.lat === null || !peta.current) return;
    peta.current.setView([u.lat, u.lng], Math.max(peta.current.getZoom(), 10), { animate: true });
    const m = penanda.current[u.user_id];
    if (m) m.openPopup();
    if (window.innerWidth < 992 && elPeta.current) elPeta.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (galat && !hasil) return <Alert color="danger">{galat}</Alert>;
  if (!hasil) {
    return (
      <div className="lu">
        <style>{css}</style>
        <div className="lu-stat">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="lu-skel" style={{ height: 70 }} />
          ))}
        </div>
        <div className="lu-skel" style={{ height: 420 }} />
        <div className="text-center text-muted small mt-3">
          <Spinner size="sm" /> Memuat . . .
        </div>
      </div>
    );
  }

  const semua = hasil.data;
  const jumlahLive = semua.filter((u) => u.live).length;
  const dariBrowser = semua.filter((u) => u.sumber === 'browser').length;
  const tanpaLokasi = semua.filter((u) => u.lat === null).length;

  return (
    <div className="lu">
      <style>{css}</style>
      {!hasil.geoip_siap && (
        <Alert color="warning">
          Database lokasi IP belum dipasang di server, jadi pengguna yang belum mengizinkan lokasi browser belum bisa ditempatkan di peta. Pasang paket <code>geoip2/geoip2</code> dan file <code>.mmdb</code>{' '}
          (mis. DB-IP City Lite) di <code>storage/app/geoip/</code>, lalu isi <code>GEOIP_DB</code> di .env.
        </Alert>
      )}
      {galat && <Alert color="danger">{galat}</Alert>}

      <div className="lu-stat">
        <KartuStat ikon="bi-broadcast" warna="#16a34a" angka={jumlahLive} label={`Live (aktif ≤ ${hasil.batas_live_menit} menit)`} />
        <KartuStat ikon="bi-clock-history" warna="#64748b" angka={semua.length - jumlahLive} label="Lokasi terakhir" />
        <KartuStat ikon="bi-geo-alt-fill" warna="#2563eb" angka={dariBrowser} label="Lokasi dari browser" />
        <KartuStat ikon="bi-question-circle" warna="#d97706" angka={tanpaLokasi} label="Tanpa lokasi" />
      </div>

      <div className="lu-bar">
        <div className="lu-cari">
          <i className="bi bi-search" />
          <input type="search" placeholder="Cari nama, jabatan, atau kota" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari pengguna" />
        </div>
        <div className="lu-segmen" role="tablist">
          <button type="button" role="tab" aria-selected={!hanyaLive} className={!hanyaLive ? 'aktif' : ''} onClick={() => setHanyaLive(false)}>
            Semua
          </button>
          <button type="button" role="tab" aria-selected={hanyaLive} className={hanyaLive ? 'aktif' : ''} onClick={() => setHanyaLive(true)}>
            Live
          </button>
        </div>
        <div className="lu-sisi">
          <span>Diperbarui {dayjs(hasil.diperbarui).format('HH:mm:ss')} · otomatis 30 dtk</span>
          <button type="button" className="lu-segar" onClick={muat} disabled={memuat} title="Segarkan sekarang" aria-label="Segarkan">
            {memuat ? <Spinner size="sm" /> : <i className="bi bi-arrow-clockwise" />}
          </button>
        </div>
      </div>

      <div className="lu-wrap">
        <div className="lu-panel">
          <div className="lu-peta-box">
            <div className="lu-peta" ref={elPeta} />
            <div className="lu-vinyet" />
            <div className="lu-atas-peta">
              <button type="button" className="lu-tombol-peta" onClick={tampilkanSemua}>
                <i className="bi bi-arrows-fullscreen" /> Tampilkan semua
              </button>
            </div>
            <div className="lu-legenda">
              <span>
                <i className="bi bi-circle-fill" style={{ color: '#16a34a', fontSize: 10 }} /> Live
              </span>
              <span>
                <i className="bi bi-circle-fill" style={{ color: '#94a3b8', fontSize: 10 }} /> Lokasi terakhir
              </span>
              <span>
                <i className="bi bi-circle" style={{ color: '#2563eb', fontSize: 10 }} /> Tepi biru: lokasi browser
              </span>
              <span>
                <i className="bi bi-building" style={{ color: '#0f172a', fontSize: 11 }} /> Kantor
              </span>
            </div>
          </div>
          {terpilih && (
            <div className="lu-detail">
              <div className="lu-detail-kepala">
                <img src={fotoKaryawan(terpilih.employe_id)} onError={onAvatarError} alt="" />
                <div>
                  <strong>{terpilih.nama}</strong>
                  <small>{terpilih.jabatan || '-'}</small>
                </div>
                <button type="button" className="lu-detail-tutup" onClick={() => setDipilih(null)} aria-label="Tutup rincian">
                  &times;
                </button>
              </div>
              <div className="lu-rinci-grid">
                <Rincian ikon="bi-pc-display" judul="Perangkat">
                  {terpilih.sistem_operasi || '-'}
                </Rincian>
                <Rincian ikon="bi-browser-chrome" judul="Browser">
                  {terpilih.browser || '-'}
                </Rincian>
                <Rincian ikon="bi-hdd-network" judul="IP">
                  {terpilih.ip || '-'}
                </Rincian>
                <Rincian ikon="bi-wifi" judul="Jaringan">
                  {terpilih.jaringan ? (
                    <>
                      {terpilih.jaringan.org}
                      <small>
                        {JENIS_JARINGAN[terpilih.jaringan.jenis] || ''} · AS{terpilih.jaringan.asn}
                        {terpilih.sumber === 'kantor' ? ' · jaringan kantor' : ''}
                      </small>
                    </>
                  ) : (
                    <>
                      {terpilih.sumber === 'kantor' ? 'Jaringan kantor' : '-'}
                      {hasil.asn_siap === false && <small>Database jaringan belum dipasang</small>}
                    </>
                  )}
                </Rincian>
                <Rincian ikon="bi-geo-alt" judul="Lokasi">
                  {terpilih.lat === null ? 'Tidak diketahui' : lokasiTeks(terpilih)}
                  {terpilih.sumber && <small>{SUMBER_LOKASI[terpilih.sumber]}</small>}
                </Rincian>
                <Rincian ikon="bi-clock-history" judul="Aktivitas terakhir">
                  {terpilih.live ? 'Sedang aktif' : waktu(terpilih.terakhir_aktif)}
                  {terpilih.terakhir_aktif && <small>{dayjs(terpilih.terakhir_aktif).format('DD MMM YYYY, HH:mm')}</small>}
                </Rincian>
              </div>
            </div>
          )}
          <div className="lu-kaki">
            Lokasi browser untuk pengguna yang sudah mengizinkan. Yang belum, ditempatkan di sekitar lokasi browser rekan pada IP yang sama; bila tidak ada, perkiraan dari IP (akurat sampai kota).{' '}
            <a href="https://db-ip.com" target="_blank" rel="noreferrer">
              IP geolocation by DB-IP
            </a>
          </div>
        </div>

        <div className="lu-panel">
          <div className="lu-daftar-kepala">
            <span>Pengguna</span>
            <small>{tampil.length} ditampilkan</small>
          </div>
          <div className="lu-daftar">
            {tampil.length === 0 && (
              <div className="lu-kosong">
                <i className="bi bi-people" />
                Tidak ada pengguna yang cocok.
              </div>
            )}
            {tampil.map((u) => (
              <button key={u.user_id} type="button" className={`lu-item${dipilih === u.user_id ? ' pilih' : ''}${u.lat === null ? ' tanpa' : ''}`} onClick={() => fokus(u)} title={u.lat === null ? 'Lokasi tidak diketahui' : 'Lihat di peta'}>
                <span className="lu-foto">
                  <img src={fotoKaryawan(u.employe_id)} onError={onAvatarError} alt="" loading="lazy" />
                  <span className={`status${u.live ? ' live' : ''}`} />
                </span>
                <span className="lu-info">
                  <div className="lu-nama">{u.nama}</div>
                  {u.jabatan && <div className="lu-sub">{u.jabatan}</div>}
                  <div className="lu-baris">
                    {u.live ? <span className="lu-pil live">Live</span> : <span className="lu-pil">Aktif {waktu(u.terakhir_aktif)}</span>}
                    {u.sumber === 'browser' && <span className="lu-pil biru">Browser</span>}
                    {u.sumber === 'jaringan' && <span className="lu-pil biru">Jaringan</span>}
                    {u.sumber === 'kantor' && <span className="lu-pil biru">Kantor</span>}
                    {u.sumber === 'ip' && <span className="lu-pil">IP</span>}
                  </div>
                  <div className="lu-sub mt-1">
                    <i className="bi bi-geo-alt" /> {lokasiTeks(u)}
                  </div>
                  <div className="lu-sub">
                    <i className="bi bi-hdd-network" /> {u.ip || '-'}
                    {jaringanTeks(u) ? ` · ${jaringanTeks(u)}` : ''}
                  </div>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LokasiUser;
