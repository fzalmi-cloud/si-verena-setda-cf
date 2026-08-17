import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TahunSelect from '@/components/TahunSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Settings, HelpCircle, History, GitBranch, Bell, CheckCircle2 } from 'lucide-react';
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
  const [periode, setPeriode] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditList, setAuditList] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [notifList, setNotifList] = useState([]);

  const isAdminLike = ['admin', 'kabag'].includes(role);
  const isVerif = ['admin', 'kabag', 'verifikator', 'verifikator_1', 'verifikator_2', 'verifikator_3', 'reviewer'].includes(role);
  const biroSaya = user?.nama_biro || '';

  useEffect(() => {
    api.list('periode', { limit: 100 }).then(resp => {
      const list = Array.isArray(resp?.data) ? resp.data : [];
      const aktif = list.find(p => p.status === 'aktif' && String(p.tahun) === String(tahun)) || list.find(p => p.status === 'aktif');
      if (aktif) setPeriode(aktif);
    }).catch(() => {});
  }, [tahun]);

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
              <Button variant="outline" size="sm" onClick={() => toast.info('Periode diatur pada menu Periode Renja. Status aktif: ' + (periode?.status || '-'))}>
                <Settings className="w-3.5 h-3.5 mr-1" /> Pengaturan Periode
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}><HelpCircle className="w-3.5 h-3.5 mr-1" /> Bantuan</Button>
            <Button variant="outline" size="sm" onClick={openAudit}><History className="w-3.5 h-3.5 mr-1" /> Riwayat Aktivitas</Button>
            <Button variant="outline" size="sm" onClick={openNotif}><Bell className="w-3.5 h-3.5 mr-1" /> Notifikasi{notifList.filter(n => !n.is_read).length > 0 ? ` (${notifList.filter(n => !n.is_read).length})` : ''}</Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 flex-wrap text-xs">
          <Badge variant="outline" className="bg-card">Tahun {tahun}</Badge>
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
