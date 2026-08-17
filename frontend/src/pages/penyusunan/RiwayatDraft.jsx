import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, RotateCcw, GitCompare, Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CFG = {
  draft_otomatis: { label: 'Draft Otomatis', cls: 'bg-slate-100 text-slate-600' },
  direview: { label: 'Sedang Direview', cls: 'bg-blue-100 text-blue-700' },
  perlu_perbaikan: { label: 'Perlu Perbaikan', cls: 'bg-amber-100 text-amber-700' },
  disetujui: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700' },
  final: { label: 'Final', cls: 'bg-emerald-200 text-emerald-900 font-bold' },
};

export default function RiwayatDraft() {
  const qc = useQueryClient();
  const [compareIds, setCompareIds] = useState([]);

  const { data: draftListResp, isLoading } = useQuery({
    queryKey: ['draft-renja-list'],
    queryFn: () => api.list('draft', { limit: 50 }),
  });
  const draftList = Array.isArray(draftListResp?.data) ? draftListResp.data : [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete("draftrenjasetda", id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['draft-renja-list'] }); toast.success('Draft dihapus'); },
    onError: err => toast.error('Gagal hapus: ' + err.message),
  });

  const toggleCompare = (id) => {
    setCompareIds(prev => prev.includes(id)
      ? prev.filter(i => i !== id)
      : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Riwayat Draft Renja Setda</h1>
          <p className="text-sm text-muted-foreground mt-1">{draftList.length} draft tersimpan</p>
        </div>
        <Link to="/penyusunan/generate">
          <Button className="gap-2"><Plus className="w-4 h-4" /> Buat Draft Baru</Button>
        </Link>
      </div>

      {compareIds.length === 2 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-primary">Membandingkan 2 versi draft</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCompareIds([])}>Batal Bandingkan</Button>
            <Button size="sm" className="gap-1"><GitCompare className="w-3.5 h-3.5" /> Bandingkan</Button>
          </div>
        </div>
      )}

      {draftList.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground text-sm">Belum ada draft yang dibuat</p>
          <Link to="/penyusunan/generate" className="mt-4 inline-block">
            <Button size="sm" className="mt-3">Buat Draft Pertama</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left w-8"></th>
                  <th className="px-4 py-2.5 text-left">Versi</th>
                  <th className="px-4 py-2.5 text-left">Judul / Tahun</th>
                  <th className="px-4 py-2.5 text-center">Tanggal Generate</th>
                  <th className="px-4 py-2.5 text-center">Dibuat Oleh</th>
                  <th className="px-4 py-2.5 text-center">Jumlah Biro</th>
                  <th className="px-4 py-2.5 text-center">Status Validasi</th>
                  <th className="px-4 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {draftList.map((draft, idx) => {
                  const cfg = STATUS_CFG[draft.status] || STATUS_CFG.draft_otomatis;
                  return (
                    <tr key={draft.id} className={`hover:bg-muted/20 ${compareIds.includes(draft.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={compareIds.includes(draft.id)} onChange={() => toggleCompare(draft.id)} className="rounded" />
                      </td>
                      <td className="px-4 py-3 font-bold text-primary">v{draft.versi}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm line-clamp-1">{draft.judul}</p>
                        {draft.catatan_umum && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{draft.catatan_umum}</p>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {draft.generated_at ? format(new Date(draft.generated_at), 'd MMM yyyy HH:mm', { locale: idLocale }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">{draft.generated_by || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold">{draft.jumlah_biro || '—'}</span>
                        <span className="text-xs text-muted-foreground"> biro</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                        {draft.validated_by && <p className="text-[10px] text-muted-foreground mt-0.5">oleh {draft.validated_by}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link to={`/penyusunan/editor/${draft.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"><Eye className="w-3 h-3" /> Buka</Button>
                          </Link>
                          {draft.status !== 'final' && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(draft.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}