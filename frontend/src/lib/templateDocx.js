// templateDocx.js — Isi template DOCX resmi Renja Perubahan Setda dengan data draft.
// Membangun ulang isi dokumen (mulai DAFTAR ISI) mengikuti sistematika
// Permendagri 86/2017: BAB I–IV dengan heading & tabel yang benar.
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
// opts.logoBytes: Uint8Array PNG emblem (opsional) utk disisipkan di sampul
function buildLogoParagraphXml(rId, cx, cy) {
  return `<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="240"/></w:pPr>
  <w:r><w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${cx}" cy="${cy}"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:docPr id="100" name="Logo Provinsi Sumatera Barat"/>
      <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic>
            <pic:nvPicPr><pic:cNvPr id="101" name="logoEmblem.png"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing></w:r>
</w:p>`;
}

const ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
const BAB_TITLES = {
  '1': 'PENDAHULUAN',
  '2': 'EVALUASI PELAKSANAAN RENJA PERANGKAT DAERAH',
  '3': 'TUJUAN, SASARAN, PROGRAM DAN KEGIATAN',
  '4': 'PENUTUP',
};

export async function buildDocxFromTemplate(zip, sections, opts = {}) {
  const { logoBytes } = opts;
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('word/document.xml tidak ada di template');
  const xml = await entry.async('string');

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const body = doc.getElementsByTagName('w:body')[0];
  if (!body) throw new Error('w:body tidak ditemukan di template');

  const byTag = (el, tag) => Array.from(el.getElementsByTagName(tag));
  const paraText = (el) => byTag(el, 'w:t').map(t => t.textContent || '').join('').trim();
  const makeText = (text) => {
    const t = doc.createElement('w:t');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = text;
    return t;
  };
  // Buat paragraf baru berdasarkan template paragraf (gaya sama), isi = satu baris teks
  const createPara = (base, text, { justify = true } = {}) => {
    const p = base.cloneNode(true);
    byTag(p, 'w:r').forEach(r => r.parentNode.removeChild(r));
    let pPr = byTag(p, 'w:pPr')[0];
    if (!pPr) { pPr = doc.createElement('w:pPr'); p.insertBefore(pPr, p.firstChild); }
    let jc = byTag(pPr, 'w:jc')[0];
    if (justify) {
      if (!jc) { jc = doc.createElement('w:jc'); pPr.appendChild(jc); }
      jc.setAttribute('w:val', 'both');
    } else if (jc) {
      jc.parentNode.removeChild(jc);
    }
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
  // Kecilkan ukuran font semua sel tabel (agar tabel lebar muat di kertas)
  const shrinkTableFont = (tbl, halfPoints = 13) => {
    byTag(tbl, 'w:tc').forEach(tc => {
      byTag(tc, 'w:r').forEach(r => {
        let rPr = r.getElementsByTagName('w:rPr')[0];
        if (!rPr) { rPr = doc.createElement('w:rPr'); r.insertBefore(rPr, r.firstChild); }
        let sz = byTag(rPr, 'w:sz')[0];
        if (!sz) { sz = doc.createElement('w:sz'); rPr.appendChild(sz); }
        sz.setAttribute('w:val', String(halfPoints));
        let szCs = byTag(rPr, 'w:szCs')[0];
        if (!szCs) { szCs = doc.createElement('w:szCs'); rPr.appendChild(szCs); }
        szCs.setAttribute('w:val', String(halfPoints));
      });
    });
  };
  // Buat tabel baru dari template tabel (base) + rows (baris 0 = header)
  const createTable = (baseTbl, rows) => {
    const tbl = baseTbl.cloneNode(true);
    const hdrTr = byTag(tbl, 'w:tr')[0] || null;
    const sampleTr = byTag(tbl, 'w:tr')[1] || hdrTr || null;
    byTag(tbl, 'w:tr').forEach(r => r.parentNode.removeChild(r));
    (rows || []).forEach((row, ri) => {
      const trBase = ri === 0 ? (hdrTr || sampleTr) : sampleTr;
      if (!trBase) return;
      const tr = trBase.cloneNode(true);
      let tcs = byTag(tr, 'w:tc');
      const ncols = row.length;
      while (tcs.length < ncols) {
        const tc = byTag(trBase, 'w:tc')[0].cloneNode(true);
        tr.appendChild(tc);
        tcs = byTag(tr, 'w:tc');
      }
      while (tcs.length > ncols) {
        tcs[tcs.length - 1].parentNode.removeChild(tcs[tcs.length - 1]);
        tcs = byTag(tr, 'w:tc');
      }
      tcs.forEach((tc, ci) => setCellText(tc, String(row[ci] ?? '')));
      tbl.appendChild(tr);
    });
    shrinkTableFont(tbl);
    return tbl;
  };

  // ── Inventaris elemen template (sebelum dihapus) ──
  const allParas = byTag(body, 'w:p');
  const findPara = (re) => allParas.find(p => re.test(paraText(p)));
  const tocPara = allParas.find(p => byTag(p, 'w:instrText').some(t => /TOC/.test(t.textContent || '')));
  const daftarIsiPara = findPara(/^DAFTAR ISI$/);
  const babHeadingStyle = findPara(/^BAB\s+\d+\s+PENDAHULUAN$/) || allParas.find(p => /^BAB\s/.test(paraText(p)));
  const subHeadingStyle = findPara(/^\d\.\d\.\d\s/) || babHeadingStyle;
  // paragraf sampel BODY sebagai basis gaya teks (bukan paragraf sampul font besar)
  let basePara = allParas.find(p => {
    const t = paraText(p);
    return t.length > 40 && !/^BAB\s/.test(t) && !/^\d\.\d\.\d/.test(t) && !/PETUNJUK PENGGUNAAN/.test(t);
  }) || allParas.find(p => paraText(p).trim().length > 40) || allParas[0];
  // tabel template multi-kolom (>=5 kolom) sbg basis tabel baru —
  // JANGAN pakai tabel STATUS sampul (1 kolom, font 11pt)
  const allTables = byTag(body, 'w:tbl');
  const multiColTbl = allTables.find(t => byTag(t, 'w:gridCol').length >= 5) || allTables[0];

  // ── Bersihkan: hapus petunjuk penggunaan, deskripsi, & semua isi setelah DAFTAR ISI ──
  // (sampul + DAFTAR ISI + field TOC dipertahankan; sisanya dibangun ulang)
  const anchor = tocPara || daftarIsiPara;
  if (!anchor) throw new Error('Field DAFTAR ISI (TOC) tidak ditemukan di template');
  const children = Array.from(body.childNodes);
  let removing = false;
  // a) hapus blok "PETUNJUK PENGGUNAAN TEMPLATE" antara sampul & DAFTAR ISI
  const petunjukPara = allParas.find(p => /^PETUNJUK PENGGUNAAN/.test(paraText(p)));
  if (petunjukPara && daftarIsiPara) {
    let el = petunjukPara;
    while (el && el !== daftarIsiPara) {
      const nx = el.nextSibling;
      if (el.parentNode) el.parentNode.removeChild(el);
      el = nx;
    }
  }
  children.forEach(child => {
    if (child === anchor) { removing = true; return; }
    if (removing) body.removeChild(child);
    if (child === daftarIsiPara) {
      // hapus paragraf deskripsi & hal. kosong di antara DAFTAR ISI dan field TOC
      let nx = child.nextSibling;
      while (nx && nx !== anchor) {
        const nn = nx.nextSibling;
        if (nx.nodeType === 1 && nx.nodeName === 'w:p') body.removeChild(nx);
        nx = nn;
      }
    }
  });
  // normalisasi field TOC: backslash ganda -> tunggal agar Word bisa update DAFTAR ISI
  if (anchor === tocPara) {
    byTag(tocPara, 'w:instrText').forEach(t => {
      if (t.textContent) t.textContent = t.textContent.replace(/\\\\/g, '\\');
    });
  }

  // ── Bangun ulang isi dokumen: BAB I–IV sesuai Permendagri 86/2017 ──
  const BAB_ORDER = ['1', '2', '3', '4'];
  const insertPoint = anchor; // sisipkan setelah field TOC
  const appendAfter = (el) => {
    insertPoint.parentNode.insertBefore(el, insertPoint.nextSibling);
    // update insertPoint agar urutan tetap
    // (gunakan variabel eksternal — lihat bawah)
  };

  let cursor = insertPoint;
  const insert = (el) => {
    cursor.parentNode.insertBefore(el, cursor.nextSibling);
    cursor = el;
  };

  BAB_ORDER.forEach(babNo => {
    const babSections = sections.filter(s => String(s.chapter) === babNo);
    if (!babSections.length) return;
    // Heading BAB (gaya dari template, teks diganti)
    const babHeading = createPara(babHeadingStyle, `BAB ${ROMAN[babNo] || babNo} ${BAB_TITLES[babNo] || ''}`, { justify: false });
    // pastikan gaya heading BAB: teks bold, lebih besar
    const hbRPr = byTag(babHeading, 'w:r')[0]?.getElementsByTagName('w:rPr')[0];
    if (hbRPr) {
      let b = byTag(hbRPr, 'w:b')[0];
      if (!b) { b = doc.createElement('w:b'); hbRPr.appendChild(b); }
      let sz = byTag(hbRPr, 'w:sz')[0];
      if (sz) sz.setAttribute('w:val', '32'); // 16pt
    }
    insert(babHeading);

    babSections.forEach(s => {
      // Sub-heading: "2.1 Evaluasi Pelaksanaan Renja Setda Tahun Lalu dan Capaian Renstra"
      const subHeading = createPara(subHeadingStyle, `${s.subchapter} ${s.judul}`, { justify: false });
      const shRPr = byTag(subHeading, 'w:r')[0]?.getElementsByTagName('w:rPr')[0];
      if (shRPr) {
        let b = byTag(shRPr, 'w:b')[0];
        if (!b) { b = doc.createElement('w:b'); shRPr.appendChild(b); }
        let sz = byTag(shRPr, 'w:sz')[0];
        if (sz) sz.setAttribute('w:val', '28'); // 14pt
      }
      insert(subHeading);

      // Isi section: paragraf narasi + caption tabel + tabel pipe
      const blocks = parseTableBlocks(s.content || '');
      let pendingTitle = null;
      blocks.forEach(b => {
        if (b.type === 'text') {
          const joined = b.lines.join('\n');
          const m = joined.match(/^(Tabel\s+\d\.\d\s*—[^\n]*)$/i);
          if (m) { pendingTitle = m[1].trim(); return; }
          b.lines.forEach(l => insert(createPara(basePara, l)));
        } else {
          if (pendingTitle) {
            insert(createPara(basePara, pendingTitle, { justify: false }));
            pendingTitle = null;
          }
          insert(createTable(multiColTbl, b.rows));
        }
      });
      if (pendingTitle) insert(createPara(basePara, pendingTitle, { justify: false }));
    });
  });

  // ── Sisipkan logo emblem di awal sampul (opsional) ──
  if (logoBytes && logoBytes.length > 0) {
    try {
      // tambah file media ke zip
      zip.file('word/media/logoEmblem.png', logoBytes);
      // tambah relationship
      const relsEntry = zip.file('word/_rels/document.xml.rels');
      if (relsEntry) {
        const relsXml = await relsEntry.async('string');
        const relsDoc = parser.parseFromString(relsXml, 'application/xml');
        const relsRoot = relsDoc.getElementsByTagName('Relationships')[0];
        if (relsRoot && !relsXml.includes('rIdLogoEmblem')) {
          const rel = relsDoc.createElement('Relationship');
          rel.setAttribute('Id', 'rIdLogoEmblem');
          rel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
          rel.setAttribute('Target', 'media/logoEmblem.png');
          relsRoot.appendChild(rel);
          zip.file('word/_rels/document.xml.rels', new XMLSerializer().serializeToString(relsDoc));
        }
      }
      // buat paragraf gambar (emblem 2.5cm, aspek 226:242)
      const cx = 900000;
      const cy = Math.round((900000 * 242) / 226);
      const logoParaXml = buildLogoParagraphXml('rIdLogoEmblem', cx, cy);
      const logoDoc = parser.parseFromString(logoParaXml, 'application/xml');
      const logoPara = logoDoc.getElementsByTagName('w:p')[0];
      if (logoPara && body.firstChild) {
        body.insertBefore(logoPara, body.firstChild);
      } else if (logoPara) {
        body.appendChild(logoPara);
      }
    } catch (e) {
      console.warn('[templateDocx] logo gagal disisipkan:', e?.message || e);
    }
  }

  return new XMLSerializer().serializeToString(doc);
}
