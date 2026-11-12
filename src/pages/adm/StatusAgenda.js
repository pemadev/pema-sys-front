import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

const base = `${process.env.REACT_APP_BASEURL}`.replace(/\/$/, '');

const STATUS = {
  selesai: { kelas: 'selesai', label: 'Selesai', ket: 'Surat telah ditindaklanjuti' },
  diproses: { kelas: 'diproses', label: 'Diproses', ket: 'Surat sedang dalam proses tindak lanjut' },
};

const CSS = `
.sa-root { --sa-bg:#f4f6f8; --sa-kartu:#fff; --sa-teks:#101828; --sa-lembut:#475467; --sa-redup:#667085; --sa-garis:#eaecf0;
  --sa-aksen:#17483d; --sa-ok:#067647; --sa-ok-bg:#ecfdf3; --sa-ok-garis:#abefc6;
  --sa-proses:#b54708; --sa-proses-bg:#fffaeb; --sa-proses-garis:#fedf89; --sa-err:#b42318; --sa-err-bg:#fef3f2; --sa-ikon-teks:#fff;
  min-height:100vh; background:var(--sa-bg); color:var(--sa-teks); font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
  -webkit-font-smoothing:antialiased; padding:0 0 40px; }
@media (prefers-color-scheme: dark) {
  .sa-root { --sa-bg:#0d1218; --sa-kartu:#151c25; --sa-teks:#f2f4f7; --sa-lembut:#cbd2dc; --sa-redup:#98a2b3; --sa-garis:#27303c;
    --sa-aksen:#5fc4a6; --sa-ok:#47cd89; --sa-ok-bg:#0b2a1b; --sa-ok-garis:#134e2e;
    --sa-proses:#fdb022; --sa-proses-bg:#2b1d05; --sa-proses-garis:#5c3d0a; --sa-err:#f97066; --sa-err-bg:#2c1210; --sa-ikon-teks:#0d1218; }
}
.sa-root *, .sa-root *::before, .sa-root *::after { box-sizing:border-box; }
.sa-bar { background:var(--sa-kartu); border-bottom:1px solid var(--sa-garis); }
.sa-bar-in { max-width:720px; margin:0 auto; padding:14px 16px; display:flex; align-items:center; gap:12px; }
.sa-logo { width:36px; height:36px; border-radius:10px; background:var(--sa-aksen); color:var(--sa-ikon-teks); display:grid; place-items:center; font-weight:700; font-size:.7rem; letter-spacing:.04em; flex-shrink:0; }
.sa-merk { font-weight:700; letter-spacing:.08em; color:var(--sa-aksen); line-height:1.1; }
.sa-sub { font-size:.78rem; color:var(--sa-redup); }
.sa-wrap { max-width:720px; margin:0 auto; padding:20px 16px 0; }
.sa-kartu { background:var(--sa-kartu); border:1px solid var(--sa-garis); border-radius:16px; box-shadow:0 1px 2px rgba(16,24,40,.05),0 8px 24px rgba(16,24,40,.06); overflow:hidden; }
.sa-hero { padding:22px 20px; display:flex; flex-direction:column; gap:14px; border-bottom:1px solid var(--sa-garis); }
.sa-label { font-size:.72rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--sa-redup); }
.sa-nomor { font-size:clamp(1.25rem,5.2vw,1.75rem); font-weight:700; letter-spacing:-.01em; overflow-wrap:anywhere; line-height:1.25; margin-top:4px; }
.sa-status { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:12px; border:1px solid; }
.sa-status.selesai { background:var(--sa-ok-bg); border-color:var(--sa-ok-garis); color:var(--sa-ok); }
.sa-status.diproses { background:var(--sa-proses-bg); border-color:var(--sa-proses-garis); color:var(--sa-proses); }
.sa-ikon { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; background:currentColor; flex-shrink:0; }
.sa-ikon svg { width:18px; height:18px; stroke:var(--sa-ikon-teks); fill:none; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; }
.sa-status b { display:block; font-size:1.05rem; line-height:1.2; }
.sa-status span.ket { font-size:.82rem; opacity:.9; }
.sa-bagian { padding:20px; }
.sa-bagian + .sa-bagian { border-top:1px solid var(--sa-garis); }
.sa-judul { font-size:.95rem; font-weight:600; margin:0 0 14px; }
.sa-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px 24px; margin:0; }
.sa-grid > div { min-width:0; }
.sa-grid .penuh { grid-column:1 / -1; }
.sa-grid dt { font-size:.74rem; color:var(--sa-redup); margin:0 0 3px; font-weight:500; }
.sa-grid dd { margin:0; font-size:.93rem; color:var(--sa-teks); overflow-wrap:anywhere; line-height:1.45; }
.sa-garis { list-style:none; margin:0; padding:0; }
.sa-garis li { position:relative; display:flex; gap:14px; padding-bottom:18px; }
.sa-garis li:last-child { padding-bottom:0; }
.sa-garis li::before { content:''; position:absolute; left:6px; top:16px; bottom:-2px; width:2px; background:var(--sa-garis); }
.sa-garis li:last-child::before { display:none; }
.sa-titik { width:14px; height:14px; border-radius:50%; background:var(--sa-kartu); border:3px solid var(--sa-aksen); margin-top:3px; flex-shrink:0; z-index:1; }
.sa-garis li:last-child .sa-titik { background:var(--sa-aksen); }
.sa-langkah { min-width:0; }
.sa-langkah div { font-size:.92rem; line-height:1.4; overflow-wrap:anywhere; }
.sa-langkah small { font-size:.78rem; color:var(--sa-redup); }
.sa-foot { text-align:center; font-size:.76rem; color:var(--sa-redup); margin-top:18px; padding:0 8px; line-height:1.5; }
.sa-err { padding:28px 20px; text-align:center; }
.sa-err .sa-ikon { background:var(--sa-err-bg); color:var(--sa-err); margin:0 auto 12px; width:44px; height:44px; }
.sa-err .sa-ikon svg { stroke:currentColor; width:22px; height:22px; }
.sa-err h2 { font-size:1.05rem; margin:0 0 6px; }
.sa-err p { margin:0; color:var(--sa-lembut); font-size:.9rem; }
.sa-skel { height:14px; border-radius:6px; background:linear-gradient(90deg,var(--sa-garis),transparent,var(--sa-garis)); background-size:200% 100%; animation:saShim 1.4s infinite; margin:10px 0; }
@keyframes saShim { from { background-position:200% 0; } to { background-position:-200% 0; } }
@media (max-width:520px) {
  .sa-wrap { padding-top:14px; }
  .sa-hero, .sa-bagian { padding:16px; }
  .sa-grid { grid-template-columns:1fr; gap:14px; }
}
@media (prefers-reduced-motion: reduce) { .sa-skel { animation:none; } }
`;

const Cek = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
const Jam = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
const Silang = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// Halaman publik dari QR nomor agenda surat masuk: hanya ringkasan dan status, tanpa isi surat
const StatusAgenda = () => {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = 'Status Surat Masuk';
    axios
      .get(`${base}/dapi/adm/public/agenda/${token}`)
      .then((res) => setInfo(res.data.data))
      .catch(() => setError(true));
  }, [token]);

  const status = STATUS[info?.status] || STATUS.diproses;
  const waktu = (v) => (v ? dayjs(v).locale('id').format('DD MMM YYYY, HH:mm') : '-');

  return (
    <div className="sa-root">
      <style>{CSS}</style>
      <header className="sa-bar">
        <div className="sa-bar-in">
          <div className="sa-logo">PEMA</div>
          <div>
            <div className="sa-merk">PT PEMA</div>
            <div className="sa-sub">Status Surat Masuk</div>
          </div>
        </div>
      </header>

      <main className="sa-wrap">
        {error ? (
          <div className="sa-kartu sa-err" role="alert">
            <div className="sa-ikon">
              <Silang />
            </div>
            <h2>Nomor agenda tidak valid</h2>
            <p>Kode QR ini tidak dikenali atau suratnya sudah tidak ada. Pastikan Anda memindai lembar agenda yang benar.</p>
          </div>
        ) : null}

        {!error && !info ? (
          <div className="sa-kartu" style={{ padding: 20 }} aria-busy="true">
            <div className="sa-skel" style={{ width: '40%' }} />
            <div className="sa-skel" style={{ width: '75%', height: 26 }} />
            <div className="sa-skel" />
            <div className="sa-skel" style={{ width: '90%' }} />
            <div className="sa-skel" style={{ width: '60%' }} />
          </div>
        ) : null}

        {info ? (
          <article className="sa-kartu">
            <section className="sa-hero">
              <div>
                <div className="sa-label">Nomor Agenda</div>
                <div className="sa-nomor">{info.nomor_agenda || '-'}</div>
              </div>
              <div className={`sa-status ${status.kelas}`} role="status">
                <span className="sa-ikon">{info.status === 'selesai' ? <Cek /> : <Jam />}</span>
                <div>
                  <b>{status.label}</b>
                  <span className="ket">{status.ket}</span>
                </div>
              </div>
            </section>

            <section className="sa-bagian">
              <h2 className="sa-judul">Informasi surat</h2>
              <dl className="sa-grid">
                <div>
                  <dt>Nomor surat</dt>
                  <dd>{info.nomor || '-'}</dd>
                </div>
                <div>
                  <dt>Pengirim</dt>
                  <dd>{info.pengirim || '-'}</dd>
                </div>
                <div className="penuh">
                  <dt>Perihal</dt>
                  <dd>{info.perihal || '-'}</dd>
                </div>
                <div>
                  <dt>Tanggal surat</dt>
                  <dd>{info.tgl_surat ? dayjs(info.tgl_surat).locale('id').format('DD MMMM YYYY') : '-'}</dd>
                </div>
                <div>
                  <dt>Diterima</dt>
                  <dd>{waktu(info.diterima)}</dd>
                </div>
              </dl>
            </section>

            <section className="sa-bagian">
              <h2 className="sa-judul">Perjalanan surat</h2>
              <ol className="sa-garis">
                {info.langkah.map((l, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i}>
                    <span className="sa-titik" />
                    <div className="sa-langkah">
                      <div>{l.keterangan}</div>
                      <small>{waktu(l.waktu)}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </article>
        ) : null}

        <p className="sa-foot">Halaman ini hanya menampilkan ringkasan status. Isi dan berkas surat tidak dapat dilihat dari sini.</p>
      </main>
    </div>
  );
};

export default StatusAgenda;
