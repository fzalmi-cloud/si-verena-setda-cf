import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { filterBiroByRole, getSingleBiroForRole, isRestrictedRole } from '@/lib/roleAccess';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, CheckCircle2, X, Loader2, FileUp, AlertCircle, Bot, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { jalankanAutoVerifikasi, simpanHasilAutoVerifikasi } from '@/lib/autoVerifikasi';
import { calculateScore } from '@/lib/pemeriksaanRules';

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx';
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const SETDA_NAME = 'Sekretariat Daerah / SETDA';

export const JENIS_OPTIONS = [
  { value: 'renja_biro', label: 'Renja Biro', runAI: true },
  { value: 'draft_renja_setda', label: 'Draft Renja Setda', runAI: true },
  { value: 'revisi_renja', label: 'Revisi Renja', runAI: true },
  { value: 'dokumen_pendukung', label: 'Dokumen Pendukung' },
  { value: 'matriks_renja', label: 'Matriks Renja' },
  { value: 'hasil_verifikasi', label: 'Hasil Verifikasi' },
  { value: 'lampiran', label: 'Lampiran' },
];

const SUB_JENIS_MAP = {
  matriks_renja: 'matriks_excel',
  renja_biro: 'dokumen_narasi_word_pdf',
  draft_renja_setda: 'dokumen_narasi_word_pdf',
  revisi_renja: 'dokumen_narasi_word_pdf',
};

const STATUS_CONFIG = {
  diunggah: { label: 'Diunggah', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  sedang_diproses: { label: 'Sedang Diproses', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  selesai_diproses: { label: 'Selesai Diproses', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  gagal: { label: 'Gagal', cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function UploadRenja() {
  const { user } = useOutletContext() || {};
  const role = user?.role;
  const queryClient = useQueryClient();
  const [selectedBiro, setSelectedBiro] = useState(getSingleBiroForRole(role) || '');
  const [tahun, setTahun] = useState('2027');
  const [jenisDokumen, setJenisDokumen] = useState('renja_biro');
  const [catatan, setCatatan] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [aiProgress, setAiProgress] = useState(null);
  const [aiError, setAiError] = useState('');

  const { data: allBiroList = [] } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => base44.entities.Biro.list(),
  });
  const biroList = filterBiroByRole(role, allBiroList);

  const { data: dokumenList = [], refetch: refetchDokumen } = useQuery({
    queryKey: ['dokumen-renja-upload', selectedBiro, tahun],
    queryFn: () => selectedBiro
      ? base44.entities.DokumenRenja.filter(
          { nama_biro: selectedBiro, periode_tahun: parseInt(tahun) },
          '-created_date', 20
        )
      : base44.entities.DokumenRenja.list('-created_date', 30),
  });

  const { data: fileReferensi = [] } = useQuery({
    queryKey: ['file-referensi'],
    queryFn: () => base44.entities.FileReferensi.filter({ aktif: true }, '-created_date', 20),
  });

  // Saat unit SETDA dipilih, otomatis aktifkan jenis Draft Renja Setda
  // agar alur pemeriksaan khusus Setda langsung berjalan.
  useEffect(() => {
    if (selectedBiro === SETDA_NAME && jenisDokumen !== 'draft_renja_setda') {
      setJenisDokumen('draft_renja_setda');
    }
  }, [selectedBiro]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.DokumenRenja.create(data),
  });

  const handleAutoVerifikasi = async (dokumen) => {
    setAiError('');
    setAiProgress({ step: 0, total: 6, kategori: 'Mempersiapkan...' });
    await base44.entities.DokumenRenja.update(dokumen.id, { status_upload: 'sedang_diproses' });

    const existingResults = await base44.entities.HasilPemeriksaan.filter(
      { nama_biro: dokumen.nama_biro, periode_tahun: dokumen.periode_tahun },
      '-created_date', 200
    );

    const refUrls = fileReferensi.map(f => f.file_url).filter(Boolean);

    try {
      const hasilAuto = await jalankanAutoVerifikasi({
        namaBiro: dokumen.nama_biro,
        periodeTeahun: dokumen.periode_tahun,
        dokumenUrl: dokumen.file_url,
        fileReferensiUrls: refUrls,
        onProgress: (p) => setAiProgress(p),
      });

      await simpanHasilAutoVerifikasi({
        namaBiro: dokumen.nama_biro,
        periodeTeahun: parseInt(dokumen.periode_tahun),
        hasilAuto,
        existingResults,
        queryClient,
      });

      const scores = calculateScore(hasilAuto);
      const existingSkor = await base44.entities.SkorDokumen.filter({
        nama_biro: dokumen.nama_biro,
        periode_tahun: parseInt(dokumen.periode_tahun),
      });
      const skorPayload = {
        nama_biro: dokumen.nama_biro,
        periode_tahun: parseInt(dokumen.periode_tahun),
        ...scores,
        status_final: 'sedang_diperiksa',
        tanggal_pemeriksaan: new Date().toISOString(),
      };
      if (existingSkor.length > 0) {
        await base44.entities.SkorDokumen.update(existingSkor[0].id, skorPayload);
      } else {
        await base44.entities.SkorDokumen.create(skorPayload);
      }

      await base44.entities.DokumenRenja.update(dokumen.id, { status_upload: 'selesai_diproses' });
      queryClient.invalidateQueries({ queryKey: ['skor-dokumen'] });
      queryClient.invalidateQueries({ queryKey: ['hasil-pemeriksaan'] });
      queryClient.invalidateQueries({ queryKey: ['dokumen-renja-upload'] });
      toast.success(`Pemeriksaan selesai! Skor total: ${scores.skor_total}. Lihat detail di Pemeriksaan Detail.`);
    } catch (err) {
      await base44.entities.DokumenRenja.update(dokumen.id, { status_upload: 'gagal' });
      setAiError('Pemeriksaan AI gagal: ' + err.message + '. Anda dapat melakukan input manual di halaman Pemeriksaan Detail.');
      queryClient.invalidateQueries({ queryKey: ['dokumen-renja-upload'] });
    } finally {
      setAiProgress(null);
    }
  };

  const validateFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type) && !f.name.match(/\.(pdf|doc|docx|xls|xlsx)$/i)) {
      setFileError('Format file tidak didukung. Gunakan PDF, Word, atau Excel.');
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
      toast.error('Gagal mengunggah file. Coba lagi.');
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBiro) { toast.error('Pilih nama unit terlebih dahulu'); return; }
    if (!uploadedFile) { toast.error('Pilih file dokumen terlebih dahulu'); return; }
    setAiError('');
    const levelUnit = selectedBiro === SETDA_NAME ? 'setda' : 'biro';
    let created;
    try {
      created = await saveMutation.mutateAsync({
        nama_biro: selectedBiro,
        periode_tahun: parseInt(tahun),
        jenis_dokumen: jenisDokumen,
        sub_jenis: SUB_JENIS_MAP[jenisDokumen] || 'lainnya',
        level_unit: levelUnit,
        status_dokumen: levelUnit === 'setda' ? 'dokumen_setda' : 'dokumen_biro',
        nama_file: uploadedFile.name,
        file_url: uploadedFile.url,
        catatan_upload: catatan || undefined,
        status_upload: 'diunggah',
      });
    } catch (err) {
      toast.error('Gagal menyimpan dokumen: ' + err.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['dokumen-renja'] });
    queryClient.invalidateQueries({ queryKey: ['dokumen-renja-upload'] });
    setFile(null);
    setUploadedFile(null);
    setCatatan('');

    const runAI = JENIS_OPTIONS.find(j => j.value === jenisDokumen)?.runAI;
    if (runAI) {
      toast.success('Dokumen berhasil diunggah! Memulai pemeriksaan AI...');
      await handleAutoVerifikasi(created);
    } else {
      toast.success('Dokumen berhasil disimpan.');
    }
  };

  const formatSize = (bytes) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const isBusy = saveMutation.isPending || !!aiProgress;
  const runAI = !!JENIS_OPTIONS.find(j => j.value === jenisDokumen)?.runAI;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Upload Dokumen Renja</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unggah dokumen Renja Biro maupun Draft Renja Setda dalam satu tempat. Jenis dokumen menentukan alur pemeriksaan.
        </p>
      </div>

      {fileReferensi.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <Bot className="w-4 h-4 flex-shrink-0" />
          <span>AI akan menggunakan <strong>{fileReferensi.length} file referensi</strong> sebagai pedoman pemeriksaan</span>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Biro / Unit <span className="text-destructive">*</span></label>
                <Select value={selectedBiro} onValueChange={setSelectedBiro}>
                  <SelectTrigger><SelectValue placeholder="Pilih biro/unit..." /></SelectTrigger>
                  <SelectContent>
                    {biroList.map(b => <SelectItem key={b.id} value={b.nama_biro}>{b.nama_biro}</SelectItem>)}
                    {!isRestrictedRole(role) && <SelectItem value={SETDA_NAME}>{SETDA_NAME}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tahun Renja <span className="text-destructive">*</span></label>
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

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jenis Dokumen <span className="text-destructive">*</span></label>
              <Select value={jenisDokumen} onValueChange={setJenisDokumen}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis dokumen..." /></SelectTrigger>
                <SelectContent>
                  {JENIS_OPTIONS.map(j => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedBiro === SETDA_NAME && (
                <p className="text-xs text-purple-600 mt-1">
                  Jenis <strong>Draft Renja Setda</strong> aktif. Verifikasi otomatis akan berjalan setelah dokumen diunggah.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">File Dokumen <span className="text-destructive">*</span></label>
              {uploadedFile ? (
                <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-success/40 bg-success/5">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(uploadedFile.size)} · Siap diproses</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFile(null); setUploadedFile(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                    dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  <input type="file" accept={ACCEPTED} className="hidden" onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])} />
                  {uploading ? (
                    <><Loader2 className="w-8 h-8 text-primary animate-spin" /><p className="text-sm text-muted-foreground">Mengunggah file...</p></>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileUp className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Seret file ke sini atau <span className="text-primary">pilih file</span></p>
                        <p className="text-xs text-muted-foreground mt-0.5">PDF, DOC, DOCX · Maksimal 20 MB</p>
                      </div>
                    </>
                  )}
                </label>
              )}
              {fileError && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" />{fileError}
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              <span>
                Dokumen narasi Renja mencakup seluruh bab. Untuk matriks Excel atau dokumen pendukung lain, gunakan menu <strong>Upload Lengkap</strong>.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Catatan <span className="text-xs">(opsional)</span></label>
              <Textarea value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Contoh: Versi revisi ke-2 setelah rapat..." rows={2} />
            </div>

            <Button type="submit" className="w-full h-11" disabled={isBusy || uploading || !uploadedFile}>
              {isBusy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</> : <><Upload className="w-4 h-4 mr-2" />{runAI ? 'Kirim & Periksa Otomatis' : 'Simpan Dokumen'}</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {aiProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-5 h-5 text-blue-600 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">AI sedang memeriksa dokumen...</p>
              <p className="text-xs text-blue-600 mt-0.5">Langkah {aiProgress.step}/{aiProgress.total}: {aiProgress.kategori}</p>
            </div>
          </div>
          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(aiProgress.step / aiProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {aiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Pemeriksaan Otomatis Gagal</p>
              <p className="text-xs text-red-700 mt-1">{aiError}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => window.location.href = '/pemeriksaan?biro=' + selectedBiro + '&tahun=' + tahun}>
              Buka Pemeriksaan Detail (Input Manual)
            </Button>
          </div>
        </div>
      )}

      {dokumenList.length > 0 && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Dokumen {selectedBiro ? `— ${selectedBiro}` : 'Terbaru'} (Tahun {tahun})
            </h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchDokumen()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {dokumenList.map(d => {
              const cfg = STATUS_CONFIG[d.status_upload] || STATUS_CONFIG.diunggah;
              const isSetda = (d.level_unit || (d.nama_biro === SETDA_NAME ? 'setda' : 'biro')) === 'setda';
              return (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSetda ? 'bg-purple-500/10' : 'bg-primary/10'}`}>
                    <FileText className={`w-4 h-4 ${isSetda ? 'text-purple-600' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.nama_file || 'Dokumen'}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.nama_biro} · {d.periode_tahun} · {JENIS_OPTIONS.find(j => j.value === d.jenis_dokumen)?.label || d.jenis_dokumen} · {d.created_date ? format(new Date(d.created_date), 'd MMM yyyy', { locale: idLocale }) : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${isSetda ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {isSetda ? 'SETDA' : 'BIRO'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { step: '1', label: 'Upload Dokumen', active: true },
          { step: '2', label: 'Pemeriksaan AI', active: !!aiProgress },
          { step: '3', label: 'Hasil Verifikasi', active: false },
        ].map(({ step, label, active }) => (
          <div key={step} className={`p-3 rounded-lg border text-xs font-medium ${active ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {step}
            </div>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}