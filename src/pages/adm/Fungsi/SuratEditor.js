import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Editor } from '@tinymce/tinymce-react';
import { cleanWordPaste, PDF_LINE_RATIO, scaleLineHeights } from './wordHtml';
import './SuratEditor.scss';

// Kertas A4 dengan lebar teks yang sama dengan PDF surat (A4, margin kiri/kanan 50pt, Archivo 10pt)
const PAGE_STYLE = `
  html { background: #e9ebee; }
  body {
    box-sizing: border-box;
    width: 21cm;
    min-height: 29.7cm;
    margin: 18px auto 24px;
    padding: 1.5cm 1.76cm 2.5cm;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    font-family: Archivo, Arial, sans-serif;
    font-size: 10pt;
    /* the letter body prints at 1.3 line spacing (Word/pdfmake sense) */
    line-height: ${+(1.3 * PDF_LINE_RATIO).toFixed(3)};
    color: #000;
  }
  p { margin: 0; }
  /* paragraphs without their own spacing print 3pt above + 2.14pt below */
  p:not([style*="margin"]) { padding: 3pt 0 2.14pt; }
  table { border-collapse: collapse; }
  table:not([style*="border: 0"]) td, table:not([style*="border: 0"]) th { border: 1px solid #000; }
  td, th { padding: 2px 4px; vertical-align: top; }
  @media (max-width: 860px) {
    body { width: auto; min-height: 0; margin: 0; padding: 16px; box-shadow: none; }
  }
`;

const BORDERLESS_TABLE = `<table style="border-collapse: collapse; width: 100%; border: 0px;">
  <tbody>
    <tr>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 32%;">Nama Acara</td>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 2%;">:</td>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 66%;">&nbsp;</td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 32%;">Hari / Tanggal</td>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 2%;">:</td>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 66%;">&nbsp;</td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 32%;">Waktu</td>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 2%;">:</td>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 66%;">&nbsp;</td>
    </tr>
    <tr>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 32%;">Tempat</td>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 2%;">:</td>
      <td style="vertical-align: top; border: 0px; line-height: 1.2; width: 66%;">&nbsp;</td>
    </tr>
  </tbody>
</table><p>&nbsp;</p>`;

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20];
// Word's Line Spacing menu
const LINE_HEIGHTS = [1, 1.15, 1.5, 2, 2.5, 3];
const STYLES = [
  { tag: 'p', label: 'Normal', sample: { fontSize: 13 } },
  { tag: 'h1', label: 'Judul 1', sample: { fontSize: 17, fontWeight: 600 } },
  { tag: 'h2', label: 'Judul 2', sample: { fontSize: 15, fontWeight: 600 } },
  { tag: 'h3', label: 'Judul 3', sample: { fontSize: 13, fontWeight: 600 } },
];
// Word's "Standard Colors" row plus black/greys
const COLORS = [
  '#000000',
  '#404040',
  '#7F7F7F',
  '#C00000',
  '#FF0000',
  '#FFC000',
  '#FFFF00',
  '#92D050',
  '#00B050',
  '#00B0F0',
  '#0070C0',
  '#002060',
  '#7030A0',
];
const HIGHLIGHTS = ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FF0000', '#0000FF', '#C0C0C0'];

const toPt = (v) => {
  const m = /^([\d.]+)(px|pt)?$/.exec(String(v || ''));
  if (!m) return 10;
  return Math.round(m[2] === 'pt' ? +m[1] : +m[1] * 0.75);
};

const Ruler = ({ zoom }) => {
  const cm = 37.795 * (zoom / 100);
  return (
    <div className="we-ruler" aria-hidden="true">
      <div
        className="we-ruler-page"
        style={{ width: 21 * cm, '--cm': `${cm}px`, '--margin': `${1.76 * cm}px` }}
      >
        {Array.from({ length: 17 }, (_, i) => (
          <span key={i} style={{ left: (1.76 + i + 1) * cm }}>
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
};
Ruler.propTypes = { zoom: PropTypes.number.isRequired };

// Ribbon pieces live at module level so they keep their DOM between renders (state changes on every keystroke)
const RibbonCtx = createContext({ icons: {}, menu: null, setMenu: () => {} });

const Icon = ({ name, fallback }) => {
  const { icons } = useContext(RibbonCtx);
  return icons[name] ? (
    // eslint-disable-next-line react/no-danger
    <span className="we-ico" dangerouslySetInnerHTML={{ __html: icons[name] }} />
  ) : (
    <span className="we-ico we-ico-text">{fallback}</span>
  );
};
Icon.propTypes = { name: PropTypes.string.isRequired, fallback: PropTypes.node };
Icon.defaultProps = { fallback: '' };

const Btn = ({ icon, label, title, onClick, active, disabled, big, fallback, showLabel, bar }) => (
  <button
    type="button"
    className={`we-btn${big ? ' we-big' : ''}${active ? ' we-on' : ''}`}
    title={title || label}
    aria-label={title || label}
    aria-pressed={active === undefined ? undefined : !!active}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    <span className="we-ico-wrap">
      <Icon name={icon} fallback={fallback} />
      {bar && <span className="we-bar" style={{ background: bar }} />}
    </span>
    {(big || showLabel) && <span className="we-lbl">{label}</span>}
  </button>
);
Btn.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string,
  title: PropTypes.string,
  onClick: PropTypes.func,
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  big: PropTypes.bool,
  fallback: PropTypes.node,
  showLabel: PropTypes.bool,
  bar: PropTypes.string,
};
Btn.defaultProps = {
  label: '',
  title: '',
  onClick: undefined,
  active: undefined,
  disabled: false,
  big: false,
  fallback: '',
  showLabel: false,
  bar: undefined,
};

const Group = ({ label, children, className }) => (
  <div className={`we-group ${className}`}>
    <div className="we-group-body">{children}</div>
    <div className="we-group-label">{label}</div>
  </div>
);
Group.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
Group.defaultProps = { className: '' };

// The ribbon scrolls sideways on narrow screens, which would clip a normal dropdown, so it floats (fixed)
const Drop = ({ id, button, children }) => {
  const { menu, setMenu } = useContext(RibbonCtx);
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const toggle = () => {
    if (menu === id) {
      setMenu(null);
      return;
    }
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 2, left: Math.min(r.left, window.innerWidth - 240) });
    setMenu(id);
  };
  return (
    <div className="we-drop" ref={ref}>
      {button(toggle)}
      {menu === id && pos && (
        <div className="we-pop" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
          {children}
        </div>
      )}
    </div>
  );
};
Drop.propTypes = {
  id: PropTypes.string.isRequired,
  button: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

const SuratEditor = ({ value, onChange, apiKey, height }) => {
  const edRef = useRef(null);
  // full clipboard HTML of the last paste; TinyMCE strips its <style> block (Word's paragraph spacing)
  const clipRef = useRef('');
  const rootRef = useRef(null);
  const [icons, setIcons] = useState({});
  const [tab, setTab] = useState('beranda');
  const [menu, setMenu] = useState(null);
  const [st, setSt] = useState({});
  const [words, setWords] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [full, setFull] = useState(false);
  const [grid, setGrid] = useState([0, 0]);
  // last colours used, shown under the colour buttons like Word
  const [lastColor, setLastColor] = useState({ ForeColor: '#C00000', HiliteColor: '#FFFF00' });

  const ed = () => edRef.current;
  const run = (cmd, val, ui = false) => {
    const e = ed();
    if (!e) return;
    e.focus();
    e.execCommand(cmd, ui, val);
    setMenu(null);
  };

  const refresh = () => {
    const e = ed();
    if (!e || !e.selection) return;
    const q = (c) => {
      try {
        return e.queryCommandState(c);
      } catch (err) {
        return false;
      }
    };
    const inTable = !!e.dom.getParent(e.selection.getNode(), 'table');
    setSt({
      bold: q('Bold'),
      italic: q('Italic'),
      underline: q('Underline'),
      strike: q('Strikethrough'),
      sub: q('Subscript'),
      sup: q('Superscript'),
      left: q('JustifyLeft'),
      center: q('JustifyCenter'),
      right: q('JustifyRight'),
      justify: q('JustifyFull'),
      ul: q('InsertUnorderedList'),
      ol: q('InsertOrderedList'),
      block: (e.queryCommandValue('FormatBlock') || 'p').toLowerCase(),
      size: toPt(e.queryCommandValue('FontSize')),
      ...(() => {
        const block = e.dom.getParent(e.selection.getNode(), e.dom.isBlock) || e.getBody();
        const lh = parseFloat(e.dom.getStyle(block, 'line-height'));
        return {
          lineHeight: Number.isNaN(lh) ? null : +(lh / PDF_LINE_RATIO).toFixed(2),
          spaceBefore: parseFloat(e.dom.getStyle(block, 'margin-top')) > 0,
          spaceAfter: parseFloat(e.dom.getStyle(block, 'margin-bottom')) > 0,
        };
      })(),
      inTable,
      undo: e.undoManager.hasUndo(),
      redo: e.undoManager.hasRedo(),
    });
    if (!inTable) setTab((t) => (t === 'tabel' ? 'beranda' : t));
  };

  const countWords = () => {
    const wc = ed()?.plugins?.wordcount;
    if (wc) setWords(wc.body.getWordCount());
  };

  // close dropdowns on outside click / Escape
  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => {
      if (!e.target.closest?.('.we-drop')) setMenu(null);
    };
    const onKey = (e) => e.key === 'Escape' && setMenu(null);
    // floating dropdowns would stay behind when the page scrolls
    const onScroll = (e) => !e.target.closest?.('.we-pop') && setMenu(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [menu]);

  useEffect(() => {
    const body = ed()?.getBody();
    if (body) body.style.zoom = zoom / 100;
  }, [zoom]);

  const insertBorderless = () => {
    const e = ed();
    e.focus();
    e.insertContent(BORDERLESS_TABLE);
  };

  // Word's "Add/Remove Space Before/After Paragraph"
  const setParagraphSpace = (prop, size) => {
    const e = ed();
    e.focus();
    e.undoManager.transact(() => {
      e.selection.getSelectedBlocks().forEach((b) => e.dom.setStyle(b, prop, size));
    });
    e.nodeChanged();
    setMenu(null);
  };

  const setTableBorders = (on) => {
    const e = ed();
    const table = e.dom.getParent(e.selection.getNode(), 'table');
    if (!table) return;
    e.undoManager.transact(() => {
      if (on) table.setAttribute('border', '1');
      else table.removeAttribute('border');
      e.dom.setStyles(table, {
        'border-collapse': 'collapse',
        border: on ? '1px solid #000' : '0px',
      });
      e.dom
        .select('td,th', table)
        .forEach((c) => e.dom.setStyle(c, 'border', on ? '1px solid #000' : '0px'));
    });
    e.nodeChanged();
  };

  const pasteFromClipboard = async () => {
    const e = ed();
    try {
      const items = await navigator.clipboard.read();
      const item = items[0];
      if (item.types.includes('text/html')) {
        const html = await (await item.getType('text/html')).text();
        clipRef.current = html;
        e.execCommand('mceInsertClipboardContent', false, { html });
      } else {
        const text = await (await item.getType('text/plain')).text();
        e.execCommand('mceInsertClipboardContent', false, { text });
      }
    } catch (err) {
      e.notificationManager.open({
        text: 'Browser tidak mengizinkan tempel dari tombol. Gunakan Ctrl+V.',
        type: 'info',
        timeout: 4000,
      });
    }
  };

  const stepSize = (dir) => {
    const cur = st.size || 10;
    const next =
      dir > 0 ? FONT_SIZES.find((s) => s > cur) : [...FONT_SIZES].reverse().find((s) => s < cur);
    if (next) run('FontSize', `${next}pt`);
  };

  const palette = (colors, cmd, noneLabel) => (
    <>
      <div className="we-swatches">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            className="we-swatch"
            style={{ background: c }}
            title={c}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setLastColor((prev) => ({ ...prev, [cmd]: c }));
              run(cmd, c);
            }}
          />
        ))}
      </div>
      <button
        type="button"
        className="we-menu-item"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => run('mceRemoveTextcolor', cmd === 'ForeColor' ? 'forecolor' : 'hilitecolor')}
      >
        {noneLabel}
      </button>
    </>
  );

  const homeTab = (
    <>
      <Group label="Clipboard">
        <Btn big icon="paste" label="Tempel" title="Tempel (Ctrl+V)" onClick={pasteFromClipboard} />
        <div className="we-col">
          <Btn
            icon="cut"
            label="Potong"
            title="Potong (Ctrl+X)"
            showLabel
            onClick={() => run('Cut')}
          />
          <Btn
            icon="copy"
            label="Salin"
            title="Salin (Ctrl+C)"
            showLabel
            onClick={() => run('Copy')}
          />
        </div>
      </Group>
      <Group label="Font">
        <div className="we-col">
          <div className="we-row">
            <select
              className="we-select"
              title="Ukuran Font"
              value={st.size || 10}
              onChange={(e) => run('FontSize', `${e.target.value}pt`)}
            >
              {!FONT_SIZES.includes(st.size || 10) && <option value={st.size}>{st.size}</option>}
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Btn
              icon="text-size-increase"
              fallback="A+"
              title="Perbesar Font"
              onClick={() => stepSize(1)}
            />
            <Btn
              icon="text-size-decrease"
              fallback="A-"
              title="Perkecil Font"
              onClick={() => stepSize(-1)}
            />
            <Btn
              icon="remove-formatting"
              title="Hapus Semua Format"
              onClick={() => run('RemoveFormat')}
            />
          </div>
          <div className="we-row">
            <Btn icon="bold" title="Tebal (Ctrl+B)" active={st.bold} onClick={() => run('Bold')} />
            <Btn
              icon="italic"
              title="Miring (Ctrl+I)"
              active={st.italic}
              onClick={() => run('Italic')}
            />
            <Btn
              icon="underline"
              title="Garis Bawah (Ctrl+U)"
              active={st.underline}
              onClick={() => run('Underline')}
            />
            <Btn
              icon="strike-through"
              title="Coret"
              active={st.strike}
              onClick={() => run('Strikethrough')}
            />
            <Btn
              icon="subscript"
              title="Subskrip"
              active={st.sub}
              onClick={() => run('Subscript')}
            />
            <Btn
              icon="superscript"
              title="Superskrip"
              active={st.sup}
              onClick={() => run('Superscript')}
            />
            <Drop
              id="hilite"
              button={(toggle) => (
                <Btn
                  icon="highlight-bg-color"
                  title="Warna Sorotan Teks"
                  bar={lastColor.HiliteColor}
                  onClick={toggle}
                />
              )}
            >
              {palette(HIGHLIGHTS, 'HiliteColor', 'Tanpa Warna')}
            </Drop>
            <Drop
              id="color"
              button={(toggle) => (
                <Btn
                  icon="text-color"
                  title="Warna Font"
                  bar={lastColor.ForeColor}
                  onClick={toggle}
                />
              )}
            >
              {palette(COLORS, 'ForeColor', 'Otomatis')}
            </Drop>
          </div>
        </div>
      </Group>
      <Group label="Paragraf">
        <div className="we-col">
          <div className="we-row">
            <Btn
              icon="unordered-list"
              title="Poin"
              active={st.ul}
              onClick={() => run('InsertUnorderedList')}
            />
            <Btn
              icon="ordered-list"
              title="Penomoran"
              active={st.ol}
              onClick={() => run('InsertOrderedList')}
            />
            <Btn icon="outdent" title="Kurangi Indentasi" onClick={() => run('Outdent')} />
            <Btn icon="indent" title="Tambah Indentasi" onClick={() => run('Indent')} />
          </div>
          <div className="we-row">
            <Btn
              icon="align-left"
              title="Rata Kiri (Ctrl+L)"
              active={st.left}
              onClick={() => run('JustifyLeft')}
            />
            <Btn
              icon="align-center"
              title="Rata Tengah (Ctrl+E)"
              active={st.center}
              onClick={() => run('JustifyCenter')}
            />
            <Btn
              icon="align-right"
              title="Rata Kanan (Ctrl+R)"
              active={st.right}
              onClick={() => run('JustifyRight')}
            />
            <Btn
              icon="align-justify"
              title="Rata Kiri Kanan (Ctrl+J)"
              active={st.justify}
              onClick={() => run('JustifyFull')}
            />
            <Drop
              id="lh"
              button={(toggle) => <Btn icon="line-height" title="Spasi Baris" onClick={toggle} />}
            >
              {LINE_HEIGHTS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`we-menu-item we-check${st.lineHeight === h ? ' we-checked' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => run('LineHeight', String(+(h * PDF_LINE_RATIO).toFixed(3)))}
                >
                  {(Number.isInteger(h) ? h.toFixed(1) : String(h)).replace('.', ',')}
                </button>
              ))}
              <div className="we-menu-sep" />
              <button
                type="button"
                className="we-menu-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setParagraphSpace('margin-top', st.spaceBefore ? '0pt' : '12pt')}
              >
                {st.spaceBefore ? 'Hapus Spasi Sebelum Paragraf' : 'Tambah Spasi Sebelum Paragraf'}
              </button>
              <button
                type="button"
                className="we-menu-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setParagraphSpace('margin-bottom', st.spaceAfter ? '0pt' : '8pt')}
              >
                {st.spaceAfter ? 'Hapus Spasi Setelah Paragraf' : 'Tambah Spasi Setelah Paragraf'}
              </button>
            </Drop>
          </div>
        </div>
      </Group>
      <Group label="Gaya" className="we-styles-group">
        <div className="we-styles">
          {STYLES.map((s) => (
            <button
              key={s.tag}
              type="button"
              className={`we-style${st.block === s.tag ? ' we-on' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run('FormatBlock', s.tag)}
            >
              <span style={s.sample}>AaBbCc</span>
              <small>{s.label}</small>
            </button>
          ))}
        </div>
      </Group>
      <Group label="Pengeditan">
        <div className="we-col">
          <Btn
            icon="search"
            label="Cari"
            title="Cari (Ctrl+F)"
            showLabel
            onClick={() => run('SearchReplace')}
          />
          <Btn
            icon="replace"
            fallback="ab"
            label="Ganti"
            title="Ganti (Ctrl+H)"
            showLabel
            onClick={() => run('SearchReplace')}
          />
          <Btn
            icon="select-all"
            label="Pilih Semua"
            title="Pilih Semua (Ctrl+A)"
            showLabel
            onClick={() => run('SelectAll')}
          />
        </div>
      </Group>
    </>
  );

  const insertTab = (
    <>
      <Group label="Tabel">
        <Drop
          id="grid"
          button={(toggle) => (
            <Btn big icon="table" label="Tabel" title="Sisipkan Tabel" onClick={toggle} />
          )}
        >
          <div className="we-grid-title">
            {grid[0] ? `Tabel ${grid[1]}x${grid[0]}` : 'Sisipkan Tabel'}
          </div>
          <div className="we-grid" onMouseLeave={() => setGrid([0, 0])}>
            {Array.from({ length: 8 }, (_, r) =>
              Array.from({ length: 10 }, (__, c) => (
                <button
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${r}-${c}`}
                  type="button"
                  aria-label={`Tabel ${c + 1} kolom x ${r + 1} baris`}
                  className={`we-cell${r < grid[0] && c < grid[1] ? ' we-on' : ''}`}
                  onMouseEnter={() => setGrid([r + 1, c + 1])}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => run('mceInsertTable', { rows: r + 1, columns: c + 1 })}
                />
              )),
            )}
          </div>
        </Drop>
        <Btn
          big
          icon="table-insert-row-after"
          label="Tabel Tanpa Garis"
          title="Tabel tanpa garis (Nama : Isi)"
          onClick={insertBorderless}
        />
      </Group>
      <Group label="Simbol">
        <Btn big icon="insert-character" label="Simbol" onClick={() => run('mceShowCharmap')} />
        <Btn
          big
          icon="horizontal-rule"
          label="Garis"
          title="Garis Horizontal"
          onClick={() => run('InsertHorizontalRule')}
        />
      </Group>
    </>
  );

  const tableTab = (
    <>
      <Group label="Baris & Kolom">
        <div className="we-col">
          <Btn
            icon="table-insert-row-above"
            label="Sisip di Atas"
            showLabel
            onClick={() => run('mceTableInsertRowBefore')}
          />
          <Btn
            icon="table-insert-row-after"
            label="Sisip di Bawah"
            showLabel
            onClick={() => run('mceTableInsertRowAfter')}
          />
        </div>
        <div className="we-col">
          <Btn
            icon="table-insert-column-before"
            label="Sisip di Kiri"
            showLabel
            onClick={() => run('mceTableInsertColBefore')}
          />
          <Btn
            icon="table-insert-column-after"
            label="Sisip di Kanan"
            showLabel
            onClick={() => run('mceTableInsertColAfter')}
          />
        </div>
      </Group>
      <Group label="Hapus">
        <div className="we-col">
          <Btn
            icon="table-delete-row"
            label="Hapus Baris"
            showLabel
            onClick={() => run('mceTableDeleteRow')}
          />
          <Btn
            icon="table-delete-column"
            label="Hapus Kolom"
            showLabel
            onClick={() => run('mceTableDeleteCol')}
          />
          <Btn
            icon="table-delete-table"
            label="Hapus Tabel"
            showLabel
            onClick={() => run('mceTableDelete')}
          />
        </div>
      </Group>
      <Group label="Gabung">
        <div className="we-col">
          <Btn
            icon="table-merge-cells"
            label="Gabungkan Sel"
            showLabel
            onClick={() => run('mceTableMergeCells')}
          />
          <Btn
            icon="table-split-cells"
            label="Pisahkan Sel"
            showLabel
            onClick={() => run('mceTableSplitCells')}
          />
        </div>
      </Group>
      <Group label="Garis">
        <div className="we-col">
          <Btn
            icon="border-all"
            fallback="▦"
            label="Semua Garis"
            showLabel
            onClick={() => setTableBorders(true)}
          />
          <Btn
            icon="border-none"
            fallback="⬚"
            label="Tanpa Garis"
            showLabel
            onClick={() => setTableBorders(false)}
          />
        </div>
      </Group>
      <Group label="Properti">
        <Btn
          big
          icon="table-cell-properties"
          label="Properti"
          title="Properti Tabel"
          onClick={() => run('mceTableProps', undefined, true)}
        />
      </Group>
    </>
  );

  const viewTab = (
    <>
      <Group label="Tampilan">
        <Btn
          big
          icon="fullscreen"
          label={full ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          active={full}
          onClick={() => setFull(!full)}
        />
        <Btn
          big
          icon="visualblocks"
          label="Tanda Paragraf"
          onClick={() => run('mceVisualBlocks')}
        />
        <Btn big icon="preview" label="Pratinjau" onClick={() => run('mcePreview')} />
        <Btn big icon="sourcecode" label="Kode HTML" onClick={() => run('mceCodeEditor')} />
      </Group>
      <Group label="Zoom">
        <Btn
          big
          icon="zoom-in"
          fallback="+"
          label="Perbesar"
          onClick={() => setZoom(Math.min(200, zoom + 10))}
        />
        <Btn
          big
          icon="zoom-out"
          fallback="-"
          label="Perkecil"
          onClick={() => setZoom(Math.max(50, zoom - 10))}
        />
        <Btn
          big
          icon="document-properties"
          fallback="1:1"
          label="100%"
          onClick={() => setZoom(100)}
        />
      </Group>
    </>
  );

  const tabs = [
    ['beranda', 'Beranda'],
    ['sisipkan', 'Sisipkan'],
    ['tampilan', 'Tampilan'],
  ];

  return (
    <RibbonCtx.Provider value={{ icons, menu, setMenu }}>
      <div
        ref={rootRef}
        className={`we-root${full ? ' we-full' : ''}`}
        style={full ? undefined : { height }}
      >
        <div className="we-titlebar">
          <div className="we-qat">
            <Btn
              icon="undo"
              title="Batalkan (Ctrl+Z)"
              disabled={!st.undo}
              onClick={() => run('Undo')}
            />
            <Btn
              icon="redo"
              title="Ulangi (Ctrl+Y)"
              disabled={!st.redo}
              onClick={() => run('Redo')}
            />
          </div>
          <div className="we-title">Isi Surat</div>
          <div className="we-title-hint">Tempel dari Word dengan Ctrl+V, format tetap terjaga</div>
        </div>

        <div className="we-tabs" role="tablist">
          <div className="we-drop">
            <button
              type="button"
              className="we-tab we-file"
              onClick={() => setMenu(menu === 'file' ? null : 'file')}
            >
              File
            </button>
            {menu === 'file' && (
              <div className="we-pop we-file-menu">
                <button
                  type="button"
                  className="we-menu-item"
                  onClick={() => run('mceNewDocument')}
                >
                  Dokumen Baru (kosongkan isi)
                </button>
                <button type="button" className="we-menu-item" onClick={() => run('mcePreview')}>
                  Pratinjau
                </button>
              </div>
            )}
          </div>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`we-tab${tab === id ? ' we-active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          {st.inTable && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'tabel'}
              className={`we-tab we-context${tab === 'tabel' ? ' we-active' : ''}`}
              onClick={() => setTab('tabel')}
            >
              Tabel
            </button>
          )}
        </div>

        <div className="we-ribbon">
          {tab === 'beranda' && homeTab}
          {tab === 'sisipkan' && insertTab}
          {tab === 'tampilan' && viewTab}
          {tab === 'tabel' && tableTab}
        </div>

        <Ruler zoom={zoom} />

        <div className="we-doc">
          <Editor
            apiKey={apiKey}
            value={value}
            onEditorChange={onChange}
            onInit={(evt, editor) => {
              edRef.current = editor;
              setIcons(editor.ui.registry.getAll().icons);
              refresh();
              countWords();
            }}
            init={{
              height: '100%',
              menubar: false,
              toolbar: false,
              statusbar: false,
              branding: false,
              promotion: false,
              table_toolbar: '',
              plugins: [
                'lists',
                'advlist',
                'table',
                'charmap',
                'searchreplace',
                'visualblocks',
                'wordcount',
                'code',
                'preview',
              ],
              block_formats: 'Paragraf=p; Judul 1=h1; Judul 2=h2; Judul 3=h3',
              // The PDF has only the letter font; any other family would make pdfmake fail
              invalid_styles: { '*': 'font-family' },
              indent_use_margin: true,
              table_default_attributes: { border: '1' },
              table_default_styles: { 'border-collapse': 'collapse', width: '100%' },
              // Images can't be carried into the PDF
              paste_data_images: false,
              // Runs on the raw clipboard HTML, before TinyMCE drops Word's mso-list markers
              paste_preprocess: (editor, args) => {
                if (!/mso-|Mso|urn:schemas-microsoft-com/.test(args.content)) return;
                const doc = new DOMParser().parseFromString(args.content, 'text/html');
                cleanWordPaste(doc.body, clipRef.current);
                // eslint-disable-next-line no-param-reassign
                args.content = doc.body.innerHTML;
              },
              content_css:
                'https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,600;1,400;1,600&display=swap',
              content_style: PAGE_STYLE,
              setup: (editor) => {
                editor.on('paste', (ev) => {
                  clipRef.current = ev.clipboardData?.getData('text/html') || '';
                });
                // Stored HTML keeps Word/PDF line spacing; the editor shows it scaled to look the same on screen
                editor.on('BeforeSetContent', (ev) => {
                  if (ev.format !== 'raw' && typeof ev.content === 'string') {
                    // eslint-disable-next-line no-param-reassign
                    ev.content = scaleLineHeights(ev.content, PDF_LINE_RATIO);
                  }
                });
                editor.on('GetContent', (ev) => {
                  if (
                    ev.format !== 'raw' &&
                    ev.format !== 'text' &&
                    typeof ev.content === 'string'
                  ) {
                    // eslint-disable-next-line no-param-reassign
                    ev.content = scaleLineHeights(ev.content, 1 / PDF_LINE_RATIO, 2);
                  }
                });
                editor.on('NodeChange SelectionChange Undo Redo SetContent', refresh);
                editor.on('input SetContent Undo Redo', countWords);
                // Word paragraph alignment shortcuts
                editor.addShortcut('meta+l', 'Rata kiri', () => editor.execCommand('JustifyLeft'));
                editor.addShortcut('meta+e', 'Rata tengah', () =>
                  editor.execCommand('JustifyCenter'),
                );
                editor.addShortcut('meta+r', 'Rata kanan', () =>
                  editor.execCommand('JustifyRight'),
                );
                editor.addShortcut('meta+j', 'Rata kiri-kanan', () =>
                  editor.execCommand('JustifyFull'),
                );
                editor.addShortcut('meta+shift+l', 'Poin', () =>
                  editor.execCommand('InsertUnorderedList'),
                );
                editor.addShortcut('meta+h', 'Ganti', () => editor.execCommand('SearchReplace'));
              },
            }}
          />
        </div>

        <div className="we-status">
          <span>{words} kata</span>
          <span className="we-status-sep">Bahasa Indonesia</span>
          <div className="we-zoom">
            <button
              type="button"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              aria-label="Perkecil"
            >
              −
            </button>
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              value={zoom}
              onChange={(e) => setZoom(+e.target.value)}
              aria-label="Zoom"
            />
            <button
              type="button"
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              aria-label="Perbesar"
            >
              +
            </button>
            <span className="we-zoom-val">{zoom}%</span>
          </div>
        </div>
      </div>
    </RibbonCtx.Provider>
  );
};

SuratEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  apiKey: PropTypes.string.isRequired,
  height: PropTypes.number,
};

SuratEditor.defaultProps = {
  value: '',
  height: 780,
};

export default SuratEditor;
