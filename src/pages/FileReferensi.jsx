import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookOpen, Plus, Trash2, FileText, Upload, Loader2, CheckCircle2, X, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const JENIS_LABELS = {
  pedoman_renja: { label: 'Pedoman Renja', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  peraturan: { label: 'Peraturan', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  checklist_bappeda: { label: 'Checklist Bappeda', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  contoh_dokumen: { label: 'Contoh Dokumen', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  lainnya: { label: 'Lainnya', color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export default function FileReferensi() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [form, setForm] = useState({ judul: '', deskripsi: '', jenis: 'pedoman_renja' });

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['file-referensi'],
    queryFn: () => base44.entities.FileReferensi.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FileReferensi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-referensi'] });
      toast.success('File referensi berhasil ditambahkan');
      setShowDialog(false);
      setForm({ judul: '', deskripsi: '', jenis: 'pedoman_renja' });
      setUploadedFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FileReferensi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-referensi'] });
      toast.success('File referensi dihapus');
      setDeleteTarget(null);
    },
  });

  const handleFileSelect = async (f) => {
    if (f.size > 50 * 1024 * 1024) { toast.error('Ukuran file maksimal 50 MB'); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setUploadedFile({ name: f.name, url: file_url, size: f.size });
      if (!form.judul) setForm(p => ({ ...p, judul: f.name.replace(/\.[^.]+$/, '') }));
    } catch {
      toast.error('Gagal mengunggah file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.judul) { toast.error('Judul wajib diisi'); return; }
    if (!uploadedFile) { toast.error('Pilih file terlebih dahulu'); return; }
    createMutation.mutate({
      ...form,
      nama_file: uploadedFile.name,
      file_url: uploadedFile.url,
      aktif: true,
    });
  };

  const formatSize = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">File Referensi AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola file pedoman dan referensi yang digunakan AI untuk memeriksa dokumen Renja. Hanya dapat diakses administrator.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Referensi
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <BookOpen className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-semibold">Cara kerja file referensi</p>
          <p className="text-xs mt-1 text-blue-700">
            File yang diunggah di sini akan dibaca oleh sistem AI sebelum memeriksa dokumen Renja dari biro. 
            AI akan menggunakan file ini sebagai pedoman/standar acuan untuk menilai kesesuaian dokumen.
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
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer">
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

      {/* Dialog Tambah */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah File Referensi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Judul Referensi <span className="text-destructive">*</span></label>
              <Input value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))} placeholder="Contoh: Permendagri No. 86 Tahun 2017" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jenis</label>
              <Select value={form.jenis} onValueChange={v => setForm(p => ({ ...p, jenis: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JENIS_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Deskripsi <span className="text-xs text-muted-foreground">(opsional)</span></label>
              <Textarea value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} rows={2} placeholder="Ringkasan isi referensi..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">File <span className="text-destructive">*</span></label>
              {uploadedFile ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-success/40 bg-success/5">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setUploadedFile(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xlsx,.xls" onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])} />
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{uploading ? 'Mengunggah...' : 'Pilih file (PDF, Word, Excel)'}</span>
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || uploading}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Simpan
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
    </div>
  );
}