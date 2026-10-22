// Minta server menandatangani PDF secara kriptografis (hanya untuk surat yang punya kode TTE).
// Jika gagal atau surat belum punya TTE, PDF asli dikembalikan apa adanya.
const signSuratPdf = async (api, suratId, pdfUrl, tteCode) => {
  if (!tteCode) return pdfUrl;

  try {
    const blob = await (await fetch(pdfUrl)).blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const res = await api.post(`dapi/adm/surat/sign-pdf/${suratId}`, { pdf: base64 });
    const signed = Uint8Array.from(atob(res.data.data.pdf), (c) => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([signed], { type: 'application/pdf' }));
  } catch (e) {
    return pdfUrl;
  }
};

export default signSuratPdf;
