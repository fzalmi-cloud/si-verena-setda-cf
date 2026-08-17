import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { filterBiroByRole, isRestrictedRole } from '@/lib/roleAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, AlertTriangle, CheckCircle2, XCircle, Search, ClipboardList, Info, Plus, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { getFileUrl } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_LABELS = { sesuai: 'Sesuai', perlu_perbaikan: 'Perlu Perbaikan', tidak_ditemukan: 'Tidak Ditemukan' };
const STATUS_CLS = {
  sesuai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  perlu_perbaikan: 'bg-amber-50 text-amber-700 border-amber-200',
  tidak_ditemukan: 'bg-red-50 text-red-700 border-red-200',
};

const BULAN_ID = { 'januari':1,'februari':2,'maret':3,'april':4,'mei':5,'juni':6,'juli':7,'agustus':8,'september':9,'oktober':10,'november':11,'desember':12 };
// Ubah nilai tanggal menjadi format yyyy-MM-dd (wajib untuk <input type="date">)
// Terima: "2026-05-12", "12 Mei 2026", "2026-05-12T...", dll.
function normalizeTanggal(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (m) {
    const bln = BULAN_ID[m[2].toLowerCase()];
    if (bln) {
      return `${m[3]}-${String(bln).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
    }
  }
  return '';
}

const emptyForm = { nama_biro: '', tanggal_verifikasi: '', bab: '', item: '', status: 'perlu_perbaikan', catatan: '' };

// Section Catatan Bappeda — CRUD penuh (data dari database), dengan logika
// "catatan TIDAK selalu ada": biro tanpa catatan ditampilkan apa adanya.
export default function CatatanBappedaSection() {
  const { user } = useAuth();
  const role = user?.role;
  const canManage = role === 'admin' || role === 'kabag';
  const queryClient = useQueryClient();

  const [selectedBiro, setSelectedBiro] = useState('');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  // Daftar biro dari DB
  const { data: biroResp } = useQuery({ queryKey: ['biro-list'], queryFn: () => api.list('biro') });
  const allBiro = Array.isArray(biroResp?.data) ? biroResp.data : [];
  const biroList = filterBiroByRole(role, allBiro);

  // Catatan dari DB
  const { data: catResp, isLoading } = useQuery({
    queryKey: ['catatan-bappeda-list'],
    queryFn: () => api.list('catatan-bappeda', { limit: 500 }),
  });
  const catatanList = Array.isArray(catResp?.data) ? catResp.data : [];
  const summary = Array.isArray(catResp?.summary) ? catResp.summary : [];

  const biroDenganCatatan = summary.map(s => s.nama_biro);
  const semuaNamaBiro = [...new Set([...biroList.map(b => b.nama_biro), ...biroDenganCatatan])];

  // Catatan biro terpilih + filter
  const catatanBiro = selectedBiro ? catatanList.filter(c => c.nama_biro === selectedBiro) : [];
  const filtered = catatanBiro.filter(c => {
    const mStatus = filterStatus === 'semua' || c.status === filterStatus;
    const kw = search.toLowerCase();
    const mSearch = !search ||
      (c.item || '').toLowerCase().includes(kw) ||
      (c.catatan || '').toLowerCase().includes(kw) ||
      (c.bab || '').toLowerCase().includes(kw);
    return mStatus && mSearch;
  });

  const openAdd = (biroPrefill = '') => {
    setEditing(null);
    setForm({ ...emptyForm, nama_biro: biroPrefill || selectedBiro || '' });
    setShowDialog(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      nama_biro: c.nama_biro || '',
      tanggal_verifikasi: normalizeTanggal(c.tanggal_verifikasi),
      bab: c.bab || '',
      item: c.item || '',
      status: c.status || 'perlu_perbaikan',
      catatan: c.catatan || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.nama_biro || !form.item) { toast.error('Biro dan item wajib diisi'); return; }
    setBusy(true);
    try {
      const payload = {
        nama_biro: form.nama_biro,
        tanggal_verifikasi: form.tanggal_verifikasi || undefined,
        bab: form.bab || undefined,
        item: form.item,
        status: form.status,
        catatan: form.catatan || undefined,
      };
      if (editing) await api.update('catatan-bappeda', editing.id, payload);
      else await api.create('catatan-bappeda', payload);
      toast.success(editing ? 'Catatan diperbarui' : 'Catatan ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['catatan-bappeda-list'] });
      setShowDialog(false);
    } catch (err) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.delete('catatan-bappeda', deleteTarget.id);
      toast.success('Catatan dihapus');
      queryClient.invalidateQueries({ queryKey: ['catatan-bappeda-list'] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Gagal hapus: ' + err.message);
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
        <p className="text-xs text-blue-700">
          Catatan koreksi hasil verifikasi Renja oleh Bappeda — dikelola langsung di sini.
          Biro tanpa catatan berarti <strong>belum ada catatan</strong> (belum diverifikasi / nihil).
          {canManage && ' Administrator dapat menambah / mengubah / menghapus catatan.'}
        </p>
      </div>

      {/* Ringkasan biro yang punya catatan */}
      {!selectedBiro && (
        summary.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Catatan Bappeda belum tersedia</p>
            <p className="text-xs mt-1">Belum ada catatan verifikasi. {canManage && 'Klik "Tambah Catatan" untuk mengisi.'}</p>
            {canManage && <Button className="mt-4" onClick={() => openAdd('')}><Plus className="w-4 h-4 mr-2" /> Tambah Catatan</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.map(r => (
              <button
                key={r.nama_biro}
                onClick={() => setSelectedBiro(r.nama_biro)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <p className="text-xs font-bold text-foreground group-hover:text-primary truncate">{r.nama_biro}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 mb-3">{r.tanggal_verifikasi || '-'}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {Number(r.sesuai) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />{r.sesuai}
                    </span>
                  )}
                  {Number(r.perlu) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                      <AlertTriangle className="w-3 h-3" />{r.perlu}
                    </span>
                  )}
                  {Number(r.tidak_ada) > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700">
                      <XCircle className="w-3 h-3" />{r.tidak_ada}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{r.total} item</p>
              </button>
            ))}
          </div>
        )
      )}

      {/* Filter biro + status */}
      <div className="flex items-end gap-3 flex-wrap bg-card rounded-xl border border-border p-4">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biro / Unit</label>
          <Select value={selectedBiro} onValueChange={(v) => { setSelectedBiro(v); setFilterStatus('semua'); setSearch(''); }}>
            <SelectTrigger><SelectValue placeholder="Pilih biro/unit..." /></SelectTrigger>
            <SelectContent>
              {semuaNamaBiro.map(k => (
                <SelectItem key={k} value={k}>
                  {k}{biroDenganCatatan.includes(k) ? '' : ' — belum ada catatan'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedBiro && (
          <>
            <div className="w-44">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Filter Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Status</SelectItem>
                  <SelectItem value="perlu_perbaikan">Perlu Perbaikan</SelectItem>
                  <SelectItem value="tidak_ditemukan">Tidak Ditemukan</SelectItem>
                  <SelectItem value="sesuai">Sesuai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cari item</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input className="pl-8 h-9 text-xs" placeholder="Cari item atau catatan..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => openAdd(selectedBiro)}>
                <Plus className="w-4 h-4 mr-1" /> Tambah Catatan
              </Button>
            )}
          </>
        )}
      </div>

      {/* Detail catatan biro terpilih */}
      {selectedBiro && !isLoading && (
        catatanBiro.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Belum ada catatan Bappeda untuk {selectedBiro}</p>
            <p className="text-xs mt-1">Catatan akan muncul jika Bappeda sudah memverifikasi biro ini.</p>
            {canManage && <Button className="mt-4" onClick={() => openAdd(selectedBiro)}><Plus className="w-4 h-4 mr-2" /> Tambah Catatan</Button>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Tidak ada item yang sesuai filter.</p>
              </div>
            ) : (
              filtered.map(c => {
                const st = STATUS_CLS[c.status] || STATUS_CLS.perlu_perbaikan;
                return (
                  <div key={c.id} className="bg-card border border-border rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${st}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.item}</p>
                        {c.bab && <p className="text-[10px] text-muted-foreground mt-0.5">{c.bab}</p>}
                        {c.catatan && <p className="text-xs text-muted-foreground mt-1">{c.catatan}</p>}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )
      )}

      {/* Dialog Tambah/Edit */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editing ? 'Edit Catatan Bappeda' : 'Tambah Catatan Bappeda'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Biro / Unit *</label>
                <Select value={form.nama_biro} onValueChange={v => setForm(p => ({ ...p, nama_biro: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih biro" /></SelectTrigger>
                  <SelectContent>
                    {semuaNamaBiro.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tanggal Verifikasi</label>
                <Input type="date" value={form.tanggal_verifikasi} onChange={e => setForm(p => ({ ...p, tanggal_verifikasi: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">BAB / Sub Bab</label>
              <Input value={form.bab} onChange={e => setForm(p => ({ ...p, bab: e.target.value }))} placeholder="Contoh: Kelengkapan Dokumen, BAB I – 1.1..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Item *</label>
              <Input value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))} placeholder="Contoh: SK Tim Penyusun Renja" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sesuai">Sesuai</SelectItem>
                  <SelectItem value="perlu_perbaikan">Perlu Perbaikan</SelectItem>
                  <SelectItem value="tidak_ditemukan">Tidak Ditemukan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Catatan</label>
              <Textarea rows={3} value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} placeholder="Uraian catatan koreksi..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={busy}>Batal</Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editing ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Catatan?</AlertDialogTitle>
            <AlertDialogDescription>
              "<strong>{deleteTarget?.item}</strong>" ({deleteTarget?.nama_biro}) akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
