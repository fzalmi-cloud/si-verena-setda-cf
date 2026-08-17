import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Clock, Send, FileText, Eye } from 'lucide-react';

const STATUS_CONFIG = {
  draft: {
    label: 'Belum Diperiksa',
    icon: Clock,
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconColor: 'text-slate-400',
    badgeCls: 'bg-slate-100 text-slate-600',
    barColor: 'bg-slate-300',
  },
  sedang_diperiksa: {
    label: 'Sedang Diperiksa',
    icon: Clock,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    badgeCls: 'bg-blue-100 text-blue-700',
    barColor: 'bg-blue-400',
  },
  perlu_revisi: {
    label: 'Perlu Revisi',
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-500',
    badgeCls: 'bg-amber-100 text-amber-700',
    barColor: 'bg-amber-400',
  },
  layak_kirim: {
    label: 'Layak Kirim',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-500',
    badgeCls: 'bg-emerald-100 text-emerald-700',
    barColor: 'bg-emerald-400',
  },
  sudah_dikirim: {
    label: 'Sudah Dikirim',
    icon: Send,
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    iconColor: 'text-primary',
    badgeCls: 'bg-primary/10 text-primary',
    barColor: 'bg-primary',
  },
};

const SCORE_COLOR = (s) =>
  s >= 75 ? 'text-emerald-600' : s >= 60 ? 'text-blue-600' : s >= 40 ? 'text-amber-600' : 'text-red-600';

const DIM_LABELS = {
  skor_kelengkapan: 'Kelengkapan',
  skor_sistematika: 'Sistematika',
  skor_tabel: 'Tabel',
  skor_matriks: 'Matriks',
  skor_konsistensi: 'Konsistensi',
  skor_substansi: 'Substansi',
};

export default function BiroStatusCard({ skor, dokumenCount = 0 }) {
  const cfg = STATUS_CONFIG[skor?.status_final] || STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const total = skor?.skor_total ?? null;

  const dims = Object.entries(DIM_LABELS).map(([key, label]) => ({
    label,
    value: skor?.[key] ?? null,
  }));

  // Singkat nama biro (hapus prefix "Biro ")
  const shortName = (skor?.nama_biro || '').replace(/^Biro\s+/i, '');

  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-3 transition-all hover:shadow-md', cfg.bg, cfg.border)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">Biro</p>
          <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2">{shortName}</h4>
        </div>
        <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', cfg.bg)}>
          <StatusIcon className={cn('w-4 h-4', cfg.iconColor)} />
        </div>
      </div>

      {/* Skor besar */}
      <div className="flex items-end gap-2">
        {total !== null ? (
          <>
            <span className={cn('text-4xl font-display font-bold leading-none', SCORE_COLOR(total))}>
              {total}
            </span>
            <span className="text-sm text-muted-foreground mb-1">/100</span>
          </>
        ) : (
          <span className="text-2xl font-display font-bold text-muted-foreground/40">—</span>
        )}
        <div className="ml-auto">
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.badgeCls)}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Progress bar skor total */}
      <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', cfg.barColor)}
          style={{ width: `${total ?? 0}%` }}
        />
      </div>

      {/* Dimensi mini */}
      {skor && (
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
          {dims.map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] text-muted-foreground uppercase font-medium leading-none mb-0.5">{label}</p>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', cfg.barColor)}
                    style={{ width: `${value ?? 0}%` }}
                  />
                </div>
                <span className="text-[9px] font-semibold text-foreground/70 w-5 text-right">{value ?? '–'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-black/5">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="w-3 h-3" />
          <span>{dokumenCount} dok</span>
        </div>
        {skor && (
          <Link
            to={`/hasil?biro=${encodeURIComponent(skor.nama_biro)}`}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <Eye className="w-3 h-3" /> Detail
          </Link>
        )}
      </div>
    </div>
  );
}