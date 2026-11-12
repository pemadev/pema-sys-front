import QRCode from 'qrcode';
import dayjs from 'dayjs';

const esc = (v) =>
  String(v ?? '-').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Tautan publik status surat masuk (dibuka dari QR tanpa login)
export const tautanAgenda = (token) => `${window.location.origin}/adm/agenda/${token}`;

// Cetak lembar nomor agenda surat masuk + QR status (diproses/selesai) pada jendela cetak
const cetakAgenda = async (row) => {
  const qr = await QRCode.toDataURL(tautanAgenda(row.agenda_token), { margin: 1, width: 240, errorCorrectionLevel: 'M' });
  const w = window.open('', '_blank', 'width=720,height=800');
  if (!w) return false;
  const baris = [
    ['Nomor Surat', row.nomor],
    ['Pengirim', row.pengirim],
    ['Perihal', row.perihal],
    ['Tanggal Surat', row.tgl_surat ? dayjs(row.tgl_surat).format('DD/MM/YYYY') : '-'],
    ['Diterima', dayjs(row.created_at || row.diterima).format('DD/MM/YYYY HH:mm')],
    ['Via', row.via],
  ]
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('');
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Agenda ${esc(row.nomor_agenda)}</title>
<style>
  @page { size: A5 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; }
  .lembar { border: 2px solid #111; border-radius: 6px; padding: 14px 18px; display: flex; gap: 18px; align-items: stretch; }
  .kiri { flex: 1; min-width: 0; }
  .judul { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #555; }
  .nomor { font-size: 28px; font-weight: 700; margin: 4px 0 10px; letter-spacing: .02em; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  td { padding: 3px 0; vertical-align: top; overflow-wrap: anywhere; }
  td.k { width: 92px; color: #555; }
  .kanan { width: 150px; text-align: center; border-left: 1px dashed #999; padding-left: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .kanan img { width: 130px; height: 130px; }
  .kanan small { display: block; margin-top: 6px; font-size: 10px; color: #555; line-height: 1.3; }
  @media print { button { display: none; } }
</style></head><body>
<div class="lembar">
  <div class="kiri">
    <div class="judul">PT PEMA &middot; Agenda Surat Masuk</div>
    <div class="nomor">${esc(row.nomor_agenda)}</div>
    <table>${baris}</table>
  </div>
  <div class="kanan"><img src="${qr}" alt="QR status"><small>Scan untuk melihat status surat (diproses / selesai)</small></div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
</body></html>`);
  w.document.close();
  return true;
};

export default cetakAgenda;
