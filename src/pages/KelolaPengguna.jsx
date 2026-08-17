import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Users, Pencil, Info, Trash2, Link2, Copy, Check, MailWarning, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const roleOptions = [
  { value: 'admin', label: 'Administrator', desc: 'Akses penuh ke seluruh sistem' },
  { value: 'kabag', label: 'Kepala Bagian (Kabag)', desc: 'Akses hampir penuh — di bawah Administrator' },
  { value: 'reviewer', label: 'Reviewer', desc: 'Akses setara Kabag — review & kelola dokumen Renja' },
  // Biro Pengusul
  { value: 'biro_pemerintahan', label: 'Biro Pemerintahan dan Otda', desc: 'Biro Pengusul — Dashboard & Upload Dokumen' },
  { value: 'biro_kesra', label: 'Biro Kesra', desc: 'Biro Pengusul — Dashboard & Upload Dokumen' },
  { value: 'biro_hukum', label: 'Biro Hukum', desc: 'Biro Pengusul — Dashboard & Upload Dokumen' },
  { value: 'biro_adpem', label: 'Biro Administrasi Pembangunan', desc: 'Biro Pengusul — Dashboard & Upload Dokumen' },
  { value: 'biro_perekonomian', label: 'Biro Perekonomian', desc: 'Biro Pengusul — Dashboard & Upload Dokumen' },
  { value: 'biro_pbj', label: 'Biro PBJ', desc: 'Biro Pengusul — Dashboard & Upload Dokumen' },
  { value: 'biro_adpim', label: 'Biro Administrasi Pimpinan', desc: 'Biro Pengusul — Dashboard & Upload Dokumen' },
  { value: 'biro_umum', label: 'Biro Umum', desc: 'Biro Pengusul — Dashboard & Upload Dokumen' },
  { value: 'biro_organisasi', label: 'Biro Organisasi', desc: 'Biro Pengusul — Dashboard & Upload Dokumen' },
  // Verifikator
  { value: 'verifikator_1', label: 'Verifikator 1 (Asisten Pemerintahan & Kesra)', desc: 'Verifikator — Biro Pemerintahan & Otda, Kesra, Hukum' },
  { value: 'verifikator_2', label: 'Verifikator 2 (Asisten Perekonomian & Pembangunan)', desc: 'Verifikator — Biro Adpem, Perekonomian, PBJ' },
  { value: 'verifikator_3', label: 'Verifikator 3 (Asisten Administrasi Umum)', desc: 'Verifikator — Biro Adpim, Umum, Organisasi' },
  // Pimpinan
  { value: 'pimpinan', label: 'Pimpinan', desc: 'Akses Dashboard saja' },
];

const roleColors = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  kabag: 'bg-purple-50 text-purple-700 border-purple-200',
  reviewer: 'bg-purple-50 text-purple-700 border-purple-200',
  pimpinan: 'bg-amber-50 text-amber-700 border-amber-200',
  verifikator_1: 'bg-blue-50 text-blue-700 border-blue-200',
  verifikator_2: 'bg-blue-50 text-blue-700 border-blue-200',
  verifikator_3: 'bg-blue-50 text-blue-700 border-blue-200',
};

const BIRO_ROLE_VALUES = ['biro_pemerintahan', 'biro_kesra', 'biro_hukum', 'biro_adpem', 'biro_perekonomian', 'biro_pbj', 'biro_adpim', 'biro_umum', 'biro_organisasi'];

function getRoleColor(role) {
  if (roleColors[role]) return roleColors[role];
  if (BIRO_ROLE_VALUES.includes(role)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-muted text-muted-foreground border-border';
}

function getRoleLabel(role) {
  return roleOptions.find(r => r.value === role)?.label || role;
}

export default function KelolaPengguna() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('biro_pemerintahan');
  const [editingUser, setEditingUser] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('biro_pemerintahan');
  const [addResult, setAddResult] = useState(null);
  const [addCopied, setAddCopied] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('Data pengguna berhasil diperbarui');
      setShowEditDialog(false);
      setEditingUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('Pengguna berhasil dihapus');
      setDeleteUser(null);
    },
    onError: (err) => {
      toast.error('Gagal menghapus pengguna: ' + err.message);
      setDeleteUser(null);
    },
  });

  const registerUrl = `${window.location.origin}/register`;

  const handleInvite = async () => {
    if (!email) { toast.error('Email wajib diisi'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error('Format email tidak valid'); return; }
    try {
      const systemRole = selectedRole === 'admin' ? 'admin' : 'user';
      await base44.users.inviteUser(email, systemRole);
      toast.success('Undangan dibuat. Email undangan dikirim oleh sistem Base44 ke ' + email);
      setInviteResult({ email, role: selectedRole });
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    } catch (err) {
      toast.error('Gagal membuat undangan: ' + err.message);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetInviteDialog = () => {
    setInviteResult(null);
    setCopied(false);
    setEmail('');
    setShowDialog(false);
  };

  const handleAddUser = async () => {
    if (!addEmail) { toast.error('Email wajib diisi'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addEmail)) { toast.error('Format email tidak valid'); return; }
    setAddSaving(true);
    try {
      await base44.users.inviteUser(addEmail, 'user');
      toast.success('Undangan dibuat. Email undangan dikirim oleh sistem Base44 ke ' + addEmail);
      setAddResult({ email: addEmail });
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    } catch (err) {
      toast.error('Gagal menambah pengguna: ' + err.message);
    } finally {
      setAddSaving(false);
    }
  };

  const handleCopyAddLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register`);
    setAddCopied(true);
    setTimeout(() => setAddCopied(false), 2000);
  };

  const resetAddDialog = () => {
    setAddResult(null);
    setAddCopied(false);
    setAddEmail('');
    setAddRole('biro_pemerintahan');
    setShowAddDialog(false);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditEmail(user.email || '');
    setEditRole(user.role || 'biro_pemerintahan');
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      data: { role: editRole },
    });
  };

  // Group by role type
  const roleDesc = roleOptions.find(r => r.value === selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kelola Pengguna</h1>
          <p className="text-sm text-muted-foreground mt-1">Undang dan kelola pengguna aplikasi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowDialog(true)}>
            <Mail className="w-4 h-4 mr-2" /> Undang Pengguna
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Tambah Pengguna
          </Button>
        </div>
      </div>

      {/* Role info legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Administrator', color: 'bg-primary/10 text-primary border-primary/20', desc: 'Akses penuh seluruh sistem' },
          { label: 'Kabag', color: 'bg-purple-50 text-purple-700 border-purple-200', desc: 'Hampir penuh, di bawah Admin' },
          { label: 'Biro Pengusul', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Dashboard & Upload Dokumen' },
          { label: 'Verifikator', color: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Dashboard, Pemeriksaan & Hasil' },
          { label: 'Pimpinan', color: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Dashboard saja' },
        ].map(r => (
          <div key={r.label} className={`flex items-center gap-2 p-3 rounded-lg border text-xs ${r.color}`}>
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <div><p className="font-semibold">{r.label}</p><p className="opacity-75">{r.desc}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-semibold">Nama</TableHead>
              <TableHead className="text-xs font-semibold">Email</TableHead>
              <TableHead className="text-xs font-semibold text-center">Role / Jabatan</TableHead>
              <TableHead className="text-xs font-semibold text-center w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-sm">{user.full_name || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-[10px] ${getRoleColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(user)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteUser(user)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada pengguna</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Undang Pengguna */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetInviteDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{inviteResult ? 'Undangan Dibuat — Bagikan Link' : 'Undang Pengguna Baru'}</DialogTitle>
          </DialogHeader>
          {inviteResult ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <p className="font-semibold mb-0.5">Undangan dibuat</p>
                  <p>Email undangan dikirim oleh sistem Base44 ke <strong>{inviteResult.email}</strong>. Jika tidak masuk, bagikan link pendaftaran di bawah secara manual.</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Link Pendaftaran</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40">
                    <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{registerUrl}</span>
                  </div>
                  <Button type="button" size="icon" variant="outline" onClick={handleCopyLink}>
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 flex gap-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Setelah pengguna terdaftar, perbarui role detail-nya menjadi <strong>{getRoleLabel(inviteResult.role)}</strong> melalui tombol edit pada tabel pengguna.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email *</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Role / Jabatan</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {roleOptions.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <div>
                          <p className="font-medium text-sm">{r.label}</p>
                          <p className="text-xs text-muted-foreground">{r.desc}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {roleDesc && (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 flex gap-2">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{roleDesc.desc}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {inviteResult ? (
              <Button onClick={resetInviteDialog}>Selesai</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
                <Button onClick={handleInvite}>Kirim Undangan</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengguna <strong>{deleteUser?.full_name || deleteUser?.email}</strong>?
              Tindakan ini tidak dapat dibatalkan. Pengguna yang dihapus tidak dapat login kembali dengan akun ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserMutation.mutate(deleteUser.id)}
            >
              Hapus Pengguna
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Edit Role */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role Pengguna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama</label>
              <p className="text-sm font-medium">{editingUser?.full_name || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
              <p className="text-sm text-muted-foreground">{editEmail}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Role / Jabatan</label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {roleOptions.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <p className="font-medium text-sm">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={handleSaveEdit} disabled={updateUserMutation.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah Pengguna */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetAddDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{addResult ? 'Pengguna Ditambahkan' : 'Tambah Pengguna'}</DialogTitle>
          </DialogHeader>
          {addResult ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <p className="font-semibold mb-0.5">Pengguna berhasil ditambahkan</p>
                  <p>Email undangan dikirim oleh sistem Base44 ke <strong>{addResult.email}</strong>. Jika tidak masuk, bagikan link pendaftaran di bawah secara manual.</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Link Pendaftaran & Login</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40">
                    <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{`${window.location.origin}/register`}</span>
                  </div>
                  <Button type="button" size="icon" variant="outline" onClick={handleCopyAddLink}>
                    {addCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 flex gap-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Bagikan link di atas ke pengguna. Setelah login pertama, atur role detail melalui tombol edit pada tabel pengguna.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email *</label>
                <Input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="nama@email.com" />
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 flex gap-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Masukkan email pengguna baru. Pengguna langsung bisa mendaftar dan login. Role dapat diatur kemudian melalui tombol edit pada tabel.</span>
              </div>
            </div>
          )}
          <DialogFooter>
            {addResult ? (
              <Button onClick={resetAddDialog}>Selesai</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
                <Button onClick={handleAddUser} disabled={addSaving}>
                  {addSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Tambah Pengguna
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}