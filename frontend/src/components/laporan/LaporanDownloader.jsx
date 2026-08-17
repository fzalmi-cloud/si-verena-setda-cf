import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { KATEGORI_LABELS, STATUS_LABELS } from '@/lib/pemeriksaanRules';
import { toast } from 'sonner';

// Buat file Word (.docx) manual via HTML blob yang bisa dibuka Word
function downloadAsWord({ selectedBiro, tahun, skor, results, summary }) {
  const statusLabel = (s) => STATUS_LABELS[s] || s;

  const rows = results.map(r => `
    <tr>
      <td style="border:1px solid #ccc;padding:6px;font-size:11pt">${KATEGORI_LABELS[r.kategori] || r.kategori}</td>
      <td style="border:1px solid #ccc;padding:6px;font-size:11pt">${r.sub_kategori || '-'}</td>
      <td style="border:1px solid #ccc;padding:6px;font-size:11pt">${r.item_pemeriksaan}</td>
      <td style="border:1px solid #ccc;padding:6px;font-size:11pt;color:${
        r.status === 'sesuai' ? 'green' : r.status === 'perlu_perbaikan' ? 'orange' : r.status === 'tidak_ditemukan' ? 'red' : 'blue'
      }">${statusLabel(r.status)}</td>
      <td style="border:1px solid #ccc;padding:6px;font-size:11pt">${r.catatan_otomatis || ''}</td>
      <td style="border:1px solid #ccc;padding:6px;font-size:11pt">${r.catatan_verifikator || ''}</td>
    </tr>
  `).join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; font-size:12pt; }
      h1 { font-size:16pt; }
      h2 { font-size:14pt; margin-top:16pt; }
      table { border-collapse: collapse; width:100%; margin-top:12pt; }
      th { background:#1a3a6b; color:white; padding:8px 6px; font-size:11pt; border:1px solid #ccc; text-align:left; }
      .score-box { display:inline-block; padding:4px 12px; border-radius:4px; background:#f0f4ff; border:1px solid #c0cfef; margin:2px; }
    </style>
    </head>
    <body>
      <h1>LAPORAN HASIL VERIFIKASI DOKUMEN RENJA</h1>
      <p><strong>Biro/Perangkat Daerah:</strong> ${selectedBiro}</p>
      <p><strong>Tahun Renja:</strong> ${tahun}</p>
      <p><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}</p>
      <p><strong>Status Akhir:</strong> ${skor.status_final?.replace(/_/g,' ').toUpperCase() || '-'}</p>

      <h2>RINGKASAN SKOR</h2>
      <table>
        <tr>
          <th>Kategori</th><th>Skor</th>
        </tr>
        <tr><td style="border:1px solid #ccc;padding:6px">Total Kesiapan</td><td style="border:1px solid #ccc;padding:6px"><strong>${skor.skor_total || 0}</strong></td></tr>
        <tr><td style="border:1px solid #ccc;padding:6px">Kelengkapan Dokumen</td><td style="border:1px solid #ccc;padding:6px">${skor.skor_kelengkapan || 0}</td></tr>
        <tr><td style="border:1px solid #ccc;padding:6px">Sistematika</td><td style="border:1px solid #ccc;padding:6px">${skor.skor_sistematika || 0}</td></tr>
        <tr><td style="border:1px solid #ccc;padding:6px">Tabel Wajib</td><td style="border:1px solid #ccc;padding:6px">${skor.skor_tabel || 0}</td></tr>
        <tr><td style="border:1px solid #ccc;padding:6px">Matriks Renja</td><td style="border:1px solid #ccc;padding:6px">${skor.skor_matriks || 0}</td></tr>
        <tr><td style="border:1px solid #ccc;padding:6px">Konsistensi</td><td style="border:1px solid #ccc;padding:6px">${skor.skor_konsistensi || 0}</td></tr>
        <tr><td style="border:1px solid #ccc;padding:6px">Substansi</td><td style="border:1px solid #ccc;padding:6px">${skor.skor_substansi || 0}</td></tr>
      </table>

      <h2>RINGKASAN TEMUAN</h2>
      <p>
        ✓ Sesuai: <strong>${summary.sesuai || 0}</strong> &nbsp;|&nbsp;
        ⚠ Perlu Perbaikan: <strong>${summary.perlu_perbaikan || 0}</strong> &nbsp;|&nbsp;
        ✗ Tidak Ditemukan: <strong>${summary.tidak_ditemukan || 0}</strong> &nbsp;|&nbsp;
        ◎ Perlu Review: <strong>${summary.perlu_review_manual || 0}</strong>
      </p>

      <h2>DETAIL HASIL PEMERIKSAAN</h2>
      <table>
        <tr>
          <th>Kategori</th>
          <th>Sub Kategori</th>
          <th>Item Pemeriksaan</th>
          <th>Status</th>
          <th>Catatan AI</th>
          <th>Catatan Verifikator</th>
        </tr>
        ${rows}
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Hasil_Verifikasi_${selectedBiro}_${tahun}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// Buat CSV yang bisa dibuka Excel
function downloadAsExcel({ selectedBiro, tahun, skor, results, summary }) {
  const BOM = '\uFEFF'; // UTF-8 BOM agar Excel baca karakter Indonesia

  const headerInfo = [
    ['LAPORAN HASIL VERIFIKASI DOKUMEN RENJA'],
    ['Biro/Perangkat Daerah', selectedBiro],
    ['Tahun Renja', tahun],
    ['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
    ['Status Akhir', skor.status_final?.replace(/_/g, ' ') || '-'],
    [],
    ['=== SKOR ==='],
    ['Kategori', 'Skor'],
    ['Total Kesiapan', skor.skor_total || 0],
    ['Kelengkapan Dokumen', skor.skor_kelengkapan || 0],
    ['Sistematika', skor.skor_sistematika || 0],
    ['Tabel Wajib', skor.skor_tabel || 0],
    ['Matriks Renja', skor.skor_matriks || 0],
    ['Konsistensi', skor.skor_konsistensi || 0],
    ['Substansi', skor.skor_substansi || 0],
    [],
    ['=== RINGKASAN TEMUAN ==='],
    ['Sesuai', summary.sesuai || 0],
    ['Perlu Perbaikan', summary.perlu_perbaikan || 0],
    ['Tidak Ditemukan', summary.tidak_ditemukan || 0],
    ['Perlu Review Manual', summary.perlu_review_manual || 0],
    [],
    ['=== DETAIL HASIL PEMERIKSAAN ==='],
    ['No', 'Kategori', 'Sub Kategori', 'Item Pemeriksaan', 'Status', 'Catatan AI', 'Catatan Verifikator'],
  ];

  const dataRows = results.map((r, i) => [
    i + 1,
    KATEGORI_LABELS[r.kategori] || r.kategori,
    r.sub_kategori || '-',
    r.item_pemeriksaan,
    STATUS_LABELS[r.status] || r.status,
    r.catatan_otomatis || '',
    r.catatan_verifikator || '',
  ]);

  const allRows = [...headerInfo, ...dataRows];

  const csv = allRows.map(row =>
    row.map(cell => {
      const s = String(cell ?? '').replace(/"/g, '""');
      return `"${s}"`;
    }).join(',')
  ).join('\r\n');

  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Hasil_Verifikasi_${selectedBiro}_${tahun}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LaporanDownloader({ selectedBiro, tahun, skor, results, summary }) {
  const [loading, setLoading] = useState(null);

  const handle = async (type) => {
    setLoading(type);
    await new Promise(r => setTimeout(r, 100));
    try {
      if (type === 'excel') {
        downloadAsExcel({ selectedBiro, tahun, skor, results, summary });
        toast.success('File Excel (CSV) berhasil diunduh');
      } else {
        downloadAsWord({ selectedBiro, tahun, skor, results, summary });
        toast.success('File Word berhasil diunduh');
      }
    } catch {
      toast.error('Gagal mengunduh file');
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Unduh
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handle('excel')} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          Unduh Excel (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('word')} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4 text-blue-600" />
          Unduh Word (.doc)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}