import pdfMake from 'pdfmake/build/pdfmake';
import htmlToPdfmake from 'html-to-pdfmake';
import image from '../../../assets/image';
// import draft from '../../../assets/images/surat/160133.png';
// import Terbilang from './Terbilang';
// import { height } from '@mui/system';

const pdfFonts = require('../../../assets/vfs_fonts');

const GenerateDispo = (dataSurat) => {
  return new Promise(() => {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
    pdfMake.fonts = {
      Archivo: {
        normal: 'Archivo-Regular.ttf',
        bold: 'Archivo-SemiBold.ttf',
        italics: 'Archivo-Italic.ttf',
        bolditalics: 'Archivo-SemiBoldItalic.ttf',
      },
    };
    const t = dataSurat?.tickler ? dataSurat?.tickler.split(",") : [];
    let tickler = `<ul style="list-style-type: square; margin-left:15">`;
    for (let i = 0; i < t?.length; i++) {
      tickler += `<li>${t[i]}</li>`;
    }
    tickler += `</ul>`;

    let vcc = `<br>CC `;
    for (let i = 0; i < dataSurat?.cc?.length; i++) {
      vcc += `<br><span>      ${dataSurat?.cc[i]}</span>`;
    }


    const html = `
        <table style="border-collapse: collapse; width: 100%;" border="1"><colgroup><col style="width: 50%;"><col style="width: 50%;"></colgroup>
          <tbody>
            <tr>
              <td colspan="2" style="margin-bottom:-4; text-align:center"><h5>LEMBAR DISPOSISI</h5></td>
            </tr>


            <tr>
            <td colspan="2" style="margin-bottom:-2; margin-top:-3;">
             <table style="border-collapse: collapse; width: 100%; border: 0px;">
                <tbody>
                  <tr>
                    <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 15%;">Surat Dari</td>
                    <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 1%;">:</td>
                    <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 84%;">${dataSurat?.detail?.pengirim}</td>
                  </tr>
                </tbody>
                </table>
             </td>
            </tr>

            <tr>
            <td  style="margin-top:-3;margin-bottom:1">
              <table style="border-collapse: collapse; width: 100%; border: 0px;">
                <tbody>
                <tr>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 30%;">Nomor Surat</td>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 2%;">:</td>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 72%;">${dataSurat?.detail?.nomor}</td>
                </tr>
                <tr>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 30%;">Tgl Surat</td>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 2%;">:</td>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 72%;">${new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dataSurat?.detail?.tgl_surat))}</td>
                </tr>
                </tbody>
                </table>
            </td>
            
            <td  style="margin-top:-3;margin-bottom:1">
              <table style="border-collapse: collapse; width: 100%; border: 0px;">
                <tbody>
                <tr>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 30%;">Diterima</td>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 2%;">:</td>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 72%;">${new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dataSurat?.detail?.created_at))}</td>
                </tr>
                <tr>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 30%;">Via</td>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 2%;">:</td>
                <td style="vertical-align: top; border: 0px; line-height: 0.8; width: 72%;">${dataSurat?.detail?.via}</td>
                </tr>
                </tbody>
                </table>
            </td>
            </tr>

            <tr>
            <td colspan="2" style="margin-bottom:-2; margin-top:-3;">
             <table style="border-collapse: collapse; width: 100%; border: 0px;">
                <tbody>
                  <tr>
                    <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 15%;">Perihal</td>
                    <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 1%;">:</td>
                    <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 84%;">${dataSurat?.detail?.perihal}</td>
                  </tr>
                </tbody>
                </table>
             </td>
            </tr>

            <tr>
            <td style="margin:4">
              Didisposisikan Kepada <br>
              <span>      <strong>${dataSurat?.to}</strong></span><br>
              ${dataSurat?.cc?.length > 0 ? vcc :''}

            </td>
            
           <td style="margin:4">
              Dengan Hormat harap 
               ${t?.length > 0 ? tickler:''}
            </td>
            </tr>


             <tr>
            <td colspan="2" style="margin-bottom:-2; margin-top:-3; height:150;border-bottom:0px;">
             <table style="border-collapse: collapse; width: 100%; border: 0px;">
                <tbody>
                  <tr>
                    <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 15%;">Catatan</td>
                    <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 1%;">:</td>
                    <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 84%;"></td>
                  </tr>
                 
                </tbody>
                </table>
                 <p style="margin-left:20;margin-top:-2;">${dataSurat?.catatan || ''}</p>
             </td>
            </tr>
            <tr>
            <td colspan="2" style="margin-bottom:-2; margin-top:-3;border-top:0px;">
                 <p style="text-align:right; margin-right:3;">${new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'numeric',
      year: 'numeric',
    }).format(new Date(dataSurat?.waktu))}<br><br><strong>${dataSurat?.nama}</strong><br>${dataSurat?.position}</p>
    <span style="font-size:8; font-style:italic;"> NB : Lembar disposisi ini merupakan dokumen resmi yang dihasilkan oleh sistem secara otomatis.</span>
             </td>
            </tr>
          </tbody>
        </table>
  
      `;


    const pdfContent = htmlToPdfmake(html, {
      defaultStyles: {

        td: {
          verticalAlign: 'top',
          marginBottom: 0,
          heigt: 'auto',
        },
        ol: {
          margin: [0, 0, 0, -15],
          padding: [0, 0, 0, 0],
        },
        ul: { margin: [0, 0, 0, -15], padding: [0, 0, 0, 0] },
        li: {
          marginBottom: 2,
        },
        tr: {
          margin: [-5, 0, 0, 0],
        },
        table: {
          margin: [0, -3, 0, -7],
          width: '100%',
        },
        br: {
          margin: [0, 0, 0, 0],
        },
      },
      tableAutoSize: true,
    });

    const docDefinition = {
      pageOrientation: 'portrait',
      pageSize: 'A4',
      pageMargins: [50, 100, 50, 70],
      content: [
        pdfContent
      ],

      background: () => {
        return dataSurat?.draft
          ? {
            image: image.draft,
            width: 300,
            height: 300,
            opacity: 0.2,
            marginTop: 250,
            marginLeft: 150,
          }
          : '';
      },
      styles: {
        boldText: {
          bold: true,
        },
      },
      images: html.images,
      header: (page) => {
        if (page !== 1) return { text: '' };

        return {
          image: image.headSurat,
          width: '595',
        };
      },
      footer: (currentPage, pageCount) => {
        if (currentPage !== pageCount) return { text: '' };

        return {
          image: image.footSurat,
          width: '595',
        };
      },
      defaultStyle: {
        font: 'Archivo',
        fontSize: 10,
        color: '#000',
        ol: {
          margin: [0, 0, 0, 0],
          padding: [0, 0, 0, 0],
        },
      },
    };
    pdfMake.createPdf(docDefinition).open();

    // Create a document definition for pdfmake
  });
};

export default GenerateDispo;
