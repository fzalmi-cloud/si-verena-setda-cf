import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { KATEGORI_LABELS, STATUS_LABELS, CHECKLIST_ITEMS } from '@/lib/pemeriksaanRules';
import jsPDF from 'jspdf';

export default function LaporanPDFGenerator({ selectedBiro, tahun, skor, results, summary }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentW = pageW - margin * 2;
      let y = margin;

      const addPage = () => {
        doc.addPage();
        y = margin;
      };

      const checkY = (needed = 10) => {
        if (y + needed > 275) addPage();
      };

      // === HEADER ===
      doc.setFillColor(30, 64, 120);
      doc.rect(0, 0, pageW, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN HASIL VERIFIKASI DOKUMEN RENJA', pageW / 2, 13, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Sekretariat Daerah – SI-VERENA', pageW / 2, 22, { align: 'center' });
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageW / 2, 29, { align: 'center' });

      y = 42;
      doc.setTextColor(30, 30, 30);

      // === INFO BIRO ===
      doc.setFillColor(240, 245, 255);
      doc.rect(margin, y, contentW, 22, 'F');
      doc.setDrawColor(180, 200, 240);
      doc.rect(margin, y, contentW, 22, 'S');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedBiro, margin + 5, y + 8);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Renja Tahun ${tahun}`, margin + 5, y + 15);

      const levelText = skor.level_kesiapan?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '-';
      const scoreText = `Skor Total: ${skor.skor_total || 0} / 100`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(scoreText, pageW - margin - 5, y + 8, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(levelText, pageW - margin - 5, y + 15, { align: 'right' });
      y += 30;

      // === SKOR PER KATEGORI ===
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SKOR PER KATEGORI', margin, y);
      y += 5;

      const skorMap = {
        kelengkapan_dokumen: skor.skor_kelengkapan,
        sistematika_dokumen: skor.skor_sistematika,
        tabel_wajib: skor.skor_tabel,
        matriks_renja: skor.skor_matriks,
        konsistensi_angka: skor.skor_konsistensi,
        substansi_bab: skor.skor_substansi,
      };

      const colW = contentW / 3;
      let col = 0;
      let rowStartY = y;

      Object.entries(KATEGORI_LABELS).forEach(([key, label]) => {
        const s = skorMap[key] || 0;
        const xPos = margin + col * colW;
        doc.setFillColor(248, 250, 252);
        doc.rect(xPos, rowStartY, colW - 2, 14, 'F');
        doc.setDrawColor(220, 228, 240);
        doc.rect(xPos, rowStartY, colW - 2, 14, 'S');

        // bar
        const barW = (colW - 14) * (s / 100);
        doc.setFillColor(200, 216, 240);
        doc.rect(xPos + 2, rowStartY + 9, colW - 14, 3, 'F');
        const barColor = s >= 90 ? [16, 185, 129] : s >= 75 ? [59, 130, 246] : s >= 60 ? [245, 158, 11] : [239, 68, 68];
        doc.setFillColor(...barColor);
        doc.rect(xPos + 2, rowStartY + 9, barW, 3, 'F');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(label.split(' ').slice(0, 2).join(' '), xPos + 2, rowStartY + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        doc.text(`${s}`, xPos + colW - 16, rowStartY + 5, { align: 'right' });

        col++;
        if (col === 3) { col = 0; rowStartY += 16; }
      });

      y = rowStartY + (col > 0 ? 16 : 0) + 8;

      // === RINGKASAN STATUS ===
      checkY(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('RINGKASAN TEMUAN', margin, y);
      y += 6;

      const summaryItems = [
        { label: 'Sesuai', count: summary.sesuai || 0, color: [16, 185, 129] },
        { label: 'Perlu Perbaikan', count: summary.perlu_perbaikan || 0, color: [245, 158, 11] },
        { label: 'Tidak Ditemukan', count: summary.tidak_ditemukan || 0, color: [239, 68, 68] },
        { label: 'Perlu Review Manual', count: summary.perlu_review_manual || 0, color: [59, 130, 246] },
      ];

      const sColW = contentW / 4;
      summaryItems.forEach((item, i) => {
        const xPos = margin + i * sColW;
        doc.setFillColor(...item.color.map(c => Math.round(c * 0.1 + 230)));
        doc.rect(xPos, y, sColW - 3, 16, 'F');
        doc.setDrawColor(...item.color.map(c => Math.round(c * 0.7 + 70)));
        doc.rect(xPos, y, sColW - 3, 16, 'S');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...item.color);
        doc.text(`${item.count}`, xPos + (sColW - 3) / 2, y + 10, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(item.label, xPos + (sColW - 3) / 2, y + 14.5, { align: 'center' });
      });
      y += 22;

      // === DETAIL PER KATEGORI ===
      Object.entries(CHECKLIST_ITEMS).forEach(([key, items]) => {
        checkY(18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setFillColor(30, 64, 120);
        doc.rect(margin, y, contentW, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(KATEGORI_LABELS[key] || key, margin + 3, y + 5.5);
        doc.setTextColor(30, 30, 30);
        y += 10;

        items.forEach((item) => {
          checkY(12);
          const result = results.find(r => r.item_pemeriksaan === item.item && r.kategori === key);
          const status = result?.status || 'perlu_review_manual';
          const statusLabel = STATUS_LABELS[status] || status;

          const statusColorMap = {
            sesuai: [16, 185, 129],
            perlu_perbaikan: [245, 158, 11],
            tidak_ditemukan: [239, 68, 68],
            perlu_review_manual: [59, 130, 246],
            tidak_berlaku: [148, 163, 184],
          };
          const clr = statusColorMap[status] || [148, 163, 184];

          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y, contentW, 9, 'F');
          doc.setDrawColor(230, 234, 240);
          doc.rect(margin, y, contentW, 9, 'S');

          // status badge
          doc.setFillColor(...clr.map(c => Math.round(c * 0.15 + 220)));
          doc.rect(margin + contentW - 36, y + 1.5, 34, 6, 'F');
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...clr);
          doc.text(statusLabel, margin + contentW - 19, y + 5.5, { align: 'center' });

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          const itemText = doc.splitTextToSize(item.item, contentW - 42);
          doc.text(itemText, margin + 3, y + 5.5);

          const lineH = itemText.length > 1 ? itemText.length * 4 + 5 : 9;
          y += lineH;

          // catatan
          const catatan = result?.catatan_otomatis || result?.catatan_verifikator;
          if (catatan) {
            checkY(8);
            doc.setFillColor(255, 251, 235);
            doc.rect(margin + 4, y, contentW - 4, 7, 'F');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 90, 20);
            const catatanText = doc.splitTextToSize(`Catatan: ${catatan}`, contentW - 10);
            doc.text(catatanText[0], margin + 6, y + 4.5);
            y += 8;
          }
        });
        y += 4;
      });

      // === FOOTER ===
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.line(margin, 285, pageW - margin, 285);
        doc.text(`SI-VERENA SETDA – Laporan Hasil Verifikasi Renja ${tahun}`, margin, 290);
        doc.text(`Halaman ${i} dari ${pageCount}`, pageW - margin, 290, { align: 'right' });
      }

      const fileName = `Laporan_Verifikasi_${selectedBiro.replace(/\s+/g, '_')}_${tahun}.pdf`;
      doc.save(fileName);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={generatePDF} disabled={loading}>
      {loading
        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        : <Download className="w-4 h-4 mr-2" />}
      {loading ? 'Membuat PDF...' : 'Unduh Laporan PDF'}
    </Button>
  );
}