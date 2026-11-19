import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'reactstrap';
import MaterialIcon from '@material/react-material-icon';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import useAxios from '../../hooks/useAxios';
import Loader from '../../layouts/loader/Loader';
import rupiah from '../../utils/rupiah';
import { alert } from '../../components/atoms/Toast';
import './ModalProses.css';

// selalu berakhiran "/" supaya tautan file valid walau .env tanpa "/" di akhir
const baseURL = `${(process.env.REACT_APP_BASEURL || '').replace(/\/+$/, '')}/`;

const JUDUL_TAHAP = {
  check_document: 'Pemeriksaan dokumen realisasi',
  verif_realisasi: 'Verifikasi realisasi',
  extend: 'Perpanjangan perjalanan',
};

const tgl = (v, pola = 'DD MMM YYYY') => (v && dayjs(v).isValid() ? dayjs(v).locale('id').format(pola) : '-');

const Baris = ({ nama, children }) => (
  <div className="lp-baris">
    <span className="lp-baris-nama">{nama}</span>
    <span className="lp-baris-isi">{children}</span>
  </div>
);
Baris.propTypes = { nama: PropTypes.string.isRequired, children: PropTypes.node };
Baris.defaultProps = { children: '-' };

const TautanBerkas = ({ href, children }) => (
  <a className="lp-lihat lp-lihat-blok" href={href} target="_blank" rel="noreferrer">
    <MaterialIcon icon="description" /> {children}
  </a>
);
TautanBerkas.propTypes = { href: PropTypes.string.isRequired, children: PropTypes.node.isRequired };

const ModalReview = ({ modalR, toggleR, sppdDetail, refetchNumber, refetchSubmitted }) => {
  const [detailSppd, setDetailSppd] = useState();
  const [stat, setStat] = useState('approve');
  const [catatan, setCatatan] = useState('');
  const [chekList, setChekList] = useState([]);
  const [mengirim, setMengirim] = useState(false);

  const api = useAxios();

  dayjs.locale('id');

  useEffect(() => {
    if (modalR && sppdDetail) {
      api.get(`dapi/sppd/pengajuan/${sppdDetail?.id}`).then((res) => {
        setDetailSppd(res.data.data);
        setChekList(res.data.data?.check_doc || []);
      });
    } else {
      setDetailSppd(null);
    }
  }, [modalR, sppdDetail]);

  const submit = async () => {
    if (stat !== 'approve' && catatan.trim() === '') {
      alert('error', 'Catatan harus diisi !');
      return;
    }
    setMengirim(true);
    await api
      .post(`dapi/sppd/pengajuan/review/${detailSppd?.nomor_dokumen}`, {
        status: stat,
        catatan_persetujuan: catatan,
        check_doc: chekList,
        type: detailSppd?.current_type,
      })
      .then((res) => {
        if (res.status === 200) {
          alert('success', 'Lembar Persetujuan Berhasil');
          refetchNumber();
          refetchSubmitted();
          toggleR();
          setStat('approve');
          setCatatan('');
        }
      })
      .catch((err) => {
        alert('error', `${err.message}`);
      })
      .finally(() => setMengirim(false));
  };

  const ubahCek = (idx, nilai) => setChekList((prev) => prev.map((c, i) => (i === idx ? { ...c, status: nilai } : c)));

  const tipe = detailSppd?.current_type;
  // tipe 'extend' (lama) atau 'extend-<n>' (approval per extend): hanya extend yang sedang direview yang ditampilkan
  const adalahExtend = tipe === 'extend' || /^extend-\d+$/.test(tipe || '');
  const daftarExtend = (detailSppd?.ekstend || []).filter((x) => (x.tipe_approval ? x.tipe_approval === tipe && x.status_approval !== 'dibatalkan' : true));
  const tujuan = detailSppd?.tujuan_sppd || [];
  const berangkat = tujuan.map((t) => t.waktu_berangkat).filter(Boolean).sort()[0];
  const kembali = tujuan.map((t) => t.waktu_kembali).filter(Boolean).sort().slice(-1)[0];
  const totalHari = tujuan.reduce((a, t) => a + (Number(t.jumlah_hari) || 0), 0);
  // rincian biaya hanya ditampilkan pada tahap verifikasi biaya
  const tampilBiaya = tipe === 'verifikasi_biaya';
  const adaTiket = tujuan.some((t) => t.perlu_tiket !== 0);
  const fileLaporan = detailSppd?.realisasi?.doc_file;

  return (
    <Modal isOpen={modalR} toggle={toggleR} size="lg" centered scrollable fullscreen="md" contentClassName="lp">
      <div className="lp-head">
        <div className="lp-head-ikon" aria-hidden="true">
          <MaterialIcon icon="fact_check" />
        </div>
        <div className="lp-head-teks">
          <h5 className="lp-judul">Lembar Persetujuan</h5>
          <p className="lp-sub">
            {adalahExtend ? `${JUDUL_TAHAP.extend}${/^extend-(\d+)$/.test(tipe) ? ` (extend ${tipe.split('-')[1]})` : ''}` : JUDUL_TAHAP[tipe] || 'Persetujuan SPPD'}
          </p>
        </div>
        <button type="button" className="lp-tutup" onClick={toggleR} aria-label="Tutup">
          <MaterialIcon icon="close" />
        </button>
      </div>

      <div className="lp-badan">
        {detailSppd ? (
          <>
            <div className="lp-bagian">
              <p className="lp-label">Ringkasan SPPD</p>
              <div className="lp-ringkas">
                <div className="lp-ringkas-no">{detailSppd.nomor_sppd || '-'}</div>
                <div className="lp-ringkas-meta">
                  {tgl(berangkat)} s.d. {tgl(kembali)}
                  {totalHari ? ` · ${totalHari} hari` : ''}
                </div>
                <div className="lp-baris-grid">
                  <Baris nama="Pelaksana">
                    <strong>{detailSppd.nama}</strong>
                    {detailSppd.jabatan ? <small className="lp-pct">{detailSppd.jabatan}</small> : null}
                  </Baris>
                  <Baris nama="Golongan / Rate">{detailSppd.golongan}</Baris>
                  <Baris nama="Internal / Eksternal">{detailSppd.pihak_name}</Baris>
                  <Baris nama="Diajukan">{tgl(detailSppd.created_at, 'DD MMM YYYY HH:mm')}</Baris>
                  <Baris nama="Aturan perusahaan">{detailSppd.dasar_ketetapan}</Baris>
                  <Baris nama="Tiket">{adaTiket ? 'Perlu (diproses divisi umum)' : 'Tidak perlu'}</Baris>
                </div>
              </div>
            </div>

            <div className="lp-bagian">
              <p className="lp-label">Tujuan perjalanan ({tujuan.length})</p>
              <div className="lp-tujuan-daftar">
                {tujuan.map((t) => (
                  <div className="lp-tujuan-kartu" key={t.id}>
                    <div className="lp-rate-kepala">
                      <strong>{t.detail_tujuan}</strong>
                      <span className="lp-rate-chip">{t.categori_sppd || '-'}</span>
                    </div>
                    <div className="lp-rate-meta">
                      {tgl(t.waktu_berangkat, 'DD MMM YYYY HH:mm')} - {tgl(t.waktu_kembali, 'DD MMM YYYY HH:mm')} · {t.jumlah_hari} hari
                    </div>
                    <div className="lp-rate-meta">
                      {[t.jenis_sppd, t.moda ? `moda ${t.moda}` : null, t.sumber_biaya ? `biaya ${t.sumber_biaya}` : null].filter(Boolean).join(' · ')}
                    </div>
                    <div className="lp-rate-meta">
                      Renbis: <strong>{t.renbis || '-'}</strong>
                      {t.k_bisnis ? ` (${t.k_bisnis})` : ''}
                    </div>
                    {t.tugas ? <div className="lp-tugas">{t.tugas}</div> : null}
                    {tampilBiaya ? (
                    <div className="lp-biaya-grid">
                      <span>
                        Uang makan<b>{rupiah(t.fix_um)}</b>
                      </span>
                      <span>
                        Uang saku<b>{rupiah(t.fix_us)}</b>
                      </span>
                      <span>
                        Transport lokal<b>{rupiah(t.fix_tl)}</b>
                      </span>
                      <span>
                        Hotel<b>{Number(t.fix_hotel) > 0 ? rupiah(t.fix_hotel) : `Sharing${t.share_label ? ` SPPD ${t.share_label}` : ''}`}</b>
                      </span>
                    </div>
                    ) : null}
                    {t.file_undangan && t.file_undangan !== '-' ? (
                      <TautanBerkas href={`${baseURL}sppd/${t.file_undangan}`}>Dokumen dasar ({t.dasar_sppd})</TautanBerkas>
                    ) : null}
                    {tampilBiaya ? (
                      <div className="lp-subtotal">
                        <span>Perkiraan biaya</span>
                        <strong>{rupiah(t.total_biaya)}</strong>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              {tampilBiaya ? (
              <div className="lp-total-kartu">
                <div>
                  <span>Total perkiraan biaya</span>
                  <strong>{rupiah(detailSppd.perkiraan_total)}</strong>
                </div>
                <div>
                  <span>Uang muka</span>
                  <strong>{rupiah(detailSppd.uang_muka)}</strong>
                </div>
              </div>
              ) : null}
              {tampilBiaya ? (
                <small className="lp-pct">Tiket dihitung aktual. Uang muka: uang makan, transport lokal, hotel, dan BBM 100%; komponen lain 0%.</small>
              ) : null}
            </div>

            {tipe === 'check_document' || tipe === 'verif_realisasi' ? (
              <div className="lp-bagian">
                <p className="lp-label">{tipe === 'check_document' ? 'Kelengkapan dokumen' : 'Laporan realisasi'}</p>
                {fileLaporan ? (
                  <TautanBerkas href={`${baseURL}sppd/${fileLaporan}`}>Laporan Realisasi SPPD</TautanBerkas>
                ) : (
                  <div className="lp-kosong">Laporan realisasi belum tersedia.</div>
                )}
                {tipe === 'check_document' ? (
                  <div className="lp-cek-daftar">
                    {chekList.map((c, i) => (
                      <div className="lp-cek" key={c?.id}>
                        <span className="lp-cek-nama">{c?.doc_name}</span>
                        <span className="lp-pilih">
                          <label className={`lp-pilih-opsi${Number(c?.status) === 1 ? ' aktif ya' : ''}`} htmlFor={`cek-ada-${c?.id}`}>
                            <input id={`cek-ada-${c?.id}`} type="radio" name={`cek-${c?.id}`} checked={Number(c?.status) === 1} onChange={() => ubahCek(i, 1)} />
                            Ada
                          </label>
                          <label className={`lp-pilih-opsi${Number(c?.status) === 0 ? ' aktif tidak' : ''}`} htmlFor={`cek-tidak-${c?.id}`}>
                            <input id={`cek-tidak-${c?.id}`} type="radio" name={`cek-${c?.id}`} checked={Number(c?.status) === 0} onChange={() => ubahCek(i, 0)} />
                            Tidak
                          </label>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {adalahExtend && daftarExtend.length > 0 ? (
              <div className="lp-bagian">
                <p className="lp-label">Pengajuan perpanjangan</p>
                {daftarExtend.map((item) => (
                  <div className="lp-tujuan-kartu" key={item.id || `${item.detail_tujuan}-${item.start}`}>
                    <Baris nama="Jenis">{item.tipe === 'tujuan_baru' ? 'Tujuan baru' : 'Tambah hari tujuan yang ada'}</Baris>
                    <Baris nama="Tujuan">{item.tipe === 'tujuan_baru' ? item.nama_tujuan_baru : item.detail_tujuan}</Baris>
                    {item.tipe === 'tujuan_baru' ? <Baris nama="Kategori / moda">{[item.kategori_nama, item.moda].filter(Boolean).join(' · ') || '-'}</Baris> : null}
                    {item.butuh_proses ? <Baris nama="Tiket">{item.perlu_tiket ? 'Perlu (divisi umum)' : 'Tidak perlu'}</Baris> : null}
                    {Number(item.bbm) > 0 ? <Baris nama="Uang BBM">{rupiah(item.bbm)}</Baris> : null}
                    <Baris nama="Mulai">{item.start}</Baris>
                    <Baris nama="Hingga">{item.end}</Baris>
                    <Baris nama="Alasan">{item.alasan}</Baris>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="lp-bagian">
              <p className="lp-label">Keputusan</p>
              <div className="lp-keputusan">
                <label className={`lp-keputusan-opsi${stat === 'approve' ? ' aktif ya' : ''}`} htmlFor="keputusan-terima">
                  <input id="keputusan-terima" type="radio" name="keputusan" value="approve" checked={stat === 'approve'} onChange={() => setStat('approve')} />
                  <MaterialIcon icon="check_circle" />
                  Terima
                </label>
                <label className={`lp-keputusan-opsi${stat === 'rejected' ? ' aktif tidak' : ''}`} htmlFor="keputusan-tolak">
                  <input id="keputusan-tolak" type="radio" name="keputusan" value="rejected" checked={stat === 'rejected'} onChange={() => setStat('rejected')} />
                  <MaterialIcon icon="cancel" />
                  Tolak
                </label>
              </div>
              <label className="lp-field" style={{ marginTop: 12 }} htmlFor="review-catatan">
                <span className="lp-field-nama">Catatan persetujuan{stat !== 'approve' ? ' (wajib diisi)' : ' (opsional)'}</span>
                <textarea id="review-catatan" className="lp-input" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Tulis catatan untuk pengaju..." />
              </label>
            </div>
          </>
        ) : (
          <Loader style={{ height: '50px!important' }} />
        )}
      </div>

      <div className="lp-kaki">
        <button type="button" className="lp-tombol" onClick={toggleR}>
          Batal
        </button>
        <button type="button" className={`lp-tombol utama${stat === 'rejected' ? ' tolak' : ''}`} onClick={submit} disabled={!detailSppd || mengirim}>
          {mengirim ? 'Mengirim...' : stat === 'approve' ? 'Kirim persetujuan' : 'Kirim penolakan'}
        </button>
      </div>
    </Modal>
  );
};

ModalReview.propTypes = {
  modalR: PropTypes.bool,
  toggleR: PropTypes.func,
  sppdDetail: PropTypes.object,
  refetchNumber: PropTypes.func,
  refetchSubmitted: PropTypes.func,
};

export default ModalReview;
