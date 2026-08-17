import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/pemeriksaanRules';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Eye, Minus, FileText, Quote } from 'lucide-react';

const statusIcons = {
  sesuai: CheckCircle2,
  perlu_perbaikan: AlertTriangle,
  tidak_ditemukan: XCircle,
  perlu_review_manual: Eye,
  tidak_berlaku: Minus,
};

export default function ChecklistSection({ kategori, label, items, results, onStatusChange, onNoteChange, readOnly }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-3.5 bg-muted/30 border-b border-border">
        <h3 className="text-sm font-semibold font-heading">{label}</h3>
        <div className="flex items-center gap-3 mt-1.5">
          {['sesuai', 'perlu_perbaikan', 'tidak_ditemukan', 'perlu_review_manual'].map(s => {
            const count = items.filter(item => {
              const r = results.find(r => r.item_pemeriksaan === item.item && r.kategori === kategori);
              return r?.status === s;
            }).length;
            if (!count) return null;
            return (
              <span key={s} className="text-[10px] text-muted-foreground">
                {STATUS_LABELS[s]}: <strong>{count}</strong>
              </span>
            );
          })}
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => {
          const result = results.find(r => r.item_pemeriksaan === item.item && r.kategori === kategori);
          const status = result?.status || 'perlu_review_manual';
          const Icon = statusIcons[status] || Eye;
          const note = result?.catatan_verifikator || '';

          return (
            <div key={item.id} className="px-5 py-3 hover:bg-muted/10 transition-colors">
              <div className="flex items-start gap-3">
                <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0",
                  status === 'sesuai' && 'text-emerald-600',
                  status === 'perlu_perbaikan' && 'text-amber-600',
                  status === 'tidak_ditemukan' && 'text-red-600',
                  status === 'perlu_review_manual' && 'text-blue-600',
                  status === 'tidak_berlaku' && 'text-muted-foreground',
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{item.item}</p>
                    {item.sub && <span className="text-xs text-muted-foreground">— {item.sub}</span>}
                    {result?.halaman && (
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1">
                        <FileText className="w-3 h-3" /> Hal. {result.halaman}
                      </Badge>
                    )}
                  </div>
                  {item.catatan_auto && status !== 'sesuai' && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">{item.catatan_auto}</p>
                  )}
                  {result?.kutipan_dokumen && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-blue-800 bg-blue-50/60 border-l-2 border-blue-300 rounded-r px-2 py-1">
                      <Quote className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="italic">"{result.kutipan_dokumen}"</span>
                    </div>
                  )}
                  {result?.catatan_otomatis && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1 inline-block">
                      {result.catatan_otomatis}
                    </p>
                  )}
                  {!readOnly && (
                    <div className="mt-2">
                      <Textarea
                        placeholder="Catatan verifikator..."
                        value={note}
                        onChange={(e) => onNoteChange(item, e.target.value)}
                        rows={1}
                        className="text-xs min-h-[32px] resize-none"
                      />
                    </div>
                  )}
                  {readOnly && note && (
                    <p className="text-xs text-foreground bg-muted/50 rounded px-2 py-1 mt-1">
                      Catatan: {note}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 w-36">
                  {readOnly ? (
                    <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[status])}>
                      {STATUS_LABELS[status]}
                    </Badge>
                  ) : (
                    <Select
                      value={status}
                      onValueChange={(v) => onStatusChange(item, v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}