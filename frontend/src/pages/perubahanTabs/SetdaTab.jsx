import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Layers, Sparkles, Loader2, ShieldCheck, CheckCircle2, Save, Bot, FileText, Download, Search, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import TahunSelect from '@/components/TahunSelect';

export default function SetdaTab({ tahun, refreshKey, role, isAdminLike, isVerif }) {
  const [tahunState, setTahunState] = useState(tahun);
  // Sinkronkan tahun dengan header halaman
  useEffect(() => { setTahunState(tahun); }, [tahun]);
  const [mode, setMode] = useState('draft');
  const [submissions, setSubmissions] = useState([]);
  const [setdaList, setSetdaList] = useState([]);
  const [selectedSetda, setSelectedSetda] = useState('');
  const [detail, setDetail] = useState(null);
  const [sections, setSections] = useState([]);
  const [editContent, setEditContent] = useState({});
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceData, setSourceData] = useState([]);
  const [exporting, setExporting] = useState('');
  const [matriks, setMatriks] = useState(null);
  const [matriksLoading, setMatriksLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [filterMatriks, setFilterMatriks] = useState('semua');

  const loadMatriks = async () => {
    if (!selectedSetda) return;
    setMatriksLoading(true);
    try {
      const mm = await api.request(`/api/perubahan/setda/${selectedSetda}/matriks`, { method: 'GET' });
      setMatriks(mm);
    } catch { setMatriks(null); } finally { setMatriksLoading(false); }
  };
  useEffect(() => { if (selectedSetda) loadMatriks(); }, [selectedSetda, refreshKey]);

  const extractPrograms = async () => {
    if (!detail) return;
    setExtracting(true);
    try {
      // Ekstrak program dari versi FINAL setiap biro (versi terakhir)
      const subs = submissions.filter(s => s.status === 'final');
      if (subs.length === 0) { toast.info('Belum ada biro FINAL untuk diekstrak.'); return; }
      let total = 0;
      for (const s of subs) {
        const vr = await api.list('perubahan/versions', { submission_id: s.id });
        const vs = Array.isArray(vr?.data) ? vr.data : [];
        const latest = vs[0];
        if (!latest) continue;
        const r = await api.request('/api/perubahan/programs/extract', { method: 'POST', body: JSON.stringify({ version_id: latest.id }) });
        total += r.programs || 0;
      }
      toast.success(`Ekstraksi selesai: ${total} program/kegiatan dari ${subs.length} biro final`);
      await loadMatriks();
    } catch (err) { toast.error('Gagal ekstraksi: ' + err.message); } finally { setExtracting(false); }
  };

  const resolveConflict = async (kode, pilih) => {
    try {
      await api.request(`/api/perubahan/setda/${selectedSetda}/resolve-conflict`, { method: 'POST', body: JSON.stringify({ kode, pilih }) });
      toast.success(`Keputusan dicatat: pakai ${pilih}`);
      await loadMatriks();
    } catch (err) { toast.error('Gagal: ' + err.message); }
  };


  const loadSubs = () => {
    api.list('perubahan/submissions', { year: parseInt(tahunState) })
      .then(r => setSubmissions(Array.isArray(r?.data) ? r.data : []))
      .catch(() => {});
  };
  useEffect(() => { loadSubs(); }, [tahunState, refreshKey]);

  useEffect(() => {
    api.list('perubahan/setda', { year: parseInt(tahunState), limit: 20 })
      .then(r => {
        const list = Array.isArray(r?.data) ? r.data : [];
        setSetdaList(list);
        setSelectedSetda(prev => prev && list.some(s => s.id === prev) ? prev : (list[0]?.id || ''));
      })
      .catch(() => {});
  }, [tahunState, refreshKey]);

  useEffect(() => {
    if (!selectedSetda) { setDetail(null); setSections([]); setEditContent({}); return; }
    api.get('perubahan/setda', selectedSetda)
      .then(d => {
        setDetail(d);
        const sec = d.sections || [];
        setSections(sec);
        const ec = {};
        sec.forEach(s => { ec[s.id] = s.content || ''; });
        setEditContent(ec);
      })
      .catch(() => { setDetail(null); setSections([]); });
  }, [selectedSetda, refreshKey]);

  const finalCount = submissions.filter(s => s.status === 'final').length;
  const progress = submissions.length > 0 ? Math.round((finalCount / submissions.length) * 100) : 0;
  const belumFinal = submissions.filter(s => s.status !== 'final');

  const generate = async () => {
    setGenerating(true);
    try {
      const resp = await api.request('/api/perubahan/setda/generate', { method: 'POST', body: JSON.stringify({ year: parseInt(tahunState), mode }) });
      toast.success(resp.message || 'Draft dibuat');
      const r = await api.list('perubahan/setda', { year: parseInt(tahunState), limit: 20 });
      const list = Array.isArray(r?.data) ? r.data : [];
      setSetdaList(list);
      setSelectedSetda(resp.id || list[0]?.id || '');
    } catch (err) {
      toast.error(err.message);
    } finally { setGenerating(false); }
  };

  const saveSection = async (id) => {
    try {
      await api.update('perubahan/sections', id, { content: editContent[id] || '', status: 'disusun' });
      toast.success('Section disimpan');
      const d = await api.get('perubahan/setda', selectedSetda);
      setSections(d.sections || []);
    } catch (err) { toast.error('Gagal: ' + err.message); }
  };

  const runCheck = async () => {
    if (!selectedSetda) return;
    setChecking(true);
    try {
      const resp = await api.request(`/api/perubahan/setda/${selectedSetda}/pemeriksaan`, { method: 'POST', body: JSON.stringify({}) });
      toast.success(resp.message || 'Pemeriksaan selesai');
    } catch (err) { toast.error('Gagal: ' + err.message); } finally { setChecking(false); }
  };

  const approve = async (type) => {
    if (!selectedSetda) return;
    try {
      await api.request(`/api/perubahan/setda/${selectedSetda}/approve`, { method: 'POST', body: JSON.stringify({ type, note: type === 'final' ? 'Ditetapkan Final' : 'Disetujui' }) });
      toast.success(type === 'final' ? 'Renja Perubahan Setda ditetapkan FINAL' : 'Disetujui');
      const r = await api.list('perubahan/setda', { year: parseInt(tahunState), limit: 20 });
      setSetdaList(Array.isArray(r?.data) ? r.data : []);
    } catch (err) { toast.error('Gagal: ' + err.message); }
  };

  const openSources = () => {
    setSourceData(detail?.sources || []);
    setSourceOpen(true);
  };

  const exportSetda = async (type) => {
    if (!detail || sections.length === 0) return;
    setExporting(type);
    try {
      if (type === 'docx') {
        const { Document, Packer, Paragraph, HeadingLevel, Header, Footer, PageNumber, AlignmentType, PageBreak } = await import('docx');
        const { saveAs } = await import('file-saver');
        const children = [];
        children.push(new Paragraph({ text: 'RENJA PERUBAHAN SEKRETARIAT DAERAH PROVINSI SUMATERA BARAT', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }));
        children.push(new Paragraph({ text: `TAHUN ${tahunState}`, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }));
        children.push(new Paragraph({ text: `Status: ${detail.status === 'final' ? 'FINAL' : 'DRAFT'}` }));
        children.push(new Paragraph({ text: '' }));
        // Daftar isi (TOC manual)
        children.push(new Paragraph({ text: 'DAFTAR ISI', heading: HeadingLevel.HEADING_1 }));
        sections.forEach(s => children.push(new Paragraph({ text: `${s.chapter}.${s.subchapter} ${s.judul}` })));
        children.push(new Paragraph({ children: [new PageBreak()] }));
        let lastChapter = '';
        sections.forEach(s => {
          if (s.chapter !== lastChapter) {
            children.push(new Paragraph({ children: [new PageBreak()] }));
            lastChapter = s.chapter;
          }
          children.push(new Paragraph({ text: `BAB ${s.chapter}`, heading: HeadingLevel.HEADING_1 }));
          children.push(new Paragraph({ text: `${s.chapter}.${s.subchapter} ${s.judul}`, heading: HeadingLevel.HEADING_2 }));
          (s.content || '').split('\n').filter(Boolean).forEach(p => children.push(new Paragraph({ text: p })));
        });
        const doc = new Document({
          sections: [{
            headers: { default: new Header({ children: [new Paragraph({ text: 'RENJA PERUBAHAN SEKRETARIAT DAERAH', alignment: AlignmentType.RIGHT })] }) },
            footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new PageNumber()] })] }) },
            children,
          }],
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Renja_Perubahan_Setda_${tahunState}.docx`);
      } else if (type === 'xlsx') {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
          ['Renja Perubahan Setda', tahunState],
          ['Status', detail.status],
          ['Jumlah Biro Final', detail.jumlah_biro_final],
          [''],
          ['BAB', 'Sub', 'Judul', 'Konten'],
          ...sections.map(s => [s.chapter, s.subchapter, s.judul, s.content || '']),
        ]), 'Struktur');
        XLSX.writeFile(wb, `Renja_Perubahan_Setda_${tahunState}.xlsx`);
      } else {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF();
        doc.setFillColor(88, 28, 135);
        doc.rect(0, 0, 210, 26, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.text('RENJA PERUBAHAN SEKRETARIAT DAERAH', 105, 11, { align: 'center' });
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text(`PROVINSI SUMATERA BARAT — TAHUN ${tahunState}  |  ${detail.status === 'final' ? 'FINAL' : 'DRAFT'}`.toUpperCase(), 105, 19, { align: 'center' });
        let y = 34;
        doc.setTextColor(30, 41, 59); doc.setFontSize(9);
        sections.forEach(s => {
          const judul = `${s.chapter}.${s.subchapter} ${s.judul}`;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(judul, 14, y); y += 6;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
          const lines = doc.splitTextToSize(s.content || 'Data Belum Tersedia', 182);
          for (const l of lines) { if (y > 275) { doc.addPage(); y = 20; } doc.text(l, 14, y); y += 5; }
          y += 3;
        });
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          doc.setPage(i); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
          doc.text(`SI-VERENA SETDA — Renja Perubahan Setda ${tahunState}  |  Halaman ${i} dari ${pages}`, 105, 290, { align: 'center' });
        }
        doc.save(`Renja_Perubahan_Setda_${tahunState}.pdf`);
      }
      toast.success(`Export ${type.toUpperCase()} berhasil`);
    } catch (err) { toast.error('Gagal export: ' + err.message); } finally { setExporting(''); }
  };

  const isFinal = detail?.status === 'final';

  return (
    <div className="space-y-4">
      {/* Status kesiapan */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Renja Perubahan Sekretariat Daerah</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{finalCount} dari {submissions.length || 0} Biro Siap Konsolidasi</p>
          </div>
          <div className="flex items-center gap-2">
            <TahunSelect value={tahunState} onValueChange={setTahunState} />
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">DRAFT (boleh belum lengkap)</SelectItem>
                <SelectItem value="final">FINAL (semua biro harus Final)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generate} disabled={generating || submissions.length === 0} className="bg-purple-600 hover:bg-purple-700">
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {generating ? 'Mengonsolidasi...' : 'GENERATE DRAFT RENJA PERUBAHAN SETDA'}
            </Button>
          </div>
        </div>
        <div className="mt-3 h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        {belumFinal.length > 0 && mode === 'final' && (
          <p className="mt-2 text-xs text-amber-600">Biro belum Final: {belumFinal.map(b => b.nama_biro).join(', ')}</p>
        )}
      </div>

      {/* Daftar setda */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Pilih draft:</span>
        <Select value={selectedSetda} onValueChange={setSelectedSetda}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Pilih draft..." /></SelectTrigger>
          <SelectContent>
            {setdaList.map(s => <SelectItem key={s.id} value={s.id}>V{s.version} · {s.year} · {s.status}</SelectItem>)}
          </SelectContent>
        </Select>
        {detail && (
          <>
            <Badge variant="outline" className={`text-[10px] ${detail.status === 'final' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-700'}`}>{detail.status === 'final' ? 'FINAL' : detail.mode === 'draft_konsolidasi' ? 'DRAFT — BELUM LENGKAP' : 'DRAFT'}</Badge>
            <Button size="sm" variant="outline" onClick={openSources}><Search className="w-3.5 h-3.5 mr-1" /> Lihat Sumber</Button>
            <Button size="sm" variant="outline" onClick={() => runCheck()} disabled={checking || !isVerif}>{checking ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Bot className="w-3.5 h-3.5 mr-1" />} Periksa Setda</Button>
            <Button size="sm" variant="outline" onClick={() => exportSetda('docx')} disabled={!!exporting}><FileText className="w-3.5 h-3.5 mr-1" /> DOCX</Button>
            <Button size="sm" variant="outline" onClick={() => exportSetda('pdf')} disabled={!!exporting}><Download className="w-3.5 h-3.5 mr-1" /> PDF</Button>
            <Button size="sm" variant="outline" onClick={() => exportSetda('xlsx')} disabled={!!exporting}><FileText className="w-3.5 h-3.5 mr-1" /> XLSX</Button>
            {isVerif && !isFinal && (
              <>
                <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300" onClick={() => approve('approve')} disabled={detail.status === 'disetujui'}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Setujui</Button>
                <Button size="sm" className="bg-primary" onClick={() => setFinalOpen(true)} disabled={detail.status !== 'disetujui'}><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Tetapkan Final</Button>
              </>
            )}
            {isFinal && <Badge className="bg-emerald-100 text-emerald-800"><Lock className="w-3 h-3 mr-1" /> Versi Final Terkunci</Badge>}
          </>
        )}
      </div>

      {/* Editor section */}
      {detail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-card border border-border rounded-xl overflow-y-auto max-h-[70vh]">
            <div className="px-4 py-3 border-b border-border bg-muted/30 text-xs font-semibold">Daftar BAB / SubBAB</div>
            <div className="divide-y divide-border">
              {sections.map(s => (
                <button key={s.id} className="w-full text-left px-4 py-2.5 hover:bg-muted/20 text-xs"
                  onClick={() => { const el = document.getElementById('sec-' + s.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                  <span className="font-semibold text-primary">{s.chapter}.{s.subchapter}</span> {s.judul}
                  <span className="block text-[9px] text-muted-foreground">{s.status}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {sections.map(s => (
              <div key={s.id} id={'sec-' + s.id} className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm font-semibold">{s.chapter}.{s.subchapter} {s.judul}</p>
                {isVerif && !isFinal ? (
                  <>
                    <Textarea rows={4} className="mt-2 text-xs font-mono" value={editContent[s.id] || ''}
                      onChange={e => setEditContent(prev => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="Data Belum Tersedia" />
                    <Button size="sm" className="mt-2" onClick={() => saveSection(s.id)}><Save className="w-3.5 h-3.5 mr-1" /> Simpan</Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{s.content || 'Data Belum Tersedia'}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedSetda && (
        <div className="text-center py-14 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Renja Perubahan Setda Belum Siap Disusun</p>
          <p className="text-xs mt-1">{finalCount} dari {submissions.length || 0} Biro telah Final. Klik "Generate Draft" untuk mulai.</p>
        </div>
      )}

      {/* Matriks & Konflik Data */}
      {detail && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Matriks Renja Perubahan Setda</h3>
            <div className="flex items-center gap-2">
              <Select value={filterMatriks} onValueChange={setFilterMatriks}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Biro</SelectItem>
                  {(matriks?.biroNames || []).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={extractPrograms} disabled={extracting}>
                {extracting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {extracting ? 'Mengekstrak...' : 'Ekstrak Program (Biro Final)'}
              </Button>
            </div>
          </div>

          {matriksLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
           !matriks ? <p className="text-xs text-muted-foreground text-center py-6">Belum ada data matriks. Klik "Ekstrak Program (Biro Final)" setelah biro Final.</p> : (
            <>
              {/* Total Setda */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[['Total Pagu Awal', matriks.totalPaguAwal], ['Total Pagu Perubahan', matriks.totalPaguPerubahan], ['Selisih', matriks.totalSelisih], ['Jumlah Baris', matriks.rows.length]].map(([l, v]) => (
                  <div key={l} className="p-3 rounded-lg border border-border text-center">
                    <p className="text-lg font-bold text-primary">{typeof v === 'number' && l.includes('Pagu') ? 'Rp ' + new Intl.NumberFormat('id-ID').format(v || 0) : v}</p>
                    <p className="text-[10px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>

              {/* Total per Biro */}
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(matriks.perBiro || {}).map(([b, d]) => (
                  <Badge key={b} variant="outline" className="text-[10px]">{b}: Rp {new Intl.NumberFormat('id-ID').format(d.pagu_perubahan || 0)} ({d.program} prog)</Badge>
                ))}
              </div>

              {/* Konflik Data */}
              {matriks.conflicts && matriks.conflicts.length > 0 && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
                  <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> KONFLIK DATA ({matriks.conflicts.length})</p>
                  <div className="space-y-1.5">
                    {matriks.conflicts.map((c, i) => (
                      <div key={i} className="flex items-center justify-between flex-wrap gap-2 p-2 rounded-lg border border-red-200 bg-white text-xs">
                        <div>
                          <p className="font-medium">{c.nama} ({c.kode})</p>
                          <p className="text-muted-foreground">Biro: Rp {new Intl.NumberFormat('id-ID').format(c.nilai_biro)} · {c.nama_biro} vs Rp {new Intl.NumberFormat('id-ID').format(c.nilai_acuan)} · {c.acuan_source || 'sumber lain'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => resolveConflict(c.kode, 'biro')}>Pakai Nilai Biro</Button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => resolveConflict(c.kode, 'acuan')}>Pakai Nilai Acuan</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabel matriks */}
              <div className="bg-card border border-border rounded-xl overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/30 text-left text-muted-foreground border-b border-border">
                    <th className="px-2 py-2 font-medium">Kode</th>
                    <th className="px-2 py-2 font-medium">Program/Kegiatan/Subkegiatan</th>
                    <th className="px-2 py-2 font-medium">Indikator</th>
                    <th className="px-2 py-2 font-medium">Target Awal</th>
                    <th className="px-2 py-2 font-medium">Target Perubahan</th>
                    <th className="px-2 py-2 font-medium text-right">Pagu Awal</th>
                    <th className="px-2 py-2 font-medium text-right">Pagu Perubahan</th>
                    <th className="px-2 py-2 font-medium text-right">+/-</th>
                    <th className="px-2 py-2 font-medium">Biro</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {matriks.rows
                      .filter(r => filterMatriks === 'semua' || (r.biro || '').includes(filterMatriks))
                      .map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-2 py-1.5">{r.kode}</td>
                        <td className="px-2 py-1.5 max-w-[220px]">{r.program}{r.kegiatan ? ' — ' + r.kegiatan : ''}{r.subkegiatan ? ' — ' + r.subkegiatan : ''}</td>
                        <td className="px-2 py-1.5 max-w-[120px] text-muted-foreground">{r.indikator || '-'}</td>
                        <td className="px-2 py-1.5">{r.target_awal || '-'}</td>
                        <td className="px-2 py-1.5">{r.target_perubahan || '-'}</td>
                        <td className="px-2 py-1.5 text-right">{new Intl.NumberFormat('id-ID').format(r.pagu_awal)}</td>
                        <td className="px-2 py-1.5 text-right font-semibold">{new Intl.NumberFormat('id-ID').format(r.pagu_perubahan)}</td>
                        <td className={`px-2 py-1.5 text-right font-bold ${r.selisih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{r.selisih >= 0 ? '+' : ''}{new Intl.NumberFormat('id-ID').format(r.selisih)}</td>
                        <td className="px-2 py-1.5">{r.biro}{r.duplikat ? <span className="text-[9px] text-amber-600 ml-1">(multi-biro)</span> : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Dialog sumber */}
      <Dialog open={sourceOpen} onOpenChange={setSourceOpen}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Traceability — Sumber Data</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            {sourceData.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada sumber.</p>}
            {sourceData.map(s => (
              <div key={s.id} className="p-2.5 rounded-lg border border-border text-xs">
                <p className="font-medium">Sumber: {s.source_location || s.nama_biro}</p>
                <p className="text-muted-foreground">Biro: {s.nama_biro} · V{s.version_number} · {s.source_type}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog final */}
      <AlertDialog open={finalOpen} onOpenChange={setFinalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Tetapkan Renja Perubahan Setda sebagai FINAL?</AlertDialogTitle>
            <AlertDialogDescription>Semua Biro wajib sudah Final. Versi final dikunci dan siap diekspor.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-primary" onClick={() => { approve('final'); setFinalOpen(false); }}>Tetapkan Final</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
