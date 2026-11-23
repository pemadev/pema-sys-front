import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, Label, Input, Alert, Button } from 'reactstrap';
import { useEffect, useState } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import useAxios from '../../hooks/useAxios';
import { alert } from '../../components/atoms/Toast';

import 'dayjs/locale/id';
import './ModalDocs.scss';
import './Modal30.css';

const pdfFonts = require('../../assets/vfs_fonts');

pdfMake.vfs = pdfFonts.pdfMake.vfs;
pdfMake.fonts = {
  Archivo: {
    normal: 'Archivo-Regular.ttf',
    bold: 'Archivo-SemiBold.ttf',
    italics: 'Archivo-Italic.ttf',
    bolditalics: 'Archivo-SemiBoldItalic.ttf',
  },
};

// penanda unik tiap baris rentang (key React)
let urutanRentang = 0;
const uid = () => {
  urutanRentang += 1;

  return urutanRentang;
};

const fmt = (v) => dayjs(v).locale('id').format('DD MMM YYYY');

// jendela tanggal yang boleh dipilih untuk satu tujuan (dari server)
const jendelaTujuan = (item) => (item?.hotel30_mulai && item?.hotel30_akhir ? { min: dayjs(item.hotel30_mulai), max: dayjs(item.hotel30_akhir) } : null);

// rentang awal satu tujuan: yang sudah pernah diajukan, jika belum seluruh jendela yang diizinkan (boleh dipersempit atau dipecah)
const rentangAwal = (item) => {
  const sudah = item?.tigapuluh?.rentang;
  if (Array.isArray(sudah) && sudah.length && dayjs(sudah[0].mulai).isValid() && dayjs(sudah[0].mulai).year() > 2000) {
    return sudah.map((r) => ({ uid: uid(), mulai: dayjs(r.mulai), hingga: dayjs(r.selesai) }));
  }
  if (item?.tigapuluh?.mulai && item?.tigapuluh?.selesai && dayjs(item.tigapuluh.mulai).year() > 2000) {
    return [{ uid: uid(), mulai: dayjs(item.tigapuluh.mulai), hingga: dayjs(item.tigapuluh.selesai) }];
  }
  const j = jendelaTujuan(item);

  return [{ uid: uid(), mulai: j ? j.min : null, hingga: j ? j.max : null }];
};

const Modal30 = ({ modal3, toggle3, sppdDetail }) => {
  const api = useAxios();

  const [detailSppd, setDetailSppd] = useState();
  const [dipilih, setDipilih] = useState([]); // id tujuan yang dicentang
  const [rentang, setRentang] = useState({}); // { idTujuan: [{ mulai, hingga }] }
  const [submitting, setSubmitting] = useState(false);
  const [pelaksana, setPelaksana] = useState(null); // info pelaksana (bukan karyawan => approval lewat email)
  const [email, setEmail] = useState('');
  const [tertunda, setTertunda] = useState([]); // klaim pelaksana non-karyawan yang masih menunggu persetujuan
  const [muatUlang, setMuatUlang] = useState(0);
  const [membatalkan, setMembatalkan] = useState(null);

  const sudahDisetujui = sppdDetail?.current_status === 'signed';
  // realisasi sudah disubmit: mengajukan Hotel 30% mengembalikan approval realisasi ke langkah awal (datanya tetap ada)
  const realisasiSudahSubmit = !!sppdDetail?.realisasi_status;
  const PESAN_REALISASI =
    'Realisasi SPPD ini sudah disubmit. Jika Hotel 30% diajukan, approval realisasi akan kembali ke step awal (diulang dari langkah pertama). ' +
    'Data realisasinya tetap ada dan tidak terhapus.';
  const daftarTujuan = detailSppd || [];
  const adaBaruDipilih = daftarTujuan.some((d) => dipilih.includes(d.id) && d.tigapuluh == null);
  // extend yang belum di-approve menghalangi Hotel 30% (diajukan maupun diubah)
  const extendMenunggu = (daftarTujuan[0]?.ekstend_terajukan || []).filter((e) => e.status === 'menunggu');
  const diblokirExtend = extendMenunggu.length > 0;
  const sudahDiajukanList = daftarTujuan.filter((d) => d.tigapuluh != null);
  const ringkasRentang = (item) => {
    const daftar = item?.tigapuluh?.rentang?.length ? item.tigapuluh.rentang : [{ mulai: item?.tigapuluh?.mulai, selesai: item?.tigapuluh?.selesai }];

    return daftar.map((r) => (dayjs(r.mulai).isSame(dayjs(r.selesai), 'day') ? fmt(r.mulai) : `${fmt(r.mulai)} - ${fmt(r.selesai)}`)).join(', ');
  };

  const muatPelaksana = (idTujuan) => {
    api
      .get(`dapi/sppd/tiga-puluh/${idTujuan}/pelaksana`)
      .then((res) => setPelaksana(res.data.data))
      .catch(() => setPelaksana(null));
  };

  const ubahPilihan = (item) => {
    if (dipilih.includes(item.id)) {
      const sisa = dipilih.filter((x) => x !== item.id);
      setDipilih(sisa);
      if (!sisa.length) setPelaksana(null);

      return;
    }
    setDipilih((prev) => [...prev, item.id]);
    setRentang((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: rentangAwal(item) }));
    if (!pelaksana) muatPelaksana(item.id);
  };

  const ubahRentang = (idTujuan, idx, bagian, nilai) =>
    setRentang((prev) => ({ ...prev, [idTujuan]: prev[idTujuan].map((r, i) => (i === idx ? { ...r, [bagian]: nilai } : r)) }));

  const tambahRentang = (idTujuan) => setRentang((prev) => ({ ...prev, [idTujuan]: [...prev[idTujuan], { uid: uid(), mulai: null, hingga: null }] }));

  const hapusRentang = (idTujuan, idx) => setRentang((prev) => ({ ...prev, [idTujuan]: prev[idTujuan].filter((_, i) => i !== idx) }));

  // Hotel 30% dihitung per malam (15 s.d. 16 = 1 malam). Tanggal mulai tidak boleh jatuh pada malam rentang lain,
  // dan tanggal hingga tidak boleh membuat rentang menimpa malam rentang lain.
  const mulaiTerpakai = (idTujuan, idx) => (d) =>
    (rentang[idTujuan] || []).some((r, i) => i !== idx && r.mulai && r.hingga && !d.isBefore(r.mulai, 'day') && d.isBefore(r.hingga, 'day'));
  const hinggaTerpakai = (idTujuan, idx) => (d) =>
    (rentang[idTujuan] || []).some((r, i) => i !== idx && r.mulai && r.hingga && d.isAfter(r.mulai, 'day') && !d.isAfter(r.hingga, 'day'));

  // memeriksa rentang satu tujuan; mengembalikan pesan galat atau null
  const periksa = (item) => {
    const daftar = rentang[item.id] || [];
    const j = jendelaTujuan(item);
    const nama = item.detail_tujuan;
    if (!daftar.length) return `${nama}: tambahkan minimal satu rentang tanggal`;
    for (let i = 0; i < daftar.length; i += 1) {
      const { mulai, hingga } = daftar[i];
      if (!mulai || !hingga) return `${nama}: lengkapi tanggal mulai dan hingga pada semua rentang`;
      if (!hingga.isAfter(mulai, 'day')) return `${nama}: tanggal hingga harus setelah tanggal mulai (dihitung per malam, mis. 15 s.d. 16 = 1 malam)`;
      if (j && (mulai.isBefore(j.min, 'day') || hingga.isAfter(j.max, 'day'))) return `${nama}: tanggal harus dalam ${fmt(j.min)} s.d. ${fmt(j.max)}`;
    }
    const urut = [...daftar].sort((a, b) => a.mulai.valueOf() - b.mulai.valueOf());
    for (let i = 1; i < urut.length; i += 1) {
      if (urut[i].mulai.isBefore(urut[i - 1].hingga, 'day')) return `${nama}: rentang tanggal tidak boleh saling tumpang tindih`;
    }

    return null;
  };

  const handleSubmitAction = async () => {
    if (!sppdDetail?.id) {
      alert('error', 'SPPD tidak valid');
      return;
    }
    if (!sudahDisetujui) {
      alert('error', 'Hotel 30% hanya bisa diajukan setelah SPPD disetujui');
      return;
    }
    if (diblokirExtend) {
      alert('error', 'Hotel 30% tidak bisa diajukan selama masih ada extend yang belum di-approve. Batalkan extend tersebut atau tunggu sampai disetujui.');
      return;
    }
    if (!dipilih.length) {
      alert('error', 'Centang minimal satu tujuan');
      return;
    }
    const terpilih = daftarTujuan.filter((d) => dipilih.includes(d.id));
    const galat = terpilih.map(periksa).find(Boolean);
    if (galat) {
      alert('error', galat);
      return;
    }
    if (pelaksana?.tamu && adaBaruDipilih && !/^\S+@\S+\.\S+$/.test(email)) {
      alert('error', 'Isi email pelaksana yang valid untuk permintaan persetujuan');
      return;
    }

    if (realisasiSudahSubmit) {
      // eslint-disable-next-line no-alert
      if (!window.confirm(`${PESAN_REALISASI}

Lanjutkan mengajukan Hotel 30%?`)) return;
    }

    setSubmitting(true);
    const gagal = [];
    let berhasil = 0;
    // satu per satu; tujuan yang gagal dilaporkan, yang berhasil tidak diulang
    for (let i = 0; i < terpilih.length; i += 1) {
      const item = terpilih[i];
      const payload = {
        sppd_id: sppdDetail.id,
        id_tujuan: Number(item.id),
        rentang: [...rentang[item.id]]
          .sort((a, b) => a.mulai.valueOf() - b.mulai.valueOf())
          .map((r) => ({ start_date: r.mulai.format('YYYY-MM-DD'), end_date: r.hingga.format('YYYY-MM-DD') })),
      };
      if (pelaksana?.tamu && item.tigapuluh == null) payload.email = email.trim();
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await api.post('dapi/sppd/tiga-puluh', payload);
        if (res?.data?.success) berhasil += 1;
        else gagal.push(`${item.detail_tujuan}: ${res?.data?.message || 'Gagal mengajukan'}`);
      } catch (err) {
        gagal.push(`${item.detail_tujuan}: ${err?.response?.data?.message || err?.message || err}`);
      }
    }
    setSubmitting(false);

    if (gagal.length) {
      alert('error', gagal.join(' | '));
      if (!berhasil) return;
    }
    if (berhasil) {
      alert('success', berhasil > 1 ? `Hotel 30% untuk ${berhasil} tujuan berhasil disimpan (satu dokumen)` : 'Pengajuan berhasil');
      if (!gagal.length && typeof toggle3 === 'function') toggle3();
    }
  };

  // edit: tujuan dicentang sehingga rentang tanggal lama termuat dan bisa diubah, lalu "Simpan Perubahan"
  const editPengajuan = (item) => {
    if (!dipilih.includes(item.id)) ubahPilihan(item);
    else setRentang((prev) => ({ ...prev, [item.id]: rentangAwal(item) }));
    window.setTimeout(() => document.getElementById(`m30-tj-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const batalkanPengajuan = async (item) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Batalkan pengajuan Hotel 30% untuk ${item.detail_tujuan}?`)) return;
    setMembatalkan(item.id);
    try {
      const res = await api.post(`dapi/sppd/tiga-puluh/${item.id}/batal`);
      if (res?.data?.success === false) {
        alert('error', res.data.message || 'Gagal membatalkan');
      } else {
        alert('success', res?.data?.message || 'Pengajuan Hotel 30% dibatalkan');
        setDipilih((prev) => prev.filter((x) => x !== item.id));
        setRentang((prev) => {
          const { [item.id]: dibuang, ...sisa } = prev; // eslint-disable-line no-unused-vars

          return sisa;
        });
        setMuatUlang((n) => n + 1);
      }
    } catch (err) {
      alert('error', err?.response?.data?.message || err?.message || 'Gagal membatalkan');
    } finally {
      setMembatalkan(null);
    }
  };

  const kirimUlang = async (id, emailTujuan) => {
    // eslint-disable-next-line no-alert
    const alamat = window.prompt('Kirim permintaan persetujuan ke email:', emailTujuan || '');
    if (!alamat) return;
    try {
      const res = await api.post(`dapi/sppd/tiga-puluh/${id}/kirim`, { email: alamat.trim() });
      alert('success', res?.data?.message || 'Terkirim');
    } catch (err) {
      alert('error', err?.response?.data?.message || 'Gagal mengirim');
    }
  };

  const tandaiManual = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Catat bahwa pelaksana sudah menandatangani secara manual?')) return;
    try {
      const res = await api.post(`dapi/sppd/tiga-puluh/${id}/manual`);
      alert('success', res?.data?.message || 'Tercatat');
      setTertunda((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      alert('error', err?.response?.data?.message || 'Gagal mencatat');
    }
  };

  useEffect(() => {
    if (modal3 && sppdDetail?.id) {
      api.get(`dapi/sppd/tujuan/${sppdDetail.id}`).then((res) => {
        const daftar = res.data.data || [];
        setDetailSppd(daftar);
        // hanya satu tujuan: langsung dicentang
        if (daftar.length === 1) {
          setDipilih([daftar[0].id]);
          setRentang({ [daftar[0].id]: rentangAwal(daftar[0]) });
          api
            .get(`dapi/sppd/tiga-puluh/${daftar[0].id}/pelaksana`)
            .then((r) => setPelaksana(r.data.data))
            .catch(() => setPelaksana(null));
        }
        // klaim yang sudah diajukan: tampilkan yang pelaksananya bukan karyawan dan belum menjawab
        Promise.all(
          daftar
            .filter((d) => d?.tigapuluh != null)
            .map((d) =>
              api
                .get(`dapi/sppd/tiga-puluh/${d.id}/pelaksana`)
                .then((r) => ({ id: d.id, nama: d.detail_tujuan, ...r.data.data }))
                .catch(() => null),
            ),
        ).then((hasil) => setTertunda(hasil.filter((x) => x && x.tamu && !x.dipakai_at)));
      });
    } else {
      setDetailSppd([]);
      setTertunda([]);
      setPelaksana(null);
      setEmail('');
      setDipilih([]);
      setRentang({});
    }
  }, [modal3, sppdDetail, muatUlang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal isOpen={modal3} toggle={toggle3} size="md" className="m30" centered scrollable>
      <ModalHeader toggle={toggle3}>Pengajuan Biaya Hotel 30%</ModalHeader>
      <ModalBody>
        {!sudahDisetujui ? <Alert color="warning">Hotel 30% hanya bisa diajukan setelah SPPD disetujui.</Alert> : null}
        {diblokirExtend ? (
          <Alert color="danger" className="m30-peringatan">
            <b>Hotel 30% belum bisa diajukan.</b> Masih ada pengajuan extend yang belum di-approve:{' '}
            {extendMenunggu.map((e) => (e.no_urut ? `Extend ${e.no_urut}` : 'Extend') + (e.judul ? ` (${e.judul})` : '')).join('; ')}. Batalkan extend tersebut, atau tunggu sampai disetujui.
          </Alert>
        ) : null}
        {sudahDiajukanList.length > 0 ? (
          <div className="m30-kartu">
            <span className="m30-label">Sudah diajukan</span>
            {sudahDiajukanList.map((item) => (
              <div key={item.id} className="m30-sudah">
                <div className="m30-sudah-teks">
                  <b>{item.detail_tujuan}</b>
                  <small>{ringkasRentang(item)}</small>
                </div>
                <span className="d-flex gap-1 flex-wrap">
                  <Button size="sm" outline color="primary" onClick={() => editPengajuan(item)} disabled={diblokirExtend}>
                    Edit
                  </Button>
                  <Button size="sm" outline color="danger" onClick={() => batalkanPengajuan(item)} disabled={membatalkan === item.id}>
                    {membatalkan === item.id ? 'Membatalkan...' : 'Batalkan'}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {realisasiSudahSubmit ? (
          <Alert color="warning" className="m30-peringatan">
            <b>Perhatian:</b> {PESAN_REALISASI}
          </Alert>
        ) : null}
        <p className="m30-intro">
          Pelaku perjalanan dinas yang tidak menginap di hotel/penginapan atau tidak punya bill hotel bisa mengajukan 30% dari rate hotel yang disediakan perusahaan.
          Centang semua tujuan yang diajukan: seluruhnya dicetak dalam <b>satu dokumen</b>.
        </p>

        <div className="m30-kartu">
          <span className="m30-label">Tujuan SPPD</span>
          {daftarTujuan.length === 0 ? (
            <div className="text-muted">Tidak ada tujuan</div>
          ) : (
            <div className="m30-daftar-tujuan">
              {daftarTujuan.map((item) => (
                <label key={item.id} className={`m30-tujuan${dipilih.includes(item.id) ? ' aktif' : ''}`} htmlFor={`m30-tj-${item.id}`}>
                  <input id={`m30-tj-${item.id}`} type="checkbox" checked={dipilih.includes(item.id)} onChange={() => ubahPilihan(item)} />
                  <span className="m30-tujuan-nama">{item.detail_tujuan}</span>
                  {item?.tigapuluh != null ? <span className="m30-chip">sudah diajukan, bisa diubah</span> : null}
                </label>
              ))}
            </div>
          )}
        </div>

        {dipilih.length === 0 && daftarTujuan.length > 0 ? (
          <div className="m30-kartu">
            <span className="m30-hint">Centang tujuan untuk memilih tanggal Hotel 30%.</span>
          </div>
        ) : null}

        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
          {daftarTujuan
            .filter((item) => dipilih.includes(item.id))
            .map((item) => {
              const j = jendelaTujuan(item);
              const daftar = rentang[item.id] || [];

              return (
                <div className="m30-kartu" key={item.id}>
                  <span className="m30-label">Tanggal Hotel 30% - {item.detail_tujuan}</span>
                  {item.tigapuluh != null ? (
                    <div className="m30-hint mb-2">Tujuan ini sudah pernah diajukan. Hotel 30% hanya bisa diajukan sekali, jadi pengajuan berikutnya hanya mengubah tanggal sebelumnya.</div>
                  ) : null}

                  {daftar.map((r, idx) => (
                    <div className="m30-baris-rentang" key={`${item.id}-${r.uid}`}>
                      <div className="m30-tanggal">
                        <div>
                          <Label className="small text-muted mb-1">Mulai</Label>
                          <DatePicker
                            value={r.mulai}
                            onChange={(v) => ubahRentang(item.id, idx, 'mulai', v)}
                            disabled={!j}
                            minDate={j?.min}
                            maxDate={r.hingga ? r.hingga.subtract(1, 'day') : j ? j.max.subtract(1, 'day') : undefined}
                            shouldDisableDate={mulaiTerpakai(item.id, idx)}
                            slotProps={{ textField: { size: 'small', fullWidth: true, placeholder: 'Pilih tanggal mulai' } }}
                          />
                        </div>
                        <div>
                          <Label className="small text-muted mb-1">Hingga</Label>
                          <DatePicker
                            value={r.hingga}
                            onChange={(v) => ubahRentang(item.id, idx, 'hingga', v)}
                            disabled={!j}
                            minDate={r.mulai ? r.mulai.add(1, 'day') : j ? j.min.add(1, 'day') : undefined}
                            maxDate={j?.max}
                            shouldDisableDate={hinggaTerpakai(item.id, idx)}
                            slotProps={{ textField: { size: 'small', fullWidth: true, placeholder: 'Pilih tanggal hingga' } }}
                          />
                        </div>
                      </div>
                      {daftar.length > 1 ? (
                        <button type="button" className="m30-hapus" onClick={() => hapusRentang(item.id, idx)} title="Hapus rentang ini" aria-label="Hapus rentang tanggal">
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}

                  <Button size="sm" color="primary" outline onClick={() => tambahRentang(item.id)} disabled={!j}>
                    + Tambah rentang tanggal
                  </Button>

                  {j ? (
                    <div className="m30-rentang">
                      <span>Bisa dipilih:</span>
                      <span className="m30-chip">{fmt(j.min)}</span>
                      <span>s.d.</span>
                      <span className="m30-chip">{fmt(j.max)}</span>
                      <span className="m30-hint">
                        {item?.hotel30_ekstend_akhir
                          ? `SPPD sampai ${fmt(item.waktu_kembali)}, extend yang sudah disetujui sampai ${fmt(item.hotel30_ekstend_akhir)}. `
                          : 'Sesuai tanggal SPPD. '}
                        Dihitung per malam: 15 s.d. 16 = 1 malam (tanggal hingga harus setelah tanggal mulai). Tanggal boleh selang-seling, misalnya 1-2 lalu 5-6: tambahkan rentang baru untuk tiap bagian.
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
        </LocalizationProvider>

        {pelaksana?.tamu && adaBaruDipilih && (
          <div className="m30-info">
            <div>
              Pelaksana bukan karyawan: <b>{pelaksana.nama}</b>
              {pelaksana.jabatan ? `, ${pelaksana.jabatan}` : ''}. Persetujuannya dikirim lewat email.
            </div>
            <Input className="mt-2" type="email" placeholder="Email pelaksana" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}

        {tertunda.length > 0 && (
          <div className="mb-2">
            <span className="m30-label">Menunggu persetujuan pelaksana</span>
            {tertunda.map((x) => (
              <div key={x.id} className="m30-tunggu">
                <small>
                  <b>{x.nama}</b> — {x.jabatan || ''}
                  {x.email ? ` (${x.email})` : ' (email belum dikirim)'}
                </small>
                <span className="d-flex gap-1 flex-wrap">
                  <Button size="sm" outline color="primary" onClick={() => kirimUlang(x.id, x.email)}>
                    Kirim ulang email
                  </Button>
                  <Button size="sm" outline color="secondary" onClick={() => tandaiManual(x.id)}>
                    Tanda tangan manual
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="m30-aksi">
          <button type="button" className="btn btn-light" onClick={toggle3}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmitAction} disabled={submitting || !sudahDisetujui || !dipilih.length || diblokirExtend}>
            {submitting ? 'Mengirim...' : adaBaruDipilih ? `Ajukan 30%${dipilih.length > 1 ? ` (${dipilih.length} tujuan)` : ''}` : 'Simpan Perubahan'}
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
};

Modal30.propTypes = {
  modal3: PropTypes.bool,
  toggle3: PropTypes.func,
  sppdDetail: PropTypes.object,
};

export default Modal30;
