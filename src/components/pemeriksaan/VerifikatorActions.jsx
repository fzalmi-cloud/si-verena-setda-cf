import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Edit3, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Panel aksi verifikator: Setujui / Tolak / Intervensi (ubah status manual)
 * Props:
 *   - onApprove(catatan)   → setujui semua hasil AI
 *   - onReject(catatan)    → tolak, minta revisi ulang
 *   - onSaveIntervention() → simpan perubahan manual yang sudah dibuat di checklist
 *   - saving               → boolean
 *   - totalItems           → jumlah total item
 *   - sesuaiCount          → jumlah item sesuai
 */
export default function VerifikatorActions({ onApprove, onReject, onSaveIntervention, saving, totalItems, sesuaiCount }) {
  const [dialog, setDialog] = useState(null); // 'approve' | 'reject' | null
  const [catatan, setCatatan] = useState('');

  const pct = totalItems > 0 ? Math.round((sesuaiCount / totalItems) * 100) : 0;

  const handleConfirm = () => {
    if (dialog === 'approve') onApprove(catatan);
    if (dialog === 'reject') onReject(catatan);
    setDialog(null);
    setCatatan('');
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold">Keputusan Verifikator</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sesuaiCount} dari {totalItems} item sesuai ({pct}%)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Intervensi manual (simpan perubahan checklist) */}
            <Button
              variant="outline"
              size="sm"
              onClick={onSaveIntervention}
              disabled={saving}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Edit3 className="w-3.5 h-3.5 mr-1.5" />}
              Intervensi & Simpan
            </Button>

            {/* Tolak */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCatatan(''); setDialog('reject'); }}
              disabled={saving}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Tolak & Minta Revisi
            </Button>

            {/* Setujui */}
            <Button
              size="sm"
              onClick={() => { setCatatan(''); setDialog('approve'); }}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Setujui & Finalisasi
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={cn(
              dialog === 'approve' ? 'text-emerald-700' : 'text-red-700'
            )}>
              {dialog === 'approve' ? '✓ Setujui Hasil Verifikasi' : '✗ Tolak & Minta Revisi'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {dialog === 'approve'
                ? 'Dokumen akan ditandai Layak Kirim. Status semua item AI akan dikonfirmasi.'
                : 'Biro akan diminta melakukan perbaikan dan mengunggah revisi dokumen baru.'}
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Catatan {dialog === 'approve' ? '(opsional)' : '(wajib — jelaskan alasan penolakan)'}
              </label>
              <Textarea
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                placeholder={dialog === 'approve'
                  ? 'Catatan tambahan untuk biro...'
                  : 'Contoh: Tabel T-C.29 dan T-C.30 belum dilampirkan, konsistensi angka BAB III dan IV masih berbeda...'
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button
              onClick={handleConfirm}
              disabled={dialog === 'reject' && !catatan.trim()}
              className={dialog === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {dialog === 'approve' ? 'Konfirmasi Setujui' : 'Konfirmasi Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}