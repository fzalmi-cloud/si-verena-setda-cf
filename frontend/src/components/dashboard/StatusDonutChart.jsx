import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const STATUS_META = [
  { key: 'perlu_revisi', label: 'Perlu Revisi', color: 'hsl(38, 92%, 50%)' },
  { key: 'sedang_diperiksa', label: 'Sedang Diperiksa', color: 'hsl(var(--primary))' },
  { key: 'draft', label: 'Belum Diperiksa', color: 'hsl(220, 10%, 70%)' },
  { key: 'layak_kirim', label: 'Layak Kirim', color: 'hsl(152, 60%, 40%)' },
  { key: 'sudah_dikirim', label: 'Sudah Dikirim', color: 'hsl(215, 80%, 35%)' },
];

export default function StatusDonutChart({ skorData = [], biroList = [] }) {
  const safeSkorData = Array.isArray(skorData) ? skorData : [];
  const data = useMemo(() => {
    const skorByBiro = {};
    safeSkorData.forEach(s => {
      if (!skorByBiro[s.nama_biro] || s.periode_tahun > skorByBiro[s.nama_biro].periode_tahun) {
        skorByBiro[s.nama_biro] = s;
      }
    });
    const names = biroList.map(b => b.nama_biro);
    const allNames = [...new Set([...names, ...Object.keys(skorByBiro)])];
    const counts = { perlu_revisi: 0, sedang_diperiksa: 0, draft: 0, layak_kirim: 0, sudah_dikirim: 0 };
    allNames.forEach(n => {
      const st = skorByBiro[n]?.status_final || 'draft';
      if (counts[st] !== undefined) counts[st]++;
    });
    return STATUS_META.map(m => ({ name: m.label, value: counts[m.key], color: m.color })).filter(d => d.value > 0);
  }, [skorData, biroList]);

  if (!data.length) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Belum ada data status.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip
          content={({ active, payload }) => active && payload?.length ? (
            <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
              <span className="font-semibold">{payload[0].name}</span>: <span className="font-bold">{payload[0].value} biro</span>
            </div>
          ) : null}
        />
        <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}