import React, { useMemo } from 'react';
import { CHECKLIST_ITEMS, KATEGORI_LABELS, STATUS_LABELS } from '@/lib/pemeriksaanRules';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle2, XCircle, AlertCircle, HelpCircle, Ban } from 'lucide-react';

const STATUS_CONFIG = {
  sesuai:             { label: 'Sesuai',          bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200', dot: 'bg-emerald-500',  Icon: CheckCircle2 },
  perlu_perbaikan:    { label: 'Perlu Perbaikan',  bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200',   dot: 'bg-amber-500',    Icon: AlertCircle  },
  tidak_ditemukan:    { label: 'Tidak Ditemukan',  bg: 'bg-red-50',      text: 'text-red-700',      border: 'border-red-200',     dot: 'bg-red-500',      Icon: XCircle      },
  perlu_review_manual:{ label: 'Review Manual',    bg: 'bg-blue-50',     text: 'text-blue-700',     border: 'border-blue-200',    dot: 'bg-blue-400',     Icon: HelpCircle   },
  tidak_berlaku:      { label: 'Tidak Berlaku',    bg: 'bg-slate-50',    text: 'text-slate-500',    border: 'border-slate-200',   dot: 'bg-slate-400',    Icon: Ban          },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['perlu_review_manual'];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', cfg.bg, cfg.text, cfg.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function DeltaIcon({ from, to }) {
  const isImprovement = (from !== 'sesuai' && to === 'sesuai') ||
    (from === 'tidak_ditemukan' && to !== 'tidak_ditemukan') ||
    (from === 'perlu_perbaikan' && to === 'sesuai');
  const isRegression = (from === 'sesuai' && to !== 'sesuai');
  const noChange = from === to;

  if (noChange) return <Minus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />;
  if (isImprovement) return <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />;
  if (isRegression) return <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
  return <ArrowRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
}

function buildVersionMap(allResults) {
  // Group by item_pemeriksaan+kategori, sort by created_date asc
  const grouped = {};
  allResults.forEach(r => {
    const key = `${r.kategori}__${r.item_pemeriksaan}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });
  // Sort each group oldest→newest
  Object.values(grouped).forEach(arr => arr.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));

  const awal = {};   // first record per item
  const terbaru = {}; // last record per item
  Object.entries(grouped).forEach(([key, arr]) => {
    awal[key] = arr[0];
    terbaru[key] = arr[arr.length - 1];
  });
  return { awal, terbaru };
}

export default function PerbandinganRevisi({ allResults }) {
  const { awal, terbaru } = useMemo(() => buildVersionMap(allResults), [allResults]);

  const stats = useMemo(() => {
    let improved = 0, regressed = 0, unchanged = 0, total = 0;
    Object.keys(terbaru).forEach(key => {
      const a = awal[key]?.status;
      const t = terbaru[key]?.status;
      total++;
      if (a === t) unchanged++;
      else if (t === 'sesuai' || (a === 'tidak_ditemukan' && t !== 'tidak_ditemukan')) improved++;
      else if (a === 'sesuai' && t !== 'sesuai') regressed++;
      else improved++; // any other change towards better counted as changed
    });
    return { improved, regressed, unchanged, total };
  }, [awal, terbaru]);

  const hasRevision = useMemo(() => {
    return Object.keys(terbaru).some(key => awal[key]?.id !== terbaru[key]?.id);
  }, [awal, terbaru]);

  if (!hasRevision) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground">
        <Minus className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Belum ada revisi. Perbandingan tersedia setelah biro melakukan perbaikan dan pemeriksaan ulang.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{stats.improved}</p>
          <p className="text-xs text-emerald-600 mt-0.5 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> Item Membaik
          </p>
        </div>
        <div className="bg-slate-50 border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-600">{stats.unchanged}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <Minus className="w-3 h-3" /> Tidak Berubah
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.regressed}</p>
          <p className="text-xs text-red-600 mt-0.5 flex items-center justify-center gap-1">
            <TrendingDown className="w-3 h-3" /> Item Memburuk
          </p>
        </div>
      </div>

      {/* Per-kategori breakdown */}
      {Object.entries(CHECKLIST_ITEMS).map(([katKey, items]) => {
        const hasChanges = items.some(item => {
          const key = `${katKey}__${item.item}`;
          return awal[key] && terbaru[key] && awal[key].id !== terbaru[key].id && awal[key].status !== terbaru[key].status;
        });

        return (
          <div key={katKey} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
              <p className="text-sm font-semibold">{KATEGORI_LABELS[katKey]}</p>
              {!hasChanges && (
                <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">Tidak ada perubahan</span>
              )}
            </div>
            <div className="divide-y divide-border">
              {items.map(item => {
                const key = `${katKey}__${item.item}`;
                const a = awal[key];
                const t = terbaru[key];
                if (!a || !t) return null;

                const changed = a.id !== t.id && a.status !== t.status;
                if (!changed) return null;

                return (
                  <div key={item.id} className={cn(
                    'px-4 py-2.5 flex items-start gap-3',
                    t.status === 'sesuai' ? 'bg-emerald-50/30' : a.status === 'sesuai' && t.status !== 'sesuai' ? 'bg-red-50/20' : ''
                  )}>
                    <DeltaIcon from={a.status} to={t.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">{item.item}{item.sub ? ` – ${item.sub}` : ''}</p>
                      {t.catatan_verifikator && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{t.catatan_verifikator}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <StatusBadge status={a.status} />
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                );
              })}
              {!hasChanges && (
                <div className="px-4 py-3 text-xs text-muted-foreground italic">
                  Semua item pada kategori ini belum mengalami perubahan status.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}