import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, Header, PageNumber, NumberFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const KATEGORI_LABELS = {
  kelengkapan_dokumen: 'Kelengkapan Dokumen',
  sistematika_dokumen: 'Sistematika Dokumen',
  tabel_wajib: 'Tabel Wajib',
  matriks_renja: 'Matriks Renja',
  urgensi_prioritas: 'Urgensi & Prioritas',
  konsistensi_angka: 'Konsistensi Angka',
  substansi_bab: 'Substansi Bab',
};

const STATUS_LABELS = {
  sesuai: 'Sesuai',
  perlu_perbaikan: 'Perlu Perbaikan',
  tidak_ditemukan: 'Tidak Ditemukan',
  perlu_review_manual: 'Perlu Review Manual',
  tidak_berlaku: 'Tidak Berlaku',
};

const LEVEL_LABELS = {
  sangat_siap: 'Sangat Siap',
  siap_perbaikan_kecil: 'Siap (Perbaikan Kecil)',
  perlu_perbaikan_sedang: 'Perlu Perbaikan Sedang',
  belum_layak: 'Belum Layak',
};

function formatTanggal(val) {
  if (!val) return '-';
  try { return format(new Date(val), 'd MMMM yyyy', { locale: idLocale }); } catch { return val; }
}

// ── Color helpers ────────────────────────────────────────────────────────────
const COLORS = {
  header: '1E4080',       // deep blue
  headerText: 'FFFFFF',
  subheader: '2E5FAC',
  subheaderText: 'FFFFFF',
  rowAlt: 'EEF3FB',
  sesuai: 'D6F0E0',
  perlu_perbaikan: 'FFF3CD',
  tidak_ditemukan: 'FDDEDE',
  perlu_review_manual: 'E8F4FD',
  tidak_berlaku: 'F5F5F5',
  border: 'BCC7DC',
  totalRow: 'D0DCF0',
};

function statusColor(status) {
  return COLORS[status] || 'FFFFFF';
}

// ── Cell helpers ─────────────────────────────────────────────────────────────
function headerCell(text, opts = {}) {
  return new TableCell({
    shading: { fill: opts.bg || COLORS.header, type: ShadingType.CLEAR, color: 'auto' },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: String(text), bold: true, color: COLORS.headerText, size: 18 })],
    })],
    borders: tableBorder(),
    verticalAlign: 'center',
    ...(opts.columnSpan ? { columnSpan: opts.columnSpan } : {}),
    ...(opts.width ? { width: { size: opts.width, type: WidthType.DXA } } : {}),
  });
}

function dataCell(text, opts = {}) {
  return new TableCell({
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text ?? '-'), bold: opts.bold || false, size: 17 })],
    })],
    borders: tableBorder(),
    ...(opts.columnSpan ? { columnSpan: opts.columnSpan } : {}),
    ...(opts.width ? { width: { size: opts.width, type: WidthType.DXA } } : {}),
  });
}

function tableBorder() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: COLORS.border };
  return { top: b, bottom: b, left: b, right: b };
}

// ── Heading paragraph ────────────────────────────────────────────────────────
function heading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: String(text), ...opts })],
  });
}

// ── Skor ringkasan table ─────────────────────────────────────────────────────
function buildSkorTable(skor) {
  const rows = [
    ['Skor Total', skor.skor_total ?? '-'],
    ['Skor Kelengkapan', skor.skor_kelengkapan ?? '-'],
    ['Skor Sistematika', skor.skor_sistematika ?? '-'],
    ['Skor Tabel Wajib', skor.skor_tabel ?? '-'],
    ['Skor Matriks', skor.skor_matriks ?? '-'],
    ['Skor Konsistensi', skor.skor_konsistensi ?? '-'],
    ['Skor Substansi', skor.skor_substansi ?? '-'],
    ['Level Kesiapan', LEVEL_LABELS[skor.level_kesiapan] || skor.level_kesiapan || '-'],
    ['Tanggal Pemeriksaan', formatTanggal(skor.tanggal_pemeriksaan)],
  ];

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          headerCell('Aspek Penilaian', { width: 4500 }),
          headerCell('Nilai / Keterangan', { width: 4500 }),
        ],
        tableHeader: true,
      }),
      ...rows.map(([label, val], i) =>
        new TableRow({
          children: [
            dataCell(label, { fill: i % 2 === 1 ? COLORS.rowAlt : 'FFFFFF', bold: true, width: 4500 }),
            dataCell(val, { fill: i % 2 === 1 ? COLORS.rowAlt : 'FFFFFF', center: true, width: 4500 }),
          ],
        })
      ),
    ],
  });
}

// ── Summary count table ──────────────────────────────────────────────────────
function buildSummaryTable(summary) {
  const items = [
    ['Sesuai', summary.sesuai, COLORS.sesuai],
    ['Perlu Perbaikan', summary.perlu_perbaikan, COLORS.perlu_perbaikan],
    ['Tidak Ditemukan', summary.tidak_ditemukan, COLORS.tidak_ditemukan],
    ['Perlu Review Manual', summary.perlu_review_manual, COLORS.perlu_review_manual],
  ];
  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          headerCell('Status', { width: 5000 }),
          headerCell('Jumlah Item', { width: 2000 }),
          headerCell('Persentase', { width: 2000 }),
        ],
        tableHeader: true,
      }),
      ...items.map(([label, count, color]) =>
        new TableRow({
          children: [
            dataCell(label, { fill: color, width: 5000 }),
            dataCell(count, { fill: color, center: true, width: 2000 }),
            dataCell(total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%', { fill: color, center: true, width: 2000 }),
          ],
        })
      ),
      new TableRow({
        children: [
          dataCell('TOTAL', { fill: COLORS.totalRow, bold: true, width: 5000 }),
          dataCell(total, { fill: COLORS.totalRow, bold: true, center: true, width: 2000 }),
          dataCell('100%', { fill: COLORS.totalRow, bold: true, center: true, width: 2000 }),
        ],
      }),
    ],
  });
}

// ── Per-kategori detail table ────────────────────────────────────────────────
function buildDetailTable(items) {
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          headerCell('No', { width: 500 }),
          headerCell('Item Pemeriksaan', { width: 3800 }),
          headerCell('Status', { width: 1800 }),
          headerCell('Catatan', { width: 2900 }),
        ],
        tableHeader: true,
      }),
      ...items.map((item, idx) =>
        new TableRow({
          children: [
            dataCell(idx + 1, { center: true, fill: idx % 2 === 1 ? COLORS.rowAlt : 'FFFFFF', width: 500 }),
            dataCell(item.item_pemeriksaan || '-', { fill: idx % 2 === 1 ? COLORS.rowAlt : 'FFFFFF', width: 3800 }),
            dataCell(STATUS_LABELS[item.status] || item.status || '-', {
              fill: statusColor(item.status),
              center: true, width: 1800,
            }),
            dataCell(item.catatan_otomatis || item.catatan_verifikator || '-', {
              fill: idx % 2 === 1 ? COLORS.rowAlt : 'FFFFFF', width: 2900,
            }),
          ],
        })
      ),
    ],
  });
}

// ── Main export function ─────────────────────────────────────────────────────
export async function exportVerifikasiWord({ selectedBiro, tahun, skor, results }) {
  const summary = {
    sesuai: results.filter(r => r.status === 'sesuai').length,
    perlu_perbaikan: results.filter(r => r.status === 'perlu_perbaikan').length,
    tidak_ditemukan: results.filter(r => r.status === 'tidak_ditemukan').length,
    perlu_review_manual: results.filter(r => r.status === 'perlu_review_manual').length,
  };

  // Group results by kategori
  const byKategori = {};
  results.forEach(r => {
    const key = r.kategori || 'lainnya';
    if (!byKategori[key]) byKategori[key] = [];
    byKategori[key].push(r);
  });

  const sections = [];

  // ── Cover / header section ─────────────────────────────────────────────────
  sections.push(
    new Paragraph({
      text: 'LAPORAN HASIL PRA-VERIFIKASI DOKUMEN RENJA',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 120 },
    }),
    new Paragraph({
      text: `${selectedBiro}`,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: selectedBiro, bold: true, size: 26, color: COLORS.header })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 480 },
      children: [new TextRun({ text: `Tahun Renja ${tahun}  |  Tanggal: ${formatTanggal(skor?.tanggal_pemeriksaan || new Date())}`, size: 20, italics: true, color: '666666' })],
    }),
    new Paragraph({ text: '', spacing: { before: 120, after: 120 } }),
  );

  // ── Section 1: Ringkasan Skor ──────────────────────────────────────────────
  sections.push(
    heading('1. Ringkasan Skor Kesiapan Dokumen'),
    buildSkorTable(skor),
    new Paragraph({ text: '', spacing: { before: 200, after: 100 } }),
  );

  // ── Section 2: Rekap Status ────────────────────────────────────────────────
  sections.push(
    heading('2. Rekap Status Item Pemeriksaan'),
    buildSummaryTable(summary),
    new Paragraph({ text: '', spacing: { before: 200, after: 100 } }),
  );

  // ── Section 3: Detail per Kategori ────────────────────────────────────────
  sections.push(heading('3. Detail Pemeriksaan per Kategori'));

  const kategoriKeys = Object.keys(KATEGORI_LABELS);
  let secIdx = 1;
  for (const key of kategoriKeys) {
    const items = byKategori[key];
    if (!items || items.length === 0) continue;
    sections.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: `3.${secIdx}  ${KATEGORI_LABELS[key]}`, bold: true, size: 22, color: COLORS.subheader })],
      }),
      buildDetailTable(items),
      new Paragraph({ text: '', spacing: { before: 160, after: 80 } }),
    );
    secIdx++;
  }

  // ── Build document ─────────────────────────────────────────────────────────
  const doc = new Document({
    numbering: undefined,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1200, right: 1000, bottom: 1200, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: `SI-VERENA — Laporan Verifikasi Renja ${tahun}`, size: 16, color: '888888' })],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border } },
            }),
          ],
        }),
      },
      children: sections,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const safeBiro = (selectedBiro || 'Semua').replace(/\s+/g, '_');
  saveAs(blob, `Laporan_Verifikasi_Renja_${safeBiro}_${tahun}.docx`);
}