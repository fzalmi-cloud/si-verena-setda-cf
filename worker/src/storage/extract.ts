// ============================================
// Ekstraksi teks dari file dokumen (PDF / DOCX / XLSX)
// untuk dikirim ke LLM sebagai konteks pemeriksaan.
// ============================================
import { unzipSync } from 'fflate';

export interface ExtractResult {
  text: string;
  format: string;
}

const MAX_TEXT = 60000; // batas karakter yang dikirim ke LLM (DeepSeek 64K token ≈ aman)

// Dapatkan key R2 dari URL file (path /api/files/{key})
export function keyFromUrl(fileUrl: string): string | null {
  if (!fileUrl) return null;
  const m = fileUrl.match(/\/api\/files\/(.+)$/);
  if (m) return decodeURIComponent(m[1]);
  // URL penuh seperti https://.../api/files/{key}
  const m2 = fileUrl.match(/\/api\/files\/(.+)$/);
  return m2 ? decodeURIComponent(m2[1]) : null;
}

export async function extractTextFromR2(
  R2: R2Bucket,
  fileUrl: string,
  namaFile?: string
): Promise<ExtractResult> {
  const key = keyFromUrl(fileUrl);
  const fallback = { text: '', format: 'unknown' };

  if (!key) return fallback;
  const object = await R2.get(key);
  if (!object) return fallback;

  const name = (namaFile || key.split('/').pop() || '').toLowerCase();
  const buf = await object.arrayBuffer();
  const bytes = new Uint8Array(buf);

  try {
    if (name.endsWith('.pdf')) return { text: await extractPdf(bytes), format: 'pdf' };
    if (name.endsWith('.docx')) return { text: extractDocx(bytes), format: 'docx' };
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return { text: extractXlsx(bytes), format: 'xlsx' };
    if (name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.md')) {
      return { text: new TextDecoder().decode(bytes).slice(0, MAX_TEXT), format: 'text' };
    }
  } catch (e: any) {
    return { text: '', format: `error:${e.message}` };
  }
  return fallback;
}

// PDF — gunakan unpdf (pdf.js versi edge-friendly)
async function extractPdf(bytes: Uint8Array): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const doc = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(doc, { mergePages: true });
    return (text || '').slice(0, MAX_TEXT);
  } catch (e: any) {
    // Fallback minimal: PDF teks biasa via regex (banyak PDF sederhana)
    const raw = new TextDecoder().decode(bytes);
    const text = raw
      .replace(/<</g, '\n<<')
      .replace(/>stream[\s\S]*?endstream/g, ' ')
      .match(/\(([^)]+)\)\s*Tj/g)
      ?.map(m => m.replace(/^\(/, '').replace(/\)\s*Tj$/, ''))
      .join(' ') || '';
    return text.slice(0, MAX_TEXT);
  }
}

// DOCX — unzip dengan fflate, ambil word/document.xml, strip tag XML
function extractDocx(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const docXml = files['word/document.xml'];
  if (!docXml) return '';
  const xml = new TextDecoder().decode(docXml);
  // Kumpulkan teks dari elemen <w:t> dan <w:p> (paragraf)
  const texts: string[] = [];
  const pRe = /<w:p[ >][\s\S]*?<\/w:p>/g;
  let m;
  while ((m = pRe.exec(xml)) !== null) {
    const para = m[0];
    const tRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let t;
    const parts: string[] = [];
    while ((t = tRe.exec(para)) !== null) {
      parts.push(t[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    }
    if (parts.length) texts.push(parts.join(''));
  }
  return texts.join('\n').slice(0, MAX_TEXT);
}

// XLSX — unzip, ambil sharedStrings + sheet pertama (dasar)
function extractXlsx(bytes: Uint8Array): string {
  try {
    const files = unzipSync(bytes);
    const decoder = new TextDecoder();
    const shared: string[] = [];
    const sharedXml = files['xl/sharedStrings.xml'];
    if (sharedXml) {
      const xml = decoder.decode(sharedXml);
      const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
      let m;
      while ((m = tRe.exec(xml)) !== null) shared.push(m[1]);
    }
    const rows: string[] = [];
    const sheetXml = files['xl/worksheets/sheet1.xml'];
    if (sheetXml) {
      const xml = decoder.decode(sheetXml);
      const rowRe = /<row[ >][\s\S]*?<\/row>/g;
      let m;
      while ((m = rowRe.exec(xml)) !== null) {
        const cells = [...m[0].matchAll(/<c[^>]*r=\"([^\"]+)\"[^>]*>[\s\S]*?(?:<v>([\s\S]*?)<\/v>)?[\s\S]*?<\/c>/g)];
        const vals = cells.map((c: any) => {
          const ref = c[1] || '';
          const v = c[2];
          if (v === undefined) return '';
          return v; // nilai numerik / shared string index
        });
        // sederhanakan: gabung semua <v>
        const vs = [...m[0].matchAll(/<v>([\s\S]*?)<\/v>/g)].map(x => x[1]);
        const textVals = vs.map(v => (/^\d+$/.test(v) && shared[Number(v)] !== undefined) ? shared[Number(v)] : v);
        if (textVals.length) rows.push(textVals.join(' | '));
      }
    }
    return rows.join('\n').slice(0, MAX_TEXT);
  } catch {
    return '';
  }
}
