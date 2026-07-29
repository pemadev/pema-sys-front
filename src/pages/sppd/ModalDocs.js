import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Card, Col, Modal, ModalBody, Row, Alert } from 'reactstrap';
import MaterialIcon from '@material/react-material-icon';
import * as pdfMake from 'pdfmake/build/pdfmake';
import htmlToPdfmake from 'html-to-pdfmake';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import './ModalDocs.scss';
import { QRCode } from 'react-qrcode-logo';
import { alert } from '../../components/atoms/Toast';
import logo from '../../assets/images/qrcode/qr-code-logo.png';
import useAxios from '../../hooks/useAxios';
import image from '../../assets/image';
import rupiah from '../../utils/rupiah';


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

const ModalDocs = ({ modalDoc, toggleDoc, sppdDetail }) => {
  const baseURL = process.env.REACT_APP_FRONTEND;

  const baseURL1 = process.env.REACT_APP_BASEURL;

  const [loading, setLoading] = useState(false);
  const [detailSppd, setDetailSppd] = useState();
  const [typeSign, setTypeSign] = useState('');

  const [typeSign2, setTypeSign2] = useState('');

  dayjs.locale('id');
  const api = useAxios();
  const qrCodeRef = useRef();
  const qrCodeRef2 = useRef();

  useEffect(() => {
    if (sppdDetail) {
      api.get(`dapi/sppd/pengajuan/${sppdDetail?.id}`).then((res) => {
        setDetailSppd(res.data.data);
        console.log(res.data.data);
      });
    } else {
      setDetailSppd(null);
    }
    console.log(detailSppd);
  }, [sppdDetail]);

  const print = (html, orientationPage, head, foot, lebar, l, t, r, b, ts) => {
    setLoading(false);
    let qrcode = ``;
    if (qrCodeRef.current) {
      const canvas = qrCodeRef.current.querySelector('canvas');

      if (canvas) {
        qrcode = canvas.toDataURL();
      }
    }
    const pdfContent = htmlToPdfmake(html, {
      defaultStyles: {
        p: { margin: [0, 3, 0, -3] },
        columnGap: 0,
        td: {
          verticalAlign: 'top',
          marginBottom: -4,
        },
        ol: {
          margin: [0, 0, 0, 0],
          padding: [0, 0, 0, 0],
        },
        li: {
          marginBottom: 2,
        },
        tr: {
          margin: [-5, 0, 0, 0],
        },
        table: {
          margin: [0, 0, 0, 0],
          width: '100%',
        },
        br: {
          margin: [0, 2, 0, 0],
        },
      },
      tableAutoSize: true,
    });

    // Create a document definition for pdfmake
    const docDefinition = {
      pageOrientation: orientationPage,
      pageSize: 'A4',
      pageMargins: [l, t, r, b],
      content: [
        pdfContent,
        {
          stack: [
            {
              text: `Banda Aceh, ${detailSppd?.approval.filter((a) => a.type === ts)[0]?.updated_at
                ? dayjs(detailSppd?.approval.filter((a) => a.type === ts)[0]?.updated_at)
                  .locale('id')
                  .format('DD MMMM YYYY')
                : ' . . . . . . . . '
                }`,
              style: 'normal',
            },
            {
              text: 'PT PEMBANGUNAN ACEH',
              style: 'boldText',
            },
            {
              image: `${detailSppd?.approval.filter((a) => a.type === ts)[0]?.status === 'approve'
                ? qrcode
                : image.placeholder
                }`,
              width: 60, // Sesuaikan lebar logo sesuai kebutuhan
            },
            {
              text: `${detailSppd?.approval.filter((a) => a.type === ts)[0]?.first_name}`,
              style: 'boldText',
            },
            {
              text: `${detailSppd?.approval.filter((a) => a.type === ts)[0]?.position_name}`,
              style: 'normal',
            },
          ],
          unbreakable: true, // This ensures the entire stack stays together on the same page
          margin: [0, 1],
        },
      ],
      styles: {
        boldText: {
          bold: true,
        },
      },
      images: html.images,
      header: (page) => {
        if (page !== 1) return { text: '' };

        return {
          image: head,
          width: lebar,
        };
      },
      footer: (currentPage, pageCount) => {
        if (currentPage !== pageCount) return { text: '' };

        return {
          image: foot,
          width: lebar,
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
  };

  const print2 = (html, orientationPage, head, foot, lebar, l, t, r, b, ts, ts2) => {
    setLoading(false);
    let qrcode = ``;
    if (qrCodeRef.current) {
      const canvas = qrCodeRef.current.querySelector('canvas');
      if (canvas) qrcode = canvas.toDataURL();
    }

    let qrcode2 = ``;
    if (qrCodeRef2.current) {
      const canvas = qrCodeRef2.current.querySelector('canvas');
      if (canvas) qrcode2 = canvas.toDataURL();
    }
    // determine approval info for the given ts (fallback to first approval)
    const appro = (ts && detailSppd?.approval?.find((a) => a.type === ts)) || detailSppd?.approval?.[0] || {};
    const topText = `Banda Aceh, ${appro?.updated_at ? dayjs(appro.updated_at).locale('id').format('DD MMMM YYYY') : ' . . . . . . . . '}`;

    const pdfContent = htmlToPdfmake(html, {
      defaultStyles: {
        p: { margin: [0, 3, 0, -3] },
        columnGap: 0,
        td: { verticalAlign: 'top', marginBottom: -4 },
        ol: { margin: [0, 0, 0, 0], padding: [0, 0, 0, 0] },
        li: { marginBottom: 2 },
        tr: { margin: [-5, 0, 0, 0] },
        table: { margin: [0, 0, 0, 0], width: '100%' },
        br: { margin: [0, 2, 0, 0] },
      },
      tableAutoSize: true,
    });

    const docDefinition = {
      pageOrientation: orientationPage,
      pageSize: 'A4',
      pageMargins: [l, t, r, b],
      content: [
        pdfContent,
        { text: topText, style: 'normal', alignment: 'left', margin: [0, 0, 0, 6] },
        {
          columns: [
            {
              stack: [
                { text: 'Pemohon,', style: 'normal', alignment: 'left', marginBottom: 5 },
                {
                  image: `${detailSppd?.approval.filter((a) => a.type === ts)[0]?.status === 'approve'
                    ? qrcode
                    : image.placeholder
                    }`, width: 60, alignment: 'left'
                },
                {
                  text: `${detailSppd?.approval.filter((a) => a.type === ts)[0]?.first_name}`,
                  style: 'boldText'
                }
                , {
                  text: `${detailSppd?.approval.filter((a) => a.type === ts)[0]?.position_name}`,
                  style: 'normal',
                }
              ],
              width: 100,
              alignment: 'left',
            },

            { width: '*', text: '' },
            {
              stack: [
                { text: 'Disetujui Oleh,', style: 'normal', alignment: 'left', marginBottom: 5 },
                {
                  image: `${detailSppd?.approval.filter((a) => a.type === ts2)[0]?.status === 'approve'
                    ? qrcode2
                    : image.placeholder
                    }`, width: 60, alignment: 'left'
                },
                {
                  text: `${detailSppd?.approval.filter((a) => a.type === ts2)[0]?.first_name}`,
                  style: 'boldText',alignment: 'left'
                }
                , {
                  text: `${detailSppd?.approval.filter((a) => a.type === ts2)[0]?.position_name}`,
                  style: 'normal',alignment: 'left',
                }
              ],
              width: 100,
              alignment: 'right',
            },
          ],
          unbreakable: true,
          margin: [0, 1],
        },
      ],
      styles: { boldText: { bold: true } },
      images: html.images,
      header: (page) => {
        if (page !== 1) return { text: '' };
        return { image: head, width: lebar };
      },
      footer: (currentPage, pageCount) => {
        if (currentPage !== pageCount) return { text: '' };
        return { image: foot, width: lebar };
      },
      defaultStyle: {
        font: 'Archivo',
        fontSize: 10,
        color: '#000',
        ol: { margin: [0, 0, 0, 0], padding: [0, 0, 0, 0] },
      },
    };

    pdfMake.createPdf(docDefinition).open();
  };

  const printST = () => {
    setLoading(true);
    setTypeSign('sign');
    let tujuans = ``;
    for (let i = 0; i < detailSppd?.tujuan_sppd?.length; i++) {
      tujuans += `<table cellpadding="5" cellspacing="0" width="100%">
        <tbody>
        <tr style="border:none">
          <td style="width: 30%; text-align: left; height:15px; vertical-align:middle!important">TUGAS</td>
          <td style="width: 70%; text-align: left;height:15px; vertical-align:middle!important">: ${detailSppd?.tujuan_sppd[i].tugas
        }</td>
        </tr>
         <tr style="border:none">
          <td style="width: 30%; text-align: left; height:15px; vertical-align:middle!important">TUJUAN</td>
          <td style="width: 70%; text-align: left;height:15px; vertical-align:middle!important">: ${detailSppd?.tujuan_sppd[i].detail_tujuan
        }</td>
        </tr>
         <tr style="border:none">
          <td style="width: 30%; text-align: left; height:15px; vertical-align:middle!important">LAMA TUGAS</td>
          <td style="width: 70%; text-align: left;height:15px; vertical-align:middle!important">: ${detailSppd?.tujuan_sppd[i].jumlah_hari
        } hari</td>
        </tr>
         <tr style="border:none">
          <td style="width: 30%; text-align: left; height:15px; vertical-align:middle!important">MULAI TUGAS</td>
          <td style="width: 70%; text-align: left;height:15px; vertical-align:middle!important">: ${dayjs(
          detailSppd?.tujuan_sppd[i].waktu_berangkat,
        )
          .locale('id')
          .format('dddd, DD MMMM YYYY HH:mm')}</td>
        </tr>
         <tr style="border:none">
          <td style="width: 30%; text-align: left; height:15px; vertical-align:middle!important">SELESAI TUGAS</td>
          <td style="width: 70%; text-align: left;height:15px; vertical-align:middle!important">:  ${dayjs(
            detailSppd?.tujuan_sppd[i].waktu_kembali,
          )
          .locale('id')
          .format('dddd, DD MMMM YYYY HH:mm')}</td>
        </tr>
        </tr>
         <tr style="border:none">
          <td style="width: 30%; text-align: left; height:15px; vertical-align:middle!important">SUMBER ANGGARAN</td>
          <td style="width: 70%; text-align: left;height:15px; vertical-align:middle!important">: ${detailSppd?.tujuan_sppd[i].sumber_biaya
        }</td>
        </tr>
        <tr style="border:none">
          <td style="width: 30%; text-align: left; height:15px; vertical-align:middle!important">NAMA PROYEK</td>
          <td style="width: 70%; text-align: left;height:15px; vertical-align:middle!important">: ${detailSppd?.tujuan_sppd[i].renbis
        }</td>
        </tr>
        </tbody>
      </table><br>`;
    }

    const html = `
        <p style="text-align:center;"><strong style="text-decoration:underline">SURAT TUGAS</strong><br>Nomor : ${detailSppd?.nomor_sppd}</p>
        <p style="text-align: justify;
  text-justify: inter-word;">${detailSppd?.narasi_st}</p>
      <table cellpadding="5" cellspacing="0" width="100%">
        <thead>
          <tr>
            <th style="width: 6%; text-align: center;height:18px; vertical-align:middle;">No</th>
            <th style="width: 47%; text-align: center;height:18px; vertical-align:middle">Nama</th>
            <th style="width: 47%; text-align: center;height:18px; vertical-align:middle">Pangkat / Jabatan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="width: 6%; text-align: center; height:18px; vertical-align:middle!important">1</td>
            <td style="width: 47%; text-align: left; height:18px; vertical-align:middle!important">${detailSppd?.nama}</td>
            <td style="width: 47%; text-align: left;height:18px; vertical-align:middle!important">${detailSppd?.jabatan}</td>
          </tr>
        </tbody>
      </table>
      <br>${tujuans}

     `;
    setTimeout(() => {
      print(html, 'potrait', image.headSurat, image.footSurat, '595', 60, 100, 60, 80, 'sign');
    }, 2000);
  };

  const printSPPD = () => {
    setLoading(true);
    setTypeSign('sign');

    let tujuan = ``;
    let transport = ``;
    let lama = ``;
    let maksud = ``;
    let sumber = ``;
    let paraf = ``;
    if (detailSppd?.tujuan_sppd?.length === 1) {
      tujuan = detailSppd?.tujuan_sppd[0].detail_tujuan;
      transport = detailSppd?.tujuan_sppd[0].moda;
      lama = `<table width="100%">
      <tbody>
        <tr style="border:none">
          <td style="width:35%; ">Selama</td>
          <td style="width: 65%;">: ${detailSppd?.tujuan_sppd[0].jumlah_hari} hari</td>
        </tr>
        <tr style="border:none">
          <td style="width:35%; ">Dari Tgl</td>
          <td style="width: 65%;">: ${dayjs(detailSppd?.tujuan_sppd[0].waktu_berangkat)
          .locale('id')
          .format('DD MMMM YYYY')} </td>
        </tr>
         <tr style="border:none">
          <td style="width:35%; ">s/d Tgl</td>
          <td style="width: 65%;">: ${dayjs(detailSppd?.tujuan_sppd[0].waktu_kembali)
          .locale('id')
          .format('DD MMMM YYYY')} </td>
        </tr>
      </tbody>
      </table>`;
      maksud = detailSppd?.tujuan_sppd[0].tugas;
      sumber = detailSppd?.tujuan_sppd[0].sumber_biaya;
      paraf = `<tr><td style="width: 43%;margin-bottom:5px; margin-top:4px;">
                      Tiba di\t\t :<br>
                      Tanggal\t  :<br><br>
                      Kepala \t. . . . .
                    </td>
                    <td style="width: 50%;margin-bottom:5px; margin-top:4px;">
                      Kembali dari\t:<br>
                      Tanggal\t\t\t :<br><br>
                      Kepala \t. . . . .
                    </td></tr>`;
    } else {
      tujuan = `<ol>`;
      transport = `<ol>`;
      lama = `<ol>`;
      maksud = `<ol>`;
      sumber = `<ol>`;

      for (let i = 0; i < detailSppd?.tujuan_sppd?.length; i++) {
        tujuan += `<li>${detailSppd?.tujuan_sppd[i].detail_tujuan}</li>`;
        transport += `<li>${detailSppd?.tujuan_sppd[i].moda}</li>`;
        lama += `<li><table width="100%">
      <tbody>
        <tr style="border:none">
          <td style="width:35%; ">Selama</td>
          <td style="width: 65%;">: ${detailSppd?.tujuan_sppd[i].jumlah_hari} hari</td>
        </tr>
        <tr style="border:none">
          <td style="width:35%; ">Dari Tgl</td>
          <td style="width: 65%;">: ${dayjs(detailSppd?.tujuan_sppd[i].waktu_berangkat)
            .locale('id')
            .format('DD MMMM YYYY')} </td>
        </tr>
         <tr style="border:none">
          <td style="width:35%; ">s/d Tgl</td>
          <td style="width: 65%;">: ${dayjs(detailSppd?.tujuan_sppd[i].waktu_kembali)
            .locale('id')
            .format('DD MMMM YYYY')} </td>
        </tr>
      </tbody>
      </table></li>`;
        maksud += `<li>${detailSppd?.tujuan_sppd[i].tugas}</li>`;
        sumber += `<li>${detailSppd?.tujuan_sppd[i].sumber_biaya}</li>`;
        paraf += `<tr><td style="width: 43%;margin-bottom:5px; margin-top:4px;">
                      Tiba di\t\t :<br>
                      Tanggal\t  :<br><br>
                      Kepala \t. . . . .
                    </td>
                    <td style="width: 50%;margin-bottom:5px; margin-top:4px;">
                      Kembali dari\t:<br>
                      Tanggal\t\t\t :<br><br>
                      Kepala \t. . . . .
                    </td></tr>`;
      }
      tujuan += `</ol>`;
      transport += `</ol>`;
      lama += `</ol>`;
      maksud += `</ol>`;
      sumber += `</ol>`;
    }

    const html = `
      <p style="text-align:center;"><strong style="text-decoration:underline">SURAT PERINTAH PERJALANAN DINAS (SPPD)</strong><br>Nomor : ${detailSppd?.nomor_sppd.replaceAll(
      'ST',
      'SPPD',
    )}</p>

      <table cellpadding="5" cellspacing="0" width="100%">
        <tbody>
          <tr>
            <td style="width: 50%;border:none;">

              <table cellpadding="5" cellspacing="0" width="100%">
                <tbody>
                  <tr>
                    <td style="width:7%; margin-bottom:5px; margin-top:4px;">1.</td>
                    <td style="width: 43%;margin-bottom:5px; margin-top:4px;">Nama / Pegawai yang melaksanan perjalanan dinas </td>
                    <td style="width: 50%;margin-bottom:5px; margin-top:4px;">${detailSppd?.nama
      }</td>
                  </tr>
                  <tr>
                    <td style="width:7%; margin-bottom:5px; margin-top:4px;">2.</td>
                    <td style="width: 43%;margin-bottom:5px; margin-top:4px;">Jabatan </td>
                    <td style="width: 50%;margin-bottom:5px; margin-top:4px;">${detailSppd?.jabatan
      }</td>
                  </tr>
                  <tr>
                    <td style="width:7%; margin-bottom:5px; margin-top:4px;">3.</td>
                    <td style="width: 43%;margin-bottom:5px; margin-top:4px;">Tujuan Perjalanan Dinas </td>
                    <td style="width: 50%;margin-bottom:5px; margin-top:4px;">${tujuan}</td>
                  </tr>
                  <tr>
                    <td style="width:7%; margin-bottom:5px; margin-top:4px;">4.</td>
                    <td style="width: 43%;margin-bottom:5px; margin-top:4px;">Transportasi yang digunakan </td>
                    <td style="width: 50%;margin-bottom:5px; margin-top:4px;">${transport}</td>
                  </tr>
                  <tr>
                    <td style="width:7%; margin-bottom:5px; margin-top:4px;">5.</td>
                    <td style="width: 43%;margin-bottom:5px; margin-top:4px;">Lama Perjalanan Dinas </td>
                    <td style="width: 50%;margin-bottom:5px; margin-top:4px;">${lama}</td>
                  </tr>
                  <tr>
                    <td style="width:7%; margin-bottom:5px; margin-top:4px;">6.</td>
                    <td style="width: 43%;margin-bottom:5px; margin-top:4px;">Maksud Perjalanan Dinas </td>
                    <td style="width: 50%;margin-bottom:5px; margin-top:4px;">${maksud}</td>
                  </tr>
                  <tr>
                    <td style="width:7%; margin-bottom:5px; margin-top:4px;">7.</td>
                    <td style="width: 43%;margin-bottom:5px; margin-top:4px;">Pembebanan Biaya Perjalanan Dinas </td>
                    <td style="width: 50%;margin-bottom:5px; margin-top:4px;">${sumber}</td>
                  </tr>

                </tbody>
              </table>

            </td>

            <td style="width: 50%;border:none;">

               <table cellpadding="5" cellspacing="0" width="100%" style="margin-top:-5">
                <tbody>
                <tr style="border:none">
                    <td style="width: 7%;margin-bottom:0px; margin-top:0px; height: 0px;"></td>
                    <td style="width: 43%;margin-bottom:0px; margin-top:0px;height: 0px;"></td>
                    <td style="width: 50%;margin-bottom:0px; margin-top:0px;height: 0px;" ></td>
                  <tr>
                    <td style="width: 7%;margin-bottom:5px; margin-top:4px;" rowspan="${detailSppd?.tujuan_sppd?.length + 1
      }">8.</td>
                    <td style="width: 93%;margin-bottom:5px; margin-top:4px;" colspan="2">MENGETAHUI PEJABAT DAERAH YANG DIKUNJUNGI<br><span>Tempat Kedudukan Melaksanakan Perintah</span></td>
                  </tr>

                    ${paraf}

                   <tr>
                    <td style="width: 7%;margin-bottom:5px; margin-top:4px;" rowspan="2">9.</td>
                    <td style="width: 93%;margin-bottom:5px; margin-top:4px;" colspan="2">CATATAN</td>
                  </tr>
                   <tr>
                    <td style="width: 93%;margin-bottom:8px; margin-top:7px;" colspan="3"><i>${detailSppd?.approval.filter((a) => a.type === typeSign)[0]?.ket || '<br><br>'
      }</i></td>
                  </tr>
                </tbody>
              </table>

            </td>
          </tr>
        </tbody>
       </table>

        <small><i>Untuk keperluan klaim biaya perjalanan dinas (SPPD), mohon agar melampirkan dokumen pendukung sebagai berikut: :
      <ul>
      <li>Invoice atau bukti pembayaran hotel</li>
    <li>E-tiket perjalanan</li>
    <li>Boarding pass</li>
    <li>Kwitansi transportasi lokal (jika ada)</li>
    <li>Kwitansi transportasi umum (jika ada)</li>
    <li>Foto Kegiatan</li>
    <li>Laporan Kegiatan</li>
      </ul></i></small><br>
    `;

    setTimeout(() => {
      console.log(typeSign);
      print(html, 'landscape', image.headSurat2, image.footSurat2, '860', 60, 70, 60, 80, 'sign');
    }, 2000);
  };

  const printRealisasi = () => {
    setLoading(true);
    setTypeSign('verif_realisasi');
    if (detailSppd.realisasi) {
      console.log(detailSppd);

      let tets = ``;
      for (let i = 0; i < detailSppd?.realisasi_biaya?.length; i++) {
        tets += `<li style="margin-bottom:10px;"><span><strong> Tujuan SPPD : ${detailSppd?.realisasi_biaya[i]?.detail_tujuan
          }</strong><br> ${dayjs(detailSppd?.realisasi_biaya[i]?.rill_wb)
            .locale('id')
            .format('dddd, DD MMMM YYYY HH:mm')} (${detailSppd?.realisasi_biaya[i].rate_wb * 100
          }%*) -  ${dayjs(detailSppd?.realisasi_biaya[i]?.rill_wt)
            .locale('id')
            .format('dddd, DD MMMM YYYY HH:mm')} (${detailSppd?.realisasi_biaya[i].rate_wt * 100
          }%*) </span>
      <table cellspacing="0" width="100%" style="margin-top:-10">
        <tbody>
        <tr>
            <td style="width:40%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none"><strong>Daftar Rincian</strong> </td>
            <td style="width:29%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none"><strong>Sumber Biaya</strong> </td>
            <td style="width:29%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" ><strong>Total Biaya</strong></td>
          </tr>

            <tr>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Tiket </td>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">${detailSppd?.realisasi_biaya[i]?.p_tiket
          }% PEMA </td>
            <td style="margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >${rupiah(
            detailSppd?.realisasi_biaya[i]?.rill_tiket,
          )}</td>
          </tr>

          <tr>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Uang Makan</td>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">${detailSppd?.realisasi_biaya[i]?.p_um
          }% PEMA </td>
            <td style="margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >${rupiah(
            detailSppd?.realisasi_biaya[i].fix_um,
          )}</td>
          </tr>

          <tr>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Transportasi Lokal</td </td>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">${detailSppd?.realisasi_biaya[i]?.p_tl
          }% PEMA </td>
            <td style="margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >${rupiah(
            detailSppd?.realisasi_biaya[i]?.fix_tr,
          )}</td>
          </tr>

          <tr>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Uang Saku </td </td>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">${detailSppd?.realisasi_biaya[i]?.p_us
          }% PEMA </td>
            <td style="margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >${rupiah(
            detailSppd?.realisasi_biaya[i]?.fix_us,
          )}</td>
          </tr>

            <tr>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Hotel</td>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">${detailSppd?.realisasi_biaya[i]?.p_hotel
          }% PEMA </td>
            <td style="margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >${rupiah(
            detailSppd?.realisasi_biaya[i]?.rill_hotel,
          )}</td>
          </tr>

          <tr>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Uang BBM</td>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">100% PEMA </td>
            <td style="margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >${rupiah(
            detailSppd?.realisasi_biaya[i]?.rill_bbm,
          )}</td>
          </tr>

           <tr>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Tranportasi Umum</td>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">100% PEMA </td>
            <td style="margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >${rupiah(
            detailSppd?.realisasi_biaya[i]?.rill_t_umum,
          )}</td>
          </tr>

          <tr>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none"><strong>Total Biaya</strong></td </td>
            <td style="margin-bottom:5px; margin-top:4px; border-right:none;border-left:none"</td>
            <td style="margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" ><strong>${rupiah(
            detailSppd?.realisasi_biaya[i]?.jumlah_rill,
          )}</strong></td>
          </tr>


        </tbody>
      </table>
    </li>`;
      }

      const html = `<p style="text-align:center;"><strong style="text-decoration:underline">DAFTAR RINCIAN BIAYA AKTUAL</strong><br>Nomor SPPD : ${detailSppd?.nomor_sppd.replaceAll(
        'ST',
        'SPPD',
      )}</p><br>

        <table cellpadding="5" cellspacing="0" width="100%">
          <tbody>
            <tr>
              <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">ID Karyawan</td </td>
              <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.employe_id
        }</td>
            </tr>
            <tr>
              <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Nama Yang Melakukan Perjalanan Dinas</td </td>
              <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.nama
        }</td>
            </tr>
            <tr>
              <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Jabatan</td </td>
              <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.jabatan
        }</td>
            </tr>
            <tr>
              <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Golongan / Rate</td </td>
              <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.golongan
        }</td>
            </tr>
          </tbody>
        </table>

         <table width="100%">
      <tbody>
      <tr>
        <td style="width:100%; margin-top:7px">
        <ol style="margin-top:-15;margin-bottom:-19">
    ${tets}
          </ol>
          <span><strong>Total Aktual Biaya _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _${rupiah(detailSppd?.rill_biaya)}
          <br/>
          Bayar Vendor Tiket _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ ${rupiah(detailSppd?.rill_tiket)}
          <br/>
          Total Uang Muka _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _<u>${rupiah(detailSppd?.uang_muka)}  </u>
          <br/>
          Total Selisih Biaya _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _   <i style="color:${(detailSppd?.rill_biaya - detailSppd?.uang_muka - detailSppd?.rill_tiket) < 0 ? 'red' : 'green'}">${rupiah((detailSppd?.rill_biaya) - (detailSppd?.uang_muka) - (detailSppd?.rill_tiket))}</i>
          </strong>
          </span>
      </td>
     </tr>
    </tbody>
   </table>
        <br>

        `;
      setTimeout(() => {
        print(
          html,
          'landscape',
          image.headSurat2,
          image.footSurat2,
          '860',
          60,
          70,
          60,
          80,
          'verif_realisasi',
        );
      }, 2000);
    } else {
      alert('error', 'Data Realisasi Belum Ada');
      setLoading(false);
    }
  };

  const printekstend = (id) => {
    console.log(id);
    console.log(detailSppd);
    setLoading(true);
    setTypeSign('extend');
    const ekstenddata = detailSppd?.approval?.find((f) => f.type === 'extend');
    console.log(ekstenddata);
    const detailektend = detailSppd?.ekstend?.find((f) => f.id_tujuan === id);

    const html = `<p style="text-align:center;"><strong style="text-decoration:underline">SURAT PERNYATAAN PENAMBAHAN HARI</strong><br>Nomor SPPD : ${detailSppd?.nomor_sppd.replaceAll(
      'ST',
      'SPPD',
    )}</p><br>

      <p>Yang Bertanda Tangan di Bawah ini</p>
      <table cellpadding="5" cellspacing="0" width="100%" >
        <tbody>
          <tr>
            <td style="width:20%;margin-bottom:0px; margin-top:0px; border:none">Nama</td </td>
            <td style="width:80%;margin-bottom:0px; margin-top:0px;border:none" >: ${ekstenddata?.first_name
      }</td>
          </tr>
          <tr>
            <td style="width:80%;margin-bottom:0px; margin-top:0px; border:none">Jabatan</td </td>
            <td style="width:70%;margin-bottom:0px; margin-top:0px;border:none" >: ${ekstenddata?.position_name
      }</td>
          </tr>
        </tbody>
      </table>
      <p style="text-align:justify; line-height:1.3; margin-top:-3">
        Dengan ini menyatakan bahwa atas nama <strong>${detailSppd?.nama}</strong> Jabatan <strong>${detailSppd?.jabatan}</strong> sesuai dengan Surat Tugas Nomor <strong>${detailSppd?.nomor_sppd}</strong> tanggal ${dayjs(detailSppd?.approval?.find((f) => f.type === 'sign')?.updated_at).format('DD MMMM YYYY')} melakukan penambahan perjalanan dinas selama
        ${detailektend?.start && detailektend?.end ? dayjs(detailektend?.end).diff(dayjs(detailektend?.start), 'day') + 1 : '-'} hari mulai  tanggal ${dayjs(detailektend?.start).format('DD MMMM YYYY')} - ${dayjs(detailektend?.end).format('DD MMMM YYYY')} dikarenakan ${detailektend?.alasan}.
      </p>
      <p style="text-align:justify; line-height:1.3; margin-top:-3">
        Demikian surat pernyataan ini dibuat dengan sebenarnya untuk ditindaklanjuti sebagaimana mestinya.
      </p>

   `;
    setTimeout(() => {
      print(
        html,
        'potrait',
        image.headSurat,
        image.footSurat,
        '595',
        60,
        80,
        60,
        80,
        'extend',
      );
    }, 2000);

  };

  const printChecklist = () => {
    console.log(detailSppd);
    setLoading(true);
    setTypeSign('verif_realisasi');
    if (detailSppd.realisasi_status) {
      let tets = ``;
      for (let i = 0; i < detailSppd?.check_doc?.length; i++) {
        tets += ` <tr>
              <td style="margin-bottom:5px; margin-top:4px;">${i + 1}</td>
              <td style="margin-bottom:5px; margin-top:4px;">${detailSppd?.check_doc[i].doc_name
          }</td>
               <td style="margin-bottom:5px; margin-top:4px;text-align:center">${detailSppd?.check_doc[i].status === 1 ? 'Ada' : 'Tidak Ada'
          }</td>
            </tr>`;
      }
      const html = `<p style="text-align:center;"><strong style="text-decoration:underline">DAFTAR RINCIAN BUKTI PENDUKUNG PERJALANAN DINAS</strong><br>Nomor SPPD : ${detailSppd?.nomor_sppd.replaceAll(
        'ST',
        'SPPD',
      )}</p><br>


      <table cellpadding="5" cellspacing="0" width="100%" >
        <tbody>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Internal / Eksternal</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.pihak_name
        }</td>
          </tr>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">ID Karyawan</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.employe_id
        }</td>
          </tr>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Nama Yang Melakukan Perjalanan Dinas</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.nama
        }</td>
          </tr>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Jabatan</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.jabatan
        }</td>
          </tr>

        </tbody>
      </table>

    <table cellpadding="5" cellspacing="0" width="100%" >
    <thead>
      <tr>
            <th style="width:5% ;margin-bottom:5px; margin-top:4px;">No</th>
            <th style="width:80% ;margin-bottom:5px; margin-top:4px;">Nama Dokumen</th>
            <th style="width:15% ;margin-bottom:5px; margin-top:4px; text-align:center">Kelengkapan</th>
      </tr>
    </thead>
    <tbody>
           ${tets}
    </tbody>
    </table>
      <p>Dokumen ini Disajikan oleh\t\t\t\t\t: <strong>${detailSppd?.realisasi?.submitter_name
        }</strong><br> Direview oleh \t\t\t\t\t\t\t\t\t\t\t\t: <strong>${detailSppd?.approval?.filter((f) => f.type === 'check_document')[0]?.status === 'approve'
          ? detailSppd?.approval?.filter((f) => f.type === 'check_document')[0]?.first_name
          : '-'
        }</strong></p>

      `;
      setTimeout(() => {
        print(
          html,
          'potrait',
          image.headSurat,
          image.footSurat,
          '595',
          60,
          80,
          60,
          80,
          'verif_document',
        );
      }, 2000);
    } else {
      alert('error', 'Data Realisasi Belum Ada');
      setLoading(false);
    }
  };

  const printBiaya = () => {
    setLoading(true);
    setTypeSign('verifikasi_biaya');
    let tets = ``;
    for (let i = 0; i < detailSppd?.tujuan_sppd?.length; i++) {
      let termin = ``;
      // termin='ete';
      // console.log( detailSppd?.tujuan_sppd[i]?.termin?.length)

      for (let j = 0; j < detailSppd?.tujuan_sppd[i]?.termin?.length; j++) {
        console.log(detailSppd?.tujuan_sppd[i]?.termin[j]?.id)
        termin += `
        <tr>

         <td style="width:4%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">${(detailSppd?.tujuan_sppd[i]?.termin[j]?.id + 1)}</td>
         <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">${dayjs(detailSppd?.tujuan_sppd[i]?.termin[j]?.tgl_bayar).format('DD MMMM YYYY')}</td>
         <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">${rupiah(detailSppd?.tujuan_sppd[i]?.termin[j]?.jumlah)}</td>
        </tr>`;
      }

      tets += `<li style="margin-bottom:10px;">


      <table cellspacing="0" width="100%" style="margin-top:-17">
        <tbody>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Jenis Perjalanan Dinas</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${detailSppd?.tujuan_sppd[i]?.jenis_sppd
        }</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Kategori</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${detailSppd?.tujuan_sppd[i]?.categori_sppd
        }</td>
          </tr>
           <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Detail Tujuan</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${detailSppd?.tujuan_sppd[i]?.detail_tujuan
        }</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Sumber Biaya</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${detailSppd?.tujuan_sppd[i]?.sumber_biaya
        }</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">RKAP</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${detailSppd?.tujuan_sppd[i]?.renbis || '-'
        }</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Waktu Berangkat</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${dayjs(
          detailSppd?.tujuan_sppd[i]?.waktu_berangkat,
        )
          .locale('id')
          .format('dddd, DD MMMM YYYY HH:mm')} (${detailSppd?.tujuan_sppd[i].rate_wb * 100
        }%*)</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Waktu Kembali</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${dayjs(
          detailSppd?.tujuan_sppd[i]?.waktu_kembali,
        )
          .locale('id')
          .format('dddd, DD MMMM YYYY HH:mm')} (${detailSppd?.tujuan_sppd[i].rate_wt * 100
        }%*)</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Tiket </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: aktual</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Uang Makan </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${rupiah(
          detailSppd?.tujuan_sppd[i].fix_um,
        )}</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Transportasi Lokal </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${rupiah(
          detailSppd?.tujuan_sppd[i]?.fix_tl,
        )}</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Uang Saku </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${rupiah(
          detailSppd?.tujuan_sppd[i]?.fix_us,
        )}</td>
          </tr>
            <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Hotel </td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${detailSppd?.tujuan_sppd[i]?.fix_hotel > 0 ? (rupiah(detailSppd?.tujuan_sppd[i]?.fix_hotel,)) : `Sharing dengan SPPD No. ${detailSppd?.tujuan_sppd[i]?.share_label}`}</td>
          </tr>
          <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none">Uang BBM </td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >: ${rupiah(
          detailSppd?.tujuan_sppd[i]?.bbm,
        )}</td>

          </tr>
            <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none"><strong>Total Perkiraan Biaya</strong></td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >:  <strong>${rupiah(
          detailSppd?.tujuan_sppd[i]?.total_biaya,
        )}</strong></td>
          </tr>
          </tr>
            <tr>
            <td style="width:48%;margin-bottom:5px; margin-top:4px; border-right:none;border-left:none"><strong>Total Uang Muka</strong></td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none;border-right:none" >:  <strong>${rupiah(
          detailSppd?.tujuan_sppd[i]?.uang_muka,
        )}</strong></td>
          </tr>
        </tbody>
      </table>

      <p><strong>Termin Pembayaran Uang Muka</strong></p>
        <table cellspacing="0" width="100%" style="margin-top:-17">
        <tbody>
        ${termin}
        </tbody>
      </table>

    </li>`;
    }

    const html = `<p style="text-align:center;"><strong style="text-decoration:underline">PENGAJUAN BIAYA PERJALANAN DINAS</strong><br>Nomor SPPD : ${detailSppd?.nomor_sppd.replaceAll(
      'ST',
      'SPPD',
    )}</p><br>

      <table cellpadding="5" cellspacing="0" width="100%">
        <tbody>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Nomor Pengajuan</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.nomor_sppd
      }</td>
          </tr>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Internal / Eksternal</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.pihak_name
      }</td>
          </tr>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">ID Karyawan</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.employe_id
      }</td>
          </tr>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Nama Yang Melakukan Perjalanan Dinas</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.nama
      }</td>
          </tr>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Jabatan</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.jabatan
      }</td>
          </tr>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Golongan / Rate</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${detailSppd?.golongan
      }</td>
          </tr>
          <tr>
            <td style="width:50%;margin-bottom:5px; margin-top:4px; border-right:none">Diajukan pada</td </td>
            <td style="width:50%;margin-bottom:5px; margin-top:4px;border-left:none" >: ${dayjs(
        detailSppd?.created_at,
      )
        .locale('id')
        .format('dddd, DD MMMM YYYY HH:mm')}</td>
          </tr>
        </tbody>
      </table>
    <table width="100%">
      <tbody>
      <tr>
        <td style="width:100%; margin-top:7px"><strong>TUJUAN SPPD</strong><br>
        <ol style="margin-top:-15;margin-bottom:-10">
    ${tets}
          </ol>
          <p><strong>TOTAL SEMUA PERKIRAAN BIAYA : ${rupiah(
          detailSppd?.perkiraan_total,
        )}**</strong>
          <br/>
          <span>Total Semua Uang Muka : ${rupiah(detailSppd?.uang_muka)}***</span>
          </p>

          <span style="font-size:10px; font-style:italic">* Persentase Rate hitungan biaya sesuai jam berangkat / tiba<br>
          ** Perkiraan biaya ini tidak termasuk tiket <br>*** Uang Muka adalah jumlah total perkiraan biaya dikurangi uang saku</span>
      </td>
     </tr>
    </tbody>
   </table>
        <br>
      `;
    setTimeout(() => {
      print(
        html,
        'potrait',
        image.headSurat,
        image.footSurat,
        '595',
        60,
        80,
        60,
        80,
        'verifikasi_biaya',
      );
    }, 2000);
  };

  const printHotelTigap = (id) => {
    setLoading(true);
    const tjn = detailSppd?.tujuan_sppd?.filter((f) => f.id === id)[0];
    console.log(id);
    setTypeSign('pemohon');
    setTypeSign2('approval_hotel');
    const html = `<p style="text-align:center;"><strong style="text-decoration:underline">SURAT KETERANGAN</strong></p>
    <p>Yang bertanda tangan di bawah ini :</p>
    <table cellpadding="5" cellspacing="0" width="100%">
        <tbody>
        <tr style="border:none">
          <td style="width: 30%; text-align: left; height:15px; vertical-align:middle!important">Nama</td>
          <td style="width: 70%; text-align: left;height:15px; vertical-align:middle!important">: ${detailSppd?.nama
      }</td>
        </tr>
        <tr style="border:none">
          <td style="width: 30%; text-align: left; height:15px; vertical-align:middle!important">Jabatan</td>
          <td style="width: 70%; text-align: left;height:15px; vertical-align:middle!important">: ${detailSppd?.jabatan
      }</td>
        </tr>
        </tbody>
      </table>

    <p>Bahwa dalam melaksanakan Surat Tugas Nomor : ${detailSppd?.nomor_sppd} tanggal ${dayjs(
        detailSppd?.mulai_tugas,
      )
        .locale('id')
        .format('DD MMMM YYYY')} benar adanya tidak menginap di Hotel/Tempat Penginapan pada tanggal ${dayjs(
          tjn?.tigapuluh?.mulai,
        )
          .locale('id')
          .format('DD')} - ${dayjs(tjn?.tigapuluh?.selesai).locale('id').format('DD MMMM YYYY')}, memohon untuk persetujuan pembayaran sebesar 30% dari standar anggaran penginapan yang sudah ditetapkan oleh perusahaan.</p>
    <p>Demikian surat keterangan ini kami buat dengan sebenarnya untuk disetujui sebagaimana mestinya.</p>

      `;
    setTimeout(() => {
      print2(
        html,
        'potrait',
        image.headSurat,
        image.footSurat,
        '595',
        60,
        80,
        60,
        80,
        'pemohon',
        'approval_hotel',
      );
    }, 2000);
  };

  return (
    <Modal isOpen={modalDoc} toggle={toggleDoc} size="xl" className="modal1" centered>
      <ModalBody className="p-3 ">
        {loading ? (
          <Alert color="success">Silakan Tunggu, Dokumen sedang diproses . . . . </Alert>
        ) : null}
        <div ref={qrCodeRef} style={{ display: 'none' }}>
          <QRCode
            value={`${baseURL}verification/${detailSppd?.nomor_dokumen}?type=${typeSign}`}
            size={400}
            qrStyle="dots"
            logoImage={logo} // Ganti dengan URL logo kamu
            logoWidth={100}
            logoHeight={100}
            eyeRadius={20}
            fgColor="#0F52BA"
          />
        </div>

        <div ref={qrCodeRef2} style={{ display: 'none' }}>
          <QRCode
            value={`${baseURL}verification/${detailSppd?.nomor_dokumen}?type=${typeSign2}`}
            size={400}
            qrStyle="dots"
            logoImage={logo} // Ganti dengan URL logo kamu
            logoWidth={100}
            logoHeight={100}
            eyeRadius={20}
            fgColor="#0F52BA"
          />
        </div>
        <Row className="mt-5 d-flex justify-content-center">
          {/* <Col md={3}>
            <Card className="  mx-sm-1 p-3 col-card border border-info" onClick={detailSppd ? printPengajuan : console.log('test')}>
              <Card className=" bg-info my-card border shadow text-light p-3">
                <MaterialIcon icon="description" />
              </Card>
              <div className="text-center mt-3">
                <h4 className="text-info">Pengajuan</h4>
              </div>
            </Card>
          </Col> */}
          <Col md={3} className="mt-3">
            <Card
              className="  mx-sm-1 p-3 col-card border border-danger"
              onClick={detailSppd ? printST : null}
            >
              <Card className=" bg-danger my-card border shadow text-light p-3">
                <MaterialIcon icon="description" />
              </Card>
              <div className="text-center mt-3">
                <h4 className="text-danger">Surat Tugas</h4>
              </div>
            </Card>
          </Col>
          <Col md={3} className="mt-3">
            <Card
              className="  mx-sm-1 p-3 col-card border border-success"
              onClick={detailSppd ? printSPPD : null}
            >
              <Card className=" bg-success my-card border shadow text-light p-3">
                <MaterialIcon icon="description" />
              </Card>
              <div className="text-center mt-3">
                <h4 className="text-success">SPPD</h4>
              </div>
            </Card>
          </Col>
          <Col md={3} className="mt-3">
            <Card
              className="  mx-sm-1 p-3 col-card border border-dark"
              onClick={detailSppd ? printBiaya : null}
            >
              <Card className=" bg-dark my-card border shadow text-light p-3">
                <MaterialIcon icon="description" />
              </Card>
              <div className="text-center mt-3">
                <h4 className="text-dark">P Biaya</h4>
              </div>
            </Card>
          </Col>

          {detailSppd?.realisasi ? (
            <>
              <Col md={3} className="mt-3">
                <Card
                  className="  mx-sm-1 p-3 col-card border border-dark"
                  onClick={detailSppd ? printRealisasi : null}
                >
                  <Card className=" bg-info my-card border shadow text-light p-3">
                    <MaterialIcon icon="description" />
                  </Card>
                  <div className="text-center mt-3">
                    <h4 className="text-info">R Biaya</h4>
                  </div>
                </Card>
              </Col>

              <Col md={3} className="mt-3">
                <Card
                  className="  mx-sm-1 p-3 col-card border border-dark"
                  onClick={detailSppd ? printChecklist : null}
                >
                  <Card className=" bg-info my-card border shadow text-light p-3">
                    <MaterialIcon icon="description" />
                  </Card>
                  <div className="text-center mt-3">
                    <h4 className="text-info">Cheklist</h4>
                  </div>
                </Card>
              </Col>

              <Col md={3} className="mt-3">
                <a
                  href={`${baseURL1}sppd/${detailSppd?.realisasi?.doc_file}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Card className="  mx-sm-1 p-3 col-card border border-success">
                    <Card className=" bg-success my-card border shadow text-light p-3">
                      <MaterialIcon icon="description" />
                    </Card>
                    <div className="text-center mt-3">
                      <h4 className="text-success">Laporan SPPD</h4>
                    </div>
                  </Card>
                </a>
              </Col>
            </>
          ) : null}

          {detailSppd?.proses?.filter((p) => p.as === 'umum')[0]?.file ? (
            <>
              <Col md={3} className="mt-3">
                <a
                  href={`${baseURL1}sppd/${detailSppd?.proses?.filter((p) => p.as === 'umum')[0]?.file
                    }`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Card
                    className="  mx-sm-1 p-3 col-card border border-success"
                  >
                    <Card className=" bg-success my-card border shadow text-light p-3">
                      <MaterialIcon icon="description" />
                    </Card>
                    <div className="text-center mt-3">
                      <h4 className="text-success">Tiket</h4>
                    </div>
                  </Card>
                </a>
              </Col>
            </>
          ) : null}

          {detailSppd?.proses?.filter((p) => p.as === 'uangmuka')[0]?.file ? (
            <>
              <Col md={3} className="mt-3">
                <a
                  href={`${baseURL1}sppd/${detailSppd?.proses?.filter((p) => p.as === 'uangmuka')[0]?.file
                    }`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Card
                    className="  mx-sm-1 p-3 col-card border border-success"
                  >
                    <Card className=" bg-success my-card border shadow text-light p-3">
                      <MaterialIcon icon="description" />
                    </Card>
                    <div className="text-center mt-3">
                      <h4 className="text-success">Uang Muka</h4>
                    </div>
                  </Card>
                </a>
              </Col>
            </>
          ) : null}


          {detailSppd?.proses?.filter((p) => p.as === 'keuangan')[0]?.file ? (
            <>
              <Col md={3} className="mt-3">
                <a
                  href={`${baseURL1}sppd/${detailSppd?.proses?.filter((p) => p.as === 'keuangan')[0]?.file
                    }`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Card
                    className="  mx-sm-1 p-3 col-card border border-success"
                  >
                    <Card className=" bg-success my-card border shadow text-light p-3">
                      <MaterialIcon icon="description" />
                    </Card>
                    <div className="text-center mt-3">
                      <h4 className="text-success">Bukti Bayar</h4>
                    </div>
                  </Card>
                </a>
              </Col>
            </>
          ) : null}

          {detailSppd?.ekstend?.length > 0 ? (
            <>
              {detailSppd?.ekstend?.map((i) => (
                <Col md={3} className="mt-3" onClick={detailSppd ? () => printekstend(i.id_tujuan) : null}>

                  <Card
                    className="  mx-sm-1 p-3 col-card border border-success"
                  >
                    <Card className=" bg-success my-card border shadow text-light p-3">
                      <MaterialIcon icon="description" />
                    </Card>
                    <div className="text-center mt-3">
                      <h4 className="text-success">Ekstend </h4>
                      <small>({i.detail_tujuan})</small>
                    </div>
                  </Card>
                </Col>
              ))}
            </>
          ) : null}

          {detailSppd?.tigap === true ? (
            detailSppd?.tujuan_sppd?.map((i) => (
              <Col md={3} key={i.id} className="mt-3">
                <Card className="mx-sm-1 p-3 col-card border border-secondary" on onClick={() => printHotelTigap(i.id)}>
                  <Card className="bg-secondary my-card border shadow text-light p-3">
                    <MaterialIcon icon="room" />
                  </Card>
                  <div className="text-center mt-3">
                    <h6 className="text-secondary">Biaya Hotel 30%</h6>
                    <small>{i?.detail_tujuan}</small>
                  </div>
                </Card>
              </Col>
            ))
          ) : null}

        </Row>
      </ModalBody>
    </Modal>
  );
};

ModalDocs.propTypes = {
  modalDoc: PropTypes.bool,
  toggleDoc: PropTypes.func,
  sppdDetail: PropTypes.object,
};

export default ModalDocs;
