import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { filterBiroByRole, isRestrictedRole } from '@/lib/roleAccess';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Trash2, Loader2, ExternalLink, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { SETDA_NAME } from '@/pages/UploadRenja';

const JENIS_LABELS = {
  narasi_renja: 'Narasi Renja',
  renja_biro: 'Renja Biro',
  draft_renja_setda: 'Draft Renja Setda',
  revisi_renja: 'Revisi Renja',
  matriks_renja: 'Matriks Renja',
  checklist_verifikasi: 'Checklist Verifikasi',
  dokumen_pendukung: 'Dok. Pendukung',
  hasil_verifikasi: 'Hasil Verifikasi',
  lampiran: 'Lampiran',
};

const STATUS_DOK_BADGE = {
  dokumen_biro: { label: 'Dokumen Biro', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  dokumen_setda: { label: 'Dokumen Setda', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  draft_manual: { label: 'Draft Manual', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
  draft_revisi: { label: 'Draft Revisi', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  final_internal: { label: 'Final Internal', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  perlu_perbaikan: { label: 'Perlu Perbaikan', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  sudah_divalidasi: { label: 'Sudah Divalidasi', cls: 'bg-green-50 text-green-700 border-green-200' },
};

const STATUS_CONFIG = {
  diunggah: { label: 'Diunggah', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  sedang_diproses: { label: 'Diproses', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  selesai_diproses: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  gagal: { label: 'Gagal', cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function DokumenDiunggah() {
  const { user } = useOutletContext() || {};
  const role = user?.role;
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterBiro, setFilterBiro] = useState('semua');
  const [filterJenis, setFilterJenis] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [filterTahun, setFilterTahun] = useState('semua');
  const [search, setSearch] = useState('');

  const { data: dokumen = [], isLoading } = useQuery({
    queryKey: ['dokumen-renja-all'],
    queryFn: () => base44.entities.DokumenRenja.list('-created_date', 200),
  });

  const { data: allBiroList = [] } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => base44.entities.Biro.list(),
  });
  const biroList = filterBiroByRole(role, allBiroList);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DokumenRenja.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dokumen-renja-all'] });
      queryClient.invalidateQueries({ queryKey: ['dokumen-renja'] });
      toast.success('Dokumen berhasil dihapus');
      setDeleteTarget(null);
    },
  });

  // Batasi data sesuai role
  const allowedBiroNames = biroList.map(b => b.nama_biro);
  const dokumenScoped = isRestrictedRole(role)
    ? dokumen.filter(d => allowedBiroNames.includes(d.nama_biro))
    : dokumen;

  const filtered = dokumenScoped.filter(d => {
    if (filterBiro !== 'semua' && d.nama_biro !== filterBiro) return false;
    if (filterJenis !== 'semua' && d.jenis_dokumen !== filterJenis) return false;
    if (filterStatus !== 'semua' && d.status_dokumen !== filterStatus) return false;
    if (filterTahun !== 'semua' && String(d.periode_tahun) !== filterTahun) return false;
    if (search && !d.nama_file?.toLowerCase().includes(search.toLowerCase()) && !d.nama_biro?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tahunList = [...new Set(dokumenScoped.map(d => d.periode_tahun))].sort((a, b) => b - a);

  // Deteksi duplikat: dokumen biro+tahun+jenis yang muncul lebih dari 1x
  const duplikatMap = {};
  dokumenScoped.forEach(d => {
    const key = `${d.nama_biro}|${d.periode_tahun}|${d.jenis_dokumen}`;
    if (!duplikatMap[key]) duplikatMap[key] = [];
    duplikatMap[key].push(d.id);
  });
  const duplikatIds = new Set();
  Object.values(duplikatMap).forEach(ids => {
    if (ids.length > 1) ids.forEach(id => duplikatIds.add(id));
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dokumen Diunggah</h1>
        <p className="text-sm text-muted-foreground mt-1">Semua dokumen yang telah diunggah oleh biro-biro. Administrator dapat menghapus dokumen ganda.</p>
      </div>

      {/* Statistik ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Dokumen', val: dokumenScoped.length, cls: 'text-primary' },
          { label: 'Biro Aktif', val: new Set(dokumenScoped.map(d => d.nama_biro)).size, cls: 'text-emerald-600' },
          { label: 'Duplikat Terdeteksi', val: duplikatIds.size, cls: 'text-amber-600' },
          { label: 'Selesai Diproses', val: dokumenScoped.filter(d => d.status_upload === 'selesai_diproses').length, cls: 'text-blue-600' },
        ].map(({ label, val, cls }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${cls}`}>{val}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama file/biro..." className="pl-9" />
        </div>
        <Select value={filterBiro} onValueChange={setFilterBiro}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Semua Biro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Biro/Unit</SelectItem>
            {biroList.map(b => <SelectItem key={b.id} value={b.nama_biro}>{b.nama_biro}</SelectItem>)}
            {!isRestrictedRole(role) && <SelectItem value={SETDA_NAME}>{SETDA_NAME}</SelectItem>}
          </SelectContent>
        </Select>
        <Select value={filterJenis} onValueChange={setFilterJenis}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Jenis</SelectItem>
            {Object.entries(JENIS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            {Object.entries(STATUS_DOK_BADGE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTahun} onValueChange={setFilterTahun}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Tahun" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Tahun</SelectItem>
            {tahunList.map(t => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabel dokumen */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Tidak ada dokumen ditemukan</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Unit</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Level</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Tahun</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Jenis</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Nama File</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Status Proses</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Penanda</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Diunggah</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(d => {
                  const isDuplikat = duplikatIds.has(d.id);
                  const statusCfg = STATUS_CONFIG[d.status_upload] || STATUS_CONFIG.diunggah;
                  return (
                    <tr key={d.id} className={`hover:bg-muted/20 transition-colors ${isDuplikat ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs">{d.nama_biro}</span>
                          {isDuplikat && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold border border-amber-300">duplikat</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${(d.level_unit || 'biro') === 'setda' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {(d.level_unit || 'biro').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{d.periode_tahun}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                          {JENIS_LABELS[d.jenis_dokumen] || d.jenis_dokumen}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-xs truncate text-muted-foreground">{d.nama_file || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {d.status_dokumen && STATUS_DOK_BADGE[d.status_dokumen] ? (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_DOK_BADGE[d.status_dokumen].cls}`}>
                            {STATUS_DOK_BADGE[d.status_dokumen].label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {d.created_date ? format(new Date(d.created_date), 'd MMM yyyy', { locale: id }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {d.file_url && (
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(d)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            Menampilkan {filtered.length} dari {dokumenScoped.length} dokumen
          </div>
        </div>
      )}

      {/* Dialog hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dokumen "<strong>{deleteTarget?.nama_file}</strong>" dari {deleteTarget?.nama_biro} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
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