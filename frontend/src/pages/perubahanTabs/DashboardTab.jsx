import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2, FileUp, Clock, AlertTriangle, CheckCircle2, ShieldCheck,
  TrendingUp, TrendingDown, Minus, Eye, FileSearch, Download, Info, GitCompare,
} from 'lucide-react';
import { getFileUrl } from '@/lib/utils';

const STATUS_LABELS = {
  belum_upload: 'Belum Upload',
  sudah_upload: 'Sudah Upload',
  sedang_diproses: 'Sedang Diperiksa',
  sedang_diperiksa: 'Sedang Diperiksa',
  perlu_perbaikan: 'Perlu Perbaikan',
  sudah_diperbaiki: 'Sudah Diperbaiki',
  menunggu_verifikator: 'Menunggu Verifikasi',
  selesai_diperiksa: 'Menunggu Verifikasi',
  dikembalikan: 'Dikembalikan',
  final: 'Final',
};
const STATUS_CLS = {
  belum_upload: 'bg-muted text-muted-foreground border-border',
  sudah_upload: 'bg-blue-50 text-blue-700 border-blue-200',
  sedang_diproses: 'bg-blue-50 text-blue-700 border-blue-200',
  sedang_diperiksa: 'bg-blue-50 text-blue-700 border-blue-200',
  perlu_perbaikan: 'bg-amber-50 text-amber-700 border-amber-200',
  sudah_diperbaiki: 'bg-teal-50 text-teal-700 border-teal-200',
  menunggu_verifikator: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  selesai_diperiksa: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  dikembalikan: 'bg-orange-50 text-orange-700 border-orange-200',
  final: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export default function DashboardTab({ tahun, refreshKey, onProgress, role, biroSaya }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.list('perubahan/dashboard', { year: parseInt(tahun) })
      .then(resp => {
        setData(resp);
        onProgress?.(resp?.stats?.progress || 0);
      })
      .catch(() => { onProgress?.(0); })
      .finally(() => setLoading(false));
  }, [tahun, refreshKey]);

  const monitoring = useMemo(() => {
    if (!data?.monitoring) return [];
    if (role?.startsWith('biro_')) return data.monitoring.filter(m => m.nama_biro === biroSaya);
    return data.monitoring;
  }, [data, role, biroSaya]);

  const stats = data?.stats || {};
  const perhatian = (data?.perhatian || []).filter(m => role?.startsWith('biro_') ? m.nama_biro === biroSaya : true);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (monitoring.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
        <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Belum Ada Renja Perubahan</p>
        <p className="text-xs mt-1">Belum terdapat Renja Perubahan yang diunggah untuk periode ini.</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total Biro', value: stats.totalBiro || 0, icon: Building2, cls: 'text-primary bg-primary/10' },
    { label: 'Sudah Upload', value: stats.sudahUpload || 0, icon: FileUp, cls: 'text-blue-600 bg-blue-50' },
    { label: 'Belum Upload', value: stats.belumUpload || 0, icon: Info, cls: 'text-muted-foreground bg-muted' },
    { label: 'Sedang Diperiksa', value: stats.sedangDiproses || 0, icon: Clock, cls: 'text-blue-600 bg-blue-50' },
    { label: 'Perlu Perbaikan', value: stats.perluPerbaikan || 0, icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50' },
    { label: 'Sudah Upload Perbaikan', value: stats.sudahDiperbaiki || 0, icon: TrendingUp, cls: 'text-teal-600 bg-teal-50' },
    { label: 'Menunggu Verifikasi', value: stats.menungguVerif || 0, icon: Eye, cls: 'text-indigo-600 bg-indigo-50' },
    { label: 'Final', value: stats.final || 0, icon: ShieldCheck, cls: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <Card key={c.label}><CardContent className="p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${c.cls}`}><c.icon className="w-5 h-5" /></div>
            <p className="text-2xl font-bold font-display">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-sm font-semibold mb-2">Progress Penyelesaian Renja Perubahan Biro</p>
          <p className="text-xs text-muted-foreground mb-2">{stats.final || 0} dari {stats.totalBiro || 0} Biro telah Final</p>
          <Progress value={stats.progress || 0} className="h-3" />
          <p className="text-sm font-bold mt-1">{stats.progress || 0}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm font-semibold mb-2">Progress Penyusunan Renja Perubahan Setda</p>
          <p className="text-xs text-muted-foreground mb-2">{stats.progress || 0}% data siap dikonsolidasikan</p>
          <Progress value={stats.progress || 0} className="h-3 bg-emerald-100" />
          <p className="text-sm font-bold mt-1 text-emerald-600">{stats.progress || 0}%</p>
        </CardContent></Card>
      </div>

      {/* Monitoring tabel */}
      <Card><CardContent className="pt-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Monitoring Renja Perubahan Biro</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-2 py-2 font-medium">No</th>
                <th className="px-2 py-2 font-medium">Nama Biro</th>
                <th className="px-2 py-2 font-medium">Upload Terakhir</th>
                <th className="px-2 py-2 font-medium text-center">Versi</th>
                <th className="px-2 py-2 font-medium text-center">Skor</th>
                <th className="px-2 py-2 font-medium text-center">Temuan Terbuka</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monitoring.map((m, i) => (
                <tr key={m.nama_biro} className="hover:bg-muted/20">
                  <td className="px-2 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2.5 font-medium text-xs">{m.nama_biro}</td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground">{m.tanggal_upload ? m.tanggal_upload.slice(0, 10) : '-'}</td>
                  <td className="px-2 py-2.5 text-center text-xs">{m.current_version > 0 ? `V${m.current_version}` : '-'}</td>
                  <td className="px-2 py-2.5 text-center font-semibold text-xs">{m.score != null ? m.score : '-'}</td>
                  <td className="px-2 py-2.5 text-center">
                    {m.kritis_open > 0
                      ? <Badge className="bg-red-100 text-red-700 text-[10px]">{m.open_count} (kritis {m.kritis_open})</Badge>
                      : m.open_count > 0 ? <Badge variant="outline" className="text-[10px] text-amber-600">{m.open_count}</Badge> : <span className="text-xs text-emerald-600">0</span>}
                  </td>
                  <td className="px-2 py-2.5">
                    <Badge variant="outline" className={`text-[10px] ${STATUS_CLS[m.status] || STATUS_CLS.belum_upload}`}>{STATUS_LABELS[m.status] || m.status}</Badge>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => window.location.href = `/perubahan?tab=hasil&biro=${encodeURIComponent(m.nama_biro)}`}>
                        <Eye className="w-3 h-3 mr-1" /> Hasil
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => window.location.href = `/perubahan?tab=upload&biro=${encodeURIComponent(m.nama_biro)}`}>
                        <FileSearch className="w-3 h-3 mr-1" /> Riwayat
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {/* Monitoring perbaikan */}
      <Card><CardContent className="pt-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Monitoring Perbaikan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-2 py-2 font-medium">Biro</th>
                <th className="px-2 py-2 font-medium text-center">Versi Awal</th>
                <th className="px-2 py-2 font-medium text-center">Versi Terbaru</th>
                <th className="px-2 py-2 font-medium text-center">Temuan Awal</th>
                <th className="px-2 py-2 font-medium text-center">Temuan Terbaru</th>
                <th className="px-2 py-2 font-medium text-center">Skor Awal</th>
                <th className="px-2 py-2 font-medium text-center">Skor Terbaru</th>
                <th className="px-2 py-2 font-medium text-center">Diperbaiki/Tetap/Baru</th>
                <th className="px-2 py-2 font-medium text-center">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monitoring.map(m => (
                <tr key={m.nama_biro + '-perbaikan'} className="hover:bg-muted/20">
                  <td className="px-2 py-2.5 font-medium text-xs">{m.nama_biro}</td>
                  <td className="px-2 py-2.5 text-center text-xs">{m.first_version_number > 0 ? `V${m.first_version_number}` : '-'}</td>
                  <td className="px-2 py-2.5 text-center text-xs">{m.latest_version_number > 0 ? `V${m.latest_version_number}` : '-'}</td>
                  <td className="px-2 py-2.5 text-center text-xs">{m.v1_findings > 0 ? m.v1_findings : '-'}</td>
                  <td className="px-2 py-2.5 text-center text-xs">{m.latest_findings > 0 ? m.latest_findings : '-'}</td>
                  <td className="px-2 py-2.5 text-center text-xs">{m.score_awal != null ? m.score_awal : '-'}</td>
                  <td className="px-2 py-2.5 text-center text-xs font-semibold">{m.score_terbaru != null ? m.score_terbaru : '-'}</td>
                  <td className="px-2 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px]">
                      <span className="text-emerald-600 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{m.diperbaiki}</span>
                      <span className="text-amber-600 flex items-center gap-0.5"><Minus className="w-3 h-3" />{m.tetap}</span>
                      <span className="text-red-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{m.baru}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    {m.score_awal != null && m.score_terbaru != null ? (
                      <div className="flex items-center gap-1 justify-center">
                        <Progress value={m.score_terbaru} className="h-2 w-20" />
                        <span className={`text-[10px] font-bold ${m.score_terbaru >= m.score_awal ? 'text-emerald-600' : 'text-red-600'}`}>{m.score_terbaru >= m.score_awal ? '+' : ''}{m.score_terbaru - m.score_awal}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      {/* Statistik temuan */}
      <Card><CardContent className="pt-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" /> Statistik Temuan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Total', v: stats.totalTemuan || 0, cls: 'text-primary' },
            { label: 'Kritis', v: stats.kritis || 0, cls: 'text-red-600' },
            { label: 'Mayor', v: stats.mayor || 0, cls: 'text-amber-600' },
            { label: 'Minor', v: stats.minor || 0, cls: 'text-blue-600' },
            { label: 'Redaksional', v: stats.informasi || 0, cls: 'text-muted-foreground' },
            { label: 'Diperbaiki', v: stats.temuan_selesai || 0, cls: 'text-emerald-600' },
            { label: 'Belum Diperbaiki', v: stats.temuan_terbuka || 0, cls: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="p-2 rounded-lg border border-border text-center">
              <p className={`text-lg font-bold ${s.cls}`}>{s.v}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent></Card>

      {/* Biro perlu perhatian */}
      {perhatian.length > 0 && (
        <Card><CardContent className="pt-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Biro yang Memerlukan Perhatian</h3>
          <div className="space-y-1.5">
            {perhatian.map(m => (
              <div key={m.nama_biro + '-perhatian'} className="flex items-center gap-2 p-2 rounded-lg border border-amber-200 bg-amber-50/50 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="font-medium">{m.nama_biro}</span>
                <span className="text-muted-foreground">
                  {m.status === 'belum_upload' ? 'Belum upload' : m.kritis_open > 0 ? `${m.kritis_open} temuan kritis terbuka` : m.status === 'dikembalikan' ? 'Dikembalikan — belum ada perbaikan' : m.score < 70 ? `Skor rendah (${m.score})` : 'Skor menurun'}
                </span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
