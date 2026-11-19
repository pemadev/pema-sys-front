import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'reactstrap';
import MaterialIcon from '@material/react-material-icon';
import './ModalProses.css';

const SUMBER_TIKET = [
  { key: 'umum', ikon: 'confirmation_number', judul: 'Diupload oleh divisi umum', ket: 'Divisi umum memesan dan mengunggah tiket pergi / pulang beserta total harganya.' },
  { key: 'mandiri', ikon: 'person', judul: 'Dipesan mandiri', ket: 'Pelaksana atau admin pengaju memesan sendiri; tiketnya diupload nanti saat realisasi.' },
];

const JUDUL_JENIS = {
  pemesanan_tiket: 'Pemesanan Tiket',
  uangmuka: 'Uang Muka',
  realisasi: 'Realisasi / Bukti Bayar',
};

const inisial = (nama) =>
  String(nama || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join('')
    .toUpperCase();

const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);

const tanggal = (v) => {
  const d = v ? new Date(String(v).replace(' ', 'T')) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';
};

const WaIkon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
  </svg>
);

const KartuKontak = ({ peran, nama, jabatan, nomor, pesan }) => (
  <div className="lp-kontak">
    <div className="lp-kontak-atas">
      <div className="lp-avatar" aria-hidden="true">{inisial(nama)}</div>
      <div style={{ minWidth: 0 }}>
        <div className="lp-kontak-peran">{peran}</div>
        <div className="lp-kontak-nama">{nama || '-'}</div>
        {jabatan ? <div className="lp-kontak-jabatan">{jabatan}</div> : null}
      </div>
    </div>
    {nomor && nomor.length > 0 ? (
      <div className="lp-wa-daftar">
        {nomor.map((n) => (
          <a
            key={n.wa}
            className="lp-wa"
            href={`https://wa.me/${n.wa}?text=${encodeURIComponent(pesan)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Hubungi ${nama} lewat WhatsApp ${n.tampil}`}
          >
            <WaIkon />
            <span>{n.tampil}</span>
            <span className="lp-wa-aksi">Hubungi</span>
          </a>
        ))}
      </div>
    ) : (
      <div className="lp-kosong">Nomor WhatsApp belum tersedia</div>
    )}
  </div>
);

const kontakShape = PropTypes.shape({ tampil: PropTypes.string, wa: PropTypes.string });

KartuKontak.propTypes = {
  peran: PropTypes.string.isRequired,
  nama: PropTypes.string,
  jabatan: PropTypes.string,
  nomor: PropTypes.arrayOf(kontakShape),
  pesan: PropTypes.string.isRequired,
};
KartuKontak.defaultProps = { nama: '', jabatan: '', nomor: [] };

const tglPendek = (v) => {
  const d = v ? new Date(String(v).replace(' ', 'T')) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
};

// Ringkasan uang muka per kategori biaya (lembar proses KeuanganSppd) + tombol unduh dokumen perhitungan uang muka
const STATUS_TIKET = {
  tanpa: { ikon: 'block', kelas: 'tanpa', judul: 'Tidak memerlukan tiket', ket: 'Perjalanan ini tidak memerlukan tiket, tidak diproses oleh divisi umum.' },
  mandiri: { ikon: 'person', kelas: 'mandiri', judul: 'Tiket dibeli mandiri', ket: 'Dibeli sendiri oleh pelaksana atau admin pengaju; tiket diupload saat realisasi.' },
  umum: { ikon: 'confirmation_number', kelas: 'umum', judul: 'Tiket dibeli oleh divisi umum', ket: '' },
  menunggu: { ikon: 'hourglass_empty', kelas: 'tanpa', judul: 'Tiket belum diproses divisi umum', ket: '' },
};

const RingkasanBiaya = ({ ringkasan, memuat, onUnduh, menyiapkan, baseUrl }) => (
  <div className="lp-bagian">
    <p className="lp-label">Ringkasan biaya uang muka</p>
    {memuat ? <div className="lp-kosong">Memuat perhitungan biaya...</div> : null}
    {!memuat && !ringkasan ? <div className="lp-kosong">Perhitungan biaya belum tersedia.</div> : null}
    {ringkasan ? (
      <>
        {(ringkasan.rate || []).map((tj, i) => (
          <div className="lp-rate" key={`rate-${tj.tujuan}-${i + 1}`}>
            <div className="lp-rate-kepala">
              <strong>{tj.tujuan}</strong>
              <span className="lp-rate-chip">{tj.kategori.kategori || '-'}</span>
            </div>
            <div className="lp-rate-meta">
              Renbis: <strong>{tj.kategori.renbis || '-'}</strong>
              {tj.kategori.kegiatan_bisnis ? ` (${tj.kategori.kegiatan_bisnis})` : ''}
            </div>
            <div className="lp-rate-meta">
              {[tj.kategori.jenis, tj.kategori.moda ? `moda ${tj.kategori.moda}` : null, tj.kategori.sumber_biaya ? `biaya ${tj.kategori.sumber_biaya}` : null].filter(Boolean).join(' · ')}
            </div>
            <div className="lp-rate-meta">
              {tj.hari} hari ({tj.malam} malam) · hitung {tj.kategori.rate_hari} hari (berangkat {tj.kategori.rate_berangkat}, tiba {tj.kategori.rate_tiba})
            </div>
          </div>
        ))}
        <table className="lp-tabel">
          <thead>
            <tr>
              <th>Kategori</th>
              <th className="lp-kanan">Perkiraan</th>
              <th className="lp-kanan">Uang muka</th>
            </tr>
          </thead>
          <tbody>
            {ringkasan.komponen.map((k) => (
              <tr key={k.kode}>
                <td>
                  {k.nama}
                  <small className="lp-pct">
                    {k.persen}%{k.catatan ? ` · ${k.catatan}` : ''}
                  </small>
                </td>
                <td className="lp-kanan">{rupiah(k.dasar)}</td>
                <td className="lp-kanan">{rupiah(k.jumlah)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Total uang muka</td>
              <td className="lp-kanan">{rupiah(ringkasan.total)}</td>
            </tr>
          </tfoot>
        </table>
        <div className={`lp-status-tiket ${(STATUS_TIKET[ringkasan.tiket.status] || STATUS_TIKET.menunggu).kelas}`}>
          <MaterialIcon icon={(STATUS_TIKET[ringkasan.tiket.status] || STATUS_TIKET.menunggu).ikon} />
          <span>
            <strong>{(STATUS_TIKET[ringkasan.tiket.status] || STATUS_TIKET.menunggu).judul}</strong>
            {(STATUS_TIKET[ringkasan.tiket.status] || STATUS_TIKET.menunggu).ket ? <small className="lp-pct">{(STATUS_TIKET[ringkasan.tiket.status] || STATUS_TIKET.menunggu).ket}</small> : null}
          </span>
        </div>
        {ringkasan.tiket.status === 'umum' || ringkasan.tiket.ada ? (
          <div className="lp-tiket-ringkas">
            <span>
              Tiket
              <small className="lp-pct">aktual, dibayar ke vendor</small>
            </span>
            <span>{ringkasan.tiket.ada ? rupiah(ringkasan.tiket.jumlah) : 'Belum ada'}</span>
          </div>
        ) : null}
        {(ringkasan.tiket.daftar || []).length > 0 ? (
          <div className="lp-tiket-daftar">
            {ringkasan.tiket.daftar.map((x) => (
              <div className="lp-tiket-baris" key={x.id}>
                <div className="lp-tiket-info">
                  <span className={`lp-arah-chip ${x.arah === 'pulang' ? 'pulang' : 'pergi'}`}>{x.arah === 'pulang' ? 'Pulang' : 'Pergi'}</span>
                  <span className="lp-tiket-ket">
                    {x.keterangan || 'Tiket'}
                    <small className="lp-pct">{x.tujuan}</small>
                  </span>
                </div>
                <div className="lp-tiket-kanan">
                  <strong>{rupiah(x.harga)}</strong>
                  {x.file ? (
                    <a className="lp-unduh-tiket" href={`${(baseUrl || '').replace(/\/+$/, '')}/sppd/${x.file}`} target="_blank" rel="noopener noreferrer" download>
                      <MaterialIcon icon="download" /> Unduh
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </>
    ) : null}
    {ringkasan && ringkasan.ekstend ? null : (
      <button type="button" className="lp-unduh" onClick={onUnduh} disabled={menyiapkan}>
        <MaterialIcon icon="download" />
        {menyiapkan ? 'Menyiapkan dokumen...' : 'Unduh dokumen perhitungan uang muka'}
      </button>
    )}
  </div>
);

const ringkasanShape = PropTypes.shape({
  ekstend: PropTypes.bool,
  komponen: PropTypes.arrayOf(PropTypes.shape({ kode: PropTypes.string, nama: PropTypes.string, persen: PropTypes.number, dasar: PropTypes.number, jumlah: PropTypes.number, catatan: PropTypes.string })),
  rate: PropTypes.arrayOf(PropTypes.shape({ tujuan: PropTypes.string, hari: PropTypes.number, malam: PropTypes.number, kategori: PropTypes.shape({}), komponen: PropTypes.arrayOf(PropTypes.shape({})) })),
  tiket: PropTypes.shape({ jumlah: PropTypes.number, ada: PropTypes.bool, daftar: PropTypes.arrayOf(PropTypes.shape({})), status: PropTypes.string }),
  total: PropTypes.number,
  bertahap: PropTypes.bool,
  termin: PropTypes.arrayOf(PropTypes.shape({ tujuan: PropTypes.string, daftar: PropTypes.arrayOf(PropTypes.shape({ no: PropTypes.number, tgl: PropTypes.string, ket: PropTypes.string, jumlah: PropTypes.number })) })),
});

RingkasanBiaya.propTypes = {
  ringkasan: ringkasanShape,
  memuat: PropTypes.bool,
  onUnduh: PropTypes.func.isRequired,
  menyiapkan: PropTypes.bool,
  baseUrl: PropTypes.string,
};
RingkasanBiaya.defaultProps = { ringkasan: null, memuat: false, menyiapkan: false, baseUrl: '' };

const labelJatuhTempo = (v) => {
  const d = v ? new Date(`${String(v).slice(0, 10)}T00:00:00`) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const hari = Math.round((d - new Date(new Date().toDateString())) / 86400000);
  if (hari === 0) return { teks: 'Hari ini', kelas: 'lp-jt-segera' };
  if (hari === 1) return { teks: 'Besok', kelas: 'lp-jt-segera' };
  if (hari < 0) return { teks: `Terlambat ${-hari} hari`, kelas: 'lp-jt-telat' };
  return null;
};

// Termin uang muka + upload bukti transfer per termin (lembar proses KeuanganSppd)
const TerminBukti = ({ ringkasan, pilihan, onPilih, baseUrl }) => {
  if (!ringkasan) return null;
  const fileBase = `${(baseUrl || '').replace(/\/+$/, '')}/sppd/`;
  const semua = ringkasan.termin.flatMap((x) => x.daftar);
  const sudah = semua.filter((x) => x.bukti).length;

  return (
    <div className="lp-bagian">
      <p className="lp-label">
        Termin pembayaran dan bukti transfer
        <span className="lp-progres">
          {sudah}/{semua.length} termin
        </span>
      </p>
      <div className="lp-termin">
        {ringkasan.termin.map((tj) => (
          <div key={tj.tujuan} className="lp-termin-blok">
            {ringkasan.termin.length > 1 ? <div className="lp-termin-tujuan">{tj.tujuan}</div> : null}
            {tj.daftar.map((x) => {
              const jt = x.bukti ? null : labelJatuhTempo(x.tgl);
              const dipilih = pilihan[x.kunci];
              return (
                <div key={x.kunci} className="lp-termin-item">
                  <div className="lp-termin-info">
                    <div className="lp-termin-nama">
                      Termin {x.no} <span className="lp-pct-inline">· {x.ket}</span>
                    </div>
                    <div className="lp-termin-meta">
                      Jatuh tempo {tglPendek(x.tgl)}
                      {jt ? <span className={`lp-jt ${jt.kelas}`}>{jt.teks}</span> : null}
                    </div>
                  </div>
                  <div className="lp-termin-jumlah">{rupiah(x.jumlah)}</div>
                  <div className="lp-termin-aksi">
                    {x.bukti ? (
                      <div className="lp-bukti-ada">
                        <a href={`${fileBase}${x.bukti.file}`} target="_blank" rel="noopener noreferrer">
                          <MaterialIcon icon="check_circle" /> Bukti terupload
                        </a>
                        <small>
                          {tglPendek(x.bukti.tgl_upload)}
                          {x.bukti.oleh ? ` · ${x.bukti.oleh}` : ''}
                        </small>
                      </div>
                    ) : (
                      <label className={`lp-berkas lp-berkas-kecil${dipilih ? ' ada' : ''}`} htmlFor={`bukti-${x.kunci}`}>
                        <MaterialIcon icon={dipilih ? 'check_circle' : 'upload_file'} />
                        <span>{dipilih ? dipilih.fileName : 'Upload bukti transfer'}</span>
                        <input
                          id={`bukti-${x.kunci}`}
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          onChange={(e) => onPilih(x.kunci, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

TerminBukti.propTypes = {
  ringkasan: ringkasanShape,
  pilihan: PropTypes.objectOf(PropTypes.shape({ fileName: PropTypes.string })),
  onPilih: PropTypes.func.isRequired,
  baseUrl: PropTypes.string,
};
TerminBukti.defaultProps = { ringkasan: null, pilihan: {}, baseUrl: '' };


const ModalProses = ({
  isOpen,
  toggle,
  sppd,
  tujuan,
  sumber,
  onSumber,
  tikets,
  onUbahTiket,
  onTambahTiket,
  onHapusTiket,
  onFileTiket,
  docName,
  onDoc,
  onSelesai,
  mode,
  baseUrl,
  ringkasan,
  memuatRingkasan,
  onUnduhHitungan,
  menyiapkanUnduh,
  buktiPilihan,
  onPilihBukti,
  jumlahBukti,
}) => {
  const ubah = mode === 'ubah';
  const jenis = sppd?.type_proses;
  const isTiket = jenis === 'pemesanan_tiket';
  const adaKontak = isTiket && Array.isArray(sppd?.pelaksana_hp);
  const total = tikets.reduce((s, t) => s + (Number(t.harga) || 0), 0);
  const mulai = tanggal(sppd?.mulai_tugas);
  const selesai = tanggal(sppd?.selesai_tugas);

  const pesan = (nama) =>
    `Halo ${nama || ''}, saya dari Divisi Umum PT PEMA. Mohon konfirmasi terkait tiket untuk SPPD ${
      sppd?.nomor_sppd || ''
    } (${mulai} - ${selesai}). Apakah tiket diurus sendiri atau dipesankan oleh Divisi Umum? Terima kasih.`;

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" centered scrollable fullscreen="md" contentClassName="lp">
      <div className="lp-head">
        <div className="lp-head-ikon" aria-hidden="true">
          <MaterialIcon icon={isTiket ? 'confirmation_number' : 'receipt_long'} />
        </div>
        <div className="lp-head-teks">
          <h5 className="lp-judul">Lembar Proses</h5>
          <p className="lp-sub">{ubah ? 'Ubah Tiket (tiket pulang dan lainnya masih bisa ditambah atau diubah)' : JUDUL_JENIS[jenis] || 'Proses SPPD'}</p>
        </div>
        <button type="button" className="lp-tutup" onClick={toggle} aria-label="Tutup">
          <MaterialIcon icon="close" />
        </button>
      </div>

      <div className="lp-badan">
        <div className="lp-bagian">
          <p className="lp-label">Ringkasan SPPD</p>
          <div className="lp-ringkas">
            <div className="lp-ringkas-no">{sppd?.nomor_sppd || '-'}</div>
            {sppd?.mode_ekstend ? (
              <div className="lp-ringkas-meta">
                <span className="lp-rate-chip">Extend</span> {sppd.ekstend_judul}
              </div>
            ) : null}
            <div className="lp-ringkas-meta">
              {mulai} s.d. {selesai}
            </div>
            {isTiket && tujuan.length > 0 ? (
              <div className="lp-tujuan">
                {tujuan.map((tj) => (
                  <span className="lp-chip" key={tj.id}>
                    <MaterialIcon icon="place" style={{ fontSize: 14 }} />
                    {tj.detail_tujuan} · {tanggal(tj.waktu_berangkat)} - {tanggal(tj.waktu_kembali)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {adaKontak ? (
          <div className="lp-bagian">
            <p className="lp-label">Hubungi untuk konfirmasi</p>
            <div className="lp-kontak-grid">
              <KartuKontak
                peran="Pelaksana SPPD"
                nama={sppd.nama}
                jabatan={sppd.jabatan}
                nomor={sppd.pelaksana_hp}
                pesan={pesan(sppd.nama)}
              />
              <KartuKontak
                peran="Admin yang mengajukan"
                nama={sppd.first_name}
                jabatan={sppd.pengaju_jabatan}
                nomor={sppd.pengaju_hp}
                pesan={pesan(sppd.first_name)}
              />
            </div>
          </div>
        ) : null}

        {isTiket ? (
          <>
            <div className="lp-bagian">
              <p className="lp-label">Sumber tiket</p>
              <div className="lp-sumber" role="radiogroup" aria-label="Sumber tiket">
                {SUMBER_TIKET.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={sumber === o.key}
                    className={`lp-opsi${sumber === o.key ? ' aktif' : ''}`}
                    onClick={() => onSumber(o.key)}
                  >
                    <span className="lp-opsi-ikon">
                      <MaterialIcon icon={o.ikon} />
                    </span>
                    <span>
                      <div className="lp-opsi-judul">{o.judul}</div>
                      <div className="lp-opsi-ket">{o.ket}</div>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {sumber === 'umum' ? (
              <div className="lp-bagian">
                <p className="lp-label">Tiket ({tikets.length})</p>
                {tikets.map((t, i) => (
                  <div className="lp-tiket" key={t.uid}>
                    <div className="lp-tiket-atas">
                      <span className="lp-tiket-no">Tiket {i + 1}</span>
                      <div className="lp-arah" role="radiogroup" aria-label={`Arah tiket ${i + 1}`}>
                        {[
                          ['pergi', 'Pergi'],
                          ['pulang', 'Pulang'],
                        ].map(([k, label]) => (
                          <button
                            key={k}
                            type="button"
                            role="radio"
                            aria-checked={t.arah === k}
                            className={t.arah === k ? 'aktif' : ''}
                            onClick={() => onUbahTiket(t.uid, { arah: k })}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button type="button" className="lp-hapus" aria-label={`Hapus tiket ${i + 1}`} onClick={() => onHapusTiket(t.uid)}>
                        <MaterialIcon icon="delete" />
                      </button>
                    </div>
                    <div className="lp-form">
                      <label className="lp-field lp-penuh" htmlFor={`tj-${t.uid}`}>
                        <span className="lp-field-nama">Tujuan SPPD</span>
                        <select
                          id={`tj-${t.uid}`}
                          className="lp-input"
                          value={t.id_tujuan}
                          onChange={(e) => onUbahTiket(t.uid, { id_tujuan: e.target.value })}
                        >
                          <option value="">Pilih tujuan SPPD</option>
                          {tujuan.map((tj) => (
                            <option key={tj.id} value={tj.id}>
                              {tj.detail_tujuan}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="lp-field lp-penuh" htmlFor={`ket-${t.uid}`}>
                        <span className="lp-field-nama">Keterangan tiket</span>
                        <input
                          id={`ket-${t.uid}`}
                          type="text"
                          className="lp-input"
                          placeholder="Maskapai, jam, rute, kode booking"
                          maxLength={255}
                          value={t.keterangan}
                          onChange={(e) => onUbahTiket(t.uid, { keterangan: e.target.value })}
                        />
                      </label>
                      <label className="lp-field" htmlFor={`hrg-${t.uid}`}>
                        <span className="lp-field-nama">Total harga tiket</span>
                        <div className="lp-rp">
                          <span>Rp</span>
                          <input
                            id={`hrg-${t.uid}`}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            className="lp-input"
                            placeholder="0"
                            value={t.harga}
                            onChange={(e) => onUbahTiket(t.uid, { harga: e.target.value })}
                          />
                        </div>
                      </label>
                      <div className="lp-field">
                        <span className="lp-field-nama">File tiket (PDF)</span>
                        <label className={`lp-berkas${t.fileName || t.fileUrl ? ' ada' : ''}`} htmlFor={`file-${t.uid}`}>
                          <MaterialIcon icon={t.fileName || t.fileUrl ? 'check_circle' : 'upload_file'} />
                          <span>{t.fileName || (t.fileUrl ? 'Tiket tersimpan (klik untuk mengganti)' : 'Pilih file PDF')}</span>
                          <input
                            id={`file-${t.uid}`}
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => onFileTiket(t.uid, e.target.files[0])}
                          />
                        </label>
                        {t.fileUrl ? (
                          <a className="lp-lihat" href={`${(baseUrl || '').replace(/\/+$/, '')}/sppd/${t.fileUrl}`} target="_blank" rel="noopener noreferrer">
                            Lihat tiket tersimpan
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="lp-tambah" onClick={onTambahTiket}>
                  <MaterialIcon icon="add" /> Tambah tiket
                </button>
                {tikets.length > 0 ? (
                  <div className="lp-total">
                    <span>
                      Total harga tiket
                      <small>{tikets.length} tiket</small>
                    </span>
                    <span>{rupiah(total)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {sumber === 'mandiri' ? (
              <div className="lp-info">
                <MaterialIcon icon="info" />
                <span>
                  Tiket dipesan mandiri, jadi belum perlu diunggah sekarang. Pelaksana SPPD atau admin pengaju mengunggahnya nanti saat realisasi.
                  Hubungi lewat WhatsApp di atas bila perlu konfirmasi.
                  {ubah ? ' Tiket divisi umum yang sebelumnya diunggah akan dihapus saat perubahan disimpan.' : ''}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {jenis === 'uangmuka' ? (
              <>
                <RingkasanBiaya ringkasan={ringkasan} memuat={memuatRingkasan} onUnduh={onUnduhHitungan} menyiapkan={menyiapkanUnduh} baseUrl={baseUrl} />
                <TerminBukti ringkasan={ringkasan} pilihan={buktiPilihan} onPilih={onPilihBukti} baseUrl={baseUrl} />
              </>
            ) : (
              <div className="lp-bagian">
                <p className="lp-label">Bukti bayar</p>
                <label className={`lp-berkas${docName ? ' ada' : ''}`} htmlFor="lp-doc">
                  <MaterialIcon icon={docName ? 'check_circle' : 'upload_file'} />
                  <span>{docName || 'Pilih file PDF bukti bayar'}</span>
                  <input id="lp-doc" type="file" accept="application/pdf" onChange={(e) => onDoc(e.target.files[0])} />
                </label>
              </div>
            )}
          </>
        )}
      </div>

      <div className="lp-kaki">
        <button type="button" className="lp-tombol" onClick={toggle}>
          Batal
        </button>
        <button type="button" className="lp-tombol utama" onClick={onSelesai}>
          {ubah ? 'Simpan perubahan' : jenis === 'uangmuka' ? `Simpan bukti transfer${jumlahBukti > 0 ? ` (${jumlahBukti})` : ''}` : 'Selesai diproses'}
        </button>
      </div>
    </Modal>
  );
};

ModalProses.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  sppd: PropTypes.shape({
    nomor_sppd: PropTypes.string,
    mode_ekstend: PropTypes.bool,
    ekstend_judul: PropTypes.string,
    nama: PropTypes.string,
    jabatan: PropTypes.string,
    first_name: PropTypes.string,
    mulai_tugas: PropTypes.string,
    selesai_tugas: PropTypes.string,
    type_proses: PropTypes.string,
    pengaju_jabatan: PropTypes.string,
    pelaksana_hp: PropTypes.arrayOf(kontakShape),
    pengaju_hp: PropTypes.arrayOf(kontakShape),
  }),
  tujuan: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      detail_tujuan: PropTypes.string,
      waktu_berangkat: PropTypes.string,
      waktu_kembali: PropTypes.string,
    }),
  ),
  sumber: PropTypes.string,
  onSumber: PropTypes.func.isRequired,
  tikets: PropTypes.arrayOf(
    PropTypes.shape({
      uid: PropTypes.string,
      id_tujuan: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      arah: PropTypes.string,
      keterangan: PropTypes.string,
      fileName: PropTypes.string,
      fileUrl: PropTypes.string,
      harga: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ),
  onUbahTiket: PropTypes.func.isRequired,
  onTambahTiket: PropTypes.func.isRequired,
  onHapusTiket: PropTypes.func.isRequired,
  onFileTiket: PropTypes.func.isRequired,
  docName: PropTypes.string,
  onDoc: PropTypes.func.isRequired,
  onSelesai: PropTypes.func.isRequired,
  mode: PropTypes.string,
  baseUrl: PropTypes.string,
  ringkasan: ringkasanShape,
  memuatRingkasan: PropTypes.bool,
  onUnduhHitungan: PropTypes.func,
  menyiapkanUnduh: PropTypes.bool,
  buktiPilihan: PropTypes.objectOf(PropTypes.shape({ fileName: PropTypes.string })),
  onPilihBukti: PropTypes.func,
  jumlahBukti: PropTypes.number,
};
ModalProses.defaultProps = { sppd: null, tujuan: [], sumber: '', tikets: [], docName: '', mode: 'proses', baseUrl: '', ringkasan: null, memuatRingkasan: false, onUnduhHitungan: () => {}, menyiapkanUnduh: false, buktiPilihan: {}, onPilihBukti: () => {}, jumlahBukti: 0 };

export default ModalProses;
