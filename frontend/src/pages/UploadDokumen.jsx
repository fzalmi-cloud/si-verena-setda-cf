import React, { useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useUpload } from '@/hooks/useUpload';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, FileSpreadsheet, FolderOpen, Info, CheckCircle2, Files, X, Loader2, Bot, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const jenisUtama = [
  { value: 'narasi_renja', label: 'Dokumen Narasi Renja', icon: FileText, subJenis: ['dokumen_narasi_word_pdf'] },
  { value: 'renja_biro', label: 'Renja Biro', icon: FileText, subJenis: ['dokumen_narasi_word_pdf'], runAI: true },
  { value: 'matriks_renja', label: 'Matriks Renja (Excel)', icon: FileSpreadsheet, subJenis: ['matriks_excel'] },
  { value: 'dokumen_pendukung', label: 'Dokumen Pendukung', icon: FolderOpen, subJenis: [
    'sk_tim_penyusun', 'bukti_orientasi', 'undangan_forum', 'berita_acara_forum',
    'notulen_rapat', 'dokumentasi_kegiatan', 'hasil_input_sipd',
    'tabel_tc29', 'tabel_tc30', 'tabel_tc31', 'tabel_tc32', 'tabel_tc33', 'lainnya'
  ]},
  { value: 'checklist_verifikasi', label: 'Checklist Verifikasi Bappeda', icon: CheckCircle2, subJenis: ['checklist_bappeda'] },
];

const subJenisLabels = {
  dokumen_narasi_word_pdf: 'Dokumen Narasi (Word/PDF)',
  matriks_excel: 'Matriks Program/Kegiatan/Subkegiatan',
  sk_tim_penyusun: 'SK Tim Penyusun Renja',
  bukti_orientasi: 'Bukti Pelaksanaan Orientasi',
  undangan_forum: 'Undangan Forum Perangkat Daerah',
  berita_acara_forum: 'Berita Acara Forum Perangkat Daerah',
  notulen_rapat: 'Notulen Rapat',
  dokumentasi_kegiatan: 'Dokumentasi Kegiatan',
  hasil_input_sipd: 'Hasil Input SIPD',
  tabel_tc29: 'Tabel T-C.29', tabel_tc30: 'Tabel T-C.30',
  tabel_tc31: 'Tabel T-C.31', tabel_tc32: 'Tabel T-C.32', tabel_tc33: 'Tabel T-C.33',
  checklist_bappeda: 'Checklist Bappeda',
  lainnya: 'Lainnya',
};

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx';
const MAX_MB = 50;

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadDokumen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { uploadMultiple, uploading, progress } = useUpload();

  const [selectedBiro, setSelectedBiro] = useState('');
  const [tahun, setTahun] = useState('2027');
  const [jenisDoc, setJenisDoc] = useState('');
  const [subJenis, setSubJenis] = useState('');
  const [catatan, setCatatan] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // { file, name, size }
  const [runAI, setRunAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({}); // name -> 'ok' | 'error'
  const [aiRunning, setAiRunning] = useState(0);

  const { data: biroList = [] } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => api.list("biro"),
  });

  const currentJenis = jenisUtama.find(j => j.value === jenisDoc);

  const addFiles = (fileList) => {
    const list = Array.from(fileList || []);
    const valid = [];
    const skipped = [];
    for (const f of list) {
      if (f.size > MAX_MB * 1024 * 1024) { skipped.push(`${f.name} (>${MAX_MB}MB)`); continue; }
      if (selectedFiles.some(s => s.name === f.name)) { skipped.push(`${f.name} (sudah dipilih)`); continue; }
      valid.push({ file: f, name: f.name, size: f.size });
    }
    if (skipped.length > 0) toast.warning('Dilewati: ' + skipped.join(', '));
    if (valid.length > 0) setSelectedFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (name) => {
    setSelectedFiles(prev => prev.filter(s => s.name !== name));
    setUploadStatus(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleUpload = async () => {
    if (!selectedBiro || !jenisDoc) { toast.error('Lengkapi biro dan jenis dokumen'); return; }
    if (selectedFiles.length === 0) { toast.error('Pilih minimal 1 file'); return; }

    setSaving(true);
    setUploadStatus({});
    const byName = {};
    selectedFiles.forEach(s => { byName[s.name] = s.file; });

    try {
      // 1. Upload SEMUA file ke R2 (satu request /api/upload/multiple)
      const result = await uploadMultiple(selectedFiles.map(s => s.file), 'dokumen');
      const uploaded = result.uploaded || [];

      const statusMap = {};
      uploaded.forEach(f => { statusMap[f.nama_file || f.file_key] = 'ok'; });
      (result.errors || []).forEach(e => { statusMap[e.filename] = 'error'; });
      setUploadStatus(statusMap);

      // 2. Bulk create record dokumen
      const items = uploaded.map(f => ({
        nama_biro: selectedBiro,
        periode_tahun: parseInt(tahun),
        jenis_dokumen: jenisDoc,
        sub_jenis: subJenis || undefined,
        level_unit: 'biro',
        nama_file: f.nama_file,
        file_url: f.file_url,
        file_key: f.file_key,
        file_size: f.file_size || 0,
        catatan_upload: catatan || undefined,
        status_upload: 'diunggah',
      }));

      let ids = [];
      if (items.length > 0) {
        const res = await api.bulkCreate('dokumenrenja', items);
        ids = res.ids || [];
      }

      queryClient.invalidateQueries({ queryKey: ['dokumen-renja'] });
      queryClient.invalidateQueries({ queryKey: ['dokumen-renja-all'] });

      const errCount = (result.errors || []).length;
      const msg = `${ids.length} dokumen berhasil diunggah${errCount ? `, ${errCount} gagal` : ''}`;
      if (errCount > 0) toast.warning(msg + ': ' + result.errors.map(e => e.filename).join(', '));
      else toast.success(msg);

      // 3. Opsional: jalankan AI untuk dokumen narasi
      if (runAI && currentJenis?.runAI && ids.length > 0) {
        setAiRunning(ids.length);
        toast.info(`Memulai pemeriksaan AI untuk ${ids.length} dokumen...`);
        for (const id of ids) {
          try {
            await api.request('/api/llm/auto-verifikasi', {
              method: 'POST',
              body: JSON.stringify({ dokumen_id: id, nama_biro: selectedBiro, periode_tahun: parseInt(tahun) }),
            });
          } catch (e) { /* lanjut ke berikutnya */ }
          setAiRunning(n => Math.max(0, n - 1));
        }
        toast.success('Pemeriksaan AI dijalankan di background untuk semua dokumen.');
      }

      // Reset form jika semua sukses
      if (errCount === 0) {
        setSelectedFiles([]);
        setSubJenis('');
        setCatatan('');
        setRunAI(false);
      }
    } catch (err) {
      toast.error('Upload batch gagal: ' + err.message);
      const n = {};
      selectedFiles.forEach(s => { n[s.name] = 'error'; });
      setUploadStatus(n);
    } finally {
      setSaving(false);
      setAiRunning(0);
    }
  };

  // Existing uploads
  const { data: existingDocs = [] } = useQuery({
    queryKey: ['dokumen-renja', selectedBiro],
    queryFn: () => selectedBiro
      ? api.list("dokumenrenja", { limit: 50 })
      : [],
    enabled: !!selectedBiro,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Upload Dokumen Renja</h1>
        <p className="text-sm text-muted-foreground mt-1">Unggah banyak dokumen sekaligus (batch) — narasi, matriks, dan pendukung Renja</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Form Upload (Batch)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biro *</label>
                  <Select value={selectedBiro} onValueChange={setSelectedBiro}>
                    <SelectTrigger><SelectValue placeholder="Pilih biro" /></SelectTrigger>
                    <SelectContent>
                      {biroList.map(b => (
                        <SelectItem key={b.id} value={b.nama_biro}>{b.nama_biro}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tahun Renja *</label>
                  <Select value={tahun} onValueChange={setTahun}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Jenis Dokumen * <span className="text-xs">(berlaku untuk semua file)</span></label>
                <Select value={jenisDoc} onValueChange={(v) => { setJenisDoc(v); setSubJenis(''); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis dokumen" /></SelectTrigger>
                  <SelectContent>
                    {jenisUtama.map(j => (
                      <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentJenis && currentJenis.subJenis.length > 1 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sub Jenis <span className="text-xs">(berlaku untuk semua file)</span></label>
                  <Select value={subJenis} onValueChange={setSubJenis}>
                    <SelectTrigger><SelectValue placeholder="Pilih sub jenis" /></SelectTrigger>
                    <SelectContent>
                      {currentJenis.subJenis.map(s => (
                        <SelectItem key={s} value={s}>{subJenisLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Batch file picker */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  File Dokumen * <span className="text-xs">(bisa pilih banyak sekaligus)</span>
                </label>
                <label className="flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    accept={ACCEPTED}
                    multiple
                    onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
                  />
                  <Files className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Pilih satu atau beberapa file (PDF, Word, Excel)</span>
                </label>

                {selectedFiles.length > 0 && (
                  <div className="space-y-1.5 mt-2 max-h-48 overflow-y-auto">
                    {selectedFiles.map(s => {
                      const st = uploadStatus[s.name];
                      return (
                        <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg border border-border text-xs">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1 truncate">{s.name}</span>
                          <span className="text-muted-foreground flex-shrink-0">{formatSize(s.size)}</span>
                          {st === 'ok' && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                          {st === 'error' && <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />}
                          {saving && !st && <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />}
                          {!saving && (
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(s.name)}>
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {saving && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>

              {/* Opsi AI */}
              {currentJenis?.runAI && (
                <label className="flex items-center gap-2 p-3 rounded-lg border border-border text-sm cursor-pointer hover:bg-muted/20">
                  <input type="checkbox" checked={runAI} onChange={e => setRunAI(e.target.checked)} className="rounded" />
                  <Bot className="w-4 h-4 text-primary" />
                  <span>Jalankan <strong>Pemeriksaan AI</strong> otomatis setelah upload (untuk dokumen narasi)</span>
                </label>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Catatan (opsional, berlaku untuk semua)</label>
                <Textarea
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  placeholder="Contoh: Batch upload Januari 2027..."
                  rows={2}
                />
              </div>

              <Button onClick={handleUpload} disabled={saving || selectedFiles.length === 0} className="w-full">
                {saving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{aiRunning > 0 ? `Menjalankan AI... (${aiRunning} tersisa)` : 'Mengunggah...'}</>
                  : <><Upload className="w-4 h-4 mr-2" />Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File` : ''}</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Existing docs sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                Dokumen Terunggah
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedBiro ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Info className="w-4 h-4" />
                  <span>Pilih biro terlebih dahulu</span>
                </div>
              ) : existingDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Belum ada dokumen</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {existingDocs.map(doc => (
                    <div key={doc.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50">
                      <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{doc.nama_file || doc.jenis_dokumen}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {doc.jenis_dokumen?.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">v{doc.versi || 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
