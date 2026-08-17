import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { filterBiroByRole, getSingleBiroForRole, isRestrictedRole } from '@/lib/roleAccess';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle2, X, Loader2, FileUp, AlertCircle, GitCompare, ExternalLink, Clock, ArrowRight } from 'lucide-react';
import { SETDA_NAME } from '@/pages/UploadRenja';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const ACCEPTED = '.pdf,.doc,.docx';
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const STATUS_COLORS = {
  sesuai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  perlu_perbaikan: 'bg-amber-50 text-amber-700 border-amber-200',
  tidak_ditemukan: 'bg-red-50 text-red-700 border-red-200',
  perlu_review_manual: 'bg-blue-50 text-blue-700 border-blue-200',
  tidak_berlaku: 'bg-slate-50 text-slate-500 border-slate-200',
};

const STATUS_LABELS = {
  sesuai: 'Sesuai',
  perlu_perbaikan: 'Perlu Perbaikan',
  tidak_ditemukan: 'Tidak Ditemukan',
  perlu_review_manual: 'Review Manual',
  tidak_berlaku: 'Tidak Berlaku',
};

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TemuanCard({ item }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      <span className={`mt-0.5 inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${STATUS_COLORS[item.status] || ''}`}>
        {STATUS_LABELS[item.status] || item.status}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug">{item.item_pemeriksaan}</p>
        {item.catatan_otomatis && <p className="text-[10px] text-muted-foreground italic mt-0.5">{item.catatan_otomatis}</p>}
        {item.catatan_verifikator && <p className="text-[10px] text-primary mt-0.5">Catatan: {item.catatan_verifikator}</p>}
      </div>
    </div>
  );
}

export default function UploadRevisi() {
  const { user } = useOutletContext() || {};
  const role = user?.role;
  const queryClient = useQueryClient();
  const [selectedBiro, setSelectedBiro] = useState(getSingleBiroForRole(role) || '');
  const [tahun, setTahun] = useState('2027');
  const [catatan, setCatatan] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const { data: allBiroList = [] } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => base44.entities.Biro.list(),
  });
  const biroList = filterBiroByRole(role, allBiroList);

  const isSetda = selectedBiro === SETDA_NAME;

  // Dokumen Renja yang sudah ada untuk biro/unit ini
  // Untuk SETDA: tampilkan draft_renja_setda & revisi_renja; untuk biro: narasi_renja & revisi_renja
  const { data: dokumenListRaw = [] } = useQuery({
    queryKey: ['dokumen-revisi-list', selectedBiro, tahun],
    queryFn: () => selectedBiro
      ? base44.entities.DokumenRenja.filter(
          { nama_biro: selectedBiro, periode_tahun: parseInt(tahun) },
          'created_date', 30
        )
      : [],
    enabled: !!selectedBiro,
  });

  const dokumenList = dokumenListRaw.filter(d =>
    isSetda
      ? ['draft_renja_setda', 'revisi_renja'].includes(d.jenis_dokumen)
      : ['narasi_renja', 'renja_biro', 'revisi_renja'].includes(d.jenis_dokumen)
  );

  // Hasil pemeriksaan terkini
  const { data: hasilPemeriksaan = [] } = useQuery({
    queryKey: ['hasil-revisi', selectedBiro, tahun],
    queryFn: () => selectedBiro
      ? base44.entities.HasilPemeriksaan.filter(
          { nama_biro: selectedBiro, periode_tahun: parseInt(tahun) },
          '-created_date', 200
        )
      : [],
    enabled: !!selectedBiro,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.DokumenRenja.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dokumen-revisi-list'] });
      queryClient.invalidateQueries({ queryKey: ['dokumen-narasi'] });
      toast.success('Dokumen revisi berhasil diunggah! Silakan jalankan pemeriksaan AI ulang.');
      setFile(null);
      setUploadedFile(null);
      setCatatan('');
    },
  });

  const validateFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type) && !f.name.match(/\.(pdf|doc|docx)$/i)) {
      setFileError('Format tidak didukung. Gunakan PDF atau Word.');
      return false;
    }
    if (f.size > 20 * 1024 * 1024) {
      setFileError('Ukuran file maksimal 20 MB.');
      return false;
    }
    setFileError('');
    return true;
  };

  const handleFileSelect = async (f) => {
    if (!validateFile(f)) return;
    setFile(f);
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setUploadedFile({ name: f.name, url: file_url, size: f.size });
    } catch {
      toast.error('Gagal mengunggah file.');
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBiro) { toast.error('Pilih nama unit terlebih dahulu'); return; }
    if (!uploadedFile) { toast.error('Pilih file dokumen revisi'); return; }
    const versiBerikutnya = dokumenList.length + 1;
    saveMutation.mutate({
      nama_biro: selectedBiro,
      periode_tahun: parseInt(tahun),
      jenis_dokumen: isSetda ? 'draft_renja_setda' : 'narasi_renja',
      sub_jenis: 'dokumen_narasi_word_pdf',
      level_unit: isSetda ? 'setda' : 'biro',
      status_dokumen: isSetda ? 'dokumen_setda' : 'dokumen_biro',
      nama_file: uploadedFile.name,
      file_url: uploadedFile.url,
      catatan_upload: catatan || `Revisi v${versiBerikutnya}`,
      status_upload: 'diunggah',
      versi: versiBerikutnya,
    });
  };

  const dokumenAwal = dokumenList[0];
  const dokumenTerbaru = dokumenList[dokumenList.length - 1];
  const adaRevisi = dokumenList.length > 1;

  // Pisahkan temuan bermasalah
  const temuanBermasalah = hasilPemeriksaan.filter(h =>
    h.status === 'perlu_perbaikan' || h.status === 'tidak_ditemukan'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Upload Dokumen Revisi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unggah versi perbaikan dokumen Renja berdasarkan catatan hasil pemeriksaan
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 bg-card rounded-xl border border-border p-4">
        <div className="flex-1 max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biro / Unit</label>
          <Select value={selectedBiro} onValueChange={(v) => { setSelectedBiro(v); setUploadedFile(null); setFile(null); }}>
            <SelectTrigger><SelectValue placeholder="Pilih biro/unit..." /></SelectTrigger>
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
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2028">2028</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedBiro && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kolom kiri: Upload form + catatan temuan */}
          <div className="space-y-4">
            {/* Catatan temuan yang harus diperbaiki */}
            {temuanBermasalah.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm font-semibold text-amber-800">
                    {temuanBermasalah.length} Temuan yang Perlu Diperbaiki
                  </p>
                </div>
                <div className="px-4 py-2 max-h-64 overflow-y-auto">
                  {temuanBermasalah.map((item) => (
                    <TemuanCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Form upload */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <FileUp className="w-4 h-4 text-primary" /> Unggah Versi Revisi Baru
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Drop zone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">File Dokumen Revisi *</label>
                  {uploadedFile ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-300 bg-emerald-50">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(uploadedFile.size)}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => { setFile(null); setUploadedFile(null); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                    >
                      <input type="file" accept={ACCEPTED} className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) handleFileSelect(f); }} />
                      {uploading ? (
                        <><Loader2 className="w-6 h-6 text-primary animate-spin" /><p className="text-xs text-muted-foreground">Mengunggah...</p></>
                      ) : (
                        <><FileUp className="w-6 h-6 text-muted-foreground" /><p className="text-xs text-center">Seret file ke sini atau <span className="text-primary font-medium">pilih file</span><br /><span className="text-muted-foreground">PDF, DOC, DOCX · Maks 20 MB</span></p></>
                      )}
                    </label>
                  )}
                  {fileError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fileError}</p>}
                </div>

                {/* Riwayat versi */}
                {dokumenList.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Riwayat Versi</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {dokumenList.map((dok, i) => (
                        <div key={dok.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-muted/40">
                          <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">v{dok.versi || i + 1}</span>
                          <span className="text-muted-foreground truncate flex-1">{dok.nama_file}</span>
                          <span className="text-muted-foreground flex-shrink-0">
                            {dok.created_date ? format(new Date(dok.created_date), 'd MMM yyyy', { locale: id }) : ''}
                          </span>
                          {dok.file_url && (
                            <a href={dok.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-70">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">Catatan Revisi</label>
                  <Textarea
                    value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                    placeholder="Contoh: Perbaikan konsistensi angka BAB III dan IV, penambahan tabel T-C.29..."
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saveMutation.isPending || uploading || !uploadedFile}>
                  {saveMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</>
                    : <><Upload className="w-4 h-4 mr-2" />Unggah Revisi v{dokumenList.length + 1}</>
                  }
                </Button>

                {saveMutation.isSuccess && (
                  <div className="text-xs text-center text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                    Revisi berhasil! Pergi ke menu <strong>Pemeriksaan</strong> untuk menjalankan AI ulang.
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Kolom kanan: Perbandingan versi berdampingan */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Perbandingan Versi Dokumen</h3>
              </div>

              {!adaRevisi ? (
                <div className="p-8 text-center text-muted-foreground">
                  <GitCompare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada revisi. Perbandingan tampil setelah dokumen perbaikan diunggah.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 divide-x divide-border">
                  {/* Versi Awal */}
                  <div>
                    <div className="px-3 py-2 bg-slate-50 border-b border-border">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Versi Awal</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5 truncate">{dokumenAwal?.nama_file}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {dokumenAwal?.created_date ? format(new Date(dokumenAwal.created_date), 'd MMM yyyy', { locale: id }) : ''}
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        {['sesuai','perlu_perbaikan','tidak_ditemukan','perlu_review_manual'].map(s => {
                          // Ambil record paling awal per item
                          const cnt = hasilPemeriksaan.length;
                          const half = Math.floor(cnt / 2);
                          const awal = hasilPemeriksaan.slice(half); // yang lama (created_date asc)
                          const c = awal.filter(h => h.status === s).length;
                          return (
                            <div key={s} className={`rounded px-1.5 py-1 border text-center ${STATUS_COLORS[s]}`}>
                              <p className="font-bold text-sm">{c}</p>
                              <p className="leading-tight">{STATUS_LABELS[s]}</p>
                            </div>
                          );
                        })}
                      </div>
                      {dokumenAwal?.file_url && (
                        <a href={dokumenAwal.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" /> Buka dokumen
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Versi Terbaru */}
                  <div>
                    <div className="px-3 py-2 bg-primary/5 border-b border-border">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Revisi Terbaru</p>
                      <p className="text-xs font-medium text-foreground mt-0.5 truncate">{dokumenTerbaru?.nama_file}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {dokumenTerbaru?.created_date ? format(new Date(dokumenTerbaru.created_date), 'd MMM yyyy', { locale: id }) : ''}
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        {['sesuai','perlu_perbaikan','tidak_ditemukan','perlu_review_manual'].map(s => {
                          const terbaru = hasilPemeriksaan.slice(0, Math.floor(hasilPemeriksaan.length / 2));
                          const c = terbaru.filter(h => h.status === s).length;
                          return (
                            <div key={s} className={`rounded px-1.5 py-1 border text-center ${STATUS_COLORS[s]}`}>
                              <p className="font-bold text-sm">{c}</p>
                              <p className="leading-tight">{STATUS_LABELS[s]}</p>
                            </div>
                          );
                        })}
                      </div>
                      {dokumenTerbaru?.file_url && (
                        <a href={dokumenTerbaru.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" /> Buka dokumen
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ringkasan perubahan per item */}
            {adaRevisi && temuanBermasalah.length > 0 && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold">Item yang Masih Perlu Perbaikan</p>
                  <p className="text-xs text-muted-foreground">Berdasarkan pemeriksaan terakhir</p>
                </div>
                <div className="divide-y divide-border max-h-80 overflow-y-auto">
                  {temuanBermasalah.map(item => (
                    <div key={item.id} className="px-4 py-2 flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{item.item_pemeriksaan}</p>
                        {item.catatan_otomatis && <p className="text-[10px] text-muted-foreground italic">{item.catatan_otomatis}</p>}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedBiro && (
        <div className="text-center py-16 text-muted-foreground">
          <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Pilih biro/unit untuk melihat riwayat versi dan mengunggah revisi</p>
        </div>
      )}
    </div>
  );
}