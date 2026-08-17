import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { filterBiroByRole, isRestrictedRole } from '@/lib/roleAccess';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CHECKLIST_ITEMS, KATEGORI_LABELS, calculateScore } from '@/lib/pemeriksaanRules';
import { jalankanAutoVerifikasi, simpanHasilAutoVerifikasi } from '@/lib/autoVerifikasi';
import ChecklistSection from '@/components/pemeriksaan/ChecklistSection';
import ScoreGauge from '@/components/dashboard/ScoreGauge';
import VerifikatorActions from '@/components/pemeriksaan/VerifikatorActions';
import { Bot, Loader2, AlertTriangle, CheckCircle2, XCircle, Lock, FileSearch, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { SETDA_NAME } from '@/pages/UploadRenja';

const NARRATIVE_JENIS = ['narasi_renja', 'renja_biro', 'draft_renja_setda', 'revisi_renja'];

// Alur pemeriksaan:
// 1. Pilih biro → Jalankan Pemeriksaan AI  (status: sedang_diperiksa)
// 2. AI selesai → verifikator bisa review tiap item
// 3. Verifikator: Setujui / Tolak / Intervensi manual
//    - Setujui  → status_final = layak_kirim
//    - Tolak    → status_final = perlu_revisi
//    - Intervensi → simpan perubahan manual, status divalidasi

export default function Pemeriksaan() {
  const { user } = useOutletContext() || {};
  const role = user?.role;
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [selectedBiro, setSelectedBiro] = useState(params.get('biro') || '');
  const [tahun, setTahun] = useState(params.get('tahun') || '2027');
  const [localResults, setLocalResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [autoProgress, setAutoProgress] = useState(null);

  const { data: allBiroList = [] } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => base44.entities.Biro.list(),
  });
  const biroList = filterBiroByRole(role, allBiroList);

  const { data: existingResults = [], isLoading } = useQuery({
    queryKey: ['hasil-pemeriksaan', selectedBiro, tahun],
    queryFn: () => selectedBiro
      ? base44.entities.HasilPemeriksaan.filter(
          { nama_biro: selectedBiro, periode_tahun: parseInt(tahun) },
          '-created_date', 200
        )
      : [],
    enabled: !!selectedBiro,
  });

  const { data: skorList = [] } = useQuery({
    queryKey: ['skor-read', selectedBiro, tahun],
    queryFn: () => selectedBiro
      ? base44.entities.SkorDokumen.filter({ nama_biro: selectedBiro, periode_tahun: parseInt(tahun) })
      : [],
    enabled: !!selectedBiro,
  });

  const { data: dokumenList = [] } = useQuery({
    queryKey: ['dokumen-narasi', selectedBiro, tahun],
    queryFn: async () => {
      if (!selectedBiro) return [];
      const all = await base44.entities.DokumenRenja.filter(
        { nama_biro: selectedBiro, periode_tahun: parseInt(tahun) },
        '-created_date', 30
      );
      return all.filter(d => NARRATIVE_JENIS.includes(d.jenis_dokumen));
    },
    enabled: !!selectedBiro,
  });

  const { data: fileReferensi = [] } = useQuery({
    queryKey: ['file-referensi'],
    queryFn: () => base44.entities.FileReferensi.filter({ aktif: true }, '-created_date', 20),
  });

  useEffect(() => {
    setLocalResults(existingResults);
  }, [existingResults]);

  const skorData = skorList[0];
  const sudahAdaHasil = existingResults.length > 0;
  const aiSudahJalan = sudahAdaHasil;
  const statusFinal = skorData?.status_final;

  // ── Jalankan Pemeriksaan AI ───────────────────────────────────────────────
  const handleAutoVerifikasi = async () => {
    if (!selectedBiro) { toast.error('Pilih biro terlebih dahulu'); return; }
    setSaving(true);
    setAutoProgress({ step: 0, total: 6, kategori: 'Mempersiapkan...' });

    // Init kelengkapan dokumen (review manual)
    const kelengkapanItems = CHECKLIST_ITEMS.kelengkapan_dokumen;
    const toInitKelengkapan = kelengkapanItems
      .filter(item => !existingResults.find(r => r.item_pemeriksaan === item.item && r.kategori === 'kelengkapan_dokumen'))
      .map(item => ({
        nama_biro: selectedBiro,
        periode_tahun: parseInt(tahun),
        kategori: 'kelengkapan_dokumen',
        sub_kategori: item.sub || '',
        item_pemeriksaan: item.item,
        status: 'perlu_review_manual',
        catatan_otomatis: item.catatan_auto || '',
        status_validasi: 'belum_divalidasi',
      }));
    if (toInitKelengkapan.length > 0) {
      await base44.entities.HasilPemeriksaan.bulkCreate(toInitKelengkapan);
    }

    const dokumenUrl = dokumenList[0]?.file_url || null;
    const refUrls = fileReferensi.map(f => f.file_url).filter(Boolean);

    try {
      const hasilAuto = await jalankanAutoVerifikasi({
        namaBiro: selectedBiro,
        periodeTeahun: tahun,
        dokumenUrl,
        fileReferensiUrls: refUrls,
        onProgress: (p) => setAutoProgress(p),
      });

      await simpanHasilAutoVerifikasi({
        namaBiro: selectedBiro,
        periodeTeahun: tahun,
        hasilAuto,
        existingResults,
        queryClient,
      });

      // Set status sedang_diperiksa
      await upsertSkor({ status_final: 'sedang_diperiksa' });

      queryClient.invalidateQueries({ queryKey: ['hasil-pemeriksaan'] });
      queryClient.invalidateQueries({ queryKey: ['skor-read'] });
      toast.success('Pemeriksaan AI selesai! Silakan review dan ambil keputusan.');
    } catch (err) {
      toast.error('Terjadi kesalahan saat pemeriksaan otomatis');
    } finally {
      setSaving(false);
      setAutoProgress(null);
    }
  };

  // ── Helper upsert skor ────────────────────────────────────────────────────
  const upsertSkor = async (extraData = {}) => {
    const scores = calculateScore(localResults.length > 0 ? localResults : existingResults);
    const scoreData = {
      nama_biro: selectedBiro,
      periode_tahun: parseInt(tahun),
      ...scores,
      tanggal_pemeriksaan: new Date().toISOString(),
      ...extraData,
    };
    const existing = await base44.entities.SkorDokumen.filter({
      nama_biro: selectedBiro,
      periode_tahun: parseInt(tahun),
    });
    if (existing.length > 0) {
      await base44.entities.SkorDokumen.update(existing[0].id, scoreData);
    } else {
      await base44.entities.SkorDokumen.create(scoreData);
    }
  };

  // ── Setujui ───────────────────────────────────────────────────────────────
  const handleApprove = async (catatan) => {
    setSaving(true);
    try {
      for (const result of localResults) {
        if (result.id) {
          await base44.entities.HasilPemeriksaan.update(result.id, {
            status: result.status,
            catatan_verifikator: result.catatan_verifikator || '',
            status_validasi: 'divalidasi',
          });
        }
      }
      await upsertSkor({
        status_final: 'layak_kirim',
        ...(catatan ? { catatan_upload: catatan } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['hasil-pemeriksaan'] });
      queryClient.invalidateQueries({ queryKey: ['skor-read'] });
      queryClient.invalidateQueries({ queryKey: ['skor-dokumen'] });
      toast.success('Dokumen disetujui dan ditandai Layak Kirim!');
    } finally {
      setSaving(false);
    }
  };

  // ── Tolak ─────────────────────────────────────────────────────────────────
  const handleReject = async (catatan) => {
    setSaving(true);
    try {
      await upsertSkor({ status_final: 'perlu_revisi' });
      // Catat catatan penolakan ke semua item yang bermasalah
      const bermasalah = localResults.filter(r => r.status !== 'sesuai' && r.status !== 'tidak_berlaku');
      for (const r of bermasalah) {
        if (r.id) {
          await base44.entities.HasilPemeriksaan.update(r.id, {
            catatan_verifikator: catatan || r.catatan_verifikator || '',
            status_validasi: 'ditolak',
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['hasil-pemeriksaan'] });
      queryClient.invalidateQueries({ queryKey: ['skor-read'] });
      queryClient.invalidateQueries({ queryKey: ['skor-dokumen'] });
      toast.success('Dokumen ditolak. Biro diminta melakukan revisi.');
    } finally {
      setSaving(false);
    }
  };

  // ── Intervensi manual ─────────────────────────────────────────────────────
  const handleSaveIntervention = async () => {
    setSaving(true);
    try {
      for (const result of localResults) {
        if (result.id) {
          await base44.entities.HasilPemeriksaan.update(result.id, {
            status: result.status,
            catatan_verifikator: result.catatan_verifikator || '',
            status_validasi: 'divalidasi',
          });
        }
      }
      const scores = calculateScore(localResults);
      await upsertSkor({
        ...scores,
        status_final: scores.skor_total >= 75 ? 'layak_kirim' : 'perlu_revisi',
      });
      queryClient.invalidateQueries({ queryKey: ['hasil-pemeriksaan'] });
      queryClient.invalidateQueries({ queryKey: ['skor-read'] });
      queryClient.invalidateQueries({ queryKey: ['skor-dokumen'] });
      toast.success('Intervensi disimpan. Skor diperbarui.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (item, newStatus) => {
    setLocalResults(prev => prev.map(r =>
      r.item_pemeriksaan === item.item ? { ...r, status: newStatus } : r
    ));
  };

  const handleNoteChange = (item, note) => {
    setLocalResults(prev => prev.map(r =>
      r.item_pemeriksaan === item.item ? { ...r, catatan_verifikator: note } : r
    ));
  };

  const scores = calculateScore(localResults);
  const sesuaiCount = localResults.filter(r => r.status === 'sesuai').length;

  const statusBadge = {
    draft:            { label: 'Draft',            cls: 'bg-slate-50 text-slate-600 border-slate-300' },
    sedang_diperiksa: { label: 'Menunggu Keputusan', cls: 'bg-blue-50 text-blue-700 border-blue-300' },
    perlu_revisi:     { label: 'Ditolak / Revisi',  cls: 'bg-red-50 text-red-700 border-red-200' },
    layak_kirim:      { label: 'Disetujui',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    sudah_dikirim:    { label: 'Sudah Dikirim',     cls: 'bg-primary/10 text-primary border-primary/30' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Pemeriksaan Dokumen Renja</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI memeriksa otomatis berdasarkan dokumen yang diunggah → verifikator setujui / tolak / intervensi
          </p>
        </div>
        {statusFinal && (
          <Badge variant="outline" className={`text-sm px-3 py-1 ${statusBadge[statusFinal]?.cls || ''}`}>
            {statusBadge[statusFinal]?.label || statusFinal}
          </Badge>
        )}
      </div>

      {/* Info file referensi */}
      {fileReferensi.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span>AI akan menggunakan <strong>{fileReferensi.length} file referensi</strong> dari halaman File Referensi AI sebagai pedoman pemeriksaan</span>
        </div>
      )}

      {/* Filter + Tombol AI */}
      <div className="flex items-end gap-4 bg-card rounded-xl border border-border p-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biro</label>
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
        <Button
          onClick={handleAutoVerifikasi}
          disabled={saving || !selectedBiro}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving && autoProgress
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />AI Memeriksa...</>
            : <><Bot className="w-4 h-4 mr-2" />{aiSudahJalan ? 'Periksa Ulang (AI)' : 'Jalankan Pemeriksaan AI'}</>
          }
        </Button>
      </div>

      {/* Banner progres AI */}
      {autoProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Bot className="w-5 h-5 text-blue-600 animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">AI sedang memeriksa dokumen secara otomatis...</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Langkah {autoProgress.step} dari {autoProgress.total}: {autoProgress.kategori}
            </p>
            <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(autoProgress.step / autoProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hasil pemeriksaan */}
      {localResults.length > 0 && !autoProgress && (
        <>
          {/* Info alur */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span className="text-amber-800 text-xs">
              Hasil di bawah adalah analisis AI. Review setiap item dan ubah bila perlu (Intervensi), 
              atau langsung ambil keputusan dengan tombol <strong>Setujui</strong> / <strong>Tolak</strong>.
            </span>
          </div>

          {/* Skor preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(KATEGORI_LABELS).map(([key, label]) => {
              const scoreKey = `skor_${key === 'kelengkapan_dokumen' ? 'kelengkapan' : key === 'sistematika_dokumen' ? 'sistematika' : key === 'tabel_wajib' ? 'tabel' : key === 'matriks_renja' ? 'matriks' : key === 'konsistensi_angka' ? 'konsistensi' : key === 'substansi_bab' ? 'substansi' : 'total'}`;
              return (
                <div key={key} className="bg-card rounded-xl border border-border p-3 text-center">
                  <ScoreGauge score={scores[scoreKey] || 0} size="sm" />
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
                </div>
              );
            })}
          </div>

          {/* Statistik ringkas */}
          <div className="flex items-center gap-4 text-xs flex-wrap">
            {[
              { label: 'Sesuai', count: localResults.filter(r => r.status === 'sesuai').length, color: 'text-emerald-600' },
              { label: 'Perlu Perbaikan', count: localResults.filter(r => r.status === 'perlu_perbaikan').length, color: 'text-amber-600' },
              { label: 'Tidak Ditemukan', count: localResults.filter(r => r.status === 'tidak_ditemukan').length, color: 'text-red-600' },
              { label: 'Perlu Review', count: localResults.filter(r => r.status === 'perlu_review_manual').length, color: 'text-blue-600' },
            ].map(({ label, count, color }) => count > 0 && (
              <span key={label} className={`font-medium ${color}`}>{label}: {count}</span>
            ))}
          </div>

          {/* ── Panel keputusan verifikator ── */}
          <VerifikatorActions
            onApprove={handleApprove}
            onReject={handleReject}
            onSaveIntervention={handleSaveIntervention}
            saving={saving}
            totalItems={localResults.filter(r => r.status !== 'tidak_berlaku').length}
            sesuaiCount={sesuaiCount}
          />

          {/* Checklist per kategori */}
          <Tabs defaultValue="kelengkapan_dokumen">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
              {Object.entries(KATEGORI_LABELS).map(([key, label]) => {
                const countManual = localResults.filter(r => r.kategori === key && r.status === 'perlu_review_manual').length;
                return (
                  <TabsTrigger key={key} value={key} className="text-xs px-3 py-1.5 data-[state=active]:bg-card relative">
                    {label.split(' ').slice(0, 2).join(' ')}
                    {countManual > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                        {countManual}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {Object.entries(CHECKLIST_ITEMS).map(([key, items]) => (
              <TabsContent key={key} value={key} className="mt-4">
                <ChecklistSection
                  kategori={key}
                  label={KATEGORI_LABELS[key]}
                  items={items}
                  results={localResults}
                  onStatusChange={handleStatusChange}
                  onNoteChange={handleNoteChange}
                  readOnly={statusFinal === 'layak_kirim' || statusFinal === 'sudah_dikirim'}
                />
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {!selectedBiro && !saving && (
        <div className="text-center py-16 text-muted-foreground">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Pilih biro lalu klik "Jalankan Pemeriksaan AI"</p>
          <p className="text-xs mt-1 opacity-70">
            AI akan memeriksa 6 kategori berdasarkan dokumen yang diunggah. Verifikator mengonfirmasi atau mengintervensi hasilnya.
          </p>
        </div>
      )}

      {selectedBiro && !isLoading && !saving && !autoProgress && localResults.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileSearch className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada hasil pemeriksaan. Klik "Jalankan Pemeriksaan AI" untuk memulai.</p>
        </div>
      )}
    </div>
  );
}