import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Table2, Loader2, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportDokumen() {
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [exporting, setExporting] = useState('');

  const { data: draftListResp } = useQuery({
    queryKey: ['draft-renja-list'],
    queryFn: () => api.list('draft', { limit: 20 }),
  });
  const draftList = Array.isArray(draftListResp?.data) ? draftListResp.data : [];

  const selectedDraft = draftList.find(d => d.id === selectedDraftId) || draftList[0];

  const { data: babListResp } = useQuery({
    queryKey: ['draft-bab-export', selectedDraft?.id],
    queryFn: () => api.list("draftrenjabab", { limit: 50 }),
    enabled: !!selectedDraft?.id,
  });
  const babList = Array.isArray(babListResp?.data) ? babListResp.data : [];

  const handleExportDOCX = async () => {
    if (!selectedDraft) return;
    setExporting('docx');
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
      const { saveAs } = await import('file-saver');

      const children = [
        new Paragraph({ text: 'RENCANA KERJA', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SEKRETARIAT DAERAH PROVINSI SUMATERA BARAT', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: `TAHUN ${selectedDraft.tahun}`, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: '' }),
      ];

      if (selectedDraft.ringkasan_eksekutif) {
        children.push(new Paragraph({ text: 'RINGKASAN EKSEKUTIF', heading: HeadingLevel.HEADING_1 }));
        selectedDraft.ringkasan_eksekutif.split('\n').filter(Boolean).forEach(p => {
          children.push(new Paragraph({ children: [new TextRun({ text: p })] }));
        });
        children.push(new Paragraph({ text: '' }));
      }

      const mainBabs = babList.filter(b => /^\d+$/.test(b.nomor_bab));
      for (const bab of mainBabs) {
        children.push(new Paragraph({ text: bab.judul_bab, heading: HeadingLevel.HEADING_1 }));
        (bab.isi_bab || '').split('\n').filter(Boolean).forEach(p => {
          if (p.startsWith('#')) {
            children.push(new Paragraph({ text: p.replace(/^#+\s*/, ''), heading: HeadingLevel.HEADING_2 }));
          } else {
            children.push(new Paragraph({ children: [new TextRun({ text: p.replace(/\*\*/g, '').replace(/\*/g, '') })] }));
          }
        });
        if (bab.sumber_data?.length > 0) {
          children.push(new Paragraph({ children: [new TextRun({ text: `Sumber Data: ${bab.sumber_data.join(', ')}`, italics: true, color: '666666', size: 18 })] }));
        }
        children.push(new Paragraph({ text: '' }));
      }

      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Renja_Setda_${selectedDraft.tahun}_v${selectedDraft.versi}.docx`);
      toast.success('DOCX berhasil diexport');
    } catch (err) {
      toast.error('Gagal export: ' + err.message);
    } finally {
      setExporting('');
    }
  };

  const handleExportXLSX = async (jenis) => {
    if (!selectedDraft) return;
    setExporting(jenis);
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      let data = [];
      let sheetName = 'Data';

      if (jenis === 'rekap') {
        const babs = babList.filter(b => /^\d+$/.test(b.nomor_bab));
        data = [['BAB', 'Judul', 'Status', 'Sumber Data', 'Catatan Verifikator']];
        babs.forEach(b => {
          data.push([b.nomor_bab, b.judul_bab, b.status_bab, (b.sumber_data||[]).join('; '), b.catatan_verifikator || '']);
        });
        sheetName = 'Rekap BAB';
      } else {
        data = [['Komponen', 'Nilai']];
        data.push(['Judul Draft', selectedDraft.judul]);
        data.push(['Tahun', selectedDraft.tahun]);
        data.push(['Versi', selectedDraft.versi]);
        data.push(['Status', selectedDraft.status]);
        data.push(['Dibuat Oleh', selectedDraft.generated_by]);
        data.push(['Jumlah Biro', selectedDraft.jumlah_biro]);
        data.push(['Biro Digunakan', (selectedDraft.biro_digunakan || []).join(', ')]);
        sheetName = 'Info Draft';
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf]), `Rekap_${jenis}_${selectedDraft.tahun}.xlsx`);
      toast.success('XLSX berhasil diexport');
    } catch (err) {
      toast.error('Gagal export: ' + err.message);
    } finally {
      setExporting('');
    }
  };

  const handleExportPDF = () => {
    if (!selectedDraft) return;
    toast.info('Membuka dialog print untuk PDF...');
    window.print();
  };

  const exportOptions = [
    { id: 'docx', label: 'Dokumen Renja Lengkap', desc: 'Export semua BAB dalam format Word (.docx)', icon: FileText, color: 'border-blue-200 bg-blue-50 text-blue-700', action: handleExportDOCX },
    { id: 'pdf', label: 'Dokumen Final PDF', desc: 'Export draft sebagai PDF (via browser print)', icon: FileText, color: 'border-red-200 bg-red-50 text-red-700', action: handleExportPDF },
    { id: 'rekap', label: 'Rekap BAB (XLSX)', desc: 'Export tabel rekap semua BAB, status, dan sumber data', icon: Table2, color: 'border-emerald-200 bg-emerald-50 text-emerald-700', action: () => handleExportXLSX('rekap') },
    { id: 'info', label: 'Info Draft (XLSX)', desc: 'Export metadata draft dan daftar biro yang digunakan', icon: Table2, color: 'border-amber-200 bg-amber-50 text-amber-700', action: () => handleExportXLSX('info') },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/penyusunan">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold">Export Dokumen</h1>
          <p className="text-sm text-muted-foreground">Export draft Renja Setda ke berbagai format</p>
        </div>
      </div>

      {/* Pilih draft */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <label className="text-sm font-semibold">Pilih Draft yang Akan Diekspor</label>
        {draftList.length > 0 ? (
          <Select value={selectedDraftId || draftList[0]?.id} onValueChange={setSelectedDraftId}>
            <SelectTrigger><SelectValue placeholder="Pilih draft..." /></SelectTrigger>
            <SelectContent>
              {draftList.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  v{d.versi} — {d.judul} ({d.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Belum ada draft. <Link to="/penyusunan/generate" className="text-primary hover:underline">Buat draft terlebih dahulu</Link>
          </div>
        )}

        {selectedDraft && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
            <p>Status: <span className="font-medium">{selectedDraft.status}</span></p>
            <p>Versi: <span className="font-medium">v{selectedDraft.versi}</span></p>
            <p>Biro: <span className="font-medium">{selectedDraft.jumlah_biro} biro</span></p>
            {selectedDraft.status !== 'final' && (
              <p className="text-amber-600">⚠ Draft belum final. Disarankan finalisasi di Editor sebelum export resmi.</p>
            )}
          </div>
        )}
      </div>

      {/* Opsi export */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {exportOptions.map(opt => {
          const Icon = opt.icon;
          return (
            <div key={opt.id} className={`rounded-xl border p-4 ${opt.color}`}>
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 gap-1 text-xs"
                    disabled={!selectedDraft || exporting === opt.id}
                    onClick={opt.action}
                  >
                    {exporting === opt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {exporting === opt.id ? 'Mengekspor...' : 'Download'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedDraft?.status === 'final' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Draft ini sudah berstatus Final dan siap diekspor sebagai dokumen resmi.</p>
        </div>
      )}
    </div>
  );
}