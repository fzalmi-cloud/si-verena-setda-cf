import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MasterBiro() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingBiro, setEditingBiro] = useState(null);
  const [form, setForm] = useState({ nama_biro: '', kode_biro: '', kepala_biro: '' });

  const { data: biroResp } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => api.list("biro"),
  });
  const biroList = Array.isArray(biroResp?.data) ? biroResp.data : Array.isArray(biroResp) ? biroResp : [];

  const createMutation = useMutation({
    mutationFn: (data) => api.create("biro", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biro-list'] });
      toast.success('Biro berhasil ditambahkan');
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.update("biro", id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biro-list'] });
      toast.success('Biro berhasil diperbarui');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete("biro", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biro-list'] });
      toast.success('Biro berhasil dihapus');
    },
  });

  const resetForm = () => {
    setForm({ nama_biro: '', kode_biro: '', kepala_biro: '' });
    setEditingBiro(null);
    setShowDialog(false);
  };

  const handleSubmit = () => {
    if (!form.nama_biro) { toast.error('Nama biro wajib diisi'); return; }
    if (editingBiro) {
      updateMutation.mutate({ id: editingBiro.id, data: form });
    } else {
      createMutation.mutate({ ...form, status: 'aktif' });
    }
  };

  const handleEdit = (biro) => {
    setEditingBiro(biro);
    setForm({ nama_biro: biro.nama_biro, kode_biro: biro.kode_biro || '', kepala_biro: biro.kepala_biro || '' });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Master Biro</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola data biro/perangkat daerah</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Biro
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-semibold">Nama Biro</TableHead>
              <TableHead className="text-xs font-semibold">Kode</TableHead>
              <TableHead className="text-xs font-semibold">Kepala Biro</TableHead>
              <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              <TableHead className="text-xs font-semibold text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {biroList.map((biro) => (
              <TableRow key={biro.id}>
                <TableCell className="font-medium text-sm">{biro.nama_biro}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{biro.kode_biro || '-'}</TableCell>
                <TableCell className="text-sm">{biro.kepala_biro || '-'}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    {biro.status || 'aktif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(biro)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(biro.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {biroList.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada data biro</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBiro ? 'Edit Biro' : 'Tambah Biro Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama Biro *</label>
              <Input value={form.nama_biro} onChange={e => setForm({ ...form, nama_biro: e.target.value })} placeholder="Contoh: Biro Administrasi Pembangunan" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kode Biro</label>
              <Input value={form.kode_biro} onChange={e => setForm({ ...form, kode_biro: e.target.value })} placeholder="Contoh: 4.01.01" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kepala Biro</label>
              <Input value={form.kepala_biro} onChange={e => setForm({ ...form, kepala_biro: e.target.value })} placeholder="Nama kepala biro" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Batal</Button>
            <Button onClick={handleSubmit}>{editingBiro ? 'Simpan' : 'Tambah'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}