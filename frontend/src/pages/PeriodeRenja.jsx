import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CalendarRange, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS = { aktif: 'Aktif', terkunci: 'Terkunci', selesai: 'Selesai' };
const STATUS_CLS = {
  aktif: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  terkunci: 'bg-purple-50 text-purple-700 border-purple-200',
  selesai: 'bg-muted text-muted-foreground border-border',
};

const emptyForm = { tahun: '', status: 'aktif', tanggal_mulai: '', tanggal_selesai: '' };

export default function PeriodeRenja() {
  const { user } = useAuth();
  const role = user?.role;
  const canManage = role === 'admin' || role === 'kabag';
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null); // null = tambah
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data: resp, isLoading } = useQuery({
    queryKey: ['periode-list'],
    queryFn: () => api.list('periode', { limit: 100 }),
  });
  const periodeList = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ tahun: String(p.tahun), status: p.status || 'aktif', tanggal_mulai: p.tanggal_mulai || '', tanggal_selesai: p.tanggal_selesai || '' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.tahun) { toast.error('Tahun wajib diisi'); return; }
    setBusy(true);
    try {
      const payload = {
        tahun: parseInt(form.tahun),
        status: form.status,
        tanggal_mulai: form.tanggal_mulai || undefined,
        tanggal_selesai: form.tanggal_selesai || undefined,
      };
      if (editing) {
        await api.update('periode', editing.id, payload);
        toast.success('Periode diperbarui');
      } else {
        await api.create('periode', payload);
        toast.success('Periode dibuat');
      }
      queryClient.invalidateQueries({ queryKey: ['periode-list'] });
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
      const res = await api.delete('periode', deleteTarget.id);
      toast.success(res.message || 'Periode dihapus');
      queryClient.invalidateQueries({ queryKey: ['periode-list'] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Gagal: ' + err.message);
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Periode / Tahun Renja</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola tahun renja yang tersedia di seluruh aplikasi (dropdown tahun diambil dari sini).
          </p>
        </div>
        {canManage && (
          <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Tambah Periode</Button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <CalendarRange className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-semibold">Bagaimana cara kerjanya?</p>
          <p className="text-xs mt-1 text-blue-700">
            Tahun yang ditambahkan di sini otomatis muncul di semua dropdown tahun (Pemeriksaan, Upload, Hasil, Penyusunan).
            Status <strong>Aktif</strong> = periode berjalan, <strong>Terkunci</strong> = upload diblokir, <strong>Selesai</strong> = berakhir.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : periodeList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <CalendarRange className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada periode</p>
          <p className="text-xs mt-1">Tambahkan tahun renja pertama untuk mengisi dropdown tahun di aplikasi</p>
          {canManage && <Button className="mt-4" onClick={openAdd}><Plus className="w-4 h-4 mr-2" /> Tambah Periode Pertama</Button>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-xs text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-3 font-semibold">Tahun</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Tanggal Mulai</th>
                <th className="text-left px-4 py-3 font-semibold">Tanggal Selesai</th>
                <th className="text-right px-4 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {periodeList.map(p => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-bold text-primary">{p.tahun}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] ${STATUS_CLS[p.status] || STATUS_CLS.aktif}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.tanggal_mulai || '-'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.tanggal_selesai || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog tambah/edit */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? `Edit Periode ${editing.tahun}` : 'Tambah Periode'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tahun *</label>
              <Input type="number" value={form.tahun} onChange={e => setForm(p => ({ ...p, tahun: e.target.value }))} placeholder="Contoh: 2028" disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="terkunci">Terkunci</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tanggal Mulai</label>
                <Input type="date" value={form.tanggal_mulai} onChange={e => setForm(p => ({ ...p, tanggal_mulai: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tanggal Selesai</label>
                <Input type="date" value={form.tanggal_selesai} onChange={e => setForm(p => ({ ...p, tanggal_selesai: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editing ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Periode {deleteTarget?.tahun}?</AlertDialogTitle>
            <AlertDialogDescription>
              Periode akan dihapus dari daftar tahun. Jika masih ada dokumen pada tahun tersebut, penghapusan akan ditolak.
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
