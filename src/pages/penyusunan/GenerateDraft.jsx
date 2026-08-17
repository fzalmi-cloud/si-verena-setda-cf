import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2, CheckCircle2, AlertTriangle, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const BIRO_LIST = [
  'Biro Pemerintahan dan Otonomi Daerah','Biro Kesejahteraan Rakyat','Biro Hukum',
  'Biro Pengadaan Barang dan Jasa','Biro Perekonomian','Biro Administrasi Pembangunan',
  'Biro Administrasi Pimpinan','Biro Umum','Biro Organisasi',
];
const SETDA_NAME = 'Sekretariat Daerah / SETDA';

const BAB_STRUKTUR = [
  { nomor: '1', judul: 'PENDAHULUAN', sub: [
    { nomor: '1.1', judul: 'Latar Belakang' },
    { nomor: '1.2', judul: 'Landasan Hukum' },
    { nomor: '1.3', judul: 'Maksud dan Tujuan' },
    { nomor: '1.4', judul: 'Sistematika Penulisan' },
  ]},
  { nomor: '2', judul: 'HASIL EVALUASI RENJA SEKRETARIAT DAERAH TAHUN LALU', sub: [
    { nomor: '2.1', judul: 'Evaluasi Pelaksanaan Renja dan Capaian Renstra' },
    { nomor: '2.2', judul: 'Analisis Kinerja Pelayanan Sekretariat Daerah' },
    { nomor: '2.3', judul: 'Isu-Isu Penting Penyelenggaraan Tugas dan Fungsi' },
    { nomor: '2.4', judul: 'Review terhadap Rancangan Awal RKPD' },
    { nomor: '2.5', judul: 'Penelaahan Usulan Program dan Kegiatan' },
  ]},
  { nomor: '3', judul: 'TUJUAN DAN SASARAN SEKRETARIAT DAERAH', sub: [
    { nomor: '3.1', judul: 'Telaahan terhadap Kebijakan Nasional dan Daerah' },
    { nomor: '3.2', judul: 'Tujuan dan Sasaran Renja Sekretariat Daerah' },
    { nomor: '3.3', judul: 'Program, Kegiatan, dan Subkegiatan' },
  ]},
  { nomor: '4', judul: 'RENCANA KERJA DAN PENDANAAN SEKRETARIAT DAERAH', sub: [
    { nomor: '4.1', judul: 'Rencana Program, Kegiatan, Indikator, Target, Lokasi, dan Pendanaan' },
    { nomor: '4.2', judul: 'Rekapitulasi Berdasarkan Biro' },
    { nomor: '4.3', judul: 'Rekapitulasi Dukungan terhadap Prioritas Pembangunan' },
    { nomor: '4.4', judul: 'Prakiraan Maju Tahun Berikutnya' },
  ]},
  { nomor: '5', judul: 'PENUTUP', sub: [
    { nomor: '5.1', judul: 'Catatan Penting' },
    { nomor: '5.2', judul: 'Kaidah Pelaksanaan' },
    { nomor: '5.3', judul: 'Rencana Tindak Lanjut' },
  ]},
];

function buildPromptForBab(nomor, judul, konteks) {
  const sysPrompt = `Kamu adalah asisten penyusun dokumen perencanaan perangkat daerah. Tugasmu menyusun Draft Renja Sekretariat Daerah Provinsi Sumatera Barat berdasarkan data resmi yang tersimpan dalam sistem. Gunakan Permendagri Nomor 86 Tahun 2017, Surat Edaran Gubernur tentang Penyusunan Rancangan Awal Renja Tahun 2027, Renstra Setda 2025–2029, kertas kerja penyusunan Renja, hasil verifikasi internal, dan Renja terakhir dari 9 biro serta draft renja setda (jika ada) sebagai sumber. Jangan membuat data baru yang tidak ada dalam sistem. Jika data tidak tersedia, beri penanda [Data belum tersedia di sistem]. Jika informasi perlu keputusan verifikator, beri penanda [Perlu review verifikator]. Susun dokumen dengan bahasa formal pemerintahan, sistematis, dan sesuai format Renja Perangkat Daerah.`;

  return `${sysPrompt}

Susun HANYA bagian BAB ${nomor} - ${judul} dari Draft Renja Setda Provinsi Sumatera Barat Tahun 2027.

KONTEKS DATA YANG TERSEDIA:
${konteks}

ATURAN PENTING:
- Gunakan bahasa formal pemerintahan Indonesia
- Jika data tidak tersedia tulis: [Data belum tersedia di sistem]
- Jika perlu validasi pejabat tulis: [Perlu review verifikator]
- Jika ada perbedaan data antar biro tulis: [Terdapat perbedaan data, perlu review verifikator]
- Jika program/kegiatan tidak cocok Renstra tulis: [Perlu cek kesesuaian dengan Renstra Setda]
- Di akhir setiap bagian, cantumkan SUMBER DATA yang digunakan dalam format: **Sumber Data:** [daftar sumber]
- Susun dengan sub-bab sesuai struktur Permendagri 86/2017

Hasilkan narasi lengkap untuk BAB ${nomor} - ${judul}:`;
}

export default function GenerateDraft() {
  const { user } = useOutletContext() || {};
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [tahun, setTahun] = useState(searchParams.get('tahun') || '2027');
  const [catatan, setCatatan] = useState('');
  const [progress, setProgress] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { data: dokumen = [] } = useQuery({
    queryKey: ['dok-gen', tahun],
    queryFn: () => base44.entities.DokumenRenja.filter({ periode_tahun: parseInt(tahun) }, '-created_date', 200),
  });
  const { data: hasilList = [] } = useQuery({
    queryKey: ['hasil-gen', tahun],
    queryFn: () => base44.entities.HasilPemeriksaan.filter({ periode_tahun: parseInt(tahun) }),
  });
  const { data: skorList = [] } = useQuery({
    queryKey: ['skor-gen', tahun],
    queryFn: () => base44.entities.SkorDokumen.filter({ periode_tahun: parseInt(tahun) }),
  });
  const { data: fileRef = [] } = useQuery({
    queryKey: ['fileref-gen'],
    queryFn: () => base44.entities.FileReferensi.filter({ aktif: true }),
  });
  const { data: riwayatRevisi = [] } = useQuery({
    queryKey: ['riwayat-gen', tahun],
    queryFn: () => base44.entities.RiwayatRevisi.filter({ periode_tahun: parseInt(tahun) }),
  });

  function buildKonteks() {
    const biroStatus = BIRO_LIST.map(b => {
      const dok = dokumen.filter(d => d.nama_biro === b).sort((a, c) => new Date(c.created_date) - new Date(a.created_date))[0];
      const skor = skorList.find(s => s.nama_biro === b);
      const catatan = hasilList.filter(h => h.nama_biro === b && h.catatan_verifikator).map(h => h.catatan_verifikator).slice(0,3).join('; ');
      return `- ${b}: ${dok ? `dokumen tersedia (${dok.jenis_dokumen}, status: ${dok.status_upload})` : 'BELUM ADA DOKUMEN'}, skor: ${skor?.skor_total ?? 'belum diperiksa'}, catatan: ${catatan || 'tidak ada catatan'}`;
    }).join('\n');

    const setdaDok = dokumen.filter(d => d.nama_biro === SETDA_NAME).sort((a,c) => new Date(c.created_date) - new Date(a.created_date))[0];
    const refNames = fileRef.map(f => f.judul).join(', ');
    const totalCatatan = hasilList.filter(h => h.status === 'perlu_perbaikan').length;

    return `Status Biro:\n${biroStatus}\n\nDraft Renja Setda: ${setdaDok ? `tersedia (${setdaDok.nama_file})` : 'belum ada'}\nDokumen Referensi: ${refNames || 'tidak ada'}\nTotal catatan perbaikan: ${totalCatatan}\nTahun Renja: ${tahun}`;
  }

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setProgress({ step: 0, total: BAB_STRUKTUR.length + 2, label: 'Mempersiapkan data...' });

    try {
      const konteks = buildKonteks();
      const biroDigunakan = BIRO_LIST.filter(b => dokumen.some(d => d.nama_biro === b));

      // Buat record draft utama
      setProgress({ step: 1, total: BAB_STRUKTUR.length + 2, label: 'Membuat draft...' });
      const draft = await base44.entities.DraftRenjaSetda.create({
        tahun: parseInt(tahun),
        versi: 1,
        judul: `Draft Renja Sekretariat Daerah Provinsi Sumatera Barat Tahun ${tahun}`,
        status: 'draft_otomatis',
        generated_by: user?.full_name || 'Sistem',
        generated_at: new Date().toISOString(),
        catatan_umum: catatan || undefined,
        jumlah_biro: biroDigunakan.length,
        biro_digunakan: biroDigunakan,
      });

      // Generate setiap BAB
      let babUrutan = 1;
      for (const bab of BAB_STRUKTUR) {
        setProgress({ step: babUrutan + 1, total: BAB_STRUKTUR.length + 2, label: `Generate BAB ${bab.nomor} — ${bab.judul}...` });
        
        const prompt = buildPromptForBab(bab.nomor, bab.judul, konteks);
        const fileUrls = fileRef.filter(f => f.file_url).map(f => f.file_url).slice(0, 3);
        
        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          file_urls: fileUrls.length > 0 ? fileUrls : undefined,
          model: 'claude_sonnet_4_6',
        });

        const sumber = [
          ...biroDigunakan.map(b => `Renja ${b}`),
          ...fileRef.map(f => f.judul).slice(0, 5),
        ];

        await base44.entities.DraftRenjaBab.create({
          draft_id: draft.id,
          nomor_bab: bab.nomor,
          judul_bab: `BAB ${bab.nomor} ${bab.judul}`,
          isi_bab: result,
          status_bab: 'draft_otomatis',
          sumber_data: sumber,
          urutan: babUrutan,
        });

        // Buat sub-bab (placeholder)
        for (const sub of bab.sub) {
          await base44.entities.DraftRenjaBab.create({
            draft_id: draft.id,
            nomor_bab: sub.nomor,
            judul_bab: sub.judul,
            isi_bab: `[Lihat narasi di BAB ${bab.nomor}]`,
            status_bab: 'draft_otomatis',
            sumber_data: sumber,
            urutan: babUrutan + 0.1,
          });
        }
        babUrutan++;
      }

      // Buat ringkasan eksekutif
      setProgress({ step: BAB_STRUKTUR.length + 2, total: BAB_STRUKTUR.length + 2, label: 'Menyusun ringkasan eksekutif...' });
      const ringkasan = await base44.integrations.Core.InvokeLLM({
        prompt: `Buat ringkasan eksekutif singkat (maksimal 300 kata) untuk Draft Renja Sekretariat Daerah Provinsi Sumatera Barat Tahun ${tahun} berdasarkan konteks berikut:\n\n${konteks}\n\nGunakan bahasa formal pemerintahan. Jika data tidak tersedia tulis [Data belum tersedia].`,
        model: 'claude_sonnet_4_6',
      });
      await base44.entities.DraftRenjaSetda.update(draft.id, { ringkasan_eksekutif: ringkasan });

      qc.invalidateQueries({ queryKey: ['draft-renja-list'] });
      toast.success('Draft Renja Setda berhasil digenerate!');
      navigate(`/penyusunan/editor/${draft.id}`);
    } catch (err) {
      toast.error('Gagal generate draft: ' + err.message);
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  const biroSiap = BIRO_LIST.filter(b => dokumen.some(d => d.nama_biro === b)).length;
  const adaSetda = dokumen.some(d => d.nama_biro === SETDA_NAME);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Generate Draft Renja Setda</h1>
        <p className="text-sm text-muted-foreground mt-1">AI akan menyusun draft lengkap berdasarkan data 9 biro yang tersimpan di sistem</p>
      </div>

      {/* Info sumber */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
          <Bot className="w-5 h-5" /> Sumber Data yang Akan Digunakan
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <span>{biroSiap}/9 Biro sudah upload Renja</span>
          </div>
          <div className="flex items-center gap-1.5">
            {adaSetda ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
            <span>Draft Renja Setda: {adaSetda ? 'Tersedia' : 'Belum ada'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <span>{fileRef.length} file referensi (Renstra, SE, dll)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <span>{hasilList.length} hasil pemeriksaan internal</span>
          </div>
        </div>
      </div>

      {/* Struktur BAB */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Struktur Draft yang Akan Dibuat</h3>
        <div className="space-y-2">
          {BAB_STRUKTUR.map(bab => (
            <div key={bab.nomor} className="flex items-start gap-2">
              <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-0.5">BAB {bab.nomor}</span>
              <div>
                <p className="text-sm font-medium">{bab.judul}</p>
                <p className="text-xs text-muted-foreground">{bab.sub.map(s => s.nomor + ' ' + s.judul).join(' · ')}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5">LAM</span>
            <p className="text-sm font-medium text-muted-foreground">Lampiran (Rekap program, tabel T-C, sumber dokumen)</p>
          </div>
        </div>
      </div>

      {/* Catatan generate */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Catatan Tambahan <span className="text-xs text-muted-foreground">(opsional)</span></label>
        <Textarea
          value={catatan}
          onChange={e => setCatatan(e.target.value)}
          placeholder="Contoh: Prioritaskan program yang mendukung Prioritas Pembangunan Daerah 2027..."
          rows={3}
        />
      </div>

      <Select value={tahun} onValueChange={setTahun}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="2025">2025</SelectItem>
          <SelectItem value="2026">2026</SelectItem>
          <SelectItem value="2027">2027</SelectItem>
        </SelectContent>
      </Select>

      {/* Progress */}
      {progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-5 h-5 text-blue-600 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">{progress.label}</p>
              <p className="text-xs text-blue-600">Langkah {progress.step}/{progress.total}</p>
            </div>
          </div>
          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(progress.step / progress.total) * 100}%` }} />
          </div>
          <p className="text-xs text-blue-500 mt-2">Proses ini membutuhkan beberapa menit. Jangan tutup halaman ini.</p>
        </div>
      )}

      {/* Peringatan anti-halusinasi */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 space-y-1">
        <p className="font-semibold">⚠ Aturan Anti-Halusinasi Aktif</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Data tidak tersedia → <code>[Data belum tersedia di sistem]</code></li>
          <li>Perlu validasi pejabat → <code>[Perlu review verifikator]</code></li>
          <li>Angka belum bisa dihitung → <code>[Perlu validasi angka]</code></li>
          <li>Perbedaan data antar dokumen → <code>[Terdapat perbedaan data]</code></li>
          <li>Setiap bab mencantumkan sumber data yang digunakan</li>
        </ul>
      </div>

      <Button onClick={handleGenerate} disabled={generating || biroSiap === 0} className="w-full h-12 text-base gap-2">
        {generating ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Sedang Generate Draft...</>
        ) : (
          <><Sparkles className="w-5 h-5" /> Generate Draft Renja Setda dengan AI</>
        )}
      </Button>
    </div>
  );
}