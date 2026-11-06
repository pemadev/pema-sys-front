import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useAxios from '../../hooks/useAxios';
import { DEFAULT_AVATAR } from '../../utils/defaultAvatar';

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

// Rapat yang ditampilkan sama dengan halaman /jadwal-rapat (PublicRoomSchedule): per ruangan, rapat yang mulai hari ini atau sesudahnya
// (atau yang sedang berjalan), urut jam mulai, paling banyak 3 rapat per ruangan; rapat tanpa nama ruangan tidak ditampilkan.
// Hasilnya digabung dan diurutkan menurut jam mulai.
const MEETINGS_PER_ROOM = 3;
const meetingsToday = (list, ref) => {
  const dayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const keep = (m) => {
    if (m.startAt && m.endAt) return m.startAt >= dayStart || (m.startAt <= ref && ref <= m.endAt);
    if (m.startAt) return m.startAt >= dayStart || ref >= m.startAt;
    if (m.endAt) return ref <= m.endAt;
    return false;
  };
  const perRoom = new Map();
  (list || [])
    .map((m) => ({ ...m, startAt: parseDate(m.start_time), endAt: parseDate(m.end_time) }))
    .filter((m) => String(m.room || '').trim() && keep(m))
    .sort((a, b) => (a.startAt ? a.startAt.getTime() : Infinity) - (b.startAt ? b.startAt.getTime() : Infinity))
    .forEach((m) => {
      const k = String(m.room).trim().toLowerCase();
      if (!perRoom.has(k)) perRoom.set(k, []);
      if (perRoom.get(k).length < MEETINGS_PER_ROOM) perRoom.get(k).push(m);
    });
  return Array.from(perRoom.values()).reduce((acc, rows) => acc.concat(rows), []).sort((a, b) => (a.startAt || 0) - (b.startAt || 0));
};
// kolom zoom_required bertipe teks dari API ("0"/"1"), jadi "0" tidak boleh dianggap Zoom
const isZoom = (v) => v === true || v === 1 || /^(1|ya|true)$/i.test(String(v));
// keterangan hari untuk rapat yang bukan hari ini
const meetingDayLabel = (d, ref) => {
  const dayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - dayStart) / (24 * 3600 * 1000));
  if (diff <= 0) return null;
  if (diff === 1) return 'Besok';
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
};
const meetingStatus = (m, ref) => {
  if (m.endAt && m.endAt < ref) return 'selesai';
  if (!m.startAt || m.startAt <= ref) return 'berlangsung';
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
let thumbActive = 0;
const THUMB_PARALLEL = 3;
const THUMB_TIMEOUT = 20000;

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

const makeThumb = (id) => new Promise((resolveRaw) => {
  // batas waktu: foto yang macet tidak boleh menahan antrean; anggap miniatur gagal dibuat dan pakai foto asli
  let done = false;
  const timer = setTimeout(() => { done = true; resolveRaw(THUMB_FAIL); }, THUMB_TIMEOUT);
  const resolve = (v) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    resolveRaw(v);
  };
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

// beberapa foto sekaligus dengan jeda, supaya foto muncul cepat tetapi decode foto besar tidak mengganggu gulir
let pumpThumbs = () => {};
const loadOneThumb = (id) => {
  thumbActive += 1;
  makeThumb(id).then((res) => {
    const prev = thumbMem.get(id);
    const prevOk = prev && prev !== THUMB_FAIL;
    if (!((res === '' || res === THUMB_FAIL) && prevOk)) {
      thumbMem.set(id, res);
      if (res !== THUMB_FAIL) saveThumb(id, res);
    }
    emitThumbs();
    setTimeout(() => {
      thumbActive -= 1;
      pumpThumbs();
    }, 100);
  });
};
pumpThumbs = () => {
  while (thumbActive < THUMB_PARALLEL && thumbQueue.length > 0) loadOneThumb(thumbQueue.shift());
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
.abs-nav { font: inherit; cursor: pointer; }
.leaflet-container { font-family: inherit; background: #0b1220; }
.abs-tiles { filter: invert(1) hue-rotate(180deg) brightness(.85) contrast(.9) saturate(.5); }
.abs-nav:focus { outline: .15em solid #fff; outline-offset: .1em; }
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
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.6em 1em', marginBottom: '.7em' },
  phaseTitle: (color) => ({ fontSize: '1.9em', fontWeight: 700, margin: 0, letterSpacing: '-.01em', lineHeight: 1.1, paddingLeft: '.6em', borderLeft: `.2em solid ${color}` }),
  nav: { display: 'flex', alignItems: 'center', gap: '.4em', marginLeft: 'auto' },
  navBtn: (active, color) => ({
    font: 'inherit',
    fontSize: '.95em',
    fontWeight: 600,
    color: active ? '#0a1020' : C.muted,
    background: active ? color : 'rgba(255,255,255,.06)',
    border: `1px solid ${active ? color : 'rgba(255,255,255,.14)'}`,
    borderRadius: '999px',
    minWidth: '2.2em',
    padding: '.3em .5em',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  }),
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

// Foto default untuk karyawan yang belum punya foto: lingkaran berwarna dengan inisial nama (warna tetap untuk nama yang sama)
const AVATAR_COLORS = [['#0ea5e9', '#1e3a8a'], ['#10b981', '#064e3b'], ['#8b5cf6', '#3b0764'], ['#f59e0b', '#78350f'], ['#ec4899', '#831843'], ['#14b8a6', '#134e4a'], ['#6366f1', '#1e1b4b'], ['#ef4444', '#7f1d1d']];
const avatarCache = new Map();
const initialsAvatar = (name) => {
  const key = String(name || '?');
  if (avatarCache.has(key)) return avatarCache.get(key);
  const words = key.split(',')[0].split(/\s+/).filter(Boolean);
  const initials = ((words[0] || '?').charAt(0) + (words[1] ? words[1].charAt(0) : '')).toUpperCase();
  const [c1, c2] = AVATAR_COLORS[Array.from(key).reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 997, 7) % AVATAR_COLORS.length];
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
    + '<rect width="100" height="100" fill="url(#g)"/>'
    + `<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${initials.length > 1 ? 40 : 46}" font-weight="700" fill="#fff" fill-opacity=".92">${initials.replace(/[<>&]/g, '')}</text></svg>`;
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  avatarCache.set(key, url);
  return url;
};

const PhotoBase = ({ id, color, size, name }) => {
  const thumb = useSyncExternalStore(subscribeThumbs, () => thumbMem.get(id), () => undefined);
  // miniatur siap -> pakai; belum siap atau tidak punya foto -> avatar inisial; miniatur tidak bisa dibuat -> foto asli (gagal -> avatar inisial)
  const fallback = initialsAvatar(name);
  let src = fallback;
  if (thumb === THUMB_FAIL) src = photoUrl(id);
  else if (thumb) src = thumb;
  const onError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallback;
  };
  return (
    <div style={{ ...styles.photoWrap(color), width: size, height: size }}>
      <img style={styles.photo} src={src} alt="" onError={onError} decoding="async" />
    </div>
  );
};
PhotoBase.propTypes = { id: PropTypes.string.isRequired, color: PropTypes.string.isRequired, size: PropTypes.string, name: PropTypes.string };
PhotoBase.defaultProps = { size: '5.4em', name: '' };
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
      <Photo id={p.employe_id} color={color} name={p.nama} />
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
      <Photo id={p.employe_id} color={s.color} name={p.nama} />
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
    <Photo id={p.employe_id} color={KEMARIN.color} name={p.nama} />
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
        {m.startAt && meetingDayLabel(m.startAt, now) ? <div style={{ fontSize: '.9em', fontWeight: 700, color: C.rapat, marginTop: '.3em' }}>{meetingDayLabel(m.startAt, now)}</div> : null}
      </div>
      <div style={styles.info}>
        <div style={{ ...styles.name, whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: '1.3em', lineHeight: 1.2 }} title={m.topic}>{m.topic || 'Rapat'}</div>
        <div style={styles.sub}>
          {m.created_by_name || '-'}
          {m.participants ? ` · ${m.participants} peserta` : ''}
          {isZoom(m.zoom_required) ? ' · Zoom' : ''}
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

// Struktur organisasi: pohon disusun dari atasan langsung (direct_atasan), berakar di Direktur Utama (id_base 3).
const ORG_COLORS = ['#fbbf24', '#60a5fa', '#c084fc', '#34d399', '#94a3b8'];
const ORG_W = '30em';

const buildOrg = (rows) => {
  const map = new Map();
  (rows || []).forEach((r) => map.set(r.employe_id, { ...r, children: [] }));
  // staf "Staf X" ditempatkan di bawah "Supervisor X" pada divisi yang sama (mis. Staf SCM di bawah Supervisor SCM, bukan supervisor divisi lain)
  const field = (j) => String(j || '').replace(/^(staf|supervisor)\s+/i, '').trim().toLowerCase();
  const sups = Array.from(map.values()).filter((n) => Number(n.id_base) === 8);
  map.forEach((n) => {
    if (Number(n.id_base) !== 9 || n.vakan) return;
    const own = map.get(n.direct_atasan);
    const match = sups.filter((s) => s.divisi === n.divisi && field(s.jabatan) === field(n.jabatan));
    if (match.length === 1 && own !== match[0] && !(own && field(own.jabatan) === field(n.jabatan))) {
      Object.assign(n, { direct_atasan: match[0].employe_id });
    }
  });
  map.forEach((n) => {
    const parent = map.get(n.direct_atasan);
    if (parent && parent !== n) parent.children.push(n);
  });
  const root = Array.from(map.values()).find((n) => Number(n.id_base) === 3);
  if (!root) return null;
  const grow = (n, parent) => {
    const kids = n.children.map((c) => grow(c, n));
    return {
      ...n,
      parentBase: parent ? parent.id_base : undefined,
      parentId: parent ? parent.employe_id : undefined,
      parentLabel: parent ? (parent.vakan ? `${parent.jabatan} (vacant)` : `${parent.nama} · ${parent.jabatan}`) : undefined,
      children: kids, total: kids.reduce((s, c) => s + c.total + (c.vakan ? 0 : 1), 0),
    };
  };
  return grow(root, undefined);
};

// Halaman struktur: 'struktur' = Dirut dan direksi; lalu satu halaman per divisi (dikelompokkan menurut nama divisi) dengan rantai atasannya di atas.
// Seorang atasan bisa memegang lebih dari satu divisi (mis. manajer dengan PS divisi lain): tiap divisi mendapat halamannya sendiri,
// berisi atasan itu di puncak dan hanya bawahan yang berasal dari divisi tersebut.
const orgDivisions = (n) => {
  const set = new Set([n.divisi]);
  n.children.forEach((c) => orgDivisions(c).forEach((d) => set.add(d)));
  return Array.from(set);
};
const orgCut = (n, d, keep) => {
  const kids = n.children.map((c) => orgCut(c, d, false)).filter(Boolean);
  if (!keep && n.divisi !== d && kids.length === 0) return null;
  return { ...n, children: kids, total: kids.reduce((s, c) => s + c.total + (c.vakan ? 0 : 1), 0) };
};
const orgPages = (root) => {
  if (!root) return [];
  const pages = [];
  const add = (chain, units) => {
    const groups = new Map();
    units.forEach((u) => {
      const divs = orgDivisions(u);
      [u.divisi, ...divs.filter((d) => d !== u.divisi)].forEach((d) => {
        const key = d || u.employe_id;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(divs.length > 1 ? orgCut(u, d, true) : u);
      });
    });
    groups.forEach((list, k) => pages.push({ chain, units: list, divisi: k, count: list.reduce((s, u) => s + u.total + (u.vakan ? 0 : 1), 0) }));
  };
  const direksi = root.children.filter((c) => Number(c.id_base) === 4);
  direksi.forEach((d) => add([root, d], d.children));
  add([root], root.children.filter((c) => Number(c.id_base) !== 4));
  return pages;
};
// baris per tingkat jabatan (hierarki: manajer -> supervisor -> staf -> tenaga pendukung): semua orang yang setingkat sejajar dalam satu baris,
// walaupun atasan langsungnya melompati satu tingkat (mis. staf langsung di bawah manajer). Urutan dalam baris mengikuti urutan pohon.
const orgLevels = (units) => {
  const flat = [];
  const walk = (n) => {
    // supervisor dengan satu atau dua staf (tanpa bawahan lagi): staf ditampilkan langsung di bawah supervisornya, bukan di baris staf yang terpisah
    const kids = n.children;
    if (Number(n.id_base) === 8 && kids.length >= 1 && kids.length <= 2 && kids.every((c) => c.children.length === 0 && Number(c.id_base) >= 9)) {
      flat.push({ ...n, inline: kids });
      return;
    }
    flat.push(n);
    n.children.forEach(walk);
  };
  units.forEach(walk);
  const ranks = Array.from(new Set(flat.map((n) => Number(n.id_base)))).sort((x, y) => x - y);
  return ranks.map((r) => flat.filter((n) => Number(n.id_base) === r));
};
// warna menurut tingkat jabatan: manajer, supervisor, staf dan di bawahnya
const rankDepth = (n) => {
  const r = Number(n.id_base);
  if (r <= 7) return 2;
  return r === 8 ? 3 : 4;
};
const orgGroup = (k) => (String(k).indexOf('divisi:') === 0 ? 'struktur' : k);

const posOf = (i, len) => (len === 1 ? 'only' : i === 0 ? 'first' : i === len - 1 ? 'last' : 'mid'); // eslint-disable-line no-nested-ternary

const OrgNode = ({ n, depth, up, pos }) => {
  const color = ORG_COLORS[Math.min(depth, ORG_COLORS.length - 1)];
  const vac = !!n.vakan;
  // dari manajer ke bawah (id_base 7+): grade kosong di HR ditandai "Belum diupdate"
  const noGrade = !vac && !n.grade && Number(n.id_base) >= 7;
  const cardStyle = { ...styles.card(color), height: '7.2em', padding: '.6em 1em .6em .8em', gap: '.8em' };
  if (vac) {
    cardStyle.border = `1px dashed ${rgba(color, 0.6)}`;
    cardStyle.background = 'rgba(255,255,255,.025)';
    cardStyle.opacity = 0.85;
  }
  const line = <div style={{ width: 2, height: '1.1em', background: rgba(color, 0.55), flexShrink: 0 }} />;
  // garis hanya bila beda tingkat: atasan dan bawahan yang sama-sama satu tingkat jabatan tidak disambung, supaya tidak tampak seperti atasan-bawahan
  const lined = up && n.parentBase !== undefined && Number(n.parentBase) !== Number(n.id_base);
  const hasDown = n.children.some((c) => Number(c.id_base) !== Number(n.id_base));
  return (
    <div style={{ width: ORG_W, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {up ? (
        // garis penghubung: stub ke atas, ditambah garis datar yang menyambung ke kartu sebelah (kecuali di ujung baris)
        <div style={{ position: 'relative', width: '100%', height: '1.1em', flexShrink: 0 }}>
          {lined && pos !== 'only' ? <div style={{ position: 'absolute', top: 0, height: 2, background: rgba(color, 0.55), left: pos === 'first' ? '50%' : 0, right: pos === 'last' ? '50%' : 0 }} /> : null}
          {lined ? <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, marginLeft: -1, background: rgba(color, 0.55) }} /> : null}
        </div>
      ) : null}
      <div style={{ ...cardStyle, width: 'calc(100% - 1em)' }}>
        {vac ? (
          <div style={{ ...styles.photoWrap(rgba(color, 0.45)), width: '4.6em', height: '4.6em' }}>
            <img style={{ ...styles.photo, opacity: 0.5 }} src={DEFAULT_AVATAR} alt="" />
          </div>
        ) : <Photo id={n.employe_id} color={color} size="4.6em" name={n.nama} />}
        <div style={styles.info}>
          <div style={{ ...styles.name, fontSize: '1.25em', ...(vac ? { fontStyle: 'italic', color: C.faint, letterSpacing: '.08em', textTransform: 'uppercase' } : {}) }} title={n.nama}>{n.nama}</div>
          <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '.88em', color: C.muted }}>{n.jabatan || '-'}</div>
          {n.grade || noGrade || n.total > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6em', marginTop: '.2em' }}>
              {n.grade ? <span style={{ ...styles.badge(color), fontSize: '.78em', marginTop: 0 }}>{n.grade}</span> : null}
              {noGrade ? <span style={{ ...styles.badge(C.faint), fontSize: '.78em', marginTop: 0, fontStyle: 'italic' }}>Belum diupdate</span> : null}
              {n.total > 0 ? <span style={{ ...styles.sub2, fontSize: '.78em', overflow: 'visible' }}>{n.total} anggota</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      {n.inline && n.inline.length === 1 ? (
        <>
          {line}
          <OrgNode n={n.inline[0]} depth={rankDepth(n.inline[0])} />
        </>
      ) : null}
      {n.inline && n.inline.length > 1 ? (
        // beberapa staf: ditumpuk di bawah supervisor dengan rel di sisi kiri, tiap staf bercabang dari rel itu
        <div style={{ width: '100%', paddingTop: '.5em', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '1.2em', top: 0, height: '.5em', width: 2, background: rgba(ORG_COLORS[3], 0.55) }} />
          {n.inline.map((c, i) => {
            const last = i === n.inline.length - 1;
            const rail = rgba(ORG_COLORS[Math.min(rankDepth(c), ORG_COLORS.length - 1)], 0.55);
            return (
              <div key={c.employe_id} style={{ position: 'relative', paddingLeft: '2.2em', paddingBottom: last ? 0 : '.5em' }}>
                <div style={{ position: 'absolute', left: '1.2em', top: 0, bottom: last ? '50%' : 0, width: 2, background: rail }} />
                <div style={{ position: 'absolute', left: '1.2em', top: '50%', width: '1em', height: 2, background: rail }} />
                <OrgNode n={c} depth={rankDepth(c)} />
              </div>
            );
          })}
        </div>
      ) : null}
      {!n.inline ? (hasDown ? line : <div style={{ height: n.children.length > 0 ? '1.1em' : 0 }} />) : null}
    </div>
  );
};
OrgNode.propTypes = {
  n: PropTypes.shape({
    employe_id: PropTypes.string,
    nama: PropTypes.string,
    jabatan: PropTypes.string,
    divisi: PropTypes.string,
    grade: PropTypes.string,
    vakan: PropTypes.bool,
    id_base: PropTypes.number,
    parentBase: PropTypes.number,
    total: PropTypes.number,
    children: PropTypes.arrayOf(PropTypes.object),
    inline: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  }).isRequired,
  depth: PropTypes.number.isRequired,
  up: PropTypes.bool,
  pos: PropTypes.string,
};
OrgNode.defaultProps = { up: false, pos: 'only' };

// urutan bawaan bagian Dashboard TV (dipakai sebelum pengaturan termuat atau bila belum pernah diatur)
// Lalu lintas: kualitas arus per titik (Lengang / Ramai / Macet) dari kecepatan sekarang dibanding kecepatan lancar, bukan peta langsung.
const TRAFFIC = {
  lengang: { color: '#34d399', label: 'Lengang' },
  ramai: { color: '#fbbf24', label: 'Ramai' },
  macet: { color: '#f87171', label: 'Macet' },
  tidak_ada_data: { color: '#64748b', label: 'Tidak ada data' },
};

const trafficOverall = (items) => {
  const ok = items.filter((i) => i.rasio !== null && i.rasio !== undefined);
  if (ok.length === 0) return 'tidak_ada_data';
  const avg = ok.reduce((s, i) => s + i.rasio, 0) / ok.length;
  if (avg >= 0.75) return 'lengang';
  return avg >= 0.5 ? 'ramai' : 'macet';
};

// peta dasar OpenStreetMap digelapkan lewat CSS (nama tempat tampil); kondisi arus ada pada warna jalan dan daftar di kiri, hanya kantor yang diberi penanda berwarna menurut kualitas arus; penanda kantor memakai cincin emas
const GOLD = '#fbbf24';

const TrafficMap = ({ traffic }) => {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return undefined;
    const map = L.map(boxRef.current, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, className: 'abs-tiles', attribution: '&copy; OpenStreetMap' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.createPane('abs-flow');
    map.getPane('abs-flow').style.zIndex = 250;

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // warna jalan langsung (hijau lancar, kuning padat, merah macet); {t} membuat ubin diambil baru setiap halaman ditampilkan
  const tileUrl = traffic.tile_url || '';
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileUrl) return undefined;
    const flow = L.tileLayer(`${tileUrl}&t={t}`, { t: Date.now(), maxZoom: 18, opacity: 0.95, pane: 'abs-flow' }).addTo(map);
    return () => {
      flow.remove();
    };
  }, [tileUrl]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pusat = traffic.pusat && traffic.pusat.lat ? [traffic.pusat.lat, traffic.pusat.lon] : null;
    const withPos = traffic.items.filter((i) => i.lat);
    const pts = withPos.map((i) => [i.lat, i.lon]);
    if (pusat) pts.push(pusat);
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(pts);
    if (pusat) {
      L.circleMarker(pusat, { radius: 13, color: GOLD, weight: 2, fill: false }).addTo(layer);
      L.circleMarker(pusat, { radius: 4, stroke: false, fillColor: GOLD, fillOpacity: 1 }).addTo(layer);
    }
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [90, 90], maxZoom: 15, animate: false });
  }, [traffic]);

  const legend = { display: 'flex', alignItems: 'center', gap: '.55em' };
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', borderRadius: '1.2em', overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', background: '#0b1220' }}>
      <div ref={boxRef} style={{ height: '100%', width: '100%' }} />
      <div style={{ position: 'absolute', left: '1em', bottom: '1.6em', zIndex: 1000, padding: '.6em .9em', borderRadius: '.8em', background: 'rgba(11,18,32,.82)', border: '1px solid rgba(255,255,255,.14)', fontSize: '.95em', color: C.text, display: 'grid', gap: '.35em' }}>
        <div style={legend}>
          <span style={{ width: '1em', height: '1em', borderRadius: '50%', border: `2px solid ${GOLD}`, boxSizing: 'border-box', display: 'inline-block', position: 'relative' }}>
            <span style={{ position: 'absolute', inset: '.2em', borderRadius: '50%', background: GOLD }} />
          </span>
          <span>Posisi kantor</span>
        </div>
      </div>
    </div>
  );
};
TrafficMap.propTypes = { traffic: PropTypes.shape({ tile_url: PropTypes.string, items: PropTypes.arrayOf(PropTypes.object), pusat: PropTypes.shape({ lat: PropTypes.number, lon: PropTypes.number }) }).isRequired };

const TrafficRow = ({ item }) => {
  const s = TRAFFIC[item.status] || TRAFFIC.tidak_ada_data;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.7em', padding: '.35em 0', borderTop: '1px solid rgba(255,255,255,.07)' }}>
      <span style={{ ...styles.dot(s.color), marginRight: 0, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: C.text }}>{item.nama}</span>
      <span style={{ color: s.color, fontWeight: 700, flexShrink: 0 }}>{s.label}</span>
      <span style={{ color: C.faint, width: '4.6em', textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{item.kecepatan === null ? '-' : `${item.kecepatan} km/j`}</span>
    </div>
  );
};
TrafficRow.propTypes = { item: PropTypes.shape({ nama: PropTypes.string, status: PropTypes.string, kecepatan: PropTypes.number }).isRequired };

const TrafficPanel = ({ traffic }) => {
  if (!traffic || !traffic.configured || traffic.items.length === 0) {
    return (
      <div style={styles.message}>
        {traffic && !traffic.configured ? 'Data lalu lintas belum diaktifkan' : 'Memuat kondisi lalu lintas...'}
      </div>
    );
  }
  const overall = trafficOverall(traffic.items);
  const o = TRAFFIC[overall];
  const count = (k) => traffic.items.filter((i) => i.status === k).length;
  const jam = traffic.updated_at ? new Date(traffic.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'minmax(19em, 26em) 1fr', gap: '1.4em', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5em', padding: '1.1em 1.3em', borderRadius: '1.2em', border: `1px solid ${rgba(o.color, 0.4)}`, background: `radial-gradient(circle at 50% 0%, ${rgba(o.color, 0.22)}, rgba(255,255,255,.03) 70%)`, minHeight: 0, fontSize: '1em' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '.95em', letterSpacing: '.25em', textTransform: 'uppercase', color: C.muted }}>Kondisi Umum</div>
          <div style={{ fontSize: '3.6em', fontWeight: 800, lineHeight: 1.05, color: o.color, letterSpacing: '-.02em' }}>{o.label}</div>
          <div style={{ fontSize: '1.05em', color: C.muted }}>Banda Aceh dan sekitarnya</div>
          <div style={{ display: 'flex', gap: '1em', justifyContent: 'center', margin: '.5em 0 .3em', fontSize: '1em', color: C.muted }}>
            {['lengang', 'ramai', 'macet'].map((k) => (
              <span key={k}><span style={styles.dot(TRAFFIC[k].color)} />{TRAFFIC[k].label} {count(k)}</span>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', fontSize: '.95em' }}>
          {traffic.items.map((i) => <TrafficRow key={i.nama} item={i} />)}
        </div>
        <div style={{ fontSize: '.85em', color: C.faint, textAlign: 'center' }}>
          Warna jalan: hijau lancar, kuning padat, merah macet · cincin emas: {traffic.pusat ? traffic.pusat.nama : 'kantor'}{jam ? ` · diperbarui ${jam}` : ''}
        </div>
      </div>
      <TrafficMap traffic={traffic} />
    </div>
  );
};
TrafficPanel.propTypes = {
  traffic: PropTypes.shape({
    configured: PropTypes.bool,
    updated_at: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.object),
    pusat: PropTypes.shape({ nama: PropTypes.string }),
  }),
};
TrafficPanel.defaultProps = { traffic: null };

const DEFAULT_SLIDES = ['hadir', 'tidak', 'kemarin', 'grafikHari', 'grafikBulan', 'rapat', 'struktur', 'lalulintas'].map((key) => ({ key, tampil: true }));
const PHASE_COLOR = { hadir: C.hadir, tidak: C.none, kemarin: C.kemarin, rapat: C.rapat, struktur: ORG_COLORS[0], grafikHari: C.ket, grafikBulan: C.ket, lalulintas: C.approved };
const PHASE_LABEL = { hadir: 'Hadir', tidak: 'Tidak Hadir', kemarin: 'Belum Clock Out', rapat: 'Rapat', struktur: 'Struktur', grafikHari: 'Grafik Harian', grafikBulan: 'Grafik Bulanan', lalulintas: 'Lalu Lintas' };

const DashboardTv = () => {
  const api = useAxios();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [orgRows, setOrgRows] = useState(null);
  const [error, setError] = useState(false);
  const [traffic, setTraffic] = useState(null);
  const [slides, setSlides] = useState(null);
  const slidesRef = useRef(null);
  slidesRef.current = slides;
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
  const org = useMemo(() => buildOrg(orgRows), [orgRows]);
  const orgRef = useRef(null);
  orgRef.current = org;
  const pages = useMemo(() => orgPages(org), [org]);
  const pagesRef = useRef([]);
  pagesRef.current = pages;

  // urutan bagian yang sedang tersedia (dipakai putaran otomatis dan tombol navigasi)
  const phaseList = () => {
    const s = statsRef.current;
    const d = dataRef.current;
    // bagian yang punya data; urutan dan status tampil/sembunyi mengikuti pengaturan PIC Dashboard
    const avail = {
      hadir: true,
      tidak: true,
      kemarin: !!(d && d.belum_clock_out.length > 0),
      grafikHari: !!(s && s.harian.length > 0),
      grafikBulan: !!s,
      rapat: meetingsToday(meetingsRef.current, new Date()).length > 0,
      struktur: !!orgRef.current,
      lalulintas: true,
    };
    const list = [];
    (slidesRef.current || DEFAULT_SLIDES).forEach((x) => {
      if (!x.tampil || !avail[x.key]) return;
      list.push(x.key);
      if (x.key === 'struktur') pagesRef.current.forEach((pg, i) => list.push(`divisi:${i}`));
    });
    return list.length > 0 ? list : ['hadir'];
  };
  const phaseRef = useRef('hadir');
  phaseRef.current = phase;
  const step = (dir) => {
    const list = phaseList();
    const i = list.indexOf(phaseRef.current);
    setPhase(list[(i + dir + list.length) % list.length]);
  };
  const stepRef = useRef(step);
  stepRef.current = step;

  // tombol panah kiri/kanan (termasuk remote TV) pindah bagian
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') stepRef.current(1);
      else if (e.key === 'ArrowLeft') stepRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const loadTraffic = useCallback(() => {
    apiRef.current
      .get('dapi/hr/dashboard-tv/lalu-lintas')
      .then((res) => setTraffic(res.data.data))
      .catch(() => {});
  }, []);

  const loadSlides = useCallback(() => {
    apiRef.current
      .get('dapi/hr/dashboard-tv/slides')
      .then((res) => setSlides(Array.isArray(res.data.data) ? res.data.data : null))
      .catch(() => {});
  }, []);

  const loadOrg = useCallback(() => {
    apiRef.current
      .get('dapi/hr/struktur-organisasi')
      .then((res) => {
        // jabatan kosong tingkat staf ke bawah, "Manajer Eksekutif", dan "Koordinator ..." tidak ditampilkan
        const rows = (Array.isArray(res.data.data) ? res.data.data : []).filter((x) => !(x.vakan && (Number(x.id_base) >= 9 || /^manajer eksekutif|koordinator/i.test(x.jabatan))));
        setOrgRows(rows);
        ensureThumbs(rows.filter((x) => !x.vakan).map((x) => x.employe_id));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    loadStats();
    loadMeetings();
    loadOrg();
    loadSlides();
    loadTraffic();
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, [load, loadStats, loadMeetings, loadOrg, loadSlides, loadTraffic]);

  // bagian yang sedang tampil disembunyikan atau belum diizinkan oleh pengaturan: pindah ke bagian pertama yang tersedia
  useEffect(() => {
    const l = phaseList();
    if (!l.includes(phaseRef.current)) setPhase(l[0]);
  }, [slides, data, stats, meetings, org]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const list = phaseList();
      const i = list.indexOf(phase);
      if (i >= 0 && i < list.length - 1) {
        setPhase(list[i + 1]);
      } else {
        load();
        loadStats();
        loadMeetings();
        loadOrg();
        loadSlides();
        loadTraffic();
        setPhase(phaseList()[0]);
      }
    };
    // lama tayang bagian yang muat satu layar: dari pengaturan PIC Dashboard (detik) bila ada, selain itu bawaan; daftar panjang mengikuti lama gulir
    const cfg = (slidesRef.current || []).find((x) => x.key === orgGroup(phase));
    const dwell = cfg && cfg.durasi ? cfg.durasi * 1000 : (phase.startsWith('grafik') || phase === 'lalulintas' ? CHART_MS : DWELL_MS);

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
  }, [phase, data ? data.tanggal : null, isLibur, load, loadStats, loadMeetings, loadOrg, loadSlides, loadTraffic]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = data ? data.ringkasan : null;
  const tanggal = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const header = (
    <div style={styles.header}>
      <div>
        <div style={styles.brand}>PT Pema · Sistem Informasi</div>
        <h1 style={styles.title}>Ikhtisar Harian Perusahaan</h1>
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
      if (list.length === 0) return <div style={styles.message}>Tidak ada rapat</div>;
      return (
        <div style={{ ...styles.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 38em), 1fr))' }} ref={contentRef} className="abs-fade" key="rapat">
          {list.map((m) => <MeetingCard key={m.id} m={m} now={now} />)}
        </div>
      );
    }
    if (phase === 'struktur' && org) {
      return (
        <div style={{ ...styles.grid, display: 'block' }} ref={contentRef} className="abs-fade" key="struktur">
          <div style={{ display: 'flex', justifyContent: 'center' }}><OrgNode n={org} depth={0} /></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '.4em 0' }}>
            {org.children.filter((c) => Number(c.id_base) === 4).map((c, i, arr) => <OrgNode key={c.employe_id} n={c} depth={1} up pos={posOf(i, arr.length)} />)}
          </div>
        </div>
      );
    }
    if (phase.indexOf('divisi:') === 0 && pages[Number(phase.slice(7))]) {
      const pg = pages[Number(phase.slice(7))];
      const lvls = orgLevels(pg.units);
      return (
        <div style={{ ...styles.grid, display: 'block' }} ref={contentRef} className="abs-fade" key={phase}>
          {pg.chain.map((n, i) => (
            <div key={n.employe_id} style={{ display: 'flex', justifyContent: 'center' }}><OrgNode n={n} depth={i === 0 ? 0 : 1} up={i > 0} /></div>
          ))}
          {lvls.map((lv) => {
            // kelompokkan menurut atasan langsung; bila satu baris berisi bawahan beberapa atasan, tiap kelompok diberi keterangan atasannya
            const groups = [];
            lv.forEach((n) => {
              const last = groups[groups.length - 1];
              if (last && last.pid === n.parentId) last.items.push(n);
              else groups.push({ pid: n.parentId, label: n.parentLabel, items: [n] });
            });
            return (
              <div key={lv[0].employe_id}>
                {groups.map((g) => (
                  <div key={g.pid || 'x'}>
                    {groups.length > 1 && g.label ? <div style={{ textAlign: 'center', fontSize: '.85em', color: C.faint, padding: '.5em 0 .1em' }}>Tim kerja {g.label}</div> : null}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '.4em 0' }}>
                      {g.items.map((n, i) => <OrgNode key={n.employe_id} n={n} depth={rankDepth(n)} up pos={posOf(i, g.items.length)} />)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      );
    }
    if (phase === 'lalulintas') {
      return (
        <div className="abs-fade" key="lalulintas" style={{ height: '100%' }}>
          <TrafficPanel traffic={traffic} />
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
    rapat: `Jadwal Rapat · Hari Ini & Mendatang (${rapatCount})`,
    struktur: `Struktur Organisasi · Direksi${org ? ` (${org.total + 1} karyawan)` : ''}`,
    grafikHari: `Grafik Kehadiran Karyawan Harian${stats ? ` · ${stats.bulan}` : ''}`,
    grafikBulan: `Grafik Kehadiran Karyawan Bulanan${stats ? ` · ${stats.tahun}` : ''}`,
    lalulintas: 'Lalu Lintas Banda Aceh dan Sekitarnya',
  }[phase] || (pages[Number(phase.slice(7))] ? `${pages[Number(phase.slice(7))].divisi} (${pages[Number(phase.slice(7))].count})` : '');
  const phaseColor = PHASE_COLOR[orgGroup(phase)];

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
        {phase.indexOf('divisi:') === 0 ? <div style={styles.legend}>Divisi {Number(phase.slice(7)) + 1} dari {pages.length}</div> : null}
        <div style={styles.nav}>
          <button type="button" className="abs-nav" style={styles.navBtn(false, phaseColor)} onClick={() => setPhase(phaseList()[0])} aria-label="Pertama">&#171;</button>
          <button type="button" className="abs-nav" style={styles.navBtn(false, phaseColor)} onClick={() => step(-1)} aria-label="Sebelumnya">&#8249;</button>
          <span style={styles.navBtn(true, phaseColor)} title={PHASE_LABEL[orgGroup(phase)]}>
            {phaseList().map(orgGroup).filter((k, i, arr) => arr.indexOf(k) === i).indexOf(orgGroup(phase)) + 1}
          </span>
          <button type="button" className="abs-nav" style={styles.navBtn(false, phaseColor)} onClick={() => step(1)} aria-label="Berikutnya">&#8250;</button>
          <button type="button" className="abs-nav" style={styles.navBtn(false, phaseColor)} onClick={() => { const l = phaseList(); setPhase(l[l.length - 1]); }} aria-label="Terakhir">&#187;</button>
        </div>
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
