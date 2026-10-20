import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PageCanvas = ({ pdf, pageNumber, width, onPageClick, children }) => {
  const canvasRef = React.useRef(null);
  const [size, setSize] = useState({ w: width, h: width * 1.414 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let task;
    let cancelled = false;
    pdf.getPage(pageNumber).then((page) => {
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setSize({ w: viewport.width, h: viewport.height });
      setScale(viewport.scale);
      task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
    });
    return () => {
      cancelled = true;
      if (task) task.cancel();
    };
  }, [pdf, pageNumber, width]);

  const handleClick = (e) => {
    if (!onPageClick || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onPageClick(pageNumber, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        width: size.w,
        height: size.h,
        margin: '0 auto 12px',
        boxShadow: '0 0 6px rgba(0,0,0,.3)',
        cursor: onPageClick ? 'crosshair' : 'default',
        background: '#fff',
      }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      {typeof children === 'function' ? children(scale) : children}
    </div>
  );
};

PageCanvas.propTypes = {
  pdf: PropTypes.object.isRequired,
  pageNumber: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  onPageClick: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

// source: ArrayBuffer of the PDF. renderField(field, index) draws the content of a box inside a page.
const PdfPages = ({ source, fields, width, onPageClick, renderField, onFieldMove, onFieldResize }) => {
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState('');
  const dragRef = React.useRef(null);
  const resizeRef = React.useRef(null);

  const startDrag = (e, f, idx) => {
    if (!onFieldMove || e.button !== 0) return;
    const page = e.currentTarget.parentElement;
    const fieldRect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      idx,
      pointerId: e.pointerId,
      page,
      offsetX: e.clientX - fieldRect.left,
      offsetY: e.clientY - fieldRect.top,
      f,
    };
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const rect = d.page.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - rect.left - d.offsetX) / rect.width, 0), 1 - d.f.w);
    const y = Math.min(Math.max((e.clientY - rect.top - d.offsetY) / rect.height, 0), 1 - d.f.h);
    onFieldMove(d.idx, x, y);
  };

  const startResize = (e, f, idx) => {
    if (!onFieldResize || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = {
      idx,
      pointerId: e.pointerId,
      page: e.currentTarget.parentElement.parentElement,
      startX: e.clientX,
      startY: e.clientY,
      field: f,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveResize = (e) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== e.pointerId) return;
    const rect = resize.page.getBoundingClientRect();
    const maxW = Math.min(0.8, 1 - resize.field.x);
    const maxH = Math.min(0.25, 1 - resize.field.y);
    const w = Math.min(maxW, Math.max(Math.min(0.2, maxW), resize.field.w + (e.clientX - resize.startX) / rect.width));
    const h = Math.min(maxH, Math.max(Math.min(0.06, maxH), resize.field.h + (e.clientY - resize.startY) / rect.height));
    onFieldResize(resize.idx, w, h);
  };

  const endDrag = (e) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
    if (resizeRef.current?.pointerId === e.pointerId) resizeRef.current = null;
  };

  useEffect(() => {
    if (!source) return undefined;
    let doc;
    setError('');
    pdfjsLib
      .getDocument({ data: new Uint8Array(source.slice(0)) })
      .promise.then((d) => {
        doc = d;
        setPdf(d);
      })
      .catch(() => setError('Gagal membaca PDF'));
    return () => {
      if (doc) doc.destroy();
    };
  }, [source]);

  if (error) return <div className="text-danger">{error}</div>;
  if (!pdf) return <div>Memuat dokumen...</div>;

  return (
    <div style={{ overflow: 'auto', background: '#e9ecef', padding: 12 }}>
      {Array.from({ length: pdf.numPages }, (_, i) => i + 1).map((n) => (
        <PageCanvas key={n} pdf={pdf} pageNumber={n} width={width} onPageClick={onPageClick}>
          {(pageScale) =>
            (fields || []).map((f, idx) =>
              f.page === n ? (
                <div
                  key={f.id || idx}
                  onPointerDown={(e) => startDrag(e, f, idx)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  style={{
                    position: 'absolute',
                    left: `${f.x * 100}%`,
                    top: `${f.y * 100}%`,
                    width: `${f.w * 100}%`,
                    height: `${f.h * 100}%`,
                    cursor: onFieldMove ? 'move' : 'default',
                    touchAction: onFieldMove ? 'none' : 'auto',
                  }}
                >
                  {renderField(f, idx, pageScale)}
                  {onFieldResize && (
                    <button
                      type="button"
                      aria-label="Ubah ukuran kotak tanda tangan"
                      title="Tarik untuk mengubah ukuran"
                      onPointerDown={(e) => startResize(e, f, idx)}
                      onPointerMove={moveResize}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        width: 14,
                        height: 14,
                        padding: 0,
                        border: '1px solid #fff',
                        borderRadius: 2,
                        background: '#17483d',
                        cursor: 'nwse-resize',
                        touchAction: 'none',
                        zIndex: 2,
                      }}
                    />
                  )}
                </div>
              ) : null,
            )
          }
        </PageCanvas>
      ))}
    </div>
  );
};

PdfPages.propTypes = {
  source: PropTypes.object,
  fields: PropTypes.array,
  width: PropTypes.number,
  onPageClick: PropTypes.func,
  onFieldMove: PropTypes.func,
  onFieldResize: PropTypes.func,
  renderField: PropTypes.func,
};

PdfPages.defaultProps = {
  width: 700,
  renderField: () => null,
};

export default PdfPages;
