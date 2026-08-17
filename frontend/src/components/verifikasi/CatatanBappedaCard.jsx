import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle, Calendar } from 'lucide-react';

const STATUS_CONFIG = {
  sesuai: {
    label: 'Sesuai',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    iconCls: 'text-emerald-600',
  },
  perlu_perbaikan: {
    label: 'Perlu Perbaikan',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: AlertCircle,
    iconCls: 'text-amber-500',
  },
  tidak_ditemukan: {
    label: 'Tidak Ditemukan',
    cls: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
    iconCls: 'text-red-500',
  },
};

export default function CatatanBappedaCard({ data }) {
  if (!data) return null;

  const perBab = {};
  data.catatan.forEach(c => {
    if (!perBab[c.bab]) perBab[c.bab] = [];
    perBab[c.bab].push(c);
  });

  const total = data.catatan.length;
  const sesuai = data.catatan.filter(c => c.status === 'sesuai').length;
  const perlu = data.catatan.filter(c => c.status === 'perlu_perbaikan').length;
  const tidakAda = data.catatan.filter(c => c.status === 'tidak_ditemukan').length;

  return (
    <div className="space-y-4">
      {/* Header ringkasan */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Tanggal verifikasi:</span>
          <span className="font-semibold">{data.tanggal_verifikasi}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            ✓ Sesuai: {sesuai}
          </span>
          <span className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">
            ⚠ Perlu Perbaikan: {perlu}
          </span>
          {tidakAda > 0 && (
            <span className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 font-medium">
              ✗ Tidak Ditemukan: {tidakAda}
            </span>
          )}
          <span className="text-xs text-muted-foreground">Total: {total} item</span>
        </div>
      </div>

      {/* Daftar per bab */}
      {Object.entries(perBab).map(([bab, items]) => (
        <div key={bab} className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
            <p className="text-xs font-bold text-foreground">{bab}</p>
          </div>
          <div className="divide-y divide-border">
            {items.map((item, idx) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.perlu_perbaikan;
              const Icon = cfg.icon;
              return (
                <div key={idx} className="px-4 py-3 flex items-start gap-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.iconCls}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-foreground">{item.item}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.catatan}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}