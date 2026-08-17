import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { filterBiroByRole, isRestrictedRole } from '@/lib/roleAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, Eye,
  BarChart2, ChevronRight, Bot, RefreshCw, Building2
} from 'lucide-react';
import { SETDA_NAME } from '@/pages/UploadRenja';

const STATUS_FINAL_CONFIG = {
  draft:            { label: 'Belum Mulai',       color: 'bg-muted text-muted-foreground border-border' },
  sedang_diperiksa: { label: 'Sedang Diperiksa',  color: 'bg-blue-50 text-blue-700 border-blue-200' },
  perlu_revisi:     { label: 'Perlu Revisi',       color: 'bg-amber-50 text-amber-700 border-amber-200' },
  layak_kirim:      { label: 'Layak Kirim',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sudah_dikirim:    { label: 'Sudah Dikirim',      color: 'bg-primary/10 text-primary border-primary/20' },
};

const LEVEL_CONFIG = {
  sangat_siap:            { label: 'Sangat Siap',           color: 'text-emerald-600', bar: 'bg-emerald-500' },
  siap_perbaikan_kecil:   { label: 'Siap (Perbaikan Kecil)',color: 'text-blue-600',    bar: 'bg-blue-500' },
  perlu_perbaikan_sedang: { label: 'Perlu Perbaikan',       color: 'text-amber-600',   bar: 'bg-amber-500' },
  belum_layak:            { label: 'Belum Layak',           color: 'text-red-600',     bar: 'bg-red-500' },
};

function SkorBar({ label, skor, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground truncate max-w-[120px]">{label}</span>
        <span className="font-semibold">{skor}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${skor}%` }} />
      </div>
    </div>
  );
}

export default function StatusPemeriksaan() {
  const { user } = useAuth();
  const role = user?.role;
  const [tahun, setTahun] = useState('2027');
  const [expand, setExpand] = useState(null);

  const { data: allBiroResp } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => api.list("biro"),
  });
  const allBiroList = Array.isArray(allBiroResp?.data) ? allBiroResp.data : [];
  const biroList = filterBiroByRole(role, allBiroList);

  const { data: skorResp, isLoading: loadingSkor, refetch } = useQuery({
    queryKey: ['skor-dokumen', tahun],
    queryFn: () => api.list('skor', { tahun: parseInt(tahun), limit: 50 }),
  });
  const skorList = Array.isArray(skorResp?.data) ? skorResp.data : [];

  const { data: hasilResp } = useQuery({
    queryKey: ['hasil-all', tahun],
    queryFn: () => api.list('pemeriksaan', { tahun: parseInt(tahun), limit: 500 }),
  });
  const hasilList = Array.isArray(hasilResp?.data) ? hasilResp.data : [];

  // Sembunyikan SETDA untuk role yang dibatasi
  const showSetda = !isRestrictedRole(role);

  // Statistik ringkas
  const totalBiro = biroList.length + (showSetda ? 1 : 0);
  const sudahDiperiksa = skorList.length;
  const layakKirim = skorList.filter(s => s.status_final === 'layak_kirim' || s.status_final === 'sudah_dikirim').length;
  const perluRevisi = skorList.filter(s => s.status_final === 'perlu_revisi').length;
  const avgSkor = sudahDiperiksa > 0
    ? Math.round(skorList.reduce((a, b) => a + (b.skor_total || 0), 0) / sudahDiperiksa)
    : 0;

  // Gabungkan biro (dan SETDA) dengan skor-nya
  const allUnits = [
    ...biroList,
    ...(showSetda ? [{ id: '__setda__', nama_biro: SETDA_NAME, _isSetda: true }] : []),
  ];
  const biroWithSkor = allUnits.map(biro => {
    const skor = skorList.find(s => s.nama_biro === biro.nama_biro);
    const hasilBiro = hasilList.filter(h => h.nama_biro === biro.nama_biro);
    const autoSelesai = hasilBiro.length > 0 && hasilBiro.every(h => h.status !== 'perlu_review_manual');
    const perluReview = hasilBiro.filter(h => h.status === 'perlu_review_manual').length;
    return { ...biro, skor, hasilCount: hasilBiro.length, autoSelesai, perluReview };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Status Pemeriksaan Dokumen</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau progres verifikasi Renja seluruh Biro</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tahun} onValueChange={setTahun}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Unit', value: totalBiro, icon: Building2, color: 'text-primary bg-primary/10' },
          { label: 'Sudah Diperiksa', value: sudahDiperiksa, icon: BarChart2, color: 'text-blue-600 bg-blue-50' },
          { label: 'Layak Kirim', value: layakKirim, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Perlu Revisi', value: perluRevisi, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rata-rata skor */}
      {sudahDiperiksa > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Rata-rata Skor Kesiapan Renja {tahun}</span>
            <span className="text-lg font-bold font-display">{avgSkor} / 100</span>
          </div>
          <Progress value={avgSkor} className="h-2" />
        </div>
      )}

      {/* Tabel per Biro */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold font-heading">Status Per Biro</h2>
        </div>
        <div className="divide-y divide-border">
          {biroWithSkor.map((biro) => {
            const skor = biro.skor;
            const isExpanded = expand === biro.id;
            const statusCfg = STATUS_FINAL_CONFIG[skor?.status_final || 'draft'];
            const levelCfg = skor ? LEVEL_CONFIG[skor.level_kesiapan || 'belum_layak'] : null;

            return (
              <div key={biro.id}>
                <div
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 cursor-pointer"
                  onClick={() => setExpand(isExpanded ? null : biro.id)}
                >
                  {/* Nama biro/unit */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{biro.nama_biro}</p>
                      {biro._isSetda && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0">SETDA</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
                        {statusCfg.label}
                      </Badge>
                      {biro.hasilCount > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {biro.autoSelesai
                            ? <><Bot className="w-3 h-3 text-blue-500" /> AI selesai</>
                            : <><Clock className="w-3 h-3" /> {biro.perluReview} item menunggu</>
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skor total */}
                  {skor ? (
                    <div className="w-32 text-right">
                      <p className={`text-lg font-bold font-display ${levelCfg?.color}`}>{skor.skor_total}</p>
                      <p className={`text-[10px] ${levelCfg?.color}`}>{levelCfg?.label}</p>
                    </div>
                  ) : (
                    <div className="w-32 text-right">
                      <p className="text-sm text-muted-foreground">—</p>
                    </div>
                  )}

                  {/* Progres bar */}
                  <div className="w-28 hidden sm:block">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${levelCfg?.bar || 'bg-muted-foreground/30'}`}
                        style={{ width: `${skor?.skor_total || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Link to={`/pemeriksaan?biro=${encodeURIComponent(biro.nama_biro)}&tahun=${tahun}`}>
                      <Button size="sm" variant="outline" className="text-xs h-7">
                        <Eye className="w-3 h-3 mr-1" /> Periksa
                      </Button>
                    </Link>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Expand: skor per kategori */}
                {isExpanded && skor && (
                  <div className="px-5 pb-4 bg-muted/10">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 pt-3">
                      <SkorBar label="Kelengkapan Dokumen" skor={skor.skor_kelengkapan || 0} color={levelCfg?.bar || 'bg-primary'} />
                      <SkorBar label="Sistematika" skor={skor.skor_sistematika || 0} color={levelCfg?.bar || 'bg-primary'} />
                      <SkorBar label="Tabel Wajib" skor={skor.skor_tabel || 0} color={levelCfg?.bar || 'bg-primary'} />
                      <SkorBar label="Matriks Renja" skor={skor.skor_matriks || 0} color={levelCfg?.bar || 'bg-primary'} />
                      <SkorBar label="Konsistensi Angka" skor={skor.skor_konsistensi || 0} color={levelCfg?.bar || 'bg-primary'} />
                      <SkorBar label="Substansi Bab" skor={skor.skor_substansi || 0} color={levelCfg?.bar || 'bg-primary'} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">
                      Diperiksa: {skor.tanggal_pemeriksaan ? new Date(skor.tanggal_pemeriksaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}