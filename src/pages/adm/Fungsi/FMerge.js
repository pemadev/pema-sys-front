import { PDFDocument } from 'pdf-lib';

const FMerge = async (base1, base2) => {
  const mergePdf = async (pdf1, pdf2) => {
    const pdfDoc = await PDFDocument.create();

    const p1 = await PDFDocument.load(pdf1);
    const p2 = await PDFDocument.load(pdf2);

    const copy1 = await pdfDoc.copyPages(p1, p1.getPageIndices());
    const copy2 = await pdfDoc.copyPages(p2, p2.getPageIndices());

    copy1.forEach((page) => {
      pdfDoc.addPage(page);
    });
    copy2.forEach((page) => {
      pdfDoc.addPage(page);
    });
    const mergedPdf = await pdfDoc.save({ useObjectStreams: false });
    return mergedPdf;
  };

   if (!base2) {
    const pd1 = Uint8Array.from(atob(base1), (c) => c.charCodeAt(0));
    const mergedPdfBlob = new Blob([pd1], { type: 'application/pdf' });
    return URL.createObjectURL(mergedPdfBlob);
  }


  const pd1 = new Uint8Array(
    atob(base1)
      .split('')
      .map((c) => c.charCodeAt(0)),
  );
  const pd2 = new Uint8Array(
    atob(base2)
      .split('')
      .map((c) => c.charCodeAt(0)),
  );

  const mergedPdf = await mergePdf(pd1, pd2);
  const mergedPdfBase64 = new Blob([mergedPdf], { type: 'application/pdf' });
  return URL.createObjectURL(mergedPdfBase64);
};

export default FMerge;
