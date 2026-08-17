import { useAuth } from '@/lib/AuthContext';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Save, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, AlertTriangle,
  FileText, Eye, EyeOff, Info, Loader2, Send, Star, Bot, History, Download
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const STATUS_BAB_CFG = {
  draft_otomatis: { label: 'Draft Otomatis', cls: 'bg-slate-100 text-slate-600' },
  direview: { label: 'Direview', cls: 'bg-blue-100 text-blue-700' },
  perlu_perbaikan: { label: 'Perlu Perbaikan', cls: 'bg-amber-100 text-amber-700' },
  disetujui: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700' },
  final: { label: 'Final', cls: 'bg-primary/10 text-primary' },
};

const STATUS_DRAFT_CFG = {
  draft_otomatis: { label: 'Draft Otomatis', cls: 'bg-slate-100 text-slate-600' },
  direview: { label: 'Sedang Direview', cls: 'bg-blue-100 text-blue-700' },
  perlu_perbaikan: { label: 'Perlu Perbaikan', cls: 'bg-amber-100 text-amber-700' },
  disetujui: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700' },
  final: { label: 'Final', cls: 'bg-emerald-200 text-emerald-800 font-bold' },
};

export default function EditorDraft() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeBabId, setActiveBabId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editCatatan, setEditCatatan] = useState('');
  const [showSumber, setShowSumber] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const { data: draft } = useQuery({
    queryKey: ['draft-detail', id],
    queryFn: () => api.get('draft', id),
    enabled: !!id,
  });
  const { data: babResponse = { data: [] }, refetch: refetchBab } = useQuery({
    queryKey: ['draft-bab', id],
    queryFn: () => api.list('draft', { draft_id: id, limit: 100 }),
    enabled: !!id,
  });
  const babList = babResponse.data || [];

  const mainBabs = babList.filter(b => !b.nomor_bab.includes('.') || b.nomor_bab.split('.').length === 1 || b.nomor_bab.endsWith('.0'));
  // Hanya tampilkan bab utama (nomor integer) di sidebar
  const sidebarBabs = babList.filter(b => /^\d+$/.test(b.nomor_bab));

  const activeBab = babList.find(b => b.id === activeBabId) || sidebarBabs[0];

  useEffect(() => {
    if (sidebarBabs.length && !activeBabId) setActiveBabId(sidebarBabs[0].id);
  }, [sidebarBabs.length]);

  useEffect(() => {
    if (activeBab) {
      setEditContent(activeBab.isi_bab || '');
      setEditCatatan(activeBab.catatan_verifikator || '');
      setEditMode(false);
    }
  }, [activeBabId]);

  const saveBab = useMutation({
    mutationFn: ({ babId, data }) => api.update("draftrenjabab", babid, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['draft-bab', id] }); toast.success('Perubahan disimpan'); },
    onError: (err) => toast.error('Gagal simpan: ' + err.message),
  });

  const saveDraft = useMutation({
    mutationFn: (data) => api.update("draftrenjasetda", id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['draft-detail', id] }); toast.success('Status draft diperbarui'); },
  });

  const handleSaveBab = () => {
    if (!activeBab) return;
    saveBab.mutate({
      babId: activeBab.id,
      data: {
        isi_bab: editContent,
        catatan_verifikator: editCatatan || undefined,
        status_bab: 'direview',
      },
    });
    setEditMode(false);
  };

  const handleSetStatusBab = (status) => {
    if (!activeBab) return;
    saveBab.mutate({ babId: activeBab.id, data: { status_bab: status } });
  };

  const handleRegenerateBab = async () => {
    if (!activeBab || regenerating) return;
    setRegenerating(true);
    try {
      const result = await api.generateLLM(
        `Kamu adalah asisten penyusun Renja pemerintahan. Susun ulang bagian "${activeBab.judul_bab}" dari Draft Renja Sekretariat Daerah Provinsi Sumatera Barat Tahun ${draft?.tahun || 2027}. Gunakan bahasa formal pemerintahan. Jika data tidak tersedia tulis [Data belum tersedia di sistem]. Cantumkan sumber data di akhir. Isi sebelumnya:\n\n${activeBab.isi_bab}`,
        { model: '@cf/qwen/qwen3-30b-a3b-fp8' }
      );
      setEditContent(result);
      setEditMode(true);
      toast.success('Regenerasi selesai — tinjau dan simpan jika sesuai');
    } catch (err) {
      toast.error('Gagal regenerasi: ' + err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleExportDOCX = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      const { saveAs } = await import('file-saver');
      const children = [];
      children.push(new Paragraph({ text: draft?.judul || 'Draft Renja Setda', heading: HeadingLevel.TITLE }));
      children.push(new Paragraph({ text: `Tahun ${draft?.tahun}`, heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph({ text: '' }));
      for (const bab of sidebarBabs) {
        children.push(new Paragraph({ text: bab.judul_bab, heading: HeadingLevel.HEADING_1 }));
        const paragraphs = (bab.isi_bab || '').split('\n').filter(Boolean);
        for (const p of paragraphs) {
          children.push(new Paragraph({ children: [new TextRun({ text: p })] }));
        }
        children.push(new Paragraph({ text: '' }));
      }
      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Draft_Renja_Setda_${draft?.tahun || ''}.docx`);
      toast.success('DOCX berhasil diexport');
    } catch (err) {
      toast.error('Gagal export DOCX: ' + err.message);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (!draft) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const draftStatus = STATUS_DRAFT_CFG[draft.status] || STATUS_DRAFT_CFG.draft_otomatis;
  const babStatus = activeBab ? (STATUS_BAB_CFG[activeBab.status_bab] || STATUS_BAB_CFG.draft_otomatis) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/penyusunan/riwayat">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">{draft.judul}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${draftStatus.cls}`}>{draftStatus.label}</span>
              <span className="text-xs text-muted-foreground">v{draft.versi} · Tahun {draft.tahun}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportDOCX} className="gap-1 text-xs">
            <Download className="w-3.5 h-3.5" /> DOCX
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1 text-xs">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          {draft.status !== 'final' && (
            <Button size="sm" onClick={() => saveDraft.mutate({ status: 'direview' })} className="gap-1 text-xs">
              <Send className="w-3.5 h-3.5" /> Ajukan Review
            </Button>
          )}
          {(user?.role === 'admin' || user?.role === 'kabag') && draft.status === 'direview' && (
            <Button size="sm" onClick={() => saveDraft.mutate({ status: 'final', validated_by: user?.full_name, validated_at: new Date().toISOString() })}
              className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700">
              <Star className="w-3.5 h-3.5" /> Finalisasi
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar navigasi BAB */}
        <div className="w-56 flex-shrink-0 border-r border-border bg-muted/20 overflow-y-auto p-3 space-y-1">
          {draft.ringkasan_eksekutif && (
            <button
              onClick={() => { setActiveBabId('ringkasan'); setEditContent(draft.ringkasan_eksekutif); setEditMode(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeBabId === 'ringkasan' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              📋 Ringkasan Eksekutif
            </button>
          )}
          {sidebarBabs.map(bab => {
            const cfg = STATUS_BAB_CFG[bab.status_bab] || STATUS_BAB_CFG.draft_otomatis;
            return (
              <button
                key={bab.id}
                onClick={() => setActiveBabId(bab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${activeBabId === bab.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                <p className="font-semibold">BAB {bab.nomor_bab}</p>
                <p className="truncate mt-0.5 opacity-80">{bab.judul_bab.replace(/^BAB \d+ /i, '')}</p>
                <span className={`inline-block text-[9px] px-1 rounded mt-1 ${activeBabId === bab.id ? 'bg-white/20 text-white' : cfg.cls}`}>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          {activeBab || activeBabId === 'ringkasan' ? (
            <div className="p-6 space-y-4 max-w-4xl">
              {/* BAB header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{activeBabId === 'ringkasan' ? 'Ringkasan Eksekutif' : activeBab?.judul_bab}</h2>
                  {babStatus && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${babStatus.cls}`}>{babStatus.label}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowSumber(!showSumber)} className="gap-1 text-xs">
                    {showSumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showSumber ? 'Sembunyikan' : 'Tampilkan'} Sumber
                  </Button>
                  {activeBabId !== 'ringkasan' && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleRegenerateBab} disabled={regenerating} className="gap-1 text-xs">
                        {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Regenerate
                      </Button>
                      <Button variant={editMode ? 'default' : 'outline'} size="sm" onClick={() => setEditMode(!editMode)} className="gap-1 text-xs">
                        {editMode ? <Save className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        {editMode ? 'Mode Preview' : 'Edit'}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Sumber data */}
              {showSumber && activeBab?.sumber_data?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  <p className="font-semibold flex items-center gap-1 mb-1.5"><Info className="w-3.5 h-3.5" /> Sumber Data Bagian Ini:</p>
                  <div className="flex flex-wrap gap-1">
                    {activeBab.sumber_data.map((s, i) => (
                      <span key={i} className="bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Peringatan data belum tervalidasi */}
              {activeBab?.status_bab === 'draft_otomatis' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <p>Bagian ini adalah <strong>draft otomatis dari AI</strong>. Verifikator wajib meninjau, mengedit, dan menyetujui sebelum dijadikan dokumen final.</p>
                </div>
              )}

              {/* Konten */}
              {editMode && activeBabId !== 'ringkasan' ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={25}
                    className="font-mono text-sm"
                    placeholder="Isi konten bab..."
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Catatan Verifikator</label>
                    <Textarea
                      value={editCatatan}
                      onChange={e => setEditCatatan(e.target.value)}
                      rows={3}
                      placeholder="Tambahkan catatan review..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveBab} disabled={saveBab.isPending} className="gap-1">
                      {saveBab.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Simpan Perubahan
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>Batal</Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none bg-white border border-border rounded-xl p-6">
                  <ReactMarkdown>{editContent || '*Konten belum tersedia*'}</ReactMarkdown>
                </div>
              )}

              {/* Aksi status BAB */}
              {activeBabId !== 'ringkasan' && !editMode && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Tandai status:</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => handleSetStatusBab('perlu_perbaikan')}>
                    Perlu Perbaikan
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => handleSetStatusBab('disetujui')}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Setujui
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/5" onClick={() => handleSetStatusBab('final')}>
                    <Star className="w-3 h-3 mr-1" /> Final
                  </Button>
                </div>
              )}

              {/* Catatan verifikator (read mode) */}
              {!editMode && activeBab?.catatan_verifikator && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                  <p className="font-semibold mb-1">Catatan Verifikator:</p>
                  <p>{activeBab.catatan_verifikator}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              Pilih BAB dari panel kiri untuk mulai mengedit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}