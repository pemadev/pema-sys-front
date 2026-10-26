// Helpers that make HTML copied from Microsoft Word print cleanly in the letter PDF (Generate.js)

const TEXT_WIDTH_PT = 495; // A4 width minus the letter's 50pt side margins
const CELL = 'vertical-align: top; border: 0px; line-height: 1.2;';

// Archivo's ascent+descent in em. pdfmake (like Word) measures line spacing as a multiple of this,
// a browser as a multiple of the font size, so the editor scales line-height by it to match the PDF
export const PDF_LINE_RATIO = 1.088;
// html-to-pdfmake lays out whitespace between two blocks as an empty line (10pt at the letter's 1.3 spacing);
// Generate.js' negative bottom margins exist to cancel it
const PHANTOM_LINE_PT = 10 * 1.3 * PDF_LINE_RATIO;
const LEGACY_BOTTOM_PT = { P: -12, OL: -15, UL: -15, TABLE: -7, DIV: 0 };
const BLOCKS = new Set(['P', 'DIV', 'OL', 'UL', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'HR', 'PRE']);
// e.g. Word tables' "margin-left:-5.4pt": html-to-pdfmake passes negative lengths through unparsed and pdfmake fails
const NEGATIVE_MARGIN = /^margin-(top|bottom|left|right)\s*:\s*-/i;
const hasTopMargin = (el) => /(^|;)\s*margin-top\s*:/i.test(el.getAttribute('style') || '');
const hasBottomMargin = (el) => /(^|;)\s*margin-bottom\s*:/i.test(el.getAttribute('style') || '');

const UNIT_PT = { pt: 1, px: 0.75, cm: 28.3465, mm: 2.83465, in: 72 };
const lengthToPt = (v) => {
  const m = /^(-?[\d.]+)\s*(pt|px|cm|mm|in)?$/i.exec(String(v).trim());
  if (!m) return null;
  return +(+m[1] * UNIT_PT[(m[2] || 'px').toLowerCase()]).toFixed(2);
};

// Word writes margins as "margin: 6.0pt 0cm .0001pt .75pt"; html-to-pdfmake drops the whole shorthand when it
// sees a unit it doesn't know (cm), so rewrite margins as pt longhands it can read. Done on the style text, not
// el.style, because the browser would fold four longhands back into the shorthand.
const normalizeMargins = (root) => {
  root.querySelectorAll('[style*="margin"]').forEach((el) => {
    const decls = el
      .getAttribute('style')
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean);
    const sides = {};
    const rest = [];
    decls.forEach((d) => {
      const [k, ...v] = d.split(':');
      const key = k.trim().toLowerCase();
      const val = v.join(':').trim();
      if (key === 'margin') {
        const parts = val.split(/\s+/);
        const [t, r = t, b = t, l = r] = parts;
        Object.assign(sides, { top: t, right: r, bottom: b, left: l });
      } else if (/^margin-(top|right|bottom|left)$/.test(key)) {
        sides[key.slice(7)] = val;
      } else {
        rest.push(d);
      }
    });
    const margins = Object.entries(sides)
      .map(([side, v]) => [side, lengthToPt(v)])
      .filter(([, pt]) => pt !== null && pt >= 0)
      .map(([side, pt]) => `margin-${side}: ${pt}pt`);
    el.setAttribute('style', [...rest, ...margins].join('; '));
  });
};

// Line heights in stored HTML follow Word/pdfmake; "115%" and "normal" (Word's single) become plain multiples
const normalizeLineHeight = (value) => {
  const v = value.trim().toLowerCase();
  if (v === 'normal') return '1';
  if (v.endsWith('%')) return String(+(parseFloat(v) / 100).toFixed(3));
  return value.trim();
};

// Multiplies every unitless/percent line-height in an HTML string (editor display <-> stored HTML)
export const scaleLineHeights = (html, factor, digits = 3) =>
  typeof html !== 'string'
    ? html
    : html.replace(/line-height:\s*([\d.]+)(%?)/gi, (m, num, pct) => {
        const base = pct ? +num / 100 : +num;
        return `line-height: ${+(base * factor).toFixed(digits)}`;
      });

const toPt = (value) => {
  const m = /^([\d.]+)\s*(pt|px)?$/i.exec(String(value || '').trim());
  if (!m) return null;
  return m[2]?.toLowerCase() === 'pt' ? +m[1] : +m[1] * 0.75;
};

// Word lists arrive as <p class="MsoListParagraph..."> with the bullet/number typed into a span;
// turn each run of them into a real <ul>/<ol>
const convertWordLists = (root) => {
  const isListPara = (el) =>
    el?.nodeName === 'P' && (/MsoListParagraph/.test(el.className) || /mso-list/i.test(el.getAttribute('style') || ''));
  Array.from(root.querySelectorAll('p'))
    .filter(isListPara)
    .forEach((p) => {
      if (!p.isConnected) return;
      const run = [p];
      let next = p.nextElementSibling;
      while (isListPara(next)) {
        run.push(next);
        next = next.nextElementSibling;
      }
      const marker = (run[0].querySelector('[style*="mso-list"]') || run[0]).textContent.trim();
      const list = root.ownerDocument.createElement(/^(\d+|[a-zA-Z]|[ivxlcdm]+)[.)]/i.test(marker) ? 'ol' : 'ul');
      run.forEach((el) => {
        el.querySelectorAll('[style*="mso-list"]').forEach((m) => m.remove());
        const li = root.ownerDocument.createElement('li');
        li.innerHTML = el.innerHTML.replace(/^(\s|&nbsp;)+/, '');
        list.appendChild(li);
      });
      run[0].parentNode.insertBefore(list, run[0]);
      run.forEach((el) => el.remove());
    });
};

// "Nama<TAB>: Syahrial" lines are aligned with tab stops in Word; HTML has no tab stops, so
// consecutive lines like that become the letter's borderless "Label : Isi" table
const convertTabbedRows = (root) => {
  const doc = root.ownerDocument;
  const split = (p) => {
    const tab = p.querySelector('[style*="mso-tab-count"]');
    if (!tab) return null;
    const after = doc.createRange();
    after.setStartAfter(tab);
    after.setEnd(p, p.childNodes.length);
    if (!/^\s*:/.test(after.toString())) return null;
    return { p, tab, after };
  };
  const rows = Array.from(root.querySelectorAll('p')).map(split).filter(Boolean);
  rows.forEach((row, i) => {
    if (!row.p.isConnected) return;
    const group = [row];
    for (let j = i + 1; j < rows.length && rows[j].p === group[group.length - 1].p.nextElementSibling; j++) group.push(rows[j]);
    const table = doc.createElement('table');
    table.setAttribute('style', 'border-collapse: collapse; width: 100%; border: 0px;');
    const tbody = doc.createElement('tbody');
    // size the label column to the longest label, like a Word tab stop
    const longest = Math.max(...group.map(({ p, tab }) => p.textContent.indexOf(tab.textContent) > 0 ? p.textContent.split(tab.textContent)[0].trim().length : 10));
    const labelPct = Math.round(Math.min(40, Math.max(12, longest * 1.8 + 3)));
    group.forEach(({ p, tab, after }) => {
      const before = doc.createRange();
      before.setStart(p, 0);
      before.setEndBefore(tab);
      const label = before.cloneContents();
      const value = after.cloneContents();
      // drop the leading ":" of the value
      const walker = doc.createTreeWalker(value, 4);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeValue.trim()) {
          n.nodeValue = n.nodeValue.replace(/^\s*:\s*/, '');
          break;
        }
      }
      const tr = doc.createElement('tr');
      [
        [label, labelPct],
        [doc.createTextNode(':'), 2],
        [value, 98 - labelPct],
      ].forEach(([content, width]) => {
        const td = doc.createElement('td');
        td.setAttribute('style', `${CELL} width: ${width}%;`);
        td.appendChild(content);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    group[0].p.parentNode.insertBefore(table, group[0].p);
    group.forEach(({ p }) => p.remove());
  });
};

// Paragraphs inside cells get the letter's negative paragraph margin in the PDF and slide out of the
// cell, so unwrap them; tables wider than the letter are scaled down to fit
export const tidyTables = (root) => {
  root.querySelectorAll('td, th').forEach((cell) => {
    const paras = Array.from(cell.children).filter((el) => el.nodeName === 'P');
    if (!paras.length) return;
    const align = paras[0].style.textAlign || paras[0].getAttribute('align');
    if (align && !cell.style.textAlign) cell.style.textAlign = align;
    paras.forEach((p, i) => {
      if (i > 0) p.before(root.ownerDocument.createElement('br'));
      p.replaceWith(...p.childNodes);
    });
  });
  root.querySelectorAll('table').forEach((table) => {
    const firstRow = table.querySelector('tr');
    if (!firstRow) return;
    const cells = Array.from(firstRow.children);
    const widths = cells.map((c) => toPt(c.style.width) ?? toPt(c.getAttribute('width')));
    if (widths.some((w) => w === null)) return;
    const total = widths.reduce((a, w) => a + w, 0);
    if (total <= TEXT_WIDTH_PT) return;
    const ratio = TEXT_WIDTH_PT / total;
    table.querySelectorAll('td, th').forEach((c) => {
      const w = toPt(c.style.width) ?? toPt(c.getAttribute('width'));
      if (w !== null) c.style.width = `${(w * ratio).toFixed(1)}pt`;
      c.removeAttribute('width');
    });
  });
};

// Word keeps paragraph spacing in its <style> block (e.g. Normal: 8pt after, 115% line spacing), which the
// editor strips on paste; copy it onto each paragraph so the letter keeps the spacing it had in Word
const applyWordParagraphStyles = (root, rawHtml) => {
  const css = (/<style[^>]*>([\s\S]*?)<\/style>/i.exec(rawHtml || '') || [])[1];
  if (!css) return;
  const rules = {};
  css.replace(/([^{}]+)\{([^}]*)\}/g, (m, selectors, body) => {
    const props = {};
    body.replace(/(margin-top|margin-bottom|line-height)\s*:\s*([^;]+)/gi, (mm, k, v) => {
      props[k.toLowerCase()] = v.trim();
    });
    selectors.split(',').forEach((sel) => {
      const cls = /(?:^|\s)(?:p)?\.(Mso\w+)/.exec(sel.trim());
      if (cls) rules[cls[1]] = { ...rules[cls[1]], ...props };
    });
    return m;
  });
  const base = rules.MsoPapDefault || {};
  root.querySelectorAll('p').forEach((p) => {
    if (p.closest('td, th, li')) return;
    const cls = (p.className || '').split(/\s+/).find((c) => rules[c]);
    const props = { ...base, ...(cls ? rules[cls] : {}) };
    Object.entries(props).forEach(([k, v]) => {
      if (!p.style.getPropertyValue(k)) p.style.setProperty(k, k === 'line-height' ? normalizeLineHeight(v) : v);
    });
  });
};

// Runs on Word's raw clipboard HTML, before the editor drops Word's mso-* markers;
// rawHtml is the full clipboard document (with its <style> block)
export const cleanWordPaste = (root, rawHtml = '') => {
  applyWordParagraphStyles(root, rawHtml);
  convertWordLists(root);
  convertTabbedRows(root);
  root.querySelectorAll('*').forEach((el) => {
    if (el.nodeName.includes(':')) {
      // <o:p>, <v:shape> and other Office-only tags
      el.replaceWith(...el.childNodes);
      return;
    }
    if (/^Mso/.test(el.className)) el.removeAttribute('class');
    const style = el.getAttribute('style');
    if (style) {
      const kept = style
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s && !/^(mso-|font-family|tab-stops|text-autospace|layout-grid|height)/i.test(s))
        .filter((s) => !NEGATIVE_MARGIN.test(s))
        .map((s) => (/^line-height\s*:/i.test(s) ? `line-height: ${normalizeLineHeight(s.split(':')[1])}` : s));
      if (kept.length) el.setAttribute('style', kept.join('; '));
      else el.removeAttribute('style');
    }
  });
  root.querySelectorAll('span:not([style]):not([class])').forEach((el) => el.replaceWith(...el.childNodes));
  tidyTables(root);
  normalizeMargins(root);
};

// Removes the empty line html-to-pdfmake inserts between two blocks wherever a block sets its own spacing,
// so Word/menu spacing prints exactly; blocks without their own spacing keep the old layout (the line is
// folded into their bottom margin)
const foldPhantomLines = (root) => {
  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType !== 3 || node.nodeValue.trim()) return;
    const prev = node.previousSibling;
    const next = node.nextSibling;
    if (!prev || !next || prev.nodeType !== 1 || next.nodeType !== 1) return;
    if (!BLOCKS.has(prev.nodeName) || !BLOCKS.has(next.nodeName)) return;
    if (!hasBottomMargin(prev) && !hasTopMargin(next)) return;
    if (!hasBottomMargin(prev)) {
      if (!(prev.nodeName in LEGACY_BOTTOM_PT)) return;
      // html-to-pdfmake can't parse negative lengths, so lists (-15pt + the line) round up to 0
      const pt = Math.max(0, +(LEGACY_BOTTOM_PT[prev.nodeName] + PHANTOM_LINE_PT).toFixed(2));
      prev.setAttribute('style', `${prev.getAttribute('style') || ''}; margin-bottom: ${pt}pt`.replace(/^;\s*/, ''));
    }
    node.remove();
  });
};

export const tidySuratHtml = (rawHtml) => {
  if (!rawHtml || typeof DOMParser === 'undefined') return rawHtml;
  const html = rawHtml.replace(/margin-(?:top|bottom|left|right)\s*:\s*-[\d.]+[a-z%]*\s*;?/gi, '');
  const needsTables = /<t[dh][\s>]/i.test(html);
  const needsSpacing = /margin/i.test(html);
  if (!needsTables && !needsSpacing) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (needsTables) tidyTables(doc.body);
  if (needsSpacing) {
    normalizeMargins(doc.body);
    foldPhantomLines(doc.body);
  }
  return doc.body.innerHTML;
};
