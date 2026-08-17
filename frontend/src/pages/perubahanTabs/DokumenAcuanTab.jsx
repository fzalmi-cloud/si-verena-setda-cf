import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { useUpload } from '@/hooks/useUpload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookOpen, Plus, Trash2, Upload, Loader2, CheckCircle2, X, Star, Power, ExternalLink } from 'lucide-react';
import { getFileUrl } from '@/lib/utils';
import { toast } from 'sonner';

const JENIS_OPTIONS = [
  { value: 'permendagri_86_2017', label: 'Permendagri 86 Tahun 2017', priority: 3 },
  { value: 'perubahan_rkpd', label: 'Perubahan RKPD', priority: 1 },
  { value: 'rancangan_perubahan_rkpd', label: 'Rancangan Perubahan RKPD', priority: 2 },
  { value: 'surat_edaran', label: 'Surat Edaran / Pedoman', priority: 2 },
  { value: 'renstra_setda', label: 'Renstra Setda', priority: 4 },
  { value: 'renja_murni', label: 'Renja Murni', priority: 4 },
  { value: 'evaluasi_tw2', label: 'Evaluasi Renja s.d. Triwulan II', priority: 4 },
  { value: 'checklist_bappeda', label: 'Checklist Verifikasi Bappeda', priority: 2 },
  { value: 'template', label: 'Format / Template Renja Perubahan', priority: 2 },
  { value: 'nomenklatur', label: 'Data Program/Kegiatan/Subkegiatan', priority: 4 },
  { value: 'lainnya', label: 'Dokumen Pendukung Lainnya', priority: 4 },
];

export default function DokumenAcuanTab({ tahun, refreshKey, canManage }) {
  const { user } = useAuth();
  const { upload, uploading } = useUpload();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ document_type: 'permendagri_86_2017', title: '', version: '1', priority: '3', keterangan: '' });
  const [uploaded, setUploaded] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.list('perubahan/references', { year: parseInt(tahun), limit: 200 })
      .then(resp => setList(Array.isArray(resp?.data) ? resp.data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [tahun, refreshKey]);

  const handleFile = async (f) => {
    try {
      const res = await upload(f, 'rp_referensi');
      setUploaded({ name: res.nama_file || f.name, url: res.file_url, key: res.file_key });
      if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') }));
    } catch { toast.error('Gagal mengunggah file'); }
  };

  const save = async () => {
    if (!form.title || !uploaded) { toast.error('Judul dan file wajib diisi'); return; }
    setBusy(true);
    try {
      const prio = Number(form.priority) || 3;
      await api.create('perubahan/references', {
        year: parseInt(tahun), document_type: form.document_type, title: form.title,
        nama_file: uploaded.name, file_url: uploaded.url, file_key: uploaded.key,
        version: form.version || '1', priority: prio, active: true, keterangan: form.keterangan || undefined,
      });
      toast.success('Dokumen acuan ditambahkan');
      setShowDialog(false);
      setForm({ document_type: 'permendagri_86_2017', title: '', version: '1', priority: String(prio), keterangan: '' });
      setUploaded(null);
      load();
    } catch (err) { toast.error('Gagal: ' + err.message); } finally { setBusy(false); }
  };

  const toggleActive = async (r) => {
    try { await api.update('perubahan/references', r.id, { active: !r.active }); load(); }
    catch (err) { toast.error(err.message); }
  };
  const togglePrimary = async (r) => {
    try { await api.update('perubahan/references', r.id, { priority: r.priority === 1 ? 3 : 1 }); load(); }
    catch (err) { toast.error(err.message); }
  };
  const del = async () => {
    setBusy(true);
    try { await api.delete('perubahan/references', deleteTarget.id); toast.success('Dihapus'); setDeleteTarget(null); load(); }
    catch (err) { toast.error('Gagal: ' + err.message); setDeleteTarget(null); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-display font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Dokumen Acuan Renja Perubahan</h2>
          <p className="text-xs text-muted-foreground mt-1">Sistem hanya menggunakan dokumen berstatus <strong>AKTIF</strong> sebagai referensi pemeriksaan. Prioritas 1 = tertinggi.</p>
        </div>
        {canManage && <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Upload Dokumen Acuan</Button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada dokumen acuan</p>
          <p className="text-xs mt-1">Upload Permendagri 86/2017, Perubahan RKPD, SE Gubernur, dll.</p>
          {canManage && <Button className="mt-4" onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Upload Pertama</Button>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-xs text-muted-foreground border-b border-border">
                  <th className="px-3 py-2.5 font-medium">No</th>
                  <th className="px-3 py-2.5 font-medium">Jenis Dokumen</th>
                  <th className="px-3 py-2.5 font-medium">Nama Dokumen</th>
                  <th className="px-3 py-2.5 font-medium text-center">Tahun</th>
                  <th className="px-3 py-2.5 font-medium text-center">Versi</th>
                  <th className="px-3 py-2.5 font-medium text-center">Prioritas</th>
                  <th className="px-3 py-2.5 font-medium text-center">Status</th>
                  <th className="px-3 py-2.5 font-medium">Tanggal Upload</th>
                  <th className="px-3 py-2.5 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((r, i) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5 text-xs">{JENIS_OPTIONS.find(j => j.value === r.document_type)?.label || r.document_type}</td>
                    <td className="px-3 py-2.5 text-xs font-medium max-w-[220px] truncate">{r.title}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{r.year}</td>
                    <td className="px-3 py-2.5 text-center text-xs">v{r.version}</td>
                    <td className="px-3 py-2.5 text-center text-xs">
                      {r.priority === 1 ? <Star className="w-3.5 h-3.5 text-amber-500 inline" /> : null} P{r.priority}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant="outline" className={`text-[10px] ${r.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                        {r.active ? 'AKTIF' : 'TIDAK AKTIF'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.created_at ? r.created_at.slice(0, 10) : '-'}</td>
                    <td className="px-3 py-2.5">
                      {canManage ? (
                        <div className="flex items-center justify-end gap-1">
                          {r.file_url && <a href={getFileUrl(r.file_url)} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-6 w-6"><ExternalLink className="w-3 h-3" /></Button></a>}
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => toggleActive(r)}>
                            <Power className="w-3 h-3 mr-1" /> {r.active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => togglePrimary(r)}>
                            <Star className="w-3 h-3 mr-1" /> {r.priority === 1 ? 'Turun Prioritas' : 'Jadikan Utama'}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget(r)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <div className="flex justify-end">{r.file_url && <a href={getFileUrl(r.file_url)} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-6 w-6"><ExternalLink className="w-3 h-3" /></Button></a>}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog upload */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Upload Dokumen Acuan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Jenis Dokumen</label>
              <Select value={form.document_type} onValueChange={v => setForm(p => ({ ...p, document_type: v, priority: String(JENIS_OPTIONS.find(j => j.value === v)?.priority || 3) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JENIS_OPTIONS.map(j => <SelectItem key={j.value} value={j.value}>{j.label} (P{j.priority})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nama Dokumen *</label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Contoh: Permendagri Nomor 86 Tahun 2017" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Versi</label>
                <Input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Prioritas</label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">P1 — Peraturan Kepala Daerah</SelectItem>
                    <SelectItem value="2">P2 — SE / Rancangan RKPD / Checklist</SelectItem>
                    <SelectItem value="3">P3 — Permendagri 86/2017</SelectItem>
                    <SelectItem value="4">P4 — Renstra / Renja Murni / Evaluasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Keterangan (opsional)</label>
              <Input value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">File *</label>
              {uploaded ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="flex-1 truncate">{uploaded.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setUploaded(null)}><X className="w-3 h-3" /></Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 text-xs text-muted-foreground">
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Mengunggah...' : 'Pilih file (PDF, DOCX, XLSX, CSV)'}
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={save} disabled={busy || uploading}>{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Dokumen Acuan?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.title}" akan dihapus dan tidak lagi digunakan AI sebagai acuan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={del} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
