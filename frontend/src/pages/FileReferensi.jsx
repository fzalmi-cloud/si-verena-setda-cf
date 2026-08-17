import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useUpload } from '@/hooks/useUpload';
import { getFileUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookOpen, Plus, Trash2, FileText, Upload, Loader2, CheckCircle2, X, AlertCircle, ExternalLink, Files, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CatatanBappedaSection from '@/components/verifikasi/CatatanBappedaSection';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const JENIS_LABELS = {
  pedoman_renja: { label: 'Pedoman Renja', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  peraturan: { label: 'Peraturan', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  checklist_bappeda: { label: 'Checklist Bappeda', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  contoh_dokumen: { label: 'Contoh Dokumen', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  lainnya: { label: 'Lainnya', color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const MAX_FILE_MB = 50;
const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx';

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function autoJudul(namaFile) {
  return (namaFile || '').replace(/\.[^.]+$/, '').trim() || 'Dokumen Referensi';
}

export default function FileReferensi() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { uploadMultiple, uploading, progress } = useUpload();

  const [showDialog, setShowDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]); // { file, name, size }
  const [batchJenis, setBatchJenis] = useState('pedoman_renja');
  const [batchDeskripsi, setBatchDeskripsi] = useState('');
  const [uploadingNow, setUploadingNow] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({}); // name -> 'ok' | 'error'

  const { data: fileRefResponse = { data: [] }, isLoading } = useQuery({
    queryKey: ['file-referensi'],
    queryFn: () => api.list('file-ref', { aktif: 'true', limit: 100 }),
  });
  const files = fileRefResponse.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete("file-ref", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-referensi'] });
      toast.success('File referensi dihapus');
      setDeleteTarget(null);
    },
  });

  const addFiles = (fileList) => {
    const list = Array.from(fileList || []);
    const valid = [];
    const skipped = [];
    for (const f of list) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        skipped.push(`${f.name} (>${MAX_FILE_MB}MB)`);
        continue;
      }
      // Hindari duplikat nama yang sudah dipilih
      if (selectedFiles.some(s => s.name === f.name)) {
        skipped.push(`${f.name} (sudah dipilih)`);
        continue;
      }
      valid.push({ file: f, name: f.name, size: f.size });
    }
    if (skipped.length > 0) toast.warning('Dilewati: ' + skipped.join(', '));
    if (valid.length > 0) setSelectedFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (name) => {
    setSelectedFiles(prev => prev.filter(s => s.name !== name));
    setUploadStatus(prev => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) { toast.error('Pilih minimal 1 file terlebih dahulu'); return; }
    setUploadingNow(true);
    setUploadStatus({});
    const byName = {};
    selectedFiles.forEach(s => { byName[s.name] = s.file; });

    try {
      // 1. Upload semua file ke R2 (satu request /api/upload/multiple)
      const result = await uploadMultiple(selectedFiles.map(s => s.file), 'referensi');
      const uploaded = result.uploaded || [];

      // Tandai status per file
      const statusMap = {};
      uploaded.forEach(f => { statusMap[f.nama_file || f.file_key] = 'ok'; });
      (result.errors || []).forEach(e => { statusMap[e.filename] = 'error'; });
      setUploadStatus(statusMap);

      // 2. Bulk create record file-referensi (hanya yang berhasil upload)
      const items = uploaded.map(f => ({
        judul: autoJudul(f.nama_file),
        deskripsi: batchDeskripsi || undefined,
        jenis: batchJenis,
        nama_file: f.nama_file,
        file_url: f.file_url,
        file_key: f.file_key,
        diunggah_oleh: user?.full_name || user?.email || undefined,
        aktif: true,
      }));

      if (items.length > 0) {
        await api.bulkCreate('file-ref', items);
      }

      queryClient.invalidateQueries({ queryKey: ['file-referensi'] });

      const errCount = (result.errors || []).length;
      if (errCount > 0) {
        toast.warning(`${items.length} file berhasil ditambahkan, ${errCount} gagal: ${result.errors.map(e => e.filename).join(', ')}`);
      } else {
        toast.success(`${items.length} file referensi berhasil ditambahkan`);
      }

      if (errCount === 0) {
        // Semua sukses -> tutup dialog & reset
        setShowDialog(false);
        setSelectedFiles([]);
        setBatchDeskripsi('');
      }
    } catch (err) {
      toast.error('Upload batch gagal: ' + err.message);
      setUploadStatus(prev => {
        const n = {};
        selectedFiles.forEach(s => { n[s.name] = 'error'; });
        return n;
      });
    } finally {
      setUploadingNow(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">File Referensi AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola file pedoman, peraturan, dan catatan verifikasi yang menjadi acuan. Hanya dapat diakses administrator.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Referensi
        </Button>
      </div>

      <Tabs defaultValue="files">
        <TabsList className="bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="files" className="text-xs px-4 py-1.5 data-[state=active]:bg-card">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> File Referensi
          </TabsTrigger>
          <TabsTrigger value="bappeda" className="text-xs px-4 py-1.5 data-[state=active]:bg-card">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Catatan Bappeda
            <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">pelengkap</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-4 space-y-4">

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <BookOpen className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-semibold">Cara kerja file referensi</p>
          <p className="text-xs mt-1 text-blue-700">
            File yang diunggah di sini akan dibaca oleh sistem AI sebelum memeriksa dokumen Renja dari biro. 
            AI akan menggunakan file ini sebagai pedoman/standar acuan untuk menilai kesesuaian dokumen. 
            Bisa upload <strong>banyak file sekaligus</strong> (batch).
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada file referensi</p>
          <p className="text-xs mt-1">Tambahkan pedoman, peraturan, atau checklist Bappeda sebagai acuan AI</p>
          <Button className="mt-4" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Referensi Pertama
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {files.map(f => {
            const jenisConfig = JENIS_LABELS[f.jenis] || JENIS_LABELS.lainnya;
            return (
              <div key={f.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{f.judul}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${jenisConfig.color}`}>
                      {jenisConfig.label}
                    </span>
                    {!f.aktif && <span className="text-xs text-muted-foreground">(nonaktif)</span>}
                  </div>
                  {f.deskripsi && <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.deskripsi}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{f.nama_file}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={getFileUrl(f.file_url)} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(f)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Tambah (Batch) */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open && !uploadingNow) {
          setShowDialog(false);
          setSelectedFiles([]);
          setBatchDeskripsi('');
          setUploadStatus({});
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambahkan File Referensi (Batch)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Drop zone / pilih file */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">File <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground"> (bisa pilih banyak sekaligus)</span>
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
                        {uploadingNow && !st && <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />}
                        {!uploadingNow && (
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(s.name)}>
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {uploadingNow && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>

            {/* Jenis (berlaku untuk semua file) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jenis <span className="text-xs text-muted-foreground">(berlaku untuk semua file)</span></label>
              <Select value={batchJenis} onValueChange={setBatchJenis}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JENIS_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deskripsi global opsional */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Deskripsi <span className="text-xs text-muted-foreground">(opsional, berlaku untuk semua file)</span></label>
              <Textarea value={batchDeskripsi} onChange={e => setBatchDeskripsi(e.target.value)} rows={2} placeholder="Contoh: Pedoman resmi yang digunakan sebagai acuan pemeriksaan" />
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Judul otomatis diambil dari nama file. Maksimal {MAX_FILE_MB} MB per file.</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={uploadingNow}>Batal</Button>
            <Button onClick={handleUpload} disabled={uploadingNow || selectedFiles.length === 0}>
              {uploadingNow ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploadingNow ? `Mengunggah ${selectedFiles.length} file...` : `Upload ${selectedFiles.length || ''} File`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus File Referensi?</AlertDialogTitle>
            <AlertDialogDescription>
              "<strong>{deleteTarget?.judul}</strong>" akan dihapus dan tidak lagi digunakan AI sebagai acuan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        <TabsContent value="bappeda" className="mt-4">
          <CatatanBappedaSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
