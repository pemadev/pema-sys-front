import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'reactstrap';
import MaterialIcon from '@material/react-material-icon';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { alert } from '../../components/atoms/Toast';
import useAxios from '../../hooks/useAxios';
import KalenderExtend from './KalenderExtend';
import './ModalProses.css';

const MODA = [
  ['darat', 'Darat', 'directions_car'],
  ['udara', 'Udara', 'flight'],
  ['laut', 'Laut', 'directions_boat'],
];

const JENIS = [
  { key: 'perpanjang', ikon: 'event_repeat', judul: 'Tambah hari', ket: 'Memperpanjang tujuan yang sudah ada.' },
  { key: 'tujuan_baru', ikon: 'add_location_alt', judul: 'Tujuan baru', ket: 'Menambah tujuan lain pada SPPD ini.' },
];

const TIKET = [
  { key: true, ikon: 'confirmation_number', judul: 'Perlu tiket', ket: 'Tiket diproses divisi umum.' },
  { key: false, ikon: 'block', judul: 'Tanpa tiket', ket: 'Hanya uang muka (divisi keuangan).' },
];

const fmt = (v) => (v ? dayjs(v).locale('id').format('DD MMM YYYY') : '-');

// Extend bisa dilakukan berulang kali. Dua jenis: tambah hari pada tujuan yang ada, atau tujuan baru.
// Setelah disetujui, extend masuk proses divisi umum (bila perlu tiket) dan divisi keuangan (uang muka), bersamaan.
const ModalExtend = ({ modalExtend, toggleExtend, sppdDetail, onSubmit }) => {
  const [jenis, setJenis] = useState('perpanjang');
  const [tujuan, setTujuan] = useState('');
  const [tujuanList, setTujuanList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [namaBaru, setNamaBaru] = useState('');
  const [kategori, setKategori] = useState('');
  const [moda, setModa] = useState([]);
  const [perluTiket, setPerluTiket] = useState(false);
  const [mulai, setMulai] = useState('');
  const [hingga, setHingga] = useState('');
  const [alasan, setAlasan] = useState('');
  const [bbm, setBbm] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const api = useAxios();
  // form diisi sekali dengan data extend yang masih menunggu (bila ada) setelah daftar tujuan dimuat
  const sudahIsi = useRef(false);

  useEffect(() => {
    if (modalExtend) {
      sudahIsi.current = false;
      setJenis('perpanjang');
      setTujuan('');
      setNamaBaru('');
      setKategori('');
      setModa([]);
      setPerluTiket(false);
      setMulai('');
      setHingga('');
      setAlasan('');
      setBbm('');
      setMengirim(false);
      if (sppdDetail?.id) {
        api.get(`dapi/sppd/tujuan/${sppdDetail.id}`).then((res) => setTujuanList(res.data.data || []));
        api.get('dapi/sppd/static/category').then((res) => setKategoriList(res.data.data || []));
      } else {
        setTujuanList([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalExtend]);

  // extend pertama yang masih menunggu persetujuan: pengajuan baru MENGEDIT extend ini, jadi form diisi dengan datanya
  const menunggu = (tujuanList[0]?.ekstend_terajukan || []).find((x) => x.status === 'menunggu') || null;
  useEffect(() => {
    if (!modalExtend || sudahIsi.current || !menunggu) return;
    sudahIsi.current = true;
    setJenis(menunggu.tipe === 'tujuan_baru' ? 'tujuan_baru' : 'perpanjang');
    setTujuan(menunggu.tipe === 'tujuan_baru' ? '' : String(menunggu.id_tujuan));
    setNamaBaru(menunggu.nama_tujuan_baru || '');
    setKategori(menunggu.id_kategori ? String(menunggu.id_kategori) : '');
    setModa(menunggu.moda ? String(menunggu.moda).split(',').filter(Boolean) : []);
    setPerluTiket(!!menunggu.perlu_tiket);
    setMulai(menunggu.start);
    setHingga(menunggu.end);
    setAlasan(menunggu.alasan || '');
    setBbm(Number(menunggu.bbm) > 0 ? String(menunggu.bbm) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalExtend, tujuanList]);
  const hariMenunggu = menunggu ? dayjs(menunggu.end).diff(dayjs(menunggu.start), 'day') + 1 : 0;

  // kalender hanya tampil setelah kolom tanggal diklik
  const [kalenderBuka, setKalenderBuka] = useState(false);

  const tujuanDipilih = tujuanList.find((t) => String(t.id) === String(tujuan));
  // extend berikutnya dimulai setelah extend sebelumnya yang sudah disetujui
  const mulaiMinimal = tujuanDipilih?.ekstend_akhir ? dayjs(tujuanDipilih.ekstend_akhir).add(1, 'day').format('YYYY-MM-DD') : '';
  // batas total hari extend per SPPD (dihitung server dari semua extend aktif); tersedia setelah daftar tujuan dimuat
  const maksHari = Number(tujuanList[0]?.ekstend_hari_maks ?? 0);
  const terpakaiHari = Math.max(0, Number(tujuanList[0]?.ekstend_hari_terpakai ?? 0) - hariMenunggu);
  const sisaHari = Math.max(0, maksHari - terpakaiHari);
  // tanggal akhir extend tidak boleh melewati hari terakhir SPPD + maksimal hari extend
  const batasAkhir = tujuanList[0]?.ekstend_batas_akhir || '';
  // data kalender: rentang SPPD (tujuan awal) dan extend yang sudah diajukan
  const sppdMulai = tujuanList.map((t) => t.waktu_berangkat).filter(Boolean).sort()[0];
  const sppdAkhir = tujuanList.map((t) => t.waktu_kembali).filter(Boolean).sort().slice(-1)[0];
  const hari = mulai && hingga && !dayjs(hingga).isBefore(dayjs(mulai)) ? dayjs(hingga).diff(dayjs(mulai), 'day') + 1 : 0;

  const pilihTujuan = (id) => {
    setTujuan(id);
    const t = tujuanList.find((x) => String(x.id) === String(id));
    // tanggal mulai disarankan: sehari setelah extend terakhir, atau sehari setelah tanggal kembali tujuan
    const awal = t?.ekstend_akhir || t?.waktu_kembali;
    if (awal && !mulai) setMulai(dayjs(awal).add(1, 'day').format('YYYY-MM-DD'));
  };

  const ubahModa = (m) => setModa((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const handleSubmit = () => {
    const baru = jenis === 'tujuan_baru';
    if (!baru && !tujuan) {
      alert('error', 'Pilih tujuan yang akan ditambah harinya.');
      return;
    }
    if (baru && (!namaBaru.trim() || !kategori)) {
      alert('error', 'Nama tujuan baru dan kategori harus diisi.');
      return;
    }
    if (!mulai || !hingga) {
      alert('error', 'Tanggal mulai dan hingga harus diisi.');
      return;
    }
    if (dayjs(mulai).isAfter(dayjs(hingga))) {
      alert('error', 'Tanggal mulai tidak boleh lebih besar dari tanggal hingga.');
      return;
    }
    if (!baru && mulaiMinimal && dayjs(mulai).isBefore(dayjs(mulaiMinimal))) {
      alert('error', `Tanggal mulai harus setelah extend sebelumnya (sampai ${fmt(tujuanDipilih.ekstend_akhir)}).`);
      return;
    }
    if (sppdAkhir && !dayjs(mulai).isAfter(dayjs(sppdAkhir), 'day')) {
      alert('error', `Tanggal mulai extend harus setelah hari terakhir SPPD (${fmt(sppdAkhir)}).`);
      return;
    }
    if (batasAkhir && dayjs(hingga).isAfter(dayjs(batasAkhir), 'day')) {
      alert('error', `Tanggal akhir extend maksimal ${maksHari} hari setelah hari terakhir SPPD, yaitu sampai ${fmt(batasAkhir)}.`);
      return;
    }
    if (maksHari > 0 && hari > sisaHari) {
      alert('error', `Total extend maksimal ${maksHari} hari per SPPD. Sudah dipakai ${terpakaiHari} hari (sisa ${sisaHari} hari). Batalkan extend sebelumnya bila ingin menambah.`);
      return;
    }
    if (bbm !== '' && (Number.isNaN(Number(bbm)) || Number(bbm) < 0)) {
      alert('error', 'Uang BBM harus berupa angka (boleh dikosongkan).');
      return;
    }
    if (!alasan.trim()) {
      alert('error', 'Alasan harus diisi.');
      return;
    }
    if (onSubmit) {
      setMengirim(true);
      Promise.resolve(
        onSubmit({ jenis, tujuan, namaBaru: namaBaru.trim(), kategori, moda: moda.join(','), perluTiket, mulai, hingga, alasan: alasan.trim(), bbm: bbm === '' ? 0 : Number(bbm) }),
      ).finally(() => setMengirim(false));
    }
  };

  return (
    <Modal isOpen={modalExtend} toggle={toggleExtend} size="lg" centered scrollable fullscreen="md" contentClassName="lp">
      <div className="lp-head">
        <div className="lp-head-ikon" aria-hidden="true">
          <MaterialIcon icon="more_time" />
        </div>
        <div className="lp-head-teks">
          <h5 className="lp-judul">Extend SPPD</h5>
          <p className="lp-sub">Tambah hari atau tujuan baru; dapat diajukan berulang kali.</p>
        </div>
        <button type="button" className="lp-tutup" onClick={toggleExtend} aria-label="Tutup">
          <MaterialIcon icon="close" />
        </button>
      </div>

      <div className="lp-badan">
        {menunggu ? (
          <div className="lp-bagian">
            <div className="lp-ringkas" style={{ borderLeft: '4px solid #f0ad4e' }}>
              <div className="lp-ringkas-no">Extend {menunggu.no_urut || ''} masih menunggu persetujuan</div>
              <div className="lp-ringkas-meta">
                {menunggu.judul} · {fmt(menunggu.start)} - {fmt(menunggu.end)} ({hariMenunggu} hari)
              </div>
              <small className="lp-pct">Selama belum disetujui, pengajuan di bawah akan mengubah extend ini (bukan membuat extend baru) dan persetujuannya diulang dari awal.</small>
            </div>
          </div>
        ) : null}
        <div className="lp-bagian">
          <p className="lp-label">SPPD</p>
          <div className="lp-ringkas">
            <div className="lp-ringkas-no">{sppdDetail?.nomor_sppd || '-'}</div>
            <div className="lp-ringkas-meta">
              {[sppdDetail?.nama, sppdDetail?.jabatan].filter(Boolean).join(' · ')}
              {sppdDetail?.mulai_tugas ? ` · ${fmt(sppdDetail.mulai_tugas)} - ${fmt(sppdDetail.selesai_tugas)}` : ''}
            </div>
          </div>
          {maksHari > 0 ? (
            <small className="lp-pct" style={{ display: 'block', marginTop: 8, color: sisaHari === 0 ? '#d9534f' : undefined, fontWeight: sisaHari === 0 ? 600 : undefined }}>
              Kuota extend: {terpakaiHari} dari {maksHari} hari terpakai, sisa {sisaHari} hari{batasAkhir ? `; tanggal akhir maksimal ${fmt(batasAkhir)} (${maksHari} hari setelah hari terakhir SPPD)` : ''}.{sisaHari === 0 ? ' Batalkan extend sebelumnya untuk menambah.' : ''}
            </small>
          ) : null}
        </div>

        <div className="lp-bagian">
          <p className="lp-label">Jenis extend</p>
          <div className="lp-sumber" role="radiogroup" aria-label="Jenis extend">
            {JENIS.map((o) => (
              <button key={o.key} type="button" role="radio" aria-checked={jenis === o.key} className={`lp-opsi${jenis === o.key ? ' aktif' : ''}`} onClick={() => setJenis(o.key)}>
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

        <div className="lp-bagian">
          <p className="lp-label">Tujuan</p>
          <div className="lp-form">
            {jenis === 'perpanjang' ? (
              <label className="lp-field lp-penuh" htmlFor="ext-tujuan">
                <span className="lp-field-nama">Tujuan SPPD</span>
                <select id="ext-tujuan" className="lp-input" value={tujuan} onChange={(e) => pilihTujuan(e.target.value)}>
                  <option value="">Pilih tujuan</option>
                  {tujuanList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.detail_tujuan}
                    </option>
                  ))}
                </select>
                {tujuanDipilih?.ekstend_banyak > 0 ? (
                  <small className="lp-pct">
                    Sudah di-extend {tujuanDipilih.ekstend_banyak}x, terakhir sampai {fmt(tujuanDipilih.ekstend_akhir)}.
                  </small>
                ) : null}
              </label>
            ) : (
              <>
                <label className="lp-field lp-penuh" htmlFor="ext-nama">
                  <span className="lp-field-nama">Nama / alamat tujuan baru</span>
                  <input id="ext-nama" className="lp-input" type="text" value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} placeholder="Contoh: Medan" />
                </label>
                <label className="lp-field lp-penuh" htmlFor="ext-kategori">
                  <span className="lp-field-nama">Kategori tujuan (menentukan tarif uang makan, hotel, dll.)</span>
                  <select id="ext-kategori" className="lp-input" value={kategori} onChange={(e) => setKategori(e.target.value)}>
                    <option value="">Pilih kategori</option>
                    {kategoriList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.categori_sppd}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="lp-field lp-penuh">
                  <span className="lp-field-nama">Moda transportasi</span>
                  <div className="lp-tujuan">
                    {MODA.map(([k, label, ikon]) => (
                      <button key={k} type="button" aria-pressed={moda.includes(k)} className={`lp-chip lp-chip-pilih${moda.includes(k) ? ' aktif' : ''}`} onClick={() => ubahModa(k)}>
                        <MaterialIcon icon={ikon} style={{ fontSize: 16 }} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="lp-field lp-penuh">
              <span className="lp-field-nama">Tanggal extend</span>
              <button type="button" className="lp-input kx-pemicu" aria-expanded={kalenderBuka} onClick={() => setKalenderBuka((v) => !v)}>
                <span>
                  {mulai ? fmt(mulai) : 'Pilih tanggal mulai'} {' - '} {hingga ? fmt(hingga) : 'hingga'}
                </span>
                <MaterialIcon icon={kalenderBuka ? 'expand_less' : 'calendar_month'} />
              </button>
              {kalenderBuka ? (
                <KalenderExtend
                  sppdMulai={sppdMulai ? dayjs(sppdMulai).format('YYYY-MM-DD') : ''}
                  sppdAkhir={sppdAkhir ? dayjs(sppdAkhir).format('YYYY-MM-DD') : ''}
                  batasAkhir={batasAkhir}
                  ekstend={(tujuanList[0]?.ekstend_terajukan || []).filter((x) => !menunggu || x.id !== menunggu.id)}
                  mulaiMinimal={jenis === 'perpanjang' ? mulaiMinimal : ''}
                  mulai={mulai}
                  hingga={hingga}
                  onPilih={(m, h) => {
                    setMulai(m);
                    setHingga(h);
                    // tutup otomatis setelah rentang lengkap dipilih
                    if (m && h) setKalenderBuka(false);
                  }}
                />
              ) : null}
            </div>
            {hari > 0 ? (
              <div className="lp-field lp-penuh">
                <small className="lp-pct" style={maksHari > 0 && hari > sisaHari ? { color: '#d9534f', fontWeight: 600 } : undefined}>
                  Lama extend: {hari} hari{maksHari > 0 && hari > sisaHari ? ` (melebihi sisa ${sisaHari} hari)` : ''}
                </small>
              </div>
            ) : null}
          </div>
        </div>

        <div className="lp-bagian">
          <p className="lp-label">Tiket</p>
          <div className="lp-sumber" role="radiogroup" aria-label="Perlu tiket">
            {TIKET.map((o) => (
              <button key={String(o.key)} type="button" role="radio" aria-checked={perluTiket === o.key} className={`lp-opsi${perluTiket === o.key ? ' aktif' : ''}`} onClick={() => setPerluTiket(o.key)}>
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
          <small className="lp-pct">Setelah extend disetujui, tiket (divisi umum) dan uang muka (divisi keuangan) diproses bersamaan.</small>
        </div>

        <div className="lp-bagian">
          <label className="lp-field" htmlFor="ext-bbm">
            <span className="lp-field-nama">Uang BBM (optional)</span>
            <input
              id="ext-bbm"
              className="lp-input"
              type="number"
              min="0"
              inputMode="numeric"
              value={bbm}
              onChange={(e) => setBbm(e.target.value)}
              placeholder="Kosongkan bila tidak ada; isi nominal (Rp) bila dibutuhkan"
            />
            {Number(bbm) > 0 ? <small className="lp-pct">Rp {Number(bbm).toLocaleString('id-ID')} (dihitung 100% pada uang muka extend)</small> : null}
          </label>
          <label className="lp-field" htmlFor="ext-alasan">
            <span className="lp-field-nama">Alasan</span>
            <textarea id="ext-alasan" className="lp-input" rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: Masih mendampingi tim PT PEMA" />
          </label>
        </div>
      </div>

      <div className="lp-kaki">
        <button type="button" className="lp-tombol" onClick={toggleExtend}>
          Batal
        </button>
        <button type="button" className="lp-tombol utama" onClick={handleSubmit} disabled={mengirim}>
          {mengirim ? 'Mengirim...' : menunggu ? 'Simpan perubahan extend' : 'Ajukan extend'}
        </button>
      </div>
    </Modal>
  );
};

ModalExtend.propTypes = {
  modalExtend: PropTypes.bool.isRequired,
  toggleExtend: PropTypes.func.isRequired,
  sppdDetail: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nomor_sppd: PropTypes.string,
    nama: PropTypes.string,
    jabatan: PropTypes.string,
    mulai_tugas: PropTypes.string,
    selesai_tugas: PropTypes.string,
  }),
  onSubmit: PropTypes.func,
};

ModalExtend.defaultProps = { sppdDetail: null, onSubmit: null };

export default ModalExtend;
