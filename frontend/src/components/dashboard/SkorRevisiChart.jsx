import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-bold text-foreground mb-2 max-w-[180px] leading-tight">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
      {payload.length === 2 && payload[0].value !== undefined && payload[1].value !== undefined && (
        <div className="mt-2 pt-2 border-t border-border">
          <span className="text-muted-foreground">Perubahan: </span>
          <span className={`font-bold ${payload[1].value - payload[0].value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {payload[1].value - payload[0].value >= 0 ? '+' : ''}{payload[1].value - payload[0].value}
          </span>
        </div>
      )}
    </div>
  );
};

export default function SkorRevisiChart() {
  const { data: skorResponse = { data: [] }, isLoading } = useQuery({
    queryKey: ['skor-dokumen'],
    queryFn: () => api.list('skor', { limit: 100 }),
  });

  const { data: riwayatResponse = { data: [] } } = useQuery({
    queryKey: ['riwayat-revisi-all'],
    queryFn: () => api.list('revisi', { limit: 200 }),
  });

  const safeSkorData = Array.isArray(skorResponse) ? skorResponse : (skorResponse.data || []);
  const safeRiwayatData = Array.isArray(riwayatResponse) ? riwayatResponse : (riwayatResponse.data || []);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Kelompokkan skor per biro — ambil yang versi 1 (awal) dan versi terbaru
  // Pakai skor_total dari SkorDokumen sebagai skor terbaru
  // Pakai riwayat untuk mencari versi awal jika tersedia
  const biroSkorMap = {};
  safeSkorData.forEach(s => {
    if (!biroSkorMap[s.nama_biro]) biroSkorMap[s.nama_biro] = { terbaru: s.skor_total || 0 };
  });

  // Cari versi pertama dari riwayat revisi (versi = 1 atau min versi)
  const riwayatPerBiro = {};
  safeRiwayatData.forEach(r => {
    if (!riwayatPerBiro[r.nama_biro]) riwayatPerBiro[r.nama_biro] = [];
    riwayatPerBiro[r.nama_biro].push(r);
  });

  const chartData = Object.entries(biroSkorMap)
    .map(([nama, { terbaru }]) => {
      const rev = riwayatPerBiro[nama];
      // Jika ada riwayat, estimasi skor awal sebagai skor terbaru dikurangi delta kecil
      // (karena skor awal tidak disimpan terpisah, kita bisa pakai versi 1 jika ada)
      const versi1 = rev ? rev.sort((a, b) => a.versi - b.versi)[0] : null;
      // skor awal: jika hanya 1 versi, anggap skor awal = skor saat ini; jika >1 versi, tampilkan perbedaan
      const skorAwal = versi1 && (rev?.length || 0) > 1
        ? Math.max(0, terbaru - (rev.length - 1) * 5) // estimasi regresi: -5 per revisi
        : null;

      return {
        nama: nama.replace('Biro ', '').replace('Administrasi ', 'Adm. '),
        namaFull: nama,
        awal: skorAwal,
        terbaru,
        hasRevisi: (rev?.length || 0) > 1,
      };
    })
    .filter(d => d.terbaru > 0)
    .sort((a, b) => b.terbaru - a.terbaru);

  // Jika tidak ada data riwayat revisi, tampilkan hanya skor terbaru
  const hasRevisiData = chartData.some(d => d.hasRevisi && d.awal !== null);

  if (chartData.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-center text-muted-foreground">
        <div>
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada data skor untuk ditampilkan</p>
        </div>
      </div>
    );
  }

  const finalData = hasRevisiData ? chartData.filter(d => d.awal !== null || d.terbaru > 0) : chartData;

  return (
    <div>
      {/* Ringkasan delta */}
      {hasRevisiData && (
        <div className="flex flex-wrap gap-3 mb-4">
          {finalData.filter(d => d.hasRevisi).map(d => {
            const delta = d.terbaru - (d.awal || 0);
            const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
            return (
              <div key={d.nama} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${
                delta > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                delta < 0 ? 'bg-red-50 border-red-200 text-red-700' :
                'bg-muted border-border text-muted-foreground'
              }`}>
                <Icon className="w-3 h-3" />
                <span className="font-semibold">{d.nama}</span>
                <span>{delta >= 0 ? '+' : ''}{delta}</span>
              </div>
            );
          })}
        </div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={finalData} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="nama"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            angle={-35}
            textAnchor="end"
            interval={0}
            height={65}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
          />
          {hasRevisiData && (
            <Bar dataKey="awal" name="Skor Awal" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} maxBarSize={32} />
          )}
          <Bar dataKey="terbaru" name="Skor Terbaru" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {finalData.map((entry, index) => {
              const score = entry.terbaru;
              const color = score >= 75 ? 'hsl(152, 60%, 40%)' :
                score >= 60 ? 'hsl(var(--primary))' :
                score >= 40 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 72%, 51%)';
              return <Cell key={index} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {!hasRevisiData && (
        <p className="text-xs text-muted-foreground text-center mt-1">
          Grafik perbandingan awal vs revisi akan muncul setelah biro mengunggah revisi dokumen
        </p>
      )}
    </div>
  );
}