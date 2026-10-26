import * as pdfMake from 'pdfmake/build/pdfmake';
import htmlToPdfmake from 'html-to-pdfmake';
import { tidySuratHtml } from './wordHtml';
import image from '../../../assets/image';
// import draft from '../../../assets/images/surat/160133.png';
import Terbilang from './Terbilang';
// import { height } from '@mui/system';

const pdfFonts = require('../../../assets/vfs_fonts');

const translateText = (input) => {
  // Contoh data terjemahan dalam JSON
  const translations = {
    "direktur utama": "President Director",
    "direktur pengembangan bisnis": "Director of Business Development",
    "direktur komersial": "Director of Commercial",
    "direktur umum dan keuangan": "Director of General Affairs and Finance",
    "kepala managemen resiko": "Head of Risk Management",
    "kepala satuan pengawas internal": "Head of Internal Supervisory Unit",
    "manajer agro dan jasa lainnya": "Manager of Agro and Other Services",
    "manajer industri dan perdagangan": "Manager of Industry and Trade",
    "manajer keuangan": "Finance Manager",
    "manajer manajemen investasi": "Investment Management Manager",
    "manajer migas, minerba dan ebtke": "Oil, Gas, Mineral, and EBTKE Manager",
    "manajer pemasaran": "Marketing Manager",
    "manajer pembinaan anak usaha/afiliasi": "Manager of Subsidiaries/ Affiliates Development",
    "manajer penelitian dan pengembangan": "Research and Development Manager",
    "manajer sumber daya manusia": "Human Resources Manager",
    "manajer teknikal dan operasi": "Technical and Operations Manager",
    "manajer teknologi informasi": "Information Technology Manager",
    "manajer umum": "General Division Manager",
    "supervisor agro dan jasa lainnya": "Supervisor of Agro and Other Services",
    "supervisor hukum dan legalitas perusahaan": "Supervisor of Legal Affairs and Corporate Legality",
    "supervisor industri dan perdagangan": "Supervisor of Industry and Trade",
    "supervisor keuangan": "Finance Supervisor",
    "supervisor manajemen investasi": "Investment Management Supervisor",
    "supervisor manajemen resiko": "Risk Management Supervisor",
    "supervisor migas, minerba dan ebtke": "Oil, Gas, Mineral, and EBTKE Supervisor",
    "supervisor minerba": "Mineral Supervisor",
    "supervisor pemasaran": "Marketing Supervisor",
    "supervisor pembinaan anak usaha/afiliasi": "Supervisor of Subsidiaries/Affiliates Development",
    "supervisor penelitian dan pengembangan": "Research and Development Supervisor",
    "supervisor scm": "SCM  Supervisor",
    "supervisor sumber daya manusia": "Human Resources Supervisor",
    "supervisor teknikal dan operasi": "Technical and Operations Supervisor",
    "supervisor teknikal dan operasi (agro dan jasa lainnya)": "Technical and Operations Supervisor (Agro and Other Services)",
    "supervisor teknikal dan operasi (migas dan ebtke)": "Technical and Operations Supervisor (Oil, Gas, and EBTKE)",
    "supervisor teknikal operasi (minerba)": "Technical Operations Supervisor (Mineral)",
    "supervisor teknologi informasi": "Information Technology Supervisor",
    "supervisor umum": "General Division Supervisor",
    "sekretaris perusahaan": "Secretary of Company",
  };

  // Mengubah input menjadi huruf kecil untuk pencocokan
  const lowercasedInput = input.toLowerCase();

  // Mengembalikan hasil terjemahan atau pesan jika tidak ditemukan
  return translations[lowercasedInput] || '';
};

const GenerateSurat = (dataSurat, htmlRef) => {
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
    const html = `<p style="margin-bottom:5px">Banda Aceh, ${new Intl.DateTimeFormat(`${dataSurat?.bhs === 'id' ? 'id-ID' : 'en-US'}`, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dataSurat?.tglSurat))}</p>  
      
        <table style="border-collapse: collapse; width: 100%; border: 0px;" border="1"; padding="0";><colgroup><col style="width: 13%;"><col style="width: 2%;"><col style="width: 85%;"></colgroup>
        <tbody>
          <tr style="margin-left:-5">
            <td style="vertical-align: top; border: 0px; line-height: 1.2; " >${dataSurat?.bhs === 'id' ? 'Nomor' : 'Number'}</td>
            <td style="vertical-align: top; border: 0px; line-height: 1.2;" >:</td>
            <td style="vertical-align: top; border: 0px; line-height: 1.2;">${dataSurat?.nomorSurat
      }</td>
          </tr>
          <tr style="margin-left:-5">
            <td style="vertical-align: top; border: 0px; line-height: 1.2;">${dataSurat?.bhs === 'id' ? 'Lampiran' : 'Attachment'}</td>
            <td style="vertical-align: top; border: 0px; line-height: 1.2;">:</td>
            <td style="vertical-align: top; border: 0px; line-height: 1.2;">${Number(dataSurat?.lampiran) > 0
        ? `${dataSurat?.lampiran} (${Terbilang(Number(dataSurat?.lampiran))}) ${dataSurat?.jenisLampiran || ' Eks'
        }`
        : `-`
      }</td>
          </tr>
          <tr style="margin-left:-5">
            <td style="vertical-align: top; border: 0px; line-height: 1.2;">${dataSurat?.bhs === 'id' ? 'Perihal' : 'Subject'}</td>
            <td style="vertical-align: top; border: 0px; line-height: 1.2;">:</td>
            <td style="vertical-align: top; border: 0px; line-height: 1.2;">${dataSurat?.perihal
      }</td>
          </tr>
        </tbody>
      </table>

        <div style="line-height: 1.2; margin-top:3; margin-bottom:-12">${dataSurat?.bhs === 'id' ? 'Kepada Yth' : 'Dear,'}<br>
            <strong style="line-height: 0.9!important;">${dataSurat?.kepada}</strong>
            ${dataSurat?.bhs === 'id' ? `<br>di - <br>
            <span>          Tempat</span>` : ''}
        </div>
       <span style="line-height: 1.3; text-align:justify">  ${tidySuratHtml(dataSurat?.isiSurat)}</span>
  
      `;

    if (htmlRef.current) {
      const canvas = htmlRef.current.querySelector('canvas');

      if (canvas) {
        const qrcode = canvas.toDataURL();

        const pdfContent = htmlToPdfmake(html, {
          // Only the Archivo font is registered; text pasted from Word carries its own font-family
          ignoreStyles: ['font-family'],
          defaultStyles: {
            p: { margin: [0, 3, 0, -12] },

            td: {
              verticalAlign: 'top',
              marginBottom: -4,
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
          pageMargins: [50, 70, 50, 70],
          content: [
            pdfContent,

            {
              stack: [
                {
                  text: `${dataSurat?.bhs === 'id' ?'Hormat Kami' : 'Your sincerelly'},`,
                  style: 'normal',
                },
                {
                  text: 'PT PEMBANGUNAN ACEH (Perseroda)',
                  style: 'boldText',
                },
                {
                  image: `${dataSurat?.status === 'signed' ? qrcode : image.placeholder}`,
                  width: 60, // Sesuaikan lebar logo sesuai kebutuhan
                },
                {
                  text: `${dataSurat?.signer?.first_name}`,
                  style: 'boldText',
                },
                {
                  text: `${dataSurat?.bhs === 'id' ? dataSurat?.signer?.position_name : translateText(dataSurat?.signer?.position_name)}`,
                  style: 'normal',
                },
              ],
              unbreakable: true, // This ensures the entire stack stays together on the same page
              margin: [0, 10],
            },
            {
              text: dataSurat?.tembusans?.length > 0 ? 'Tembusan Yth : ' : '',
              style: 'normal',
            },
            {
              ol: dataSurat?.tembusans
            }
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
        pdfMake.createPdf(docDefinition).getBase64((base64) => {
          if (base64) {
            resolve(base64); // Mengembalikan base64
          } else {
            reject(new Error('Error generating base64 PDF'));
          }
        });
      }
    }

    // Create a document definition for pdfmake
  });
};

export default GenerateSurat;
