import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { 
  Building2, CheckCircle2, AlertTriangle, FileText, BarChart3, 
  ArrowRight, Sparkles, ClipboardList, Clock, XCircle, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BIRO_LIST = [
  'Biro Pemerintahan dan Otonomi Daerah','Biro Kesejahteraan Rakyat','Biro Hukum',
  'Biro Pengadaan Barang dan Jasa','Biro Perekonomian','Biro Administrasi Pembangunan',
  'Biro Administrasi Pimpinan','Biro Umum','Biro Organisasi',
];
const TAHUN = 2027;

function StatCard({ label, value, sub, icon: IconComp, color }) {
  const Icon = IconComp;
  const colorMap = {
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    green: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    purple: 'text-purple-700 bg-purple-50 border-purple-200',
    slate: 'text-slate-700 bg-slate-50 border-slate-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.slate}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-display font-bold mt-1">{value}</p>
          {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
        </div>
        <Icon className="w-6 h-6 opacity-60 mt-1" />
      </div>
    </div>
  );
}

export default function DashboardPenyusunan() {
  const { data: dokumen = [] } = useQuery({
    queryKey: ['dok-penyusunan', TAHUN],
    queryFn: () => base44.entities.DokumenRenja.filter({ periode_tahun: TAHUN }, '-created_date', 200),
  });
  const { data: skorList = [] } = useQuery({
    queryKey: ['skor-penyusunan', TAHUN],
    queryFn: () => base44.entities.SkorDokumen.filter({ periode_tahun: TAHUN }),
  });
  const { data: hasilList = [] } = useQuery({
    queryKey: ['hasil-penyusunan', TAHUN],
    queryFn: () => base44.entities.HasilPemeriksaan.filter({ periode_tahun: TAHUN }),
  });
  const { data: draftList = [] } = useQuery({
    queryKey: ['draft-renja-list'],
    queryFn: () => base44.entities.DraftRenjaSetda.list('-generated_at', 10),
  });

  const biroUpload = BIRO_LIST.filter(b => dokumen.some(d => d.nama_biro === b));
  const biroVerif = BIRO_LIST.filter(b => skorList.some(s => s.nama_biro === b && ['layak_kirim','sudah_dikirim'].includes(s.status_final)));
  const biroBelumLengkap = BIRO_LIST.filter(b => !biroUpload.includes(b));
  const catatanTerbuka = hasilList.filter(h => h.status === 'perlu_perbaikan').length;
  const latestDraft = draftList[0];

  const statusKesiapan = useMemo(() => {
    if (biroVerif.length === 9) return { label: 'Siap Generate', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
    if (biroUpload.length >= 7) return { label: 'Hampir Siap', cls: 'bg-blue-100 text-blue-700', icon: Clock };
    if (biroUpload.length >= 4) return { label: 'Sebagian Siap', cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
    return { label: 'Belum Siap', cls: 'bg-red-100 text-red-700', icon: XCircle };
  }, [biroUpload.length, biroVerif.length]);

  const StatusIcon = statusKesiapan.icon;

  // Data grafik skor per biro
  const chartData = BIRO_LIST.map(b => {
    const skor = skorList.find(s => s.nama_biro === b);
    return {
      name: b.replace(/^Biro\s+/i, '').split(' ').slice(0,2).join(' '),
      skor: skor?.skor_total ?? 0,
    };
  });

  // Rekap status verifikasi per biro
  const statusChart = [
    { name: 'Sudah Upload', val: biroUpload.length, color: '#3b82f6' },
    { name: 'Terverifikasi', val: biroVerif.length, color: '#10b981' },
    { name: 'Belum Upload', val: biroBelumLengkap.length, color: '#ef4444' },
    { name: 'Catatan Terbuka', val: Math.min(catatanTerbuka, 9), color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Penyusunan Draft Renja Setda</h1>
          <p className="text-sm text-muted-foreground mt-1">Dashboard pemantauan dan alur kerja penyusunan Renja Tahun {TAHUN}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${statusKesiapan.cls}`}>
          <StatusIcon className="w-4 h-4" />
          Status: {statusKesiapan.label}
        </div>
      </div>

      {/* Alur kerja cepat */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Alur Kerja Penyusunan</p>
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { label: '1. Kompilasi Biro', path: '/penyusunan/kompilasi', done: biroUpload.length > 0 },
            { label: '2. Validasi Sumber', path: '/penyusunan/validasi', done: biroVerif.length > 0 },
            { label: '3. Generate Draft', path: '/penyusunan/generate', done: draftList.length > 0 },
            { label: '4. Editor Draft', path: latestDraft ? `/penyusunan/editor/${latestDraft.id}` : '/penyusunan/riwayat', done: latestDraft?.status !== 'draft_otomatis' },
            { label: '5. Export', path: '/penyusunan/export', done: latestDraft?.status === 'final' },
          ].map((step, i, arr) => (
            <React.Fragment key={step.label}>
              <Link to={step.path}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all hover:shadow-sm ${step.done ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
                  {step.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {step.label}
                </div>
              </Link>
              {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Biro Upload" value={biroUpload.length} sub="dari 9 biro" icon={Building2} color="blue" />
        <StatCard label="Terverifikasi" value={biroVerif.length} sub="siap dikompilasi" icon={CheckCircle2} color="green" />
        <StatCard label="Belum Lengkap" value={biroBelumLengkap.length} sub="perlu upload" icon={XCircle} color="red" />
        <StatCard label="Catatan Terbuka" value={catatanTerbuka} sub="perlu perbaikan" icon={AlertTriangle} color="amber" />
        <StatCard label="Draft Dibuat" value={draftList.length} sub={latestDraft ? `terbaru: ${latestDraft.status}` : 'belum ada'} icon={FileText} color="purple" />
      </div>

      {/* Grafik */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Skor per biro */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Skor Kesiapan Per Biro
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={40} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v}/100`, 'Skor']} />
              <Bar dataKey="skor" radius={[3,3,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.skor >= 75 ? '#10b981' : entry.skor >= 60 ? '#3b82f6' : entry.skor >= 40 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status rekap */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Rekap Status Verifikasi
          </h3>
          <div className="space-y-3">
            {statusChart.map(item => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-semibold">{item.val}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(item.val / 9) * 100}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Draft terbaru */}
      {latestDraft && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Draft Terbaru</h3>
            <Link to="/penyusunan/riwayat" className="text-xs text-primary hover:underline">Lihat semua</Link>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">{latestDraft.judul}</p>
              <p className="text-xs text-muted-foreground mt-0.5">v{latestDraft.versi} · oleh {latestDraft.generated_by} · {latestDraft.jumlah_biro} biro</p>
            </div>
            <Link to={`/penyusunan/editor/${latestDraft.id}`}>
              <Button size="sm" className="gap-1"><ArrowRight className="w-3.5 h-3.5" /> Buka Editor</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Kompilasi Renja Biro', path: '/penyusunan/kompilasi', icon: ClipboardList, color: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
          { label: 'Validasi Data Sumber', path: '/penyusunan/validasi', icon: CheckCircle2, color: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
          { label: 'Generate Draft AI', path: '/penyusunan/generate', icon: Sparkles, color: 'border-purple-200 text-purple-700 hover:bg-purple-50' },
          { label: 'Riwayat Draft', path: '/penyusunan/riwayat', icon: FileText, color: 'border-slate-200 text-slate-700 hover:bg-slate-50' },
        ].map(({ label, path, icon: Icon, color }) => (
          <Link key={path} to={path}>
            <button className={`w-full flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all ${color}`}>
              <Icon className="w-5 h-5" />
              {label}
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}