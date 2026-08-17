import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { FileText, CheckCircle, AlertTriangle, Clock, Gauge } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import ScoreGauge from '@/components/dashboard/ScoreGauge';
import BiroProgressTable from '@/components/dashboard/BiroProgressTable';
import BiroStatusGrid from '@/components/dashboard/BiroStatusGrid';
import ReadinessBarChart from '@/components/dashboard/ReadinessBarChart';
import StatusDonutChart from '@/components/dashboard/StatusDonutChart';
import { filterBiroByRole, isRestrictedRole } from '@/lib/roleAccess';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role;

  const { data: biroResponse } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => api.list('biro'),
  });

  const { data: skorResponse } = useQuery({
    queryKey: ['skor-dokumen'],
    queryFn: () => api.list('skor', { limit: 50 }),
  });

  const { data: dokumenResponse } = useQuery({
    queryKey: ['dokumen-renja'],
    queryFn: () => api.list('dokumen', { limit: 100 }),
  });

  const { data: hasilResponse } = useQuery({
    queryKey: ['hasil-pemeriksaan'],
    queryFn: () => api.list('pemeriksaan', { limit: 200 }),
  });

  const biroList = Array.isArray(biroResponse?.data) ? biroResponse.data : [];
  const skorData = Array.isArray(skorResponse?.data) ? skorResponse.data : [];
  const dokumenData = Array.isArray(dokumenResponse?.data) ? dokumenResponse.data : [];
  const hasilData = Array.isArray(hasilResponse?.data) ? hasilResponse.data : [];

  const filteredBiroList = filterBiroByRole(role, biroList);
  const allowedBiro = Array.isArray(filteredBiroList) ? filteredBiroList.map(b => b.nama_biro) : [];

  const filterByBiro = (arr) => {
    if (!Array.isArray(arr)) return [];
    return isRestrictedRole(role)
      ? arr.filter(item => allowedBiro.includes(item.nama_biro))
      : arr;
  };

  const filteredSkorData = filterByBiro(skorData);
  const filteredDokumenData = filterByBiro(dokumenData);
  const filteredHasilData = filterByBiro(hasilData);

  const totalDokumen = filteredDokumenData.length;
  const sudahDiperiksa = filteredSkorData.filter(s => s.status_final && s.status_final !== 'draft').length;
  const perluRevisi = filteredSkorData.filter(s => s.status_final === 'perlu_revisi').length;
  const layakKirim = filteredSkorData.filter(s => s.status_final === 'layak_kirim' || s.status_final === 'sudah_dikirim').length;

  const avgScore = filteredSkorData.length
    ? Math.round(filteredSkorData.reduce((sum, s) => sum + (s.skor_total || 0), 0) / filteredSkorData.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan status pra-verifikasi dokumen Renja Setda</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Dokumen" value={totalDokumen} icon={FileText} color="primary" />
        <StatCard title="Sudah Diperiksa" value={sudahDiperiksa} icon={CheckCircle} color="success" />
        <StatCard title="Perlu Revisi" value={perluRevisi} icon={AlertTriangle} color="warning" />
        <StatCard title="Layak Kirim" value={layakKirim} icon={Clock} color="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" /> Rata-rata Skor Kesiapan
          </h3>
          <div className="flex justify-center">
            <ScoreGauge score={avgScore} label="Skor" />
          </div>
        </div>
        <div className="lg:col-span-2">
          <BiroStatusGrid
            biroList={filteredBiroList}
            skorData={filteredSkorData}
            dokumenData={filteredDokumenData}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" /> Skor Kesiapan per Biro
          </h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Hijau ≥75 · Biru 60–74 · Kuning 40–59 · Merah &lt;40
          </p>
          <ReadinessBarChart biroList={filteredBiroList} skorData={filteredSkorData} />
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribusi Status Verifikasi</h3>
          <StatusDonutChart skorData={filteredSkorData} biroList={filteredBiroList} />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Tabel Progres Kesiapan Dokumen Per Biro</h3>
        </div>
        <BiroProgressTable skorData={filteredSkorData} />
      </div>
    </div>
  );
}
