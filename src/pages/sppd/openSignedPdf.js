// Buka PDF di tab baru. Jika dokumen sudah punya TTE, PDF ditandatangani server lebih dulu
// agar tanda tangan bisa diverifikasi di pembaca PDF. Jika sudah pernah ditandatangani,
// file tersimpan langsung dipakai tanpa membuat ulang PDF di browser.
const SILENT_REASONS = ['step_not_approved', 'no_signature'];

const openSignedPdf = (api, pdfMake, docDefinition, sppdId, type, kind = '') => {
  const win = window.open('', '_blank');
  const url = `dapi/sppd/pengajuan/sign-pdf/${sppdId}`;

  const show = (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    if (win) {
      win.location.href = blobUrl;
    } else {
      window.open(blobUrl);
    }
  };

  const report = (e) => {
    const status = e?.response?.status;
    const reason = e?.response?.data?.reason;
    const message = e?.response?.data?.message || e?.message || 'Terjadi kesalahan';
    // eslint-disable-next-line no-console
    console.warn(`PDF tidak ditandatangani (${status || 'jaringan'}): ${message}`);
    if (!SILENT_REASONS.includes(reason)) {
      // eslint-disable-next-line no-alert
      window.alert(`PDF dibuka tanpa tanda tangan digital: ${message} [${reason || status || 'jaringan'}]`);
    }
  };

  const generate = (sign) =>
    pdfMake.createPdf(docDefinition).getBase64(async (base64) => {
      if (!sign) {
        show(base64);
        return;
      }
      try {
        const res = await api.post(url, { pdf: base64, type, kind });
        show(res.data.data.pdf);
      } catch (e) {
        report(e);
        show(base64);
      }
    });

  api
    .post(url, { type, kind, cached: 1 })
    .then((res) => {
      const stored = res.data?.data?.pdf;
      if (stored) {
        show(stored);
      } else {
        generate(true);
      }
    })
    .catch((e) => {
      // 404 dengan reason: dokumen belum punya TTE, tidak perlu mencoba menandatangani lagi
      if (e?.response?.status === 404 && e?.response?.data?.reason) {
        report(e);
        generate(false);
      } else {
        generate(true);
      }
    });
};

export default openSignedPdf;
