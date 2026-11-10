import pdfMake from 'pdfmake/build/pdfmake';
import htmlToPdfmake from 'html-to-pdfmake';
// import image from '../../../assets/image';
const pdfFonts = require('../../../../assets/vfs_fonts');

const GeneratePengajuan = (row) => {
  console.log('row', row);
  return new Promise((resolve, reject) => {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
    pdfMake.fonts = {
      Archivo: {
        normal: 'Archivo-Regular.ttf',
        bold: 'Archivo-SemiBold.ttf',
        italics: 'Archivo-Italic.ttf',
        bolditalics: 'Archivo-SemiBoldItalic.ttf',
      },
    };

    const html = `
      <div style="font-size:10px;">

      <table style="width:100%; margin-bottom:10px;">
        <tr>
          <td><strong>Jenis Permohonan:</strong></td>
          <td>${row.pengajuan}</td>
          <td><strong>No Dokumen:</strong></td>
          <td>${row.no_dokumen}</td>
        </tr>
        <tr>
          <td><strong>Tanggal Pengajuan:</strong></td>
          <td>${new Date(row.created_at).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}</td>
          <td><strong>Lampiran:</strong></td>
          <td><a href="${row.lampiran}" target="_blank">Lihat Lampiran</a></td>
        </tr>
      </table>

      <p><strong>Diapprove oleh:</strong></p>
      <table style="width:100%; margin-bottom:10px;">
        <tr>
          ${row?.approvals
            ?.map(
              (item) => `
              <td style="border: 1px solid #ddd; padding:5px; vertical-align:top;">
                <strong>${item.full_name}</strong><br/>
                <span style="font-size:9px;">${item.position_name}</span><br/>
                <small>Approved At:<br/> ${new Date(item.updated_at).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}</small>
              </td>
            `,
            )
            .join('')}
        </tr>
      </table>

      <p><strong>Detail Pengajuan:</strong></p>
      <table style="width:100%; border-collapse: collapse;" border="1">
        <thead>
          <tr>
            <th style="text-align:center;">No</th>
            <th>Nama Barang/Jasa</th>
            <th>Jumlah</th>
            <th>Satuan</th>
            <th>Biaya Satuan</th>
            <th>Total Biaya</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${row.sub_pengajuan
            .map(
              (item, index) => `
              <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td  style="whiteSpace:pre-wrap;">${item.nama_item}</td>
                <td>${item.jumlah}</td>
                <td>${item.satuan}</td>
                <td>Rp ${item.biaya_satuan.toLocaleString('id-ID')}</td>
                <td>Rp ${item.total_biaya.toLocaleString('id-ID')}</td>
                <td>${item.keterangan || '-'}</td>
              </tr>
            `,
            )
            .join('')}
          <tr>
            <td colspan="5" style="text-align:right;"><strong>Total Biaya Keseluruhan</strong></td>
            <td colspan="2"><strong>Rp ${row.sub_pengajuan
              .reduce((total, item) => total + item.total_biaya, 0)
              .toLocaleString('id-ID')}</strong></td>
          </tr>
        </tbody>
      </table>

      </div>
    `;

    const pdfContent = htmlToPdfmake(html, {
      defaultStyles: {
        th: { bold: true, fillColor: '#eeeeee' },
        td: { margin: [2, 2, 2, 2] },
        p: { margin: [0, 2, 0, 2] },
      },
    });

    const docDefinition = {
      pageOrientation: 'portrait',
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: pdfContent,
      styles: {
        header: { fontSize: 12, bold: true },
        normal: { fontSize: 10 },
      },
      defaultStyle: {
        font: 'Archivo',
      },
    };

    pdfMake.createPdf(docDefinition).getBase64((base64) => {
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Error generating base64 PDF'));
      }
    });
  });
};

export default GeneratePengajuan;
