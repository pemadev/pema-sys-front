import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import useAxios from '../../hooks/useAxios';
import { DEFAULT_AVATAR, onAvatarError } from '../../utils/defaultAvatar';

const HCIS_URL = process.env.REACT_APP_HCIS_BE;

// kecepatan gulir (px/detik), jeda di atas/bawah, dan lama tayang bila daftar muat satu layar
const SCROLL_SPEED = 30;
const HOLD_MS = 4000;
const DWELL_MS = 12000;
const CHART_MS = 30000;

const C = {
  text: '#f1f5f9',
  muted: '#94a3b8',
  faint: '#64748b',
  hadir: '#34d399',
  late: '#fbbf24',
  approved: '#22c55e',
  pending: '#facc15',
  none: '#f87171',
  kemarin: '#fb923c',
  ket: '#60a5fa',
  rapat: '#c084fc',
};

const STATUS = {
  approved: { color: C.approved, label: 'Cuti disetujui' },
  pending: { color: C.pending, label: 'Menunggu persetujuan' },
  none: { color: C.none, label: 'Tanpa keterangan' },
};
const KEMARIN = { color: C.kemarin, label: 'Belum clock out' };

const ROOM_COLORS = { growth: '#38bdf8', harmoni: '#c084fc', kopiah: '#f59e0b', internasional: '#2dd4bf' };
const roomColor = (name) => ROOM_COLORS[String(name || '').toLowerCase()] || '#94a3b8';

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
};
const hhmm = (d) => (d ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') : '--:--');

// semua rapat hari ini (selesai, sedang berlangsung, akan datang), urut jam mulai
const meetingsToday = (list, ref) => {
  const dayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  return (list || [])
    .map((m) => ({ ...m, startAt: parseDate(m.start_time), endAt: parseDate(m.end_time) }))
    .filter((m) => m.startAt && m.startAt < dayEnd && (m.endAt || m.startAt) >= dayStart)
    .sort((a, b) => a.startAt - b.startAt);
};
const meetingStatus = (m, ref) => {
  if (m.endAt && m.endAt < ref) return 'selesai';
  if (m.startAt <= ref) return 'berlangsung';
  return 'akan';
};

const longDate = (ymd) => {
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? ymd : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const photoUrl = (id) => `${HCIS_URL}employee/file?f=photo-profil&id=${id}`;

// Miniatur foto: foto asli dari HR berukuran besar (sekitar 600 KB), padahal yang tampil hanya lingkaran kecil, dan itulah yang membuat TV berat.
// Foto diunduh sekali, dikecilkan menjadi 160 px (sekitar 6-10 KB), lalu disimpan di localStorage per karyawan. Kunjungan berikutnya langsung
// memakai miniatur dari localStorage tanpa mengunduh foto asli; miniatur diperbarui di latar belakang bila sudah lebih dari 24 jam.
const THUMB_KEY = 'abs-foto:';
const THUMB_TTL = 24 * 3600 * 1000;
const THUMB_SIZE = 160;
const THUMB_FAIL = 'fail'; // miniatur tidak bisa dibuat (mis. CORS): pakai foto asli
const thumbMem = new Map(); // id -> dataURL | '' (tidak punya foto) | THUMB_FAIL
const thumbChecked = new Set();
const thumbQueue = [];
const thumbListeners = new Set();
let thumbBusy = false;

const emitThumbs = () => thumbListeners.forEach((fn) => fn());
const subscribeThumbs = (fn) => {
  thumbListeners.add(fn);
  return () => thumbListeners.delete(fn);
};
const lsGet = (k) => {
  try {
    return window.localStorage.getItem(k);
  } catch (e) {
    return null;
  }
};
const lsSet = (k, v) => {
  try {
    window.localStorage.setItem(k, v);
    return true;
  } catch (e) {
    return false;
  }
};
const saveThumb = (id, data) => {
  const val = `${Date.now()}|${data}`;
  if (lsSet(THUMB_KEY + id, val)) return;
  // penyimpanan penuh: buang beberapa miniatur terlama lalu coba sekali lagi
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.indexOf(THUMB_KEY) === 0) keys.push(k);
    }
    keys.sort((x, y) => parseInt(lsGet(x), 10) - parseInt(lsGet(y), 10));
    keys.slice(0, 10).forEach((k) => window.localStorage.removeItem(k));
    lsSet(THUMB_KEY + id, val);
  } catch (e) {
    // abaikan: miniatur tetap ada di memori untuk sesi ini
  }
};

const makeThumb = (id) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const side = Math.min(w, h);
      const canvas = document.createElement('canvas');
      canvas.width = THUMB_SIZE;
      canvas.height = THUMB_SIZE;
      // potong persegi di tengah, condong ke atas supaya wajah tidak terpotong
      canvas.getContext('2d').drawImage(img, (w - side) / 2, (h - side) * 0.2, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    } catch (e) {
      resolve(THUMB_FAIL);
    }
  };
  img.onerror = () => {
    // gagal dengan mode CORS: bedakan "tidak ada foto" dari "foto ada tetapi tidak boleh dibaca kanvas"
    const probe = new Image();
    probe.onload = () => resolve(THUMB_FAIL);
    probe.onerror = () => resolve('');
    probe.src = photoUrl(id);
  };
  img.src = photoUrl(id);
});

// satu foto sekali jalan dengan jeda, supaya decode foto besar tidak mengganggu gulir
const pumpThumbs = () => {
  if (thumbBusy) return;
  const id = thumbQueue.shift();
  if (id === undefined) return;
  thumbBusy = true;
  makeThumb(id).then((res) => {
    const prev = thumbMem.get(id);
    const prevOk = prev && prev !== THUMB_FAIL;
    if (!((res === '' || res === THUMB_FAIL) && prevOk)) {
      thumbMem.set(id, res);
      if (res !== THUMB_FAIL) saveThumb(id, res);
    }
    emitThumbs();
    thumbBusy = false;
    setTimeout(pumpThumbs, 150);
  });
};

const ensureThumbs = (ids) => {
  ids.forEach((id) => {
    if (thumbChecked.has(id)) return;
    thumbChecked.add(id);
    const raw = lsGet(THUMB_KEY + id);
    if (raw) {
      const i = raw.indexOf('|');
      thumbMem.set(id, raw.slice(i + 1));
      if (Date.now() - parseInt(raw.slice(0, i), 10) < THUMB_TTL) return;
    }
    thumbQueue.push(id);
  });
  emitThumbs();
  pumpThumbs();
};

const rgba = (hex, a) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// seluruh ukuran memakai em; 1em ~ 1% lebar layar (atau 1.78% tinggi), sehingga rapi di TV 1080p/4K maupun monitor biasa
const CSS = `
@keyframes absFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes absPulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
.abs-root, .abs-root * { box-sizing: border-box; }
/* ukuran dasar: rantai cadangan untuk WebView lama (TV Android) yang belum mengenal min()/clamp() */
.abs-root { font-size: 1vw; font-size: min(1vw, 1.78vh); font-size: clamp(10px, min(1vw, 1.78vh), 42px); }
.abs-fade { animation: absFade .7s ease backwards; }
.abs-live { animation: absPulse 2s ease-in-out infinite; }
`;

const styles = {
  page: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.6em 2.2em 1.2em',
    overflow: 'hidden',
    color: C.text,
    background:
      'radial-gradient(60em 30em at 8% -10%, rgba(59,130,246,.22), transparent 60%), radial-gradient(50em 28em at 100% 110%, rgba(16,185,129,.14), transparent 60%), linear-gradient(160deg, #070b16 0%, #0c1426 55%, #0a1a2b 100%)',
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1em', marginBottom: '1.1em' },
  brand: { fontSize: '.9em', letterSpacing: '.35em', color: C.hadir, fontWeight: 700, textTransform: 'uppercase' },
  title: { fontSize: '2.6em', fontWeight: 800, margin: '.1em 0 0', letterSpacing: '-.02em', lineHeight: 1.05 },
  date: { fontSize: '1.25em', color: C.muted, marginTop: '.3em' },
  clockBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5em' },
  updated: { fontSize: '.95em', color: C.faint, textAlign: 'center', whiteSpace: 'nowrap' },
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1em', marginBottom: '.7em' },
  phaseTitle: (color) => ({ fontSize: '1.9em', fontWeight: 700, margin: 0, letterSpacing: '-.01em', lineHeight: 1.1, paddingLeft: '.6em', borderLeft: `.2em solid ${color}` }),
  legend: { display: 'flex', gap: '1.3em', fontSize: '1em', color: C.muted },
  dot: (color) => ({ display: 'inline-block', width: '.8em', height: '.8em', borderRadius: '50%', background: color, marginRight: '.5em' }),
  progress: { height: '.22em', background: 'rgba(255,255,255,.07)', borderRadius: '999px', overflow: 'hidden', marginBottom: '.9em' },
  progressFill: (color) => ({ height: '100%', width: '100%', background: color, borderRadius: '999px', transformOrigin: 'left center', transform: 'scaleX(0)', willChange: 'transform' }),
  scroller: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '1.4em', background: 'linear-gradient(to bottom, rgba(9,15,29,.96), rgba(9,15,29,0))', pointerEvents: 'none', zIndex: 2 },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '2em', background: 'linear-gradient(to top, rgba(9,15,29,.96), rgba(9,15,29,0))', pointerEvents: 'none', zIndex: 2 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(25em, 1fr))', gap: '1em', padding: '.4em 0 2em', willChange: 'transform', backfaceVisibility: 'hidden', transform: 'translate3d(0,0,0)' },
  card: (color) => ({
    height: '7.6em',
    display: 'flex',
    alignItems: 'center',
    gap: '1em',
    padding: '.9em 1.2em .9em 1em',
    borderRadius: '1em',
    position: 'relative',
    background: `linear-gradient(135deg, ${rgba(color, 0.16)} 0%, rgba(255,255,255,.04) 70%)`,
    border: `1px solid ${rgba(color, 0.35)}`,
    boxShadow: `inset .32em 0 0 ${color}`,
    contain: 'layout style paint',
  }),
  photoWrap: (color) => ({
    width: '5.4em',
    height: '5.4em',
    flexShrink: 0,
    borderRadius: '50%',
    padding: '.18em',
    background: color,
    marginLeft: '.3em',
  }),
  photo: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#1e293b', display: 'block' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: '1.4em', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' },
  sub: { fontSize: '1em', color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '.1em' },
  sub2: { fontSize: '.85em', color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  time: (color) => ({ fontSize: '2.5em', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.02em' }),
  timeNote: (color) => ({ fontSize: '.85em', fontWeight: 700, color, marginTop: '.3em', textAlign: 'right' }),
  rank: { position: 'absolute', top: '.5em', right: '.9em', fontSize: '.8em', color: C.faint, fontWeight: 600 },
  badge: (color) => ({
    display: 'inline-block',
    marginTop: '.35em',
    fontSize: '1em',
    fontWeight: 700,
    color,
    background: rgba(color, 0.14),
    border: `1px solid ${rgba(color, 0.5)}`,
    borderRadius: '999px',
    padding: '.12em .9em',
    maxWidth: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    verticalAlign: 'top',
  }),
  message: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', fontSize: '2.4em', fontWeight: 600, color: C.muted, padding: '1em' },
  error: { color: C.none, fontWeight: 600 },
};

const PhotoBase = ({ id, color }) => {
  const thumb = useSyncExternalStore(subscribeThumbs, () => thumbMem.get(id), () => undefined);
  // miniatur siap -> pakai; belum siap atau tidak punya foto -> siluet; miniatur tidak bisa dibuat -> foto asli
  let src = DEFAULT_AVATAR;
  if (thumb === THUMB_FAIL) src = photoUrl(id);
  else if (thumb) src = thumb;
  return (
    <div style={styles.photoWrap(color)}>
      <img style={styles.photo} src={src} alt="" onError={onAvatarError} decoding="async" />
    </div>
  );
};
PhotoBase.propTypes = { id: PropTypes.string.isRequired, color: PropTypes.string.isRequired };
const Photo = React.memo(PhotoBase);

const personShape = PropTypes.shape({
  employe_id: PropTypes.string,
  nama: PropTypes.string,
  jabatan: PropTypes.string,
  divisi: PropTypes.string,
  clock_in: PropTypes.string,
  terlambat: PropTypes.bool,
  status: PropTypes.string,
  jenis: PropTypes.string,
  dari_pengajuan: PropTypes.bool,
  pengajuan: PropTypes.shape({ status: PropTypes.string, alasan: PropTypes.string, jam: PropTypes.string }),
});

// pengajuan terlambat: disetujui (hijau), menunggu (kuning), ditolak (merah)
const PENGAJUAN = {
  approved: { color: C.approved, label: 'Pengajuan disetujui' },
  pending: { color: C.pending, label: 'Pengajuan menunggu' },
  rejected: { color: C.none, label: 'Pengajuan ditolak' },
};

const HadirCardBase = ({ p, rank }) => {
  const color = p.terlambat ? C.late : C.hadir;
  const pg = p.pengajuan ? PENGAJUAN[p.pengajuan.status] : null;
  return (
    <div style={styles.card(color)}>
      <span style={styles.rank}>#{rank}</span>
      <Photo id={p.employe_id} color={color} />
      <div style={styles.info}>
        <div style={styles.name} title={p.nama}>{p.nama}</div>
        <div style={styles.sub}>{p.jabatan || '-'}</div>
        {pg ? (
          <>
            <span style={{ ...styles.badge(pg.color), fontSize: '.88em', marginTop: '.2em' }}>{pg.label}</span>
            {p.pengajuan.alasan ? <div style={styles.sub2}>{p.pengajuan.alasan}</div> : null}
          </>
        ) : <div style={styles.sub2}>{p.divisi || '-'}</div>}
      </div>
      <div>
        <div style={styles.time(color)}>{p.clock_in}</div>
        {p.terlambat
          ? <div style={styles.timeNote(C.late)}>{p.dari_pengajuan ? 'Terlambat · Pengajuan' : 'Terlambat'}</div>
          : <div style={styles.timeNote(p.dari_pengajuan ? C.approved : C.faint)}>{p.dari_pengajuan ? 'Absensi pengajuan' : 'Clock in'}</div>}
      </div>
    </div>
  );
};
HadirCardBase.propTypes = { p: personShape.isRequired, rank: PropTypes.number.isRequired };
const HadirCard = React.memo(HadirCardBase);

const TidakHadirCardBase = ({ p }) => {
  const s = STATUS[p.status] || STATUS.none;
  return (
    <div style={styles.card(s.color)}>
      <Photo id={p.employe_id} color={s.color} />
      <div style={styles.info}>
        <div style={styles.name} title={p.nama}>{p.nama}</div>
        <div style={styles.sub}>{p.jabatan || '-'}</div>
        <span style={styles.badge(s.color)}>{p.status === 'none' ? s.label : p.jenis || s.label}</span>
        {p.status === 'pending' ? <span style={{ ...styles.sub2, marginLeft: '.6em' }}>menunggu persetujuan</span> : null}
        {p.pengajuan ? <div style={{ ...styles.sub2, color: C.none }}>Pengajuan ditolak{p.pengajuan.alasan ? ` · ${p.pengajuan.alasan}` : ''}</div> : null}
      </div>
    </div>
  );
};
TidakHadirCardBase.propTypes = { p: personShape.isRequired };
const TidakHadirCard = React.memo(TidakHadirCardBase);

const BelumOutCardBase = ({ p }) => (
  <div style={styles.card(KEMARIN.color)}>
    <Photo id={p.employe_id} color={KEMARIN.color} />
    <div style={styles.info}>
      <div style={styles.name} title={p.nama}>{p.nama}</div>
      <div style={styles.sub}>{p.jabatan || '-'}</div>
      <span style={styles.badge(KEMARIN.color)}>{KEMARIN.label}</span>
      {p.pengajuan ? (
        <div style={{ ...styles.sub2, color: (PENGAJUAN[p.pengajuan.status] || PENGAJUAN.pending).color }}>
          {(PENGAJUAN[p.pengajuan.status] || PENGAJUAN.pending).label.replace('Pengajuan', 'Pengajuan clock out')}
          {p.pengajuan.jam ? ` ${p.pengajuan.jam}` : ''}
        </div>
      ) : null}
    </div>
    <div>
      <div style={styles.time(KEMARIN.color)}>{p.clock_in}</div>
      <div style={styles.timeNote(C.faint)}>Clock in kemarin</div>
    </div>
  </div>
);
BelumOutCardBase.propTypes = { p: personShape.isRequired };
const BelumOutCard = React.memo(BelumOutCardBase);

const MEETING_STATUS = {
  berlangsung: { color: '#34d399', label: 'Sedang berlangsung' },
  akan: { color: '#60a5fa', label: 'Akan datang' },
  selesai: { color: '#64748b', label: 'Selesai' },
};

const MeetingCardBase = ({ m, now }) => {
  const st = meetingStatus(m, now);
  const s = MEETING_STATUS[st];
  const rc = roomColor(m.room);
  const dim = st === 'selesai';
  return (
    <div style={{ ...styles.card(rc), height: '8.6em', opacity: dim ? 0.55 : 1, gap: '1.1em' }}>
      <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '6.2em', paddingLeft: '.4em' }}>
        <div style={{ fontSize: '2.1em', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: dim ? C.muted : '#fff' }}>{hhmm(m.startAt)}</div>
        <div style={{ fontSize: '.95em', color: C.muted, marginTop: '.3em', fontVariantNumeric: 'tabular-nums' }}>s/d {hhmm(m.endAt)}</div>
      </div>
      <div style={styles.info}>
        <div style={{ ...styles.name, whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: '1.3em', lineHeight: 1.2 }} title={m.topic}>{m.topic || 'Rapat'}</div>
        <div style={styles.sub}>
          {m.created_by_name || '-'}
          {m.participants ? ` · ${m.participants} peserta` : ''}
          {m.zoom_required ? ' · Zoom' : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ ...styles.badge(rc), marginTop: 0, fontSize: '1.05em' }}>{m.room || '-'}</div>
        <div style={{ marginTop: '.5em' }}>
          <span style={{ fontSize: '.95em', fontWeight: 700, color: s.color }}>
            {st === 'berlangsung' ? <span className="abs-live" style={styles.dot(s.color)} /> : null}
            {s.label}
          </span>
        </div>
      </div>
    </div>
  );
};
MeetingCardBase.propTypes = { m: PropTypes.object.isRequired, now: PropTypes.instanceOf(Date).isRequired }; // eslint-disable-line react/forbid-prop-types
const MeetingCard = React.memo(MeetingCardBase);

const AnalogClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  const hourDeg = (h + m / 60) * 30;
  const minDeg = (m + s / 60) * 6;
  const secDeg = s * 6;
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  const nums = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return (
    <svg viewBox="-100 -100 200 200" style={{ width: '7.6em', height: '7.6em', display: 'block' }} role="img" aria-label="Jam analog">
      <defs>
        <radialGradient id="absFace" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#1b2740" />
          <stop offset="100%" stopColor="#0a1020" />
        </radialGradient>
      </defs>
      <circle r="98" fill="url(#absFace)" stroke="rgba(255,255,255,.22)" strokeWidth="2.5" />
      <circle r="92" fill="none" stroke="rgba(52,211,153,.18)" strokeWidth="1" />
      {ticks.map((i) => (
        <line
          key={i}
          x1="0"
          y1={i % 5 === 0 ? -80 : -85}
          x2="0"
          y2="-90"
          transform={`rotate(${i * 6})`}
          stroke={i % 5 === 0 ? '#e2e8f0' : 'rgba(148,163,184,.55)'}
          strokeWidth={i % 5 === 0 ? 3 : 1.2}
          strokeLinecap="round"
        />
      ))}
      {nums.map((n, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return (
          <text key={n} x={Math.sin(a) * 64} y={-Math.cos(a) * 64 + 6} textAnchor="middle" fontSize="17" fontWeight="600" fill="#cbd5e1">{n}</text>
        );
      })}
      <line x1="0" y1="8" x2="0" y2="-46" transform={`rotate(${hourDeg})`} stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" />
      <line x1="0" y1="10" x2="0" y2="-72" transform={`rotate(${minDeg})`} stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
      <line x1="0" y1="18" x2="0" y2="-80" transform={`rotate(${secDeg})`} stroke={C.hadir} strokeWidth="2" strokeLinecap="round" />
      <circle r="6" fill={C.hadir} />
      <circle r="2.4" fill="#0a1020" />
    </svg>
  );
};

const SERIES = [
  { key: 'tepat_waktu', label: 'Tepat waktu', color: C.hadir },
  { key: 'terlambat', label: 'Terlambat', color: C.late },
  { key: 'dengan_keterangan', label: 'Tidak hadir dengan keterangan', color: C.ket },
  { key: 'tanpa_keterangan', label: 'Tidak hadir tanpa keterangan', color: C.none },
];

const niceMax = (v) => {
  if (v <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(v));
  const f = v / pow;
  let n = 10;
  if (f <= 1) n = 1;
  else if (f <= 2) n = 2;
  else if (f <= 5) n = 5;
  return n * pow;
};

const VW = 1800;
const VH = 690;
const M = { l: 70, r: 30, t: 24, b: 56 };

const Grid = ({ yMax, fmt }) => {
  const ticks = [0, 1, 2, 3, 4, 5];
  return ticks.map((i) => {
    const y = VH - M.b - ((VH - M.t - M.b) * i) / 5;
    return (
      <g key={i}>
        <line x1={M.l} x2={VW - M.r} y1={y} y2={y} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
        <text x={M.l - 12} y={y + 5} textAnchor="end" fontSize="16" fill={C.faint}>{fmt((yMax * i) / 5)}</text>
      </g>
    );
  });
};
Grid.propTypes = { yMax: PropTypes.number.isRequired, fmt: PropTypes.func.isRequired };

// diagram batang berkelompok (empat kategori per kelompok); dipakai untuk grafik harian dan bulanan
const BarChart = ({ rows, labelOf, labelSize, valueSize, emptyText, fmtAxis }) => {
  const filled = rows.filter((r) => r.tepat_waktu !== null);
  const max = niceMax(Math.max(1, ...filled.flatMap((r) => SERIES.map((s) => r[s.key]))));
  const plotW = VW - M.l - M.r;
  const group = plotW / rows.length;
  const bw = (group * 0.82) / SERIES.length;
  const y = (v) => VH - M.b - ((VH - M.t - M.b) * v) / max;
  if (filled.length === 0) return <div style={styles.message}>{emptyText}</div>;
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
      <Grid yMax={max} fmt={fmtAxis} />
      {rows.map((r, gi) => {
        const gx = M.l + gi * group + group * 0.09;
        const has = r.tepat_waktu !== null;
        return (
          <g key={r.tanggal || r.bulan}>
            <text x={M.l + gi * group + group / 2} y={VH - M.b + 28} textAnchor="middle" fontSize={labelSize} fontWeight="600" fill={has ? C.muted : C.faint}>{labelOf(r)}</text>
            {has ? SERIES.map((s, si) => {
              const v = r[s.key];
              const h = VH - M.b - y(v);
              return (
                <g key={s.key}>
                  <rect x={gx + si * bw + 1} y={y(v)} width={Math.max(bw - 2, 2)} height={Math.max(h, 1)} rx="3" fill={s.color} opacity=".92" />
                  <text x={gx + si * bw + bw / 2} y={y(v) - 6} textAnchor="middle" fontSize={valueSize} fontWeight="600" fill={s.color}>{v}</text>
                </g>
              );
            }) : null}
          </g>
        );
      })}
    </svg>
  );
};
BarChart.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  labelOf: PropTypes.func.isRequired,
  labelSize: PropTypes.number.isRequired,
  valueSize: PropTypes.number.isRequired,
  emptyText: PropTypes.string.isRequired,
  fmtAxis: PropTypes.func.isRequired,
};

const WEEKDAY = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// batang horizontal bertumpuk per hari kerja: panjang batang = jumlah karyawan, segmen = empat kategori
const HBarChart = ({ rows, emptyText }) => {
  const filled = rows.filter((r) => r.tepat_waktu !== null);
  if (filled.length === 0) return <div style={styles.message}>{emptyText}</div>;
  const total = (r) => SERIES.reduce((s, x) => s + (r[x.key] || 0), 0);
  const max = Math.max(10, Math.ceil(Math.max(...filled.map(total)) / 10) * 10);
  const ML = 130;
  const MR = 80;
  const MT = 8;
  const MB = 44;
  const plotW = VW - ML - MR;
  const rowH = (VH - MT - MB) / rows.length;
  const bh = Math.min(rowH * 0.74, 36);
  const x = (v) => ML + (plotW * v) / max;
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const gx = ML + (plotW * i) / 5;
        return (
          <g key={i}>
            <line x1={gx} x2={gx} y1={MT} y2={VH - MB} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
            <text x={gx} y={VH - MB + 26} textAnchor="middle" fontSize="16" fill={C.faint}>{Math.round((max * i) / 5)}</text>
          </g>
        );
      })}
      {rows.map((r, gi) => {
        const y0 = MT + gi * rowH + (rowH - bh) / 2;
        const has = r.tepat_waktu !== null;
        const wd = WEEKDAY[new Date(`${r.tanggal}T00:00:00`).getDay()];
        let acc = 0;
        return (
          <g key={r.tanggal}>
            <text x={ML - 14} y={y0 + bh / 2 + 6} textAnchor="end" fontSize="17" fontWeight="600" fill={has ? C.muted : C.faint}>{`${wd} ${r.hari}`}</text>
            {has ? SERIES.map((s) => {
              const v = r[s.key];
              const x0 = x(acc);
              const w = x(acc + v) - x0;
              acc += v;
              return (
                <g key={s.key}>
                  {v > 0 ? <rect x={x0} y={y0} width={Math.max(w - 1, 1)} height={bh} fill={s.color} opacity=".92" /> : null}
                  {w > 28 ? <text x={x0 + w / 2} y={y0 + bh / 2 + 6} textAnchor="middle" fontSize="16" fontWeight="700" fill="#0a1020">{v}</text> : null}
                </g>
              );
            }) : null}
            {has ? <text x={x(acc) + 10} y={y0 + bh / 2 + 6} fontSize="16" fontWeight="600" fill={C.muted}>{acc}</text> : null}
          </g>
        );
      })}
    </svg>
  );
};
HBarChart.propTypes = { rows: PropTypes.arrayOf(PropTypes.object).isRequired, emptyText: PropTypes.string.isRequired };

const axisK = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)));

const ChartPanel = ({ note, children }) => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '1em', padding: '.9em 1.4em .5em' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1em', flexWrap: 'wrap', fontSize: '1.05em', color: C.muted }}>
      <div style={{ display: 'flex', gap: '1.6em', flexWrap: 'wrap' }}>
        {SERIES.map((s) => <span key={s.key}><span style={styles.dot(s.color)} />{s.label}</span>)}
      </div>
      <div style={{ fontSize: '.9em', color: C.faint }}>{note}</div>
    </div>
    <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
  </div>
);
ChartPanel.propTypes = { note: PropTypes.string.isRequired, children: PropTypes.node.isRequired };

const DashboardTv = () => {
  const api = useAxios();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState(false);
  const [phase, setPhase] = useState('hadir'); // 'hadir' -> 'tidak' -> 'kemarin' (dilewati bila kosong) -> muat ulang
  const [now, setNow] = useState(new Date());
  const scrollerRef = useRef(null);
  const contentRef = useRef(null);
  const fillRef = useRef(null);
  const dataRef = useRef(null);
  dataRef.current = data;
  const statsRef = useRef(null);
  statsRef.current = stats;
  const meetingsRef = useRef([]);
  meetingsRef.current = meetings;

  const load = useCallback(() => {
    apiRef.current
      .get('dapi/hr/dashboard-absensi')
      .then((res) => {
        const d = res.data.data;
        setData(d);
        setError(false);
        ensureThumbs([...d.hadir, ...d.tidak_hadir, ...d.belum_clock_out].map((x) => x.employe_id));
      })
      .catch(() => setError(true));
  }, []);

  const loadStats = useCallback(() => {
    apiRef.current
      .get('dapi/hr/dashboard-absensi/statistik')
      .then((res) => setStats(res.data.data))
      .catch(() => {});
  }, []);

  const loadMeetings = useCallback(() => {
    apiRef.current
      .get('dapi/meeting/room/list')
      .then((res) => setMeetings(Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    loadStats();
    loadMeetings();
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, [load, loadStats, loadMeetings]);

  // hari libur: tidak ada siklus; cukup cek ulang tiap 5 menit supaya berganti sendiri saat hari kerja tiba
  const isLibur = !!(data && data.libur);
  useEffect(() => {
    if (!isLibur) return undefined;
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [isLibur, load]);

  // gulir otomatis: 'hadir' sampai habis, lalu 'tidak hadir', lalu 'belum clock out kemarin' (bila ada), lalu muat ulang dan ulangi
  useEffect(() => {
    if (!dataRef.current || dataRef.current.libur) return undefined;
    const box = scrollerRef.current;
    const content = contentRef.current;
    const fill = fillRef.current;
    const timers = [];
    let cancelled = false;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    const next = () => {
      if (cancelled) return;
      const s = statsRef.current;
      const list = ['hadir', 'tidak'];
      if (dataRef.current.belum_clock_out.length > 0) list.push('kemarin');
      if (meetingsToday(meetingsRef.current, new Date()).length > 0) list.push('rapat');
      if (s && s.harian.length > 0) list.push('grafikHari');
      if (s) list.push('grafikBulan');
      const i = list.indexOf(phase);
      if (i >= 0 && i < list.length - 1) {
        setPhase(list[i + 1]);
      } else {
        load();
        loadStats();
        loadMeetings();
        setPhase('hadir');
      }
    };
    const dwell = phase.startsWith('grafik') ? CHART_MS : DWELL_MS;

    // bilah kemajuan: skala horizontal lewat transisi CSS (tidak memicu tata letak ulang)
    const setFill = (scale, ms) => {
      if (!fill) return;
      fill.style.transition = ms ? `transform ${ms}ms linear` : 'none';
      fill.style.transform = `scaleX(${scale})`;
    };

    if (content) {
      content.style.transition = 'none';
      content.style.transform = 'translate3d(0,0,0)';
    }
    setFill(0, 0);
    const max = box && content ? content.scrollHeight - box.clientHeight : 0;
    if (!box || !content || max <= 4) {
      // muat satu layar: tayang beberapa detik, bilah kemajuan berjalan
      later(() => setFill(1, dwell), 50);
      later(next, dwell + 50);
    } else {
      // gulir sekali jalan: satu transisi linear dari atas ke bawah, dijalankan compositor/GPU sehingga tetap halus
      // walaupun JavaScript sedang sibuk (mis. memuat foto). Jeda di atas dan di bawah, lalu pindah bagian.
      const dur = Math.round((max / SCROLL_SPEED) * 1000);
      later(() => {
        content.style.transition = `transform ${dur}ms linear`;
        content.style.transform = `translate3d(0,${-max}px,0)`;
        setFill(1, dur);
      }, HOLD_MS);
      later(next, HOLD_MS + dur + HOLD_MS);
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [phase, data ? data.tanggal : null, isLibur, load, loadStats, loadMeetings]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = data ? data.ringkasan : null;
  const tanggal = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const header = (
    <div style={styles.header}>
      <div>
        <div style={styles.brand}>PT Pema · Sistem Informasi</div>
        <h1 style={styles.title}>Dashboard TV</h1>
        <div style={styles.date}>{tanggal}</div>
      </div>
      <div style={styles.clockBox}>
        <AnalogClock />
        {data ? (
          <div style={styles.updated}>
            <span className="abs-live" style={styles.dot(error ? C.none : C.hadir)} />
            {error ? 'Gagal memperbarui data' : `Diperbarui ${data.diperbarui}`}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (isLibur) {
    return (
      <div className="abs-root" style={styles.page}>
        <style>{CSS}</style>
        {header}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="abs-fade" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '7em', lineHeight: 1 }} role="img" aria-label="libur">🏖️</div>
            <div style={{ fontSize: '5.5em', fontWeight: 800, letterSpacing: '-.02em', marginTop: '.1em' }}>Hari Libur</div>
            <div style={{ fontSize: '2.4em', color: C.hadir, fontWeight: 600, marginTop: '.2em' }}>{data.libur}</div>
            <div style={{ fontSize: '1.3em', color: C.muted, marginTop: '1em' }}>Selamat beristirahat</div>
          </div>
        </div>
      </div>
    );
  }

  const renderBody = () => {
    if (!data) return <div style={styles.message}>{error ? 'Gagal memuat data absensi' : 'Memuat data absensi...'}</div>;
    if (phase === 'hadir') {
      if (data.hadir.length === 0) return <div style={styles.message}>Belum ada karyawan yang clock in</div>;
      return (
        <div style={styles.grid} ref={contentRef} className="abs-fade" key="hadir">
          {data.hadir.map((p, i) => <HadirCard key={p.employe_id} p={p} rank={i + 1} />)}
        </div>
      );
    }
    if (phase === 'rapat') {
      const list = meetingsToday(meetings, now);
      if (list.length === 0) return <div style={styles.message}>Tidak ada rapat hari ini</div>;
      return (
        <div style={{ ...styles.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 38em), 1fr))' }} ref={contentRef} className="abs-fade" key="rapat">
          {list.map((m) => <MeetingCard key={m.id} m={m} now={now} />)}
        </div>
      );
    }
    if (phase === 'grafikHari' && stats) {
      return (
        <div className="abs-fade" key="grafikHari" style={{ height: '100%' }}>
          <ChartPanel note={`Jumlah karyawan per hari kerja · ${stats.jumlah_karyawan} karyawan · data sampai ${stats.sampai}`}>
            <HBarChart rows={stats.harian} emptyText="Belum ada data bulan ini" />
          </ChartPanel>
        </div>
      );
    }
    if (phase === 'grafikBulan' && stats) {
      return (
        <div className="abs-fade" key="grafikBulan" style={{ height: '100%' }}>
          <ChartPanel note="Total karyawan-hari kerja per bulan">
            <BarChart rows={stats.bulanan} labelOf={(row) => row.bulan} labelSize={19} valueSize={14} emptyText="Belum ada data tahun ini" fmtAxis={axisK} />
          </ChartPanel>
        </div>
      );
    }
    if (phase === 'kemarin') {
      return (
        <div style={styles.grid} ref={contentRef} className="abs-fade" key="kemarin">
          {data.belum_clock_out.map((p) => <BelumOutCard key={p.employe_id} p={p} />)}
        </div>
      );
    }
    if (data.tidak_hadir.length === 0) return <div style={styles.message}>Semua karyawan hadir</div>;
    return (
      <div style={styles.grid} ref={contentRef} className="abs-fade" key="tidak">
        {data.tidak_hadir.map((p) => <TidakHadirCard key={p.employe_id} p={p} />)}
      </div>
    );
  };

  const rapatCount = meetingsToday(meetings, now).length;
  const phaseTitle = {
    hadir: `Daftar Karyawan Hadir${r ? ` (${r.hadir})` : ''}`,
    tidak: `Daftar Karyawan Tidak Hadir${r ? ` (${r.tidak_hadir})` : ''}`,
    kemarin: `Daftar Karyawan Belum Clock Out Kemarin${r ? ` (${r.belum_clock_out_kemarin})` : ''}`,
    rapat: `Daftar Rapat Hari Ini (${rapatCount})`,
    grafikHari: `Grafik Kehadiran Karyawan Harian${stats ? ` · ${stats.bulan}` : ''}`,
    grafikBulan: `Grafik Kehadiran Karyawan Bulanan${stats ? ` · ${stats.tahun}` : ''}`,
  }[phase];
  const phaseColor = { hadir: C.hadir, tidak: C.none, kemarin: C.kemarin, rapat: C.rapat, grafikHari: C.ket, grafikBulan: C.ket }[phase];

  return (
    <div className="abs-root" style={styles.page}>
      <style>{CSS}</style>
      {header}

      <div style={styles.bar}>
        <h2 key={phase} className="abs-fade" style={styles.phaseTitle(phaseColor)}>{phaseTitle}</h2>
        {phase === 'tidak' ? (
          <div style={styles.legend}>
            <span><span style={styles.dot(C.approved)} />Cuti disetujui</span>
            <span><span style={styles.dot(C.pending)} />Menunggu persetujuan</span>
            <span><span style={styles.dot(C.none)} />Tanpa keterangan</span>
          </div>
        ) : null}
        {phase === 'kemarin' && data ? <div style={styles.legend}>{longDate(data.tanggal_kemarin)}</div> : null}
        {phase === 'rapat' ? <div style={styles.legend}>{tanggal}</div> : null}
      </div>

      <div style={styles.progress}>
        <div ref={fillRef} style={styles.progressFill(phaseColor)} />
      </div>

      <div style={styles.scroller} ref={scrollerRef}>
        {renderBody()}
        <div style={styles.fadeTop} />
        <div style={styles.fadeBottom} />
      </div>
    </div>
  );
};

export default DashboardTv;
