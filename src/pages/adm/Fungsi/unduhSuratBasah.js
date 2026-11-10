import GenerateSurat from './Generate';
import FMerge from './FMerge';

// Unduh PDF surat tanda tangan basah: isi surat lengkap dengan ruang kosong untuk tanda tangan, tanpa QR verifikasi sistem.
// qrRef: elemen yang memuat canvas QR (dibutuhkan pembuat PDF), seperti pada pratinjau surat.
const unduhSuratBasah = async (api, id, qrRef) => {
  const res = await api.get(`dapi/adm/surat/detail/${id}`);
  const detail = res.data.data;
  const pdf = await GenerateSurat({ ...detail, ttdBasah: true }, qrRef);
  const url = await FMerge(pdf, detail.fileLampiran);

  const a = document.createElement('a');
  a.href = url;
  a.download = `Surat_${String(detail.nomorSurat || id).replace(/[\\/]/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export default unduhSuratBasah;
