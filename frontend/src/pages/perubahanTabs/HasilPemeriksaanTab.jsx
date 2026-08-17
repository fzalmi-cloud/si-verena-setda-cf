import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileSearch, Bot, Loader2, AlertTriangle, CheckCircle2, RotateCcw, ShieldCheck, Download, FileText, GitCompare, Search } from 'lucide-react';
import { toast } from 'sonner';
import TahunSelect from '@/components/TahunSelect';
import { exportHasilDOCX, exportHasilPDF, exportHasilXLSX } from './exportUtils';

const SEV_LABEL = { kritis: 'KRITIS', mayor: 'MAYOR', minor: 'MINOR', informasi: 'REDAKSIONAL' };
const SEV_CLS = {
  kritis: 'bg-red-50 text-red-700 border-red-200',
  mayor: 'bg-amber-50 text-amber-700 border-amber-200',
  minor: 'bg-blue-50 text-blue-700 border-blue-200',
  informasi: 'bg-muted text-muted-foreground border-border',
};
const STATUS_LABEL = { terbuka: 'Belum Diperbaiki', diduga_diperbaiki: 'Diduga Sudah Diperbaiki', selesai: 'Sudah Diverifikasi', ditutup: 'Ditutup', dibuka_kembali: 'Dibuka Kembali' };
const SEV_ORDER = { kritis: 0, mayor: 1, minor: 2, informasi: 3 };

export default function HasilPemeriksaanTab({ tahun, refreshKey, role, biroSaya, isVerif, isAdminLike, initialBiro = '', initialVersion = '' }) {
  const { user } = useAuth();
  const [biroList, setBiroList] = useState([]);
  const [tahunState, setTahunState] = useState(tahun);
  const [selectedBiro, setSelectedBiro] = useState(role?.startsWith('biro_') ? biroSaya : initialBiro);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [findings, setFindings] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [search, setSearch] = useState('');
  const [periksaBusy, setPeriksaBusy] = useState(false);
  const [periksaStep, setPeriksaStep] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [finalOpen, setFinalOpen] = useState(false);
  const [finalNote, setFinalNote] = useState('');
  const [compareData, setCompareData] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.list('biro').then(r => setBiroList(Array.isArray(r?.data) ? r.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialBiro && !role?.startsWith('biro_')) setSelectedBiro(initialBiro);
  }, [initialBiro]);
  useEffect(() => {
    if (initialVersion) setSelectedVersion(initialVersion);
  }, [initialVersion]);

  useEffect(() => {
    if (!selectedBiro) { setVersions([]); setFindings([]); setSubmission(null); setSelectedVersion(''); return; }
    setLoading(true);
    api.list('perubahan/submissions', { year: parseInt(tahunState), nama_biro: selectedBiro })
      .then(r => {
        const sub = (Array.isArray(r?.data) ? r.data : [])[0] || null;
        setSubmission(sub);
        return sub ? api.list('perubahan/versions', { submission_id: sub.id }) : { data: [] };
      })
      .then(vr => {
        const vs = Array.isArray(vr?.data) ? vr.data : [];
        setVersions(vs);
        setSelectedVersion(prev => prev && vs.some(v => v.id === prev) ? prev : (vs[0]?.id || ''));
      })
      .finally(() => setLoading(false));
  }, [selectedBiro, tahunState, refreshKey]);

  useEffect(() => {
    if (!selectedVersion) { setFindings([]); return; }
    api.list('perubahan/findings', { version_id: selectedVersion, limit: 500 })
      .then(r => setFindings(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setFindings([]));
  }, [selectedVersion, refreshKey]);

  const versiInfo = versions.find(v => v.id === selectedVersion) || null;

  const filtered = useMemo(() => findings.filter(f => {
    if (filterSeverity !== 'semua' && f.severity !== filterSeverity) return false;
    if (filterStatus !== 'semua' && f.status !== filterStatus) return false;
    if (search) {
      const kw = search.toLowerCase();
      if (!f.description?.toLowerCase().includes(kw) && !f.item_pemeriksaan?.toLowerCase().includes(kw)) return false;
    }
    return true;
  }).sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)), [findings, filterSeverity, filterStatus, search]);

  const stats = useMemo(() => {
    const s = { kritis: 0, mayor: 0, minor: 0, informasi: 0, terbuka: 0, selesai: 0, total: findings.length };
    findings.forEach(f => {
      if (s[f.severity] !== undefined) s[f.severity]++;
      if (['terbuka', 'diduga_diperbaiki', 'dibuka_kembali'].includes(f.status)) s.terbuka++;
      if (['selesai', 'ditutup'].includes(f.status)) s.selesai++;
    });
    let skor = 100;
    skor -= findings.filter(f => f.severity === 'kritis' && ['terbuka', 'diduga_diperbaiki', 'dibuka_kembali'].includes(f.status)).length * 25;
    skor -= findings.filter(f => f.severity === 'mayor' && ['terbuka', 'diduga_diperbaiki', 'dibuka_kembali'].includes(f.status)).length * 12;
    skor -= findings.filter(f => f.severity === 'minor' && ['terbuka', 'diduga_diperbaiki', 'dibuka_kembali'].includes(f.status)).length * 5;
    skor = Math.max(0, Math.min(100, Math.round(skor)));
    s.skor = skor;
    s.level = skor >= 90 ? 'Sangat Baik' : skor >= 80 ? 'Baik' : skor >= 70 ? 'Cukup' : 'Perlu Perbaikan';
    return s;
  }, [findings]);

  const steps = ['Membaca Dokumen', 'Menganalisis Struktur', 'Membaca Tabel', 'Membandingkan dengan Dokumen Acuan', 'Menganalisis Temuan', 'Menyusun Rekomendasi'];
  const runPeriksa = async () => {
    if (!selectedVersion) { toast.error('Pilih versi terlebih dahulu'); return; }
    setPeriksaBusy(true);
    let i = 0;
    setPeriksaStep(steps[0]);
    const timer = setInterval(() => { i = Math.min(i + 1, steps.length - 1); setPeriksaStep(steps[i]); }, 2500);
    try {
      const resp = await api.request('/api/perubahan/pemeriksaan', { method: 'POST', body: JSON.stringify({ version_id: selectedVersion }) });
      toast.success(resp.message || 'Pemeriksaan selesai');
      const fr = await api.list('perubahan/findings', { version_id: selectedVersion, limit: 500 });
      setFindings(Array.isArray(fr?.data) ? fr.data : []);
      const sr = await api.list('perubahan/submissions', { year: parseInt(tahunState), nama_biro: selectedBiro });
      setSubmission((Array.isArray(sr?.data) ? sr.data : [])[0] || null);
    } catch (err) {
      toast.error('Gagal pemeriksaan: ' + err.message);
    } finally {
      clearInterval(timer);
      setPeriksaBusy(false); setPeriksaStep('');
    }
  };

  const handleReturn = async () => {
    if (!submission) return;
    setBusy(true);
    try {
      await api.request(`/api/perubahan/submissions/${submission.id}/return`, { method: 'POST', body: JSON.stringify({ note: returnNote }) });
      toast.success('Dokumen dikembalikan untuk perbaikan');
      setReturnOpen(false); setReturnNote('');
      const sr = await api.list('perubahan/submissions', { year: parseInt(tahunState), nama_biro: selectedBiro });
      setSubmission((Array.isArray(sr?.data) ? sr.data : [])[0] || null);
    } catch (err) { toast.error('Gagal: ' + err.message); } finally { setBusy(false); }
  };

  const handleFinal = async () => {
    if (!submission) return;
    setBusy(true);
    try {
      await api.request(`/api/perubahan/submissions/${submission.id}/final`, { method: 'POST', body: JSON.stringify({ note: finalNote }) });
      toast.success('Dokumen ditetapkan FINAL');
      setFinalOpen(false); setFinalNote('');
      const sr = await api.list('perubahan/submissions', { year: parseInt(tahunState), nama_biro: selectedBiro });
      setSubmission((Array.isArray(sr?.data) ? sr.data : [])[0] || null);
    } catch (err) { toast.error('Gagal: ' + err.message); } finally { setBusy(false); }
  };

  const runCompare = async () => {
    if (!selectedVersion) return;
    try {
      const resp = await api.list('perubahan/compare', { version_id: selectedVersion });
      setCompareData(resp); setCompareOpen(true);
    } catch (err) { toast.error('Gagal: ' + err.message); }
  };

  const identitas = {
    nama_biro: selectedBiro, tahun: tahunState, stage: versiInfo?.stage || submission?.stage,
    version_number: versiInfo?.version_number, tanggal_upload: versiInfo?.created_at, file: versiInfo?.main_file_name, pengunggah: versiInfo?.uploaded_by,
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-xl p-4">
        <div className="space-y-1 min-w-[120px]">
          <label className="text-xs font-medium text-muted-foreground">Tahun</label>
          <TahunSelect value={tahunState} onValueChange={setTahunState} />
        </div>
        <div className="space-y-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">Biro</label>
          <Select value={selectedBiro} onValueChange={setSelectedBiro} disabled={role?.startsWith('biro_')}>
            <SelectTrigger><SelectValue placeholder="Pilih biro" /></SelectTrigger>
            <SelectContent>{biroList.map(b => <SelectItem key={b.id} value={b.nama_biro}>{b.nama_biro}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[120px]">
          <label className="text-xs font-medium text-muted-foreground">Versi</label>
          <Select value={selectedVersion} onValueChange={setSelectedVersion}>
            <SelectTrigger><SelectValue placeholder="Pilih versi" /></SelectTrigger>
            <SelectContent>{versions.map(v => <SelectItem key={v.id} value={v.id}>V{v.version_number} {v.stage || ''}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[130px]">
          <label className="text-xs font-medium text-muted-foreground">Tingkat</label>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua</SelectItem>
              {Object.entries(SEV_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[130px]">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground">Cari</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-xs" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari temuan..." />
          </div>
        </div>
      </div>

      {/* Identitas + aksi */}
      {selectedBiro && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-sm">{selectedBiro} — Tahun {tahunState}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tahap: {identitas.stage || '-'} · Versi: V{identitas.version_number || 0} · File: {identitas.file || '-'} · Pengunggah: {identitas.pengunggah || '-'}
              </p>
              <p className="text-xs text-muted-foreground">Status: {submission?.status || 'belum_upload'} · Skor: <strong>{submission?.score ?? stats.skor}</strong>/{stats.skor}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={runPeriksa} disabled={periksaBusy || !selectedVersion}>
                {periksaBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
                {periksaBusy ? `AI: ${periksaStep}...` : 'PERIKSA DOKUMEN'}
              </Button>
              <Button size="sm" variant="outline" onClick={runCompare} disabled={!selectedVersion}><GitCompare className="w-4 h-4 mr-2" /> Bandingkan Versi</Button>
              <Button size="sm" variant="outline" onClick={() => exportHasilDOCX({ identitas, findings, skor: { skor_total: submission?.score ?? stats.skor, level_kesiapan: stats.level } })} disabled={findings.length === 0}><FileText className="w-4 h-4 mr-2" /> DOCX</Button>
              <Button size="sm" variant="outline" onClick={() => exportHasilPDF({ identitas, findings, skor: { skor_total: submission?.score ?? stats.skor, level_kesiapan: stats.level } })} disabled={findings.length === 0}><Download className="w-4 h-4 mr-2" /> PDF</Button>
              <Button size="sm" variant="outline" onClick={() => exportHasilXLSX({ identitas, findings, skor: { skor_total: submission?.score ?? stats.skor, level_kesiapan: stats.level } })} disabled={findings.length === 0}><FileText className="w-4 h-4 mr-2" /> XLSX</Button>
            </div>
          </div>
          {/* Skor + statistik */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-7 gap-2">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <p className="text-2xl font-bold text-primary">{submission?.score ?? stats.skor}</p>
              <p className="text-[10px] text-muted-foreground">SKOR /100</p>
              <p className="text-[10px] text-primary">{stats.level}</p>
            </div>
            {[['kritis', 'text-red-600'], ['mayor', 'text-amber-600'], ['minor', 'text-blue-600'], ['informasi', 'text-muted-foreground'], ['terbuka', 'text-red-600'], ['selesai', 'text-emerald-600']].map(([k, c]) => (
              <div key={k} className="p-3 rounded-lg border border-border text-center">
                <p className={`text-2xl font-bold ${c}`}>{stats[k]}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{k} {k === 'terbuka' ? '(open)' : k === 'selesai' ? '(closed)' : ''}</p>
              </div>
            ))}
          </div>
          {submission?.has_critical_open ? (
            <p className="mt-2 text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Masih ada temuan KRITIS terbuka — dokumen tidak dapat ditetapkan Final.</p>
          ) : null}
          {isVerif && submission && submission.status !== 'final' && (
            <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-border">
              <Button size="sm" variant="outline" className="text-orange-700 border-orange-300" onClick={() => setReturnOpen(true)}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Kembalikan untuk Perbaikan</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={submission.has_critical_open} onClick={() => setFinalOpen(true)}><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Tetapkan Final</Button>
            </div>
          )}
        </div>
      )}

      {/* Tabel temuan */}
      {selectedVersion ? (
        filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <FileSearch className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{findings.length === 0 ? 'Belum ada temuan. Klik "PERIKSA DOKUMEN" untuk menjalankan pemeriksaan AI.' : 'Tidak ada temuan sesuai filter.'}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-xs text-muted-foreground border-b border-border">
                    <th className="px-3 py-2.5 font-medium">No</th>
                    <th className="px-3 py-2.5 font-medium">Tingkat</th>
                    <th className="px-3 py-2.5 font-medium">BAB</th>
                    <th className="px-3 py-2.5 font-medium">Hal</th>
                    <th className="px-3 py-2.5 font-medium">Temuan</th>
                    <th className="px-3 py-2.5 font-medium">Data Dokumen</th>
                    <th className="px-3 py-2.5 font-medium">Data Acuan</th>
                    <th className="px-3 py-2.5 font-medium">Rekomendasi</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((f, i) => (
                    <tr key={f.id} className="hover:bg-muted/20 align-top">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className={`text-[9px] ${SEV_CLS[f.severity] || SEV_CLS.minor}`}>{SEV_LABEL[f.severity] || f.severity}</Badge></td>
                      <td className="px-3 py-2 text-xs">{f.chapter || '-'}</td>
                      <td className="px-3 py-2 text-xs">{f.page || '-'}</td>
                      <td className="px-3 py-2 text-xs max-w-[240px]">
                        <p className="font-medium">{f.item_pemeriksaan}</p>
                        <p className="text-muted-foreground mt-0.5">{f.description}</p>
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[180px] text-muted-foreground">{f.document_value || '-'}</td>
                      <td className="px-3 py-2 text-xs max-w-[180px] text-muted-foreground">{f.reference_value || '-'}</td>
                      <td className="px-3 py-2 text-xs max-w-[200px] text-primary">{f.recommendation || '-'}</td>
                      <td className="px-3 py-2">
                        {isVerif ? (
                          <Select value={f.status} onValueChange={async (v) => {
                            try { await api.update('perubahan/findings', f.id, { status: v, verifier_note: v === 'ditutup' ? 'Ditutup verifikator' : undefined }); toast.success('Status temuan diperbarui'); const fr = await api.list('perubahan/findings', { version_id: selectedVersion, limit: 500 }); setFindings(Array.isArray(fr?.data) ? fr.data : []); } catch (e) { toast.error('Gagal: ' + e.message); }
                          }}>
                            <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <span className="text-[10px]">{STATUS_LABEL[f.status] || f.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-14 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Pilih biro dan versi untuk melihat hasil pemeriksaan.</p>
        </div>
      )}

      {/* Dialog Kembalikan */}
      <AlertDialog open={returnOpen} onOpenChange={setReturnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Kembalikan Dokumen untuk Perbaikan</AlertDialogTitle>
            <AlertDialogDescription>Catatan pengembalian wajib diisi agar Biro mengetahui perbaikannya.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input className="mb-2" placeholder="Catatan pengembalian *" value={returnNote} onChange={e => setReturnNote(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-orange-600 hover:bg-orange-700" onClick={handleReturn} disabled={busy || !returnNote.trim()}>{busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Kembalikan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Final */}
      <AlertDialog open={finalOpen} onOpenChange={setFinalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Tetapkan Sebagai FINAL?</AlertDialogTitle>
            <AlertDialogDescription>Versi final akan dikunci dan menjadi sumber penyusunan Renja Perubahan Setda.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input className="mb-2" placeholder="Catatan (opsional)" value={finalNote} onChange={e => setFinalNote(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={handleFinal} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Tetapkan Final</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Perbandingan Versi */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Perbandingan Versi {compareData?.version_number ? `V${compareData.version_number}` : ''} vs Sebelumnya {compareData?.prev_version_number ? `V${compareData.prev_version_number}` : ''}</DialogTitle></DialogHeader>
          {compareData && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[['Temuan Sebelum', compareData.prev_total], ['Temuan Sekarang', compareData.cur_total], ['Diperbaiki', compareData.diperbaiki], ['Baru', compareData.baru_total]].map(([l, v]) => (
                  <div key={l} className="p-2 rounded-lg border border-border text-center"><p className="text-lg font-bold">{v}</p><p className="text-[10px] text-muted-foreground">{l}</p></div>
                ))}
              </div>
              <div className="space-y-1.5">
                {(compareData.rows || []).map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-border text-xs">
                    <Badge variant="outline" className={`text-[9px] ${r.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700' : r.status === 'Baru' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{r.status}</Badge>
                    <div className="min-w-0">
                      <p className="font-medium">{r.item}</p>
                      <p className="text-muted-foreground truncate">{r.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
