// templateDocx.js — Isi template DOCX resmi Renja Perubahan Setda dengan data draft.
// Memakai DOMParser/XMLSerializer global: native di browser,
// @xmldom/xmldom saat diuji di Node (set globalThis.DOMParser terlebih dahulu).

// Pisahkan teks menjadi blok paragraf & tabel (baris berisi >= 3 kolom '|')
export function parseTableBlocks(text) {
  const lines = (text || '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const isTable = lines[i].split('|').length >= 3;
    if (isTable) {
      const rows = [];
      while (i < lines.length && lines[i].split('|').length >= 3) {
        rows.push(lines[i].split('|').map(c => c.trim()));
        i++;
      }
      blocks.push({ type: 'table', rows });
    } else {
      const paras = [];
      while (i < lines.length && lines[i].split('|').length < 3) {
        if (lines[i].trim()) paras.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'text', lines: paras });
    }
  }
  return blocks;
}

// Bangun isi body document.xml baru dari template zip.
// sections: [{ chapter, subchapter, judul, content }]
export async function buildDocxFromTemplate(zip, sections) {
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('word/document.xml tidak ada di template');
  const xml = await entry.async('string');

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const body = doc.getElementsByTagName('w:body')[0];
  if (!body) throw new Error('w:body tidak ditemukan di template');

  const byTag = (el, tag) => Array.from(el.getElementsByTagName(tag));
  const paraText = (el) => byTag(el, 'w:t').map(t => t.textContent || '').join('');
  const makeText = (text) => {
    const t = doc.createElement('w:t');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = text;
    return t;
  };
  // Buat paragraf baru berdasarkan template paragraf (gaya sama), isi = satu baris teks
  const createPara = (base, text) => {
    const p = base.cloneNode(true);
    byTag(p, 'w:r').forEach(r => r.parentNode.removeChild(r));
    const r = doc.createElement('w:r');
    const rPr = byTag(base, 'w:rPr')[0];
    if (rPr) r.appendChild(rPr.cloneNode(true));
    r.appendChild(makeText(text));
    p.appendChild(r);
    return p;
  };
  // Set teks pada run pertama sebuah cell
  const setCellText = (tc, text) => {
    const p = byTag(tc, 'w:p')[0];
    if (!p) return;
    const runs = byTag(p, 'w:r');
    if (runs.length) {
      runs.slice(1).forEach(r => r.parentNode.removeChild(r));
      const t = byTag(runs[0], 'w:t')[0];
      if (t) t.textContent = text;
      else runs[0].appendChild(makeText(text));
    } else {
      const r = doc.createElement('w:r');
      r.appendChild(makeText(text));
      p.appendChild(r);
    }
  };
  // Isi ulang tabel template: header tetap, baris data diganti dari rows
  const fillTable = (tblEl, rows) => {
    const trs = byTag(tblEl, 'w:tr');
    if (!trs.length) return;
    const header = trs[0];
    const sampleData = trs[1] || null;
    trs.slice(1).forEach(r => r.parentNode.removeChild(r));
    const ncols = header ? byTag(header, 'w:tc').length : (sampleData ? byTag(sampleData, 'w:tc').length : 1);
    (rows || []).forEach(row => {
      if (sampleData) {
        const tr = sampleData.cloneNode(true);
        let tcs = byTag(tr, 'w:tc');
        // samakan jumlah sel dengan jumlah kolom
        while (tcs.length < ncols) {
          const tc = byTag(sampleData, 'w:tc')[0].cloneNode(true);
          tr.appendChild(tc);
          tcs = byTag(tr, 'w:tc');
        }
        while (tcs.length > ncols) {
          tcs[tcs.length - 1].parentNode.removeChild(tcs[tcs.length - 1]);
          tcs = byTag(tr, 'w:tc');
        }
        tcs.forEach((tc, ci) => setCellText(tc, String(row[ci] ?? '')));
        tblEl.appendChild(tr);
      } else {
        // tanpa sampel: buat baris polos
        const tr = doc.createElement('w:tr');
        for (let ci = 0; ci < ncols; ci++) {
          const tc = doc.createElement('w:tc');
          const p = doc.createElement('w:p');
          const r = doc.createElement('w:r');
          r.appendChild(makeText(String(row[ci] ?? '')));
          p.appendChild(r);
          tc.appendChild(p);
          tr.appendChild(tc);
        }
        tblEl.appendChild(tr);
      }
    });
  };
  // Buat tabel baru (dipakai utk Tabel 3.4 matriks) dari template tabel (Tabel 3.1) + rows
  const createTable = (baseTbl, rows) => {
    const tbl = baseTbl.cloneNode(true);
    // hapus semua baris, gunakan baris pertama pipe sebagai header
    byTag(tbl, 'w:tr').forEach(r => r.parentNode.removeChild(r));
    const sampleTr = byTag(baseTbl, 'w:tr')[1] || byTag(baseTbl, 'w:tr')[0] || null;
    (rows || []).forEach((row, ri) => {
      if (sampleTr) {
        const tr = sampleTr.cloneNode(true);
        let tcs = byTag(tr, 'w:tc');
        const ncols = row.length;
        while (tcs.length < ncols) {
          const tc = byTag(sampleTr, 'w:tc')[0].cloneNode(true);
          tr.appendChild(tc);
          tcs = byTag(tr, 'w:tc');
        }
        while (tcs.length > ncols) {
          tcs[tcs.length - 1].parentNode.removeChild(tcs[tcs.length - 1]);
          tcs = byTag(tr, 'w:tc');
        }
        tcs.forEach((tc, ci) => setCellText(tc, String(row[ci] ?? '')));
        tbl.appendChild(tr);
      }
    });
    return tbl;
  };

  // ── Siapkan referensi heading section ──
  const labels = new Map();
  sections.forEach(s => labels.set(`${s.chapter}.${s.subchapter} ${s.judul}`, s));

  const allParas = byTag(body, 'w:p');
  const sectionHeadings = allParas
    .map((p, i) => ({ p, i, text: paraText(p).trim() }))
    .filter(h => labels.has(h.text));

  // batas akhir tiap section = heading section berikutnya (atau akhir body)
  sectionHeadings.forEach((h, i) => { h.endP = i + 1 < sectionHeadings.length ? sectionHeadings[i + 1].p : null; });

  // cari BAB IV PENUTUP (heading asli, teks persis — hindari deskripsi sistematika di BAB I)
  const babIV = allParas.find(p => paraText(p).trim() === 'BAB IV PENUTUP');
  // cari paragraf sampel pertama (sebagai basis gaya teks)
  const basePara = allParas.find(p => paraText(p).trim().length > 40) || sectionHeadings[0]?.p || allParas[0];

  // preprocess konten per section: narrative + tabel pipe
  const sectionBlocks = new Map();
  sections.forEach(s => {
    const blocks = parseTableBlocks(s.content || '');
    // pisahkan: narrative (paragraf) dan tabel pipe (dengan judul caption terpisah)
    const paras = [];
    const tables = []; // { title: string|null, rows }
    let pendingTitle = null;
    blocks.forEach(b => {
      if (b.type === 'text') {
        const joined = b.lines.join('\n');
        const m = joined.match(/^(Tabel\s+3\.\d\s*—[^\n]*)$/i);
        if (m) pendingTitle = m[1].trim();
        else paras.push(joined);
      } else {
        tables.push({ title: pendingTitle, rows: b.rows });
        pendingTitle = null;
      }
    });
    sectionBlocks.set(s, { paras, tables });
  });

  // ── Mutasi DOM ──
  // 1) Tabel 3.1 & 3.3: isi tabel template yang ada; tabel pipe di konten tidak di-sisipkan lagi
  // 2) Section lain: hapus sampel, sisipkan narrative
  // 3) 3.4: sisipkan heading + caption + tabel matriks sebelum BAB IV

  for (const s of sections) {
    const lbl = `${s.chapter}.${s.subchapter} ${s.judul}`;
    const heading = sectionHeadings.find(h => h.text === lbl);
    if (!heading) continue; // mis. 3.4 tidak ada di template — ditangani terpisah
    const { paras, tables } = sectionBlocks.get(s) || { paras: [], tables: [] };

    // kumpulkan elemen antara heading & heading berikutnya
    let nextEl = heading.p.nextSibling;
    const between = [];
    while (nextEl && nextEl !== heading.endP && nextEl !== babIV) {
      const nx = nextEl.nextSibling;
      between.push(nextEl);
      nextEl = nx;
    }
    // deteksi tabel template yang ada di antara
    const existingTbl = between.find(el => el.tagName === 'w:tbl');
    const captionPara = between.find(el => el.tagName === 'w:p' && /^Tabel\s+3\.\d/.test(paraText(el).trim()));

    // buang semua elemen antara (akan disusun ulang)
    between.forEach(el => el.parentNode.removeChild(el));

    // sisipkan: narrative -> caption -> tabel (jika ada)
    let insertAfter = heading.p;
    paras.forEach(line => {
      const np = createPara(basePara, line);
      heading.p.parentNode.insertBefore(np, insertAfter.nextSibling);
      insertAfter = np;
    });
    if (existingTbl) {
      // isi tabel template dari tabel pipe (tanpa baris header pipe)
      const pipe = (tables.find(t => !t.title || /Tabel 3\.(1|3)/.test(t.title || '')) || tables[0] || { rows: [] });
      const dataRows = pipe.rows.length > 1 ? pipe.rows.slice(1) : pipe.rows;
      fillTable(existingTbl, dataRows);
      // sisipkan caption tabel sebelum tabel
      const capText = (pipe.title) || (captionPara ? paraText(captionPara).trim() : null);
      if (capText) {
        const cap = createPara(basePara, capText);
        heading.p.parentNode.insertBefore(cap, insertAfter.nextSibling);
        insertAfter = cap;
      }
      heading.p.parentNode.insertBefore(existingTbl, insertAfter.nextSibling);
      insertAfter = existingTbl;
    } else {
      // sisipkan tabel pipe (mis. konten berisi tabel tanpa tabel template)
      tables.forEach(tb => {
        const cap = tb.title
          ? createPara(basePara, tb.title)
          : null;
        if (cap) { heading.p.parentNode.insertBefore(cap, insertAfter.nextSibling); insertAfter = cap; }
        const nt = createTable(existingTbl || byTag(body, 'w:tbl')[0] || basePara.parentNode, tb.rows);
        heading.p.parentNode.insertBefore(nt, insertAfter.nextSibling);
        insertAfter = nt;
      });
    }
    if (captionPara && !tables.length) {
      // caption template tetap dipertahankan jika tidak ada tabel pipe
      heading.p.parentNode.insertBefore(captionPara, insertAfter.nextSibling);
    }
  }

  // 3.4 Matriks — sisipkan heading + caption + tabel sebelum BAB IV
  const s34 = sections.find(s => s.subchapter === '3.4');
  if (s34 && babIV && sectionBlocks.has(s34)) {
    const { paras, tables } = sectionBlocks.get(s34);
    const h34 = createPara(basePara, `3.3.4 ${s34.judul}`);
    // pakai gaya heading section (clone heading section terakhir)
    const secHeadingStyle = sectionHeadings.length ? sectionHeadings[sectionHeadings.length - 1].p : null;
    if (secHeadingStyle) {
      const hp = secHeadingStyle.cloneNode(true);
      byTag(hp, 'w:r').forEach(r => r.parentNode.removeChild(r));
      const r = doc.createElement('w:r');
      const rPr = byTag(secHeadingStyle, 'w:rPr')[0];
      if (rPr) r.appendChild(rPr.cloneNode(true));
      r.appendChild(makeText(`3.3.4 ${s34.judul}`));
      hp.appendChild(r);
      babIV.parentNode.insertBefore(hp, babIV);
      paras.forEach(line => {
        const np = createPara(basePara, line);
        babIV.parentNode.insertBefore(np, babIV);
      });
      tables.forEach(tb => {
        if (tb.title) {
          const cap = createPara(basePara, tb.title);
          babIV.parentNode.insertBefore(cap, babIV);
        }
        const tbl = createTable(byTag(body, 'w:tbl')[0], tb.rows);
        babIV.parentNode.insertBefore(tbl, babIV);
      });
    } else {
      babIV.parentNode.insertBefore(h34, babIV);
      paras.forEach(line => babIV.parentNode.insertBefore(createPara(basePara, line), babIV));
      tables.forEach(tb => {
        if (tb.title) babIV.parentNode.insertBefore(createPara(basePara, tb.title), babIV);
        babIV.parentNode.insertBefore(createTable(byTag(body, 'w:tbl')[0], tb.rows), babIV);
      });
    }
  }

  return new XMLSerializer().serializeToString(doc);
}
