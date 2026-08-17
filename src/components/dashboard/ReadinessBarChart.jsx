import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const scoreColor = (score) => {
  if (score >= 75) return 'hsl(152, 60%, 40%)';
  if (score >= 60) return 'hsl(var(--primary))';
  if (score >= 40) return 'hsl(38, 92%, 50%)';
  return 'hsl(0, 72%, 51%)';
};

export default function ReadinessBarChart({ biroList = [], skorData = [] }) {
  const data = useMemo(() => {
    const skorByBiro = {};
    skorData.forEach(s => {
      if (!skorByBiro[s.nama_biro] || s.periode_tahun > skorByBiro[s.nama_biro].periode_tahun) {
        skorByBiro[s.nama_biro] = s;
      }
    });
    const names = biroList.map(b => b.nama_biro);
    const allNames = [...new Set([...names, ...Object.keys(skorByBiro)])];
    return allNames.map(nama => {
      const skor = skorByBiro[nama];
      const short = nama.replace('Biro ', '').replace('Administrasi ', 'Adm. ');
      return {
        nama: short,
        namaFull: nama,
        skor: skor?.skor_total ?? 0,
        status: skor?.status_final || 'draft',
      };
    }).sort((a, b) => (a.skor || 0) - (b.skor || 0));
  }, [biroList, skorData]);

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        Belum ada data skor kesiapan.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 36, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="nama" tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} width={130} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-card border border-border rounded-lg p-2.5 shadow-lg text-xs">
                <p className="font-bold mb-1">{d.namaFull}</p>
                <p className="text-muted-foreground">Skor: <span className="font-semibold text-foreground">{d.skor || 0}</span></p>
                <p className="text-muted-foreground">Status: <span className="font-semibold text-foreground">{d.status.replace(/_/g, ' ')}</span></p>
              </div>
            );
          }}
        />
        <Bar dataKey="skor" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((entry, i) => <Cell key={i} fill={scoreColor(entry.skor)} />)}
          <LabelList dataKey="skor" position="right" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}