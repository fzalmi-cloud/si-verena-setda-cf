import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, CheckCircle, AlertTriangle, Clock, BarChart3, TrendingUp, LayoutGrid, Gauge } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import ScoreGauge from '@/components/dashboard/ScoreGauge';
import BiroProgressTable from '@/components/dashboard/BiroProgressTable';
import SkorRevisiChart from '@/components/dashboard/SkorRevisiChart';
import BiroStatusGrid from '@/components/dashboard/BiroStatusGrid';
import ReadinessBarChart from '@/components/dashboard/ReadinessBarChart';
import StatusDonutChart from '@/components/dashboard/StatusDonutChart';
import { filterBiroByRole, isRestrictedRole } from '@/lib/roleAccess';

export default function Dashboard() {
  const { user } = useOutletContext() || {};
  const role = user?.role;

  const { data: biroList = [] } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => base44.entities.Biro.list(),
  });

  const { data: skorData = [] } = useQuery({
    queryKey: ['skor-dokumen'],
    queryFn: () => base44.entities.SkorDokumen.list('-updated_date', 50),
  });

  const { data: dokumenData = [] } = useQuery({
    queryKey: ['dokumen-renja'],
    queryFn: () => base44.entities.DokumenRenja.list('-updated_date', 100),
  });

  const { data: hasilData = [] } = useQuery({
    queryKey: ['hasil-pemeriksaan'],
    queryFn: () => base44.entities.HasilPemeriksaan.list('-updated_date', 200),
  });

  // Filter data sesuai hak akses biro
  const allowedBiro = filterBiroByRole(role, biroList).map(b => b.nama_biro);
  const filterByBiro = (arr) => isRestrictedRole(role)
    ? arr.filter(item => allowedBiro.includes(item.nama_biro))
    : arr;

  const filteredSkorData = filterByBiro(skorData);
  const filteredDokumenData = filterByBiro(dokumenData);
  const filteredHasilData = filterByBiro(hasilData);

  const totalDokumen = filteredDokumenData.length;
  const sudahDiperiksa = filteredSkorData.filter(s => s.status_final !== 'draft').length;
  const perluRevisi = filteredSkorData.filter(s => s.status_final === 'perlu_revisi').length;
  const layakKirim = filteredSkorData.filter(s => s.status_final === 'layak_kirim' || s.status_final === 'sudah_dikirim').length;

  const avgScore = filteredSkorData.length
    ? Math.round(filteredSkorData.reduce((sum, s) => sum + (s.skor_total || 0), 0) / filteredSkorData.length)
    : 0;

  // Most common issues
  const issues = filteredHasilData
    .filter(h => h.status === 'perlu_perbaikan' || h.status === 'tidak_ditemukan')
    .reduce((acc, h) => {
      acc[h.item_pemeriksaan] = (acc[h.item_pemeriksaan] || 0) + 1;
      return acc;
    }, {});

  const topIssues = Object.entries(issues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan status pra-verifikasi dokumen Renja Setda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Dokumen" value={totalDokumen} icon={FileText} color="primary" />
        <StatCard title="Sudah Diperiksa" value={sudahDiperiksa} icon={CheckCircle} color="success" />
        <StatCard title="Perlu Revisi" value={perluRevisi} icon={AlertTriangle} color="warning" />
        <StatCard title="Layak Kirim" value={layakKirim} icon={Clock} color="accent" />
      </div>

      {/* Score & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Average score */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Rata-rata Skor Kesiapan
          </h3>
          <div className="flex justify-center">
            <ScoreGauge score={avgScore} label="Semua Biro" />
          </div>
        </div>

        {/* Top issues */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Kesalahan Paling Sering
          </h3>
          {topIssues.length > 0 ? (
            <div className="space-y-3">
              {topIssues.map(([issue, count], i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{issue}</p>
                  </div>
                  <span className="text-xs font-semibold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                    {count}x
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data pemeriksaan</p>
          )}
        </div>
      </div>

      {/* Grafik perbandingan skor awal vs revisi terbaru */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Perbandingan Skor Kelengkapan: Versi Awal vs Revisi Terbaru
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Warna batang: hijau ≥75, biru 60-74, kuning 40-59, merah &lt;40
        </p>
        <SkorRevisiChart />
      </div>

      {/* Visual Grid Status Per Biro — untuk pimpinan */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Status Verifikasi Per Biro</h3>
          <span className="text-xs text-muted-foreground ml-1">— Diurutkan: perlu perhatian lebih dulu</span>
        </div>
        <BiroStatusGrid
          biroList={filterBiroByRole(role, biroList)}
          skorData={filteredSkorData}
          dokumenData={filteredDokumenData}
        />
      </div>

      {/* Grafik kesiapan per biro + distribusi status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" /> Skor Kesiapan per Biro
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Hijau ≥75 · Biru 60–74 · Kuning 40–59 · Merah &lt;40
          </p>
          <ReadinessBarChart biroList={filterBiroByRole(role, biroList)} skorData={filteredSkorData} />
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribusi Status Verifikasi</h3>
          <StatusDonutChart skorData={filteredSkorData} biroList={filterBiroByRole(role, biroList)} />
        </div>
      </div>

      {/* Biro progress tabel */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Tabel Progres Kesiapan Dokumen Per Biro</h3>
        </div>
        <BiroProgressTable skorData={filteredSkorData} />
      </div>
    </div>
  );
}