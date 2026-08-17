import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { useUpload } from '@/hooks/useUpload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, Loader2, CheckCircle2, X, AlertCircle, FileText, History, ExternalLink, Bot } from 'lucide-react';
import { getFileUrl } from '@/lib/utils';
import { toast } from 'sonner';
import TahunSelect from '@/components/TahunSelect';

const STAGE_OPTIONS = [
  { value: 'rancangan_perubahan', label: 'Rancangan Perubahan Renja' },
  { value: 'rancangan_akhir', label: 'Rancangan Akhir Perubahan Renja' },
  { value: 'dokumen_final', label: 'Renja Perubahan Final' },
];

async function computeChecksum(file) {
  if (!file) return '';
  try {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch { return `${file.name}|${file.size}`; }
}

export default function UploadTab({ tahun, refreshKey, role, biroSaya, isAdminLike, initialBiro = '' }) {
  const { user } = useAuth();
  const { upload, uploading } = useUpload();
  const [biroList, setBiroList] = useState([]);
  const [selectedBiro, setSelectedBiro] = useState(role?.startsWith('biro_') ? biroSaya : initialBiro);
  const [tahunState, setTahunState] = useState(tahun);
  const [stage, setStage] = useState('rancangan_perubahan');
  const [tanggalDokumen, setTanggalDokumen] = useState('');
  const [namaPenyusun, setNamaPenyusun] = useState('');
  const [pejabatPJ, setPejabatPJ] = useState('');
  const [catatan, setCatatan] = useState('');
  const [mainFile, setMainFile] = useState(null);
  const [lampiran, setLampiran] = useState([]);
  const [versions, setVersions] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [riwayatOpen, setRiwayatOpen] = useState(false);

  useEffect(() => {
    api.list('biro').then(r => setBiroList(Array.isArray(r?.data) ? r.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialBiro && !role?.startsWith('biro_')) setSelectedBiro(initialBiro);
  }, [initialBiro]);

  // Sinkronkan tahun dengan header halaman (hindari mismatch tahun antar-tab)
  useEffect(() => { setTahunState(tahun); }, [tahun]);

  useEffect(() => {
    if (!selectedBiro) { setSubmission(null); setVersions([]); return; }
    api.list('perubahan/submissions', { year: parseInt(tahunState), nama_biro: selectedBiro })
      .then(r => {
        const subs = Array.isArray(r?.data) ? r.data : [];
        const sub = subs[0] || null;
        setSubmission(sub);
        if (sub) {
          return api.list('perubahan/versions', { submission_id: sub.id });
        }
        return { data: [] };
      })
      .then(vr => setVersions(Array.isArray(vr?.data) ? vr.data : []))
      .catch(() => { setVersions([]); });
  }, [selectedBiro, tahunState, refreshKey]);

  const handleMainFile = async (f) => {
    try {
      const res = await upload(f, 'rp_dokumen');
      setMainFile({ file: f, name: res.nama_file || f.name, url: res.file_url, key: res.file_key });
    } catch { toast.error('Gagal mengunggah file'); }
  };

  const handleLampiran = async (files) => {
    for (const f of Array.from(files || [])) {
      try {
        const res = await upload(f, 'rp_lampiran');
        setLampiran(prev => [...prev, { name: res.nama_file || f.name, url: res.file_url, key: res.file_key }]);
      } catch { toast.error('Gagal lampiran: ' + f.name); }
    }
  };

  const submit = async () => {
    if (!selectedBiro) { toast.error('Pilih biro'); return; }
    if (!mainFile) { toast.error('File dokumen utama wajib'); return; }
    setBusy(true);
    setChecking(true);
    try {
      const checksum = await computeChecksum(mainFile.file);
      let sub = submission;
      if (!sub) {
        const resp = await api.create('perubahan/submissions', { nama_biro: selectedBiro, year: parseInt(tahunState), stage });
        sub = resp;
      }
      const resp = await api.request('/api/perubahan/versions', {
        method: 'POST',
        body: JSON.stringify({
          submission_id: sub.id,
          main_file_url: mainFile.url,
          main_file_name: mainFile.name,
          lampiran: lampiran,
          checksum,
          stage,
          tanggal_dokumen: tanggalDokumen || undefined,
          nama_penyusun: namaPenyusun || undefined,
          pejabat_penanggung_jawab: pejabatPJ || undefined,
          catatan: catatan || undefined,
        }),
      });
      if (resp?.warning) {
        toast.warning(resp.warning);
      } else {
        toast.success(`Dokumen V${resp.version_number} berhasil diunggah (${resp.nomor_registrasi})`);
      }
      setMainFile(null); setCatatan(''); setTanggalDokumen(''); setNamaPenyusun(''); setPejabatPJ(''); setLampiran([]);
      const vr = await api.list('perubahan/versions', { submission_id: sub.id });
      setVersions(Array.isArray(vr?.data) ? vr.data : []);
    } catch (err) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setBusy(false); setChecking(false);
    }
  };

  // Hapus versi yang salah upload (versi, temuan, program, file R2 ikut dihapus)
  const handleDeleteVersion = async () => {
    if (!deleteVersion) return;
    setDelBusy(true);
    try {
      const resp = await api.delete('perubahan/versions', deleteVersion.id);
      toast.success(resp.message || `Versi V${deleteVersion.version_number} dihapus`);
      setDeleteVersion(null);
      if (selectedBiro) {
        const sr = await api.list('perubahan/submissions', { year: parseInt(tahunState), nama_biro: selectedBiro });
        const sub2 = (Array.isArray(sr?.data) ? sr.data : [])[0] || null;
        setSubmission(sub2);
        if (sub2) {
          const vr = await api.list('perubahan/versions', { submission_id: sub2.id });
          setVersions(Array.isArray(vr?.data) ? vr.data : []);
        } else setVersions([]);
      }
    } catch (err) {
      toast.error('Gagal hapus versi: ' + err.message);
    } finally { setDelBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Form upload */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4 text-primary" /> Upload Renja Perubahan Biro</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tahun *</label>
                <TahunSelect value={tahunState} onValueChange={setTahunState} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama Biro *</label>
                <Select value={selectedBiro} onValueChange={setSelectedBiro} disabled={role?.startsWith('biro_')}>
                  <SelectTrigger><SelectValue placeholder="Pilih biro" /></SelectTrigger>
                  <SelectContent>
                    {biroList.map(b => <SelectItem key={b.id} value={b.nama_biro}>{b.nama_biro}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Jenis Dokumen / Tahap *</label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tanggal Dokumen</label>
                <Input type="date" value={tanggalDokumen} onChange={e => setTanggalDokumen(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama Penyusun</label>
                <Input value={namaPenyusun} onChange={e => setNamaPenyusun(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Pejabat Penanggung Jawab</label>
                <Input value={pejabatPJ} onChange={e => setPejabatPJ(e.target.value)} />
              </div>
            </div>

            {/* File utama */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dokumen Utama * (DOCX/PDF)</label>
              {mainFile ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="flex-1 truncate">{mainFile.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMainFile(null)}><X className="w-3 h-3" /></Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 text-xs text-muted-foreground">
                  <input type="file" className="hidden" accept=".docx,.pdf" onChange={e => e.target.files[0] && handleMainFile(e.target.files[0])} />
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Mengunggah...' : 'Pilih file utama (DOCX / PDF)'}
                </label>
              )}
            </div>

            {/* Lampiran */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Lampiran (opsional — DOCX, PDF, XLSX)</label>
              <label className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 text-xs text-muted-foreground">
                <input type="file" className="hidden" multiple accept=".docx,.pdf,.xlsx,.xls" onChange={e => handleLampiran(e.target.files)} />
                <Upload className="w-3.5 h-3.5" /> Tambah lampiran
              </label>
              {lampiran.length > 0 && (
                <div className="space-y-1">
                  {lampiran.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border text-xs">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 truncate">{l.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLampiran(prev => prev.filter((_, x) => x !== i))}><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Catatan (opsional)</label>
              <Textarea rows={2} value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Contoh: V1 — Upload awal..." />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={submit} disabled={busy || uploading || !selectedBiro || !mainFile} className="flex-1">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {busy ? (checking ? 'Memeriksa duplikat...' : 'Menyimpan...') : `Upload V${(submission?.current_version || 0) + 1}`}
              </Button>
              <Button variant="outline" onClick={() => setRiwayatOpen(true)} disabled={versions.length === 0}>
                <History className="w-4 h-4 mr-1" /> Riwayat ({versions.length})
              </Button>
            </div>
            {submission && <p className="text-xs text-muted-foreground">Versi Aktif: <strong>V{submission.current_version}</strong> · Status: {submission.status}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Riwayat versi */}
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Riwayat Versi {selectedBiro ? `— ${selectedBiro}` : ''}</CardTitle></CardHeader>
          <CardContent>
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada versi. Setiap upload membuat versi baru (V1, V2, dst.) tanpa menimpa file lama.</p>
            ) : (
              <div className="space-y-2">
                {versions.map(v => (
                  <div key={v.id} className="p-3 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">V{v.version_number}</span>
                      <Badge variant="outline" className="text-[10px]">{v.extraction_status}</Badge>
                    </div>
                    <p className="text-xs mt-1 truncate">{v.main_file_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{v.nomor_registrasi}</p>
                    <p className="text-[10px] text-muted-foreground">oleh {v.uploaded_by || '-'} · {v.created_at ? v.created_at.slice(0, 16) : ''}</p>
                    {v.catatan && <p className="text-[10px] mt-1">{v.catatan}</p>}
                    <div className="flex items-center gap-1 mt-2">
                      {v.main_file_url && (
                        <a href={getFileUrl(v.main_file_url)} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-6 text-[10px]"><ExternalLink className="w-3 h-3 mr-1" /> Dokumen</Button>
                        </a>
                      )}
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => window.location.href = `/perubahan?tab=hasil&versi=${v.id}`}>
                        <Bot className="w-3 h-3 mr-1" /> Periksa
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] text-destructive border-destructive/30 hover:bg-destructive/10" title="Hapus versi (file salah upload)" onClick={() => setDeleteVersion(v)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog riwayat besar */}
      <Dialog open={riwayatOpen} onOpenChange={setRiwayatOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Riwayat Versi {selectedBiro}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {versions.map(v => (
              <div key={v.id} className="p-3 rounded-lg border border-border text-xs">
                <p className="font-bold text-primary">V{v.version_number} — {v.main_file_name}</p>
                <p className="text-muted-foreground mt-1">{v.nomor_registrasi} · oleh {v.uploaded_by} · {v.created_at}</p>
                {v.catatan && <p className="mt-1">{v.catatan}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog konfirmasi hapus versi */}
      <AlertDialog open={!!deleteVersion} onOpenChange={() => setDeleteVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Versi V{deleteVersion?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              File "<strong>{deleteVersion?.main_file_name}</strong>" akan dihapus beserta temuan pemeriksaan, data program, dan file di penyimpanan.
              Versi/submission akan menyesuaikan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delBusy}>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteVersion} disabled={delBusy}>
              {delBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Hapus Versi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
