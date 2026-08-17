// Export helper untuk Hasil Pemeriksaan Renja Perubahan — DOCX / PDF / XLSX
import { saveAs } from 'file-saver';

const SEV_LABEL = { kritis: 'KRITIS', mayor: 'MAYOR', minor: 'MINOR', informasi: 'REDAKSIONAL' };
const SEV_ORDER = { kritis: 0, mayor: 1, minor: 2, informasi: 3 };

function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return d; }
}

function sortFindings(f) { return [...f].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)); }

export async function exportHasilDOCX({ identitas, findings, skor }) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } = await import('docx');
  const srt = sortFindings(findings);
  const children = [];
  children.push(new Paragraph({ text: 'LAPORAN HASIL PEMERIKSAAN RENJA PERUBAHAN', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }));
  children.push(new Paragraph({ text: identitas.nama_biro || '', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }));
  children.push(new Paragraph({ text: `TAHUN ${identitas.tahun || ''}`, heading: HeadingLevel.HEADING_3, alignment: AlignmentType.CENTER }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ text: `Tanggal: ${fmtDate(new Date())}` }));
  children.push(new Paragraph({ text: `Biro: ${identitas.nama_biro || '-'}` }));
  children.push(new Paragraph({ text: `Tahun: ${identitas.tahun || '-'}` }));
  children.push(new Paragraph({ text: `Tahapan: ${identitas.stage || '-'}` }));
  children.push(new Paragraph({ text: `Versi: V${identitas.version_number || 0}` }));
  children.push(new Paragraph({ text: `Tanggal Upload: ${fmtDate(identitas.tanggal_upload)}` }));
  children.push(new Paragraph({ text: `Skor: ${skor?.skor_total ?? '-'}/100 (${skor?.level_kesiapan || '-'})` }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ text: 'STATISTIK TEMUAN', heading: HeadingLevel.HEADING_1 }));
  const counts = { kritis: 0, mayor: 0, minor: 0, informasi: 0 };
  srt.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });
  children.push(new Paragraph({ text: `Kritis: ${counts.kritis} | Mayor: ${counts.mayor} | Minor: ${counts.minor} | Redaksional: ${counts.informasi} | Total: ${srt.length}` }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ text: 'DAFTAR TEMUAN', heading: HeadingLevel.HEADING_1 }));
  const headerRow = new TableRow({
    children: ['No', 'Tingkat', 'BAB', 'Halaman', 'Temuan', 'Data Dokumen', 'Data Acuan', 'Rekomendasi', 'Status'].map(h =>
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })),
  });
  const rows = srt.map((f, i) => new TableRow({
    children: [String(i + 1), SEV_LABEL[f.severity] || f.severity, f.chapter || '-', f.page || '-', f.description || '-', f.document_value || '-', f.reference_value || '-', f.recommendation || '-', f.status || 'terbuka'].map(v =>
      new TableCell({ children: [new Paragraph({ text: String(v) })] })),
  }));
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ text: 'REKOMENDASI & KESIMPULAN', heading: HeadingLevel.HEADING_1 }));
  srt.filter(f => f.severity === 'kritis' || f.severity === 'mayor').forEach(f => {
    children.push(new Paragraph({ text: `• ${f.recommendation || '-'}` }));
  });
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Laporan_Pemeriksaan_RP_${(identitas.nama_biro || 'Biro').replace(/\s+/g, '_')}_V${identitas.version_number || 0}.docx`);
}

export async function exportHasilPDF({ identitas, findings, skor }) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();
  const srt = sortFindings(findings);
  const counts = { kritis: 0, mayor: 0, minor: 0, informasi: 0 };
  srt.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN HASIL PEMERIKSAAN RENJA PERUBAHAN', 105, 12, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${identitas.nama_biro || '-'} — Tahun ${identitas.tahun || '-'} — V${identitas.version_number || 0}`, 105, 20, { align: 'center' });

  // Identitas & skor
  doc.setTextColor(30, 41, 59); doc.setFontSize(9);
  autoTable(doc, {
    startY: 36,
    theme: 'grid',
    head: [['Identitas Dokumen', 'Nilai']],
    body: [
      ['Biro', identitas.nama_biro || '-'],
      ['Tahun', identitas.tahun || '-'],
      ['Tahapan', identitas.stage || '-'],
      ['Versi', `V${identitas.version_number || 0}`],
      ['Tanggal Upload', fmtDate(identitas.tanggal_upload)],
      ['Nama File', identitas.file || '-'],
      ['Pengunggah', identitas.pengunggah || '-'],
      ['Skor', `${skor?.skor_total ?? '-'}/100 (${skor?.level_kesiapan || '-'})`],
    ],
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 145 } },
    styles: { fontSize: 8.5, cellPadding: 1.5 },
  });

  // Statistik temuan
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    theme: 'grid',
    head: [['Total', 'Kritis', 'Mayor', 'Minor', 'Redaksional']],
    body: [[srt.length, counts.kritis, counts.mayor, counts.minor, counts.informasi]],
    styles: { fontSize: 10, halign: 'center' },
    headStyles: { fillColor: [37, 99, 235] },
  });

  // Tabel temuan
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    theme: 'striped',
    head: [['No', 'Tingkat', 'BAB', 'Hal', 'Temuan', 'Rekomendasi', 'Status']],
    body: srt.map((f, i) => [String(i + 1), SEV_LABEL[f.severity] || f.severity, f.chapter || '-', f.page || '-', f.description || '-', f.recommendation || '-', STATUS_PDF[f.status] || f.status]),
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 12 },
      3: { cellWidth: 10 },
      4: { cellWidth: 60 },
      5: { cellWidth: 55 },
      6: { cellWidth: 25 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const sev = String(data.cell.raw);
        if (sev === 'KRITIS') data.cell.styles.fillColor = [254, 226, 226];
        else if (sev === 'MAYOR') data.cell.styles.fillColor = [254, 243, 199];
        else if (sev === 'MINOR') data.cell.styles.fillColor = [219, 234, 254];
      }
    },
    styles: { fontSize: 7.5, cellPadding: 1.5, valign: 'top' },
    headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
  });

  // Footer nomor halaman
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.text(`SI-VERENA SETDA — Laporan Pemeriksaan Renja Perubahan  |  Halaman ${i} dari ${pages}`, 105, 290, { align: 'center' });
  }

  doc.save(`Laporan_Pemeriksaan_RP_${(identitas.nama_biro || 'Biro').replace(/\s+/g, '_')}_V${identitas.version_number || 0}.pdf`);
}

const STATUS_PDF = { terbuka: 'Belum Diperbaiki', diduga_diperbaiki: 'Diduga Diperbaiki', selesai: 'Selesai', ditutup: 'Ditutup', dibuka_kembali: 'Dibuka Kembali' };

export async function exportHasilXLSX({ identitas, findings, skor }) {
  const XLSX = await import('xlsx');
  const srt = sortFindings(findings);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['LAPORAN HASIL PEMERIKSAAN RENJA PERUBAHAN'],
    ['Biro', identitas.nama_biro || '-'],
    ['Tahun', identitas.tahun || '-'],
    ['Tahapan', identitas.stage || '-'],
    ['Versi', identitas.version_number || 0],
    ['Skor', skor?.skor_total ?? '-'],
    ['Level', skor?.level_kesiapan || '-'],
  ]), 'Ringkasan');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['No', 'Tingkat', 'BAB', 'Halaman', 'Temuan', 'Data Dokumen', 'Data Acuan', 'Sumber Acuan', 'Rekomendasi', 'Status'],
    ...srt.map((f, i) => [i + 1, SEV_LABEL[f.severity] || f.severity, f.chapter || '', f.page || '', f.description || '', f.document_value || '', f.reference_value || '', f.reference_source || '', f.recommendation || '', f.status || '']),
  ]), 'Seluruh Temuan');
  ['kritis', 'mayor', 'minor', 'informasi'].forEach(sev => {
    const rows = srt.filter(f => f.severity === sev);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['No', 'BAB', 'Halaman', 'Temuan', 'Rekomendasi', 'Status'],
      ...rows.map((f, i) => [i + 1, f.chapter || '', f.page || '', f.description || '', f.recommendation || '', f.status || '']),
    ]), SEV_LABEL[sev]);
  });
  XLSX.writeFile(wb, `Laporan_Pemeriksaan_RP_${(identitas.nama_biro || 'Biro').replace(/\s+/g, '_')}_V${identitas.version_number || 0}.xlsx`);
}
