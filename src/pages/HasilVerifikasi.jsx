import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { filterBiroByRole, getSingleBiroForRole, isRestrictedRole } from '@/lib/roleAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CHECKLIST_ITEMS, KATEGORI_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/lib/pemeriksaanRules';
import ScoreGauge from '@/components/dashboard/ScoreGauge';
import ChecklistSection from '@/components/pemeriksaan/ChecklistSection';
import PerbandinganRevisi from '@/components/pemeriksaan/PerbandinganRevisi';
import { FileSearch, Printer, GitCompare, Sheet, FileText } from 'lucide-react';
import { calculateScore } from '@/lib/pemeriksaanRules';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SETDA_NAME } from '@/pages/UploadRenja';
import LaporanPDFGenerator from '@/components/laporan/LaporanPDFGenerator';
import { exportVerifikasiExcel } from '@/components/laporan/ExportExcel';
import { exportVerifikasiWord } from '@/components/laporan/ExportWord';

export default function HasilVerifikasi() {
  const { user } = useOutletContext() || {};
  const role = user?.role;
  const urlParams = new URLSearchParams(window.location.search);
  const [selectedBiro, setSelectedBiro] = useState(urlParams.get('biro') || getSingleBiroForRole(role) || '');
  const [tahun, setTahun] = useState('2027');

  const { data: allBiroList = [] } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => base44.entities.Biro.list(),
  });
  const biroList = filterBiroByRole(role, allBiroList);

  const { data: results = [] } = useQuery({
    queryKey: ['hasil-read', selectedBiro, tahun],
    queryFn: () => selectedBiro
      ? base44.entities.HasilPemeriksaan.filter({ nama_biro: selectedBiro, periode_tahun: parseInt(tahun) }, '-created_date', 200)
      : [],
    enabled: !!selectedBiro,
  });

  // Semua riwayat (termasuk duplikat per item) untuk perbandingan revisi
  const { data: allResults = [] } = useQuery({
    queryKey: ['hasil-all', selectedBiro, tahun],
    queryFn: () => selectedBiro
      ? base44.entities.HasilPemeriksaan.filter({ nama_biro: selectedBiro, periode_tahun: parseInt(tahun) }, 'created_date', 500)
      : [],
    enabled: !!selectedBiro,
  });

  const { data: skorData = [] } = useQuery({
    queryKey: ['skor-read', selectedBiro, tahun],
    queryFn: () => selectedBiro
      ? base44.entities.SkorDokumen.filter({ nama_biro: selectedBiro, periode_tahun: parseInt(tahun) })
      : [],
    enabled: !!selectedBiro,
  });

  const skorDb = skorData[0];

  // Deduplikasi: ambil hanya record terbaru per (kategori + item_pemeriksaan)
  // results sudah diurutkan -created_date, jadi cukup ambil yang pertama muncul per kombinasi
  const latestResults = React.useMemo(() => {
    const seen = new Set();
    return results.filter(r => {
      const key = `${r.kategori}||${r.item_pemeriksaan}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [results]);

  // Hitung skor live dari latestResults agar selalu sinkron dengan Pemeriksaan Detail
  const liveScores = useMemo(() => calculateScore(latestResults), [latestResults]);
  const skor = latestResults.length > 0 ? {
    ...liveScores,
    status_final: skorDb?.status_final,
  } : skorDb;

  const getStatusSummary = () => {
    const summary = {};
    Object.keys(STATUS_LABELS).forEach(s => {
      summary[s] = latestResults.filter(r => r.status === s).length;
    });
    return summary;
  };
  const summary = getStatusSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Hasil Verifikasi</h1>
          <p className="text-sm text-muted-foreground mt-1">Laporan hasil pra-verifikasi dokumen Renja</p>
        </div>
        {latestResults.length > 0 && (
          <div className="flex items-center gap-2">
            <LaporanPDFGenerator
              selectedBiro={selectedBiro}
              tahun={tahun}
              skor={skor}
              results={latestResults}
              summary={summary}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportVerifikasiExcel({ selectedBiro, tahun, skor, results: latestResults })}
            >
              <Sheet className="w-4 h-4 mr-2" /> Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportVerifikasiWord({ selectedBiro, tahun, skor, results: latestResults })}
            >
              <FileText className="w-4 h-4 mr-2" /> Export Word
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Cetak
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 bg-card rounded-xl border border-border p-4">
        <div className="flex-1 max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biro / Unit</label>
          <Select value={selectedBiro} onValueChange={setSelectedBiro}>
            <SelectTrigger><SelectValue placeholder="Pilih biro/unit" /></SelectTrigger>
            <SelectContent>
              {biroList.map(b => (
                <SelectItem key={b.id} value={b.nama_biro}>{b.nama_biro}</SelectItem>
              ))}
              {!isRestrictedRole(role) && <SelectItem value={SETDA_NAME}>{SETDA_NAME}</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tahun</label>
          <Select value={tahun} onValueChange={setTahun}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {latestResults.length > 0 && (
        <>
          {/* Score overview */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-display font-bold">{selectedBiro}</h2>
                <p className="text-sm text-muted-foreground">Renja Tahun {tahun}</p>
              </div>
              <Badge variant="outline" className={cn("text-sm px-3 py-1",
                liveScores.skor_total >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                liveScores.skor_total >= 75 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                liveScores.skor_total >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200'
              )}>
                {liveScores.level_kesiapan?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              <ScoreGauge score={liveScores.skor_total || 0} label="Total" />
              <ScoreGauge score={liveScores.skor_kelengkapan || 0} size="sm" label="Kelengkapan" />
              <ScoreGauge score={liveScores.skor_sistematika || 0} size="sm" label="Sistematika" />
              <ScoreGauge score={liveScores.skor_tabel || 0} size="sm" label="Tabel" />
              <ScoreGauge score={liveScores.skor_matriks || 0} size="sm" label="Matriks" />
              <ScoreGauge score={liveScores.skor_konsistensi || 0} size="sm" label="Konsistensi" />
              <ScoreGauge score={liveScores.skor_substansi || 0} size="sm" label="Substansi" />
              <div className="flex flex-col items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Ringkasan</p>
                  <div className="space-y-0.5 text-[10px]">
                    <p className="text-emerald-600">✓ Sesuai: {summary.sesuai}</p>
                    <p className="text-amber-600">⚠ Perbaikan: {summary.perlu_perbaikan}</p>
                    <p className="text-red-600">✗ Tidak ada: {summary.tidak_ditemukan}</p>
                    <p className="text-blue-600">◎ Review: {summary.perlu_review_manual}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs: Detail & Perbandingan */}
          <Tabs defaultValue="detail">
            <TabsList className="bg-muted/50 rounded-xl p-1">
              <TabsTrigger value="detail" className="text-xs px-4 py-1.5 data-[state=active]:bg-card">
                Detail Temuan
              </TabsTrigger>
              <TabsTrigger value="perbandingan" className="text-xs px-4 py-1.5 data-[state=active]:bg-card flex items-center gap-1.5">
                <GitCompare className="w-3 h-3" /> Perbandingan Revisi
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="mt-4 space-y-4">
              {Object.entries(CHECKLIST_ITEMS).map(([key, items]) => (
                <ChecklistSection
                  key={key}
                  kategori={key}
                  label={KATEGORI_LABELS[key]}
                  items={items}
                  results={latestResults}
                  readOnly={true}
                  onStatusChange={() => {}}
                  onNoteChange={() => {}}
                />
              ))}
            </TabsContent>

            <TabsContent value="perbandingan" className="mt-4">
              <PerbandinganRevisi allResults={allResults} />
            </TabsContent>
          </Tabs>
        </>
      )}

      {!selectedBiro && (
        <div className="text-center py-16 text-muted-foreground">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Pilih biro/unit untuk melihat hasil verifikasi</p>
        </div>
      )}

      {selectedBiro && latestResults.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada hasil pemeriksaan untuk unit ini</p>
        </div>
      )}
    </div>
  );
}