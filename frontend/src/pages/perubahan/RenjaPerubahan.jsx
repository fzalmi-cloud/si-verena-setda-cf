import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import TahunSelect from '@/components/TahunSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Settings, HelpCircle, History, GitBranch, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import DashboardTab from '@/pages/perubahanTabs/DashboardTab';
import DokumenAcuanTab from '@/pages/perubahanTabs/DokumenAcuanTab';
import UploadTab from '@/pages/perubahanTabs/UploadTab';
import HasilPemeriksaanTab from '@/pages/perubahanTabs/HasilPemeriksaanTab';
import SetdaTab from '@/pages/perubahanTabs/SetdaTab';

const TAHAP_LABELS = {
  rancangan_perubahan: 'Rancangan Perubahan Renja',
  rancangan_akhir: 'Rancangan Akhir Perubahan Renja',
  dokumen_final: 'Dokumen Final',
};

export default function RenjaPerubahan() {
  const { user } = useAuth();
  const role = user?.role;
  const params = new URLSearchParams(window.location.search);
  const [tahun, setTahun] = useState(params.get('tahun') || '2027');
  const [tab, setTab] = useState(params.get('tab') || 'dashboard');
  const [urlBiro, setUrlBiro] = useState(params.get('biro') || '');
  const [urlVersi, setUrlVersi] = useState(params.get('versi') || '');
  const [refreshKey, setRefreshKey] = useState(0);
  const [periodeList, setPeriodeList] = useState([]);
  const [periode, setPeriode] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showPeriode, setShowPeriode] = useState(false);
  const [periodeForm, setPeriodeForm] = useState({ status: 'aktif', tanggal_mulai: '', tanggal_selesai: '' });
  const [periodeBusy, setPeriodeBusy] = useState(false);
  const [auditList, setAuditList] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [notifList, setNotifList] = useState([]);

  const isAdminLike = ['admin', 'kabag'].includes(role);
  const isVerif = ['admin', 'kabag', 'verifikator', 'verifikator_1', 'verifikator_2', 'verifikator_3', 'reviewer'].includes(role);
  const biroSaya = user?.nama_biro || '';

  // Default tahun: jika URL tidak menyebut tahun, otomatis ke tahun yang punya data submissions
  useEffect(() => {
    if (params.get('tahun')) return;
    api.list('perubahan/years').then(r => {
      const ys = Array.isArray(r?.data) ? r.data : [];
      if (ys.length) setTahun(String(ys[0].year));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.list('periode', { jenis: 'perubahan', limit: 100 }).then(resp => {
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setPeriodeList(list);
      const utkTahun = list.find(p => String(p.tahun) === String(tahun));
      if (utkTahun) setPeriode(utkTahun);
      else setPeriode(list.find(p => p.status === 'aktif') || null);
    }).catch(() => {});
  }, [tahun]);

  // Buka dialog pengaturan periode (edit tanggal mulai/batas/status utk tahun terpilih)
  const openPeriode = () => {
    const target = periodeList.find(p => String(p.tahun) === String(tahun)) || null;
    setPeriodeForm({
      status: target?.status || 'aktif',
      tanggal_mulai: target?.tanggal_mulai ? String(target.tanggal_mulai).slice(0, 10) : '',
      tanggal_selesai: target?.tanggal_selesai ? String(target.tanggal_selesai).slice(0, 10) : '',
    });
    setShowPeriode(true);
  };

  const savePeriode = async () => {
    setPeriodeBusy(true);
    try {
      const payload = {
        status: periodeForm.status,
        tanggal_mulai: periodeForm.tanggal_mulai || undefined,
        tanggal_selesai: periodeForm.tanggal_selesai || undefined,
      };
      const target = periodeList.find(p => String(p.tahun) === String(tahun));
      if (target) {
        await api.update('periode', target.id, payload);
      } else {
        await api.create('periode', { jenis: 'perubahan', tahun: parseInt(tahun), ...payload });
      }
      toast.success('Periode diperbarui');
      setShowPeriode(false);
      const resp = await api.list('periode', { jenis: 'perubahan', limit: 100 });
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setPeriodeList(list);
      setPeriode(list.find(p => String(p.tahun) === String(tahun)) || list.find(p => p.status === 'aktif') || null);
      refreshAll();
    } catch (err) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setPeriodeBusy(false);
    }
  };

  const refreshAll = () => setRefreshKey(k => k + 1);

  // Sinkronkan tab biro/versi dari URL (mis. dari tombol di tab lain)
  const setTabAndUrl = (v) => {
    setTab(v);
    const u = new URLSearchParams(window.location.search);
    u.set('tab', v);
    window.history.replaceState({}, '', `?${u.toString()}`);
  };

  const openAudit = async () => {
    setShowAudit(true);
    try {
      const resp = await api.list('perubahan/audit', { limit: 100 });
      setAuditList(Array.isArray(resp?.data) ? resp.data : []);
    } catch { setAuditList([]); }
  };

  const openNotif = async () => {
    setShowNotif(true);
    try {
      const resp = await api.list('perubahan/notifications', { role, nama_biro: biroSaya, limit: 50 });
      setNotifList(Array.isArray(resp?.data) ? resp.data : []);
    } catch { setNotifList([]); }
  };

  const markRead = async (id) => {
    try { await api.request(`/api/perubahan/notifications/${id}/read`, { method: 'POST' }); } catch {}
    setNotifList(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-display font-bold">RENJA PERUBAHAN SEKRETARIAT DAERAH</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Sistem Penyusunan, Verifikasi, Perbaikan dan Konsolidasi Renja Perubahan Biro menjadi Renja Perubahan Setda
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={refreshAll}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
            {isAdminLike && (
              <Button variant="outline" size="sm" onClick={openPeriode}>
                <Settings className="w-3.5 h-3.5 mr-1" /> Pengaturan Periode
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}><HelpCircle className="w-3.5 h-3.5 mr-1" /> Bantuan</Button>
            <Button variant="outline" size="sm" onClick={openAudit}><History className="w-3.5 h-3.5 mr-1" /> Riwayat Aktivitas</Button>
            <Button variant="outline" size="sm" onClick={openNotif}><Bell className="w-3.5 h-3.5 mr-1" /> Notifikasi{notifList.filter(n => !n.is_read).length > 0 ? ` (${notifList.filter(n => !n.is_read).length})` : ''}</Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 flex-wrap text-xs">
          <div className="space-y-0.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Tahun Perencanaan</p>
            <Select value={tahun} onValueChange={setTahun}>
              <SelectTrigger className="h-8 w-28 bg-card text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(periodeList.length > 0 ? periodeList : [2028, 2027, 2026, 2025].map(y => ({ tahun: y }))).map(p => (
                  <SelectItem key={p.tahun} value={String(p.tahun)}>{p.tahun}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="bg-card">Tahap: {TAHAP_LABELS[periode?.status === 'aktif' ? 'rancangan_perubahan' : 'rancangan_perubahan']}</Badge>
          <Badge variant="outline" className={`bg-card ${periode?.status === 'aktif' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            Status Periode: {periode?.status === 'aktif' ? 'Aktif' : periode?.status || 'Belum diset'}
          </Badge>
          <Badge variant="outline" className="bg-card">Mulai: {periode?.tanggal_mulai || '-'}</Badge>
          <Badge variant="outline" className="bg-card">Batas Waktu: {periode?.tanggal_selesai || '-'}</Badge>
          <Badge variant="outline" className="bg-card">Progress: {progress}%</Badge>
        </div>
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTabAndUrl}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
          <TabsTrigger value="dashboard" className="text-xs px-4 py-2 data-[state=active]:bg-card whitespace-nowrap">1. Dashboard Renja Perubahan</TabsTrigger>
          <TabsTrigger value="acuan" className="text-xs px-4 py-2 data-[state=active]:bg-card whitespace-nowrap">2. Dokumen Acuan</TabsTrigger>
          <TabsTrigger value="upload" className="text-xs px-4 py-2 data-[state=active]:bg-card whitespace-nowrap">3. Upload Renja Perubahan Biro</TabsTrigger>
          <TabsTrigger value="hasil" className="text-xs px-4 py-2 data-[state=active]:bg-card whitespace-nowrap">4. Hasil Pemeriksaan</TabsTrigger>
          <TabsTrigger value="setda" className="text-xs px-4 py-2 data-[state=active]:bg-card whitespace-nowrap">5. Renja Perubahan Setda</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardTab tahun={tahun} refreshKey={refreshKey} onProgress={setProgress} role={role} biroSaya={biroSaya} />
        </TabsContent>
        <TabsContent value="acuan" className="mt-4">
          <DokumenAcuanTab tahun={tahun} refreshKey={refreshKey} canManage={isAdminLike} />
        </TabsContent>
        <TabsContent value="upload" className="mt-4">
          <UploadTab tahun={tahun} refreshKey={refreshKey} role={role} biroSaya={biroSaya} isAdminLike={isAdminLike} initialBiro={urlBiro} />
        </TabsContent>
        <TabsContent value="hasil" className="mt-4">
          <HasilPemeriksaanTab tahun={tahun} refreshKey={refreshKey} role={role} biroSaya={biroSaya} isVerif={isVerif} isAdminLike={isAdminLike} initialBiro={urlBiro} initialVersion={urlVersi} />
        </TabsContent>
        <TabsContent value="setda" className="mt-4">
          <SetdaTab tahun={tahun} refreshKey={refreshKey} role={role} isAdminLike={isAdminLike} isVerif={isVerif} />
        </TabsContent>
      </Tabs>

      {/* Dialog Pengaturan Periode */}
      <Dialog open={showPeriode} onOpenChange={setShowPeriode}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Pengaturan Periode — {tahun}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status Periode</label>
              <Select value={periodeForm.status} onValueChange={v => setPeriodeForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="terkunci">Terkunci (blokir upload)</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tanggal Mulai</label>
              <Input type="date" value={periodeForm.tanggal_mulai} onChange={e => setPeriodeForm(p => ({ ...p, tanggal_mulai: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Batas Waktu</label>
              <Input type="date" value={periodeForm.tanggal_selesai} onChange={e => setPeriodeForm(p => ({ ...p, tanggal_selesai: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPeriode(false)} disabled={periodeBusy}>Batal</Button>
            <Button onClick={savePeriode} disabled={periodeBusy}>
              {periodeBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan Periode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Bantuan */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Bantuan — Renja Perubahan</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Alur:</strong> Dokumen Acuan → Upload Biro → Pemeriksaan → Temuan → Perbaikan → Versi Baru → Final → Konsolidasi Setda.</p>
            <p><strong className="text-foreground">Tab 1:</strong> Dashboard — monitoring seluruh Biro, monitoring perbaikan, statistik temuan.</p>
            <p><strong className="text-foreground">Tab 2:</strong> Dokumen Acuan — dasar pemeriksaan (Permendagri 86/2017, Perubahan RKPD, SE, dll).</p>
            <p><strong className="text-foreground">Tab 3:</strong> Upload — unggah dokumen per Biro dengan versioning otomatis.</p>
            <p><strong className="text-foreground">Tab 4:</strong> Hasil Pemeriksaan — temuan, skor, rekomendasi, export DOCX/PDF/XLSX.</p>
            <p><strong className="text-foreground">Tab 5:</strong> Renja Perubahan Setda — konsolidasi biro Final menjadi dokumen Setda.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Audit */}
      <Dialog open={showAudit} onOpenChange={setShowAudit}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Riwayat Aktivitas (Audit Trail)</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            {auditList.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Belum ada aktivitas.</p>}
            {auditList.map(a => (
              <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg border border-border text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">{a.action} <span className="text-muted-foreground">— {a.object_type}</span></p>
                  <p className="text-muted-foreground truncate">{a.notes || ''}</p>
                  <p className="text-[10px] text-muted-foreground">{a.user_name || '-'} · {a.created_at || '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Notifikasi */}
      <Dialog open={showNotif} onOpenChange={setShowNotif}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Notifikasi</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            {notifList.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Tidak ada notifikasi.</p>}
            {notifList.map(n => (
              <button key={n.id} onClick={() => markRead(n.id)} className={`w-full text-left p-2.5 rounded-lg border border-border text-xs hover:bg-muted/20 ${n.is_read ? 'opacity-60' : ''}`}>
                <p className="font-medium">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.type} · {n.created_at}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
