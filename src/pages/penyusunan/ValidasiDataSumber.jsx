import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ArrowRight, RefreshCw, ChevronRight } from 'lucide-react';

const BIRO_LIST = [
  'Biro Pemerintahan dan Otonomi Daerah','Biro Kesejahteraan Rakyat','Biro Hukum',
  'Biro Pengadaan Barang dan Jasa','Biro Perekonomian','Biro Administrasi Pembangunan',
  'Biro Administrasi Pimpinan','Biro Umum','Biro Organisasi',
];
const SETDA_NAME = 'Sekretariat Daerah / SETDA';

const STATUS_CFG = {
  lengkap: { label: 'Lengkap', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  belum_lengkap: { label: 'Belum Lengkap', cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  tidak_ditemukan: { label: 'Tidak Ditemukan', cls: 'bg-red-100 text-red-700', icon: XCircle },
  perlu_review: { label: 'Perlu Review', cls: 'bg-blue-100 text-blue-700', icon: HelpCircle },
};

export default function ValidasiDataSumber() {
  const { user } = useOutletContext() || {};
  const [searchParams] = useSearchParams();
  const [tahun, setTahun] = useState(searchParams.get('tahun') || '2027');

  const { data: dokumen = [], isLoading: loadDok, refetch } = useQuery({
    queryKey: ['dok-validasi', tahun],
    queryFn: () => base44.entities.DokumenRenja.filter({ periode_tahun: parseInt(tahun) }, '-created_date', 200),
  });
  const { data: skorList = [] } = useQuery({
    queryKey: ['skor-validasi', tahun],
    queryFn: () => base44.entities.SkorDokumen.filter({ periode_tahun: parseInt(tahun) }),
  });
  const { data: hasilList = [] } = useQuery({
    queryKey: ['hasil-validasi', tahun],
    queryFn: () => base44.entities.HasilPemeriksaan.filter({ periode_tahun: parseInt(tahun) }),
  });
  const { data: fileRef = [] } = useQuery({
    queryKey: ['file-ref-validasi'],
    queryFn: () => base44.entities.FileReferensi.filter({ aktif: true }),
  });

  function hasDokJenis(namaBiro, jenis) {
    return dokumen.some(d => d.nama_biro === namaBiro && d.jenis_dokumen === jenis);
  }
  function hasDokSubJenis(namaBiro, subJenis) {
    return dokumen.some(d => d.nama_biro === namaBiro && d.sub_jenis === subJenis);
  }

  const validasiItems = useMemo(() => {
    const biroUpload = BIRO_LIST.filter(b => dokumen.some(d => d.nama_biro === b && ['renja_biro','revisi_renja'].includes(d.jenis_dokumen)));
    const setdaUpload = dokumen.some(d => d.nama_biro === SETDA_NAME && d.jenis_dokumen === 'draft_renja_setda');
    const biroVerif = BIRO_LIST.filter(b => skorList.some(s => s.nama_biro === b && ['layak_kirim','sudah_dikirim'].includes(s.status_final)));
    const adaNarasiRenja = BIRO_LIST.filter(b => hasDokJenis(b, 'renja_biro') || hasDokJenis(b, 'revisi_renja'));
    const adaMatriks = BIRO_LIST.filter(b => hasDokJenis(b, 'matriks_renja'));
    const adaHasil = BIRO_LIST.filter(b => hasilList.some(h => h.nama_biro === b));
    const adaCatatan = hasilList.filter(h => h.catatan_verifikator && h.catatan_verifikator.trim()).length;
    const adaChecklist = fileRef.some(f => f.jenis === 'checklist_bappeda');
    const adaRenstra = fileRef.some(f => f.judul?.toLowerCase().includes('renstra'));
    const adaSE = fileRef.some(f => f.judul?.toLowerCase().includes('surat edaran') || f.judul?.toLowerCase().includes('se gubernur'));
    const adaPermendagri = fileRef.some(f => f.judul?.toLowerCase().includes('permendagri') || f.judul?.toLowerCase().includes('86'));

    function statusBiro(count, total = 9) {
      if (count === total) return 'lengkap';
      if (count > 0) return 'belum_lengkap';
      return 'tidak_ditemukan';
    }

    return [
      {
        no: 1, komponen: 'Upload Renja 9 Biro',
        sumber: 'Tabel DokumenRenja', 
        status: statusBiro(biroUpload.length),
        catatan: `${biroUpload.length}/9 biro sudah upload Renja`,
        aksi: biroUpload.length < 9 ? 'Minta biro yang belum upload segera mengunggah dokumen' : '-',
        detail: BIRO_LIST.filter(b => !biroUpload.includes(b)),
      },
      {
        no: 2, komponen: 'Draft Renja Setda',
        sumber: 'Tabel DokumenRenja',
        status: setdaUpload ? 'lengkap' : 'belum_lengkap',
        catatan: setdaUpload ? 'Draft Renja Setda sudah tersedia' : 'Draft Renja Setda belum diunggah (opsional, akan digunakan jika tersedia)',
        aksi: setdaUpload ? '-' : 'Upload draft renja setda jika tersedia',
        detail: [],
      },
      {
        no: 3, komponen: 'Dokumen Narasi Renja per Biro',
        sumber: 'Tabel DokumenRenja (jenis: renja_biro, revisi_renja)',
        status: statusBiro(adaNarasiRenja.length),
        catatan: `${adaNarasiRenja.length}/9 biro memiliki narasi Renja`,
        aksi: 'Upload narasi Renja biro yang belum ada',
        detail: BIRO_LIST.filter(b => !adaNarasiRenja.includes(b)),
      },
      {
        no: 4, komponen: 'Matriks Program/Kegiatan/Subkegiatan',
        sumber: 'Tabel DokumenRenja (jenis: matriks_renja)',
        status: statusBiro(adaMatriks.length),
        catatan: `${adaMatriks.length}/9 biro memiliki matriks`,
        aksi: 'Upload matriks Excel per biro',
        detail: BIRO_LIST.filter(b => !adaMatriks.includes(b)),
      },
      {
        no: 5, komponen: 'Hasil Verifikasi Internal',
        sumber: 'Tabel HasilPemeriksaan',
        status: statusBiro(adaHasil.length),
        catatan: `${adaHasil.length}/9 biro sudah diperiksa`,
        aksi: 'Lakukan pemeriksaan dokumen di menu Pemeriksaan Detail',
        detail: BIRO_LIST.filter(b => !adaHasil.includes(b)),
      },
      {
        no: 6, komponen: 'Catatan Penting Verifikator',
        sumber: 'Tabel HasilPemeriksaan (catatan_verifikator)',
        status: adaCatatan > 0 ? 'lengkap' : 'belum_lengkap',
        catatan: `${adaCatatan} catatan verifikator tersedia`,
        aksi: '-',
        detail: [],
      },
      {
        no: 7, komponen: 'Dokumen Terverifikasi (Layak/Final)',
        sumber: 'Tabel SkorDokumen',
        status: statusBiro(biroVerif.length),
        catatan: `${biroVerif.length}/9 biro sudah layak kirim/terverifikasi`,
        aksi: 'Selesaikan proses verifikasi di Pemeriksaan Detail',
        detail: BIRO_LIST.filter(b => !biroVerif.includes(b)),
      },
      {
        no: 8, komponen: 'Dokumen Renstra Setda 2025–2029',
        sumber: 'Tabel FileReferensi',
        status: adaRenstra ? 'lengkap' : 'tidak_ditemukan',
        catatan: adaRenstra ? 'Renstra Setda tersedia sebagai referensi AI' : 'Belum ada dokumen Renstra di File Referensi',
        aksi: 'Upload Renstra Setda 2025–2029 di menu File Referensi AI',
        detail: [],
      },
      {
        no: 9, komponen: 'Surat Edaran Gubernur (SE Renja 2027)',
        sumber: 'Tabel FileReferensi',
        status: adaSE ? 'lengkap' : 'tidak_ditemukan',
        catatan: adaSE ? 'SE Gubernur tersedia' : 'Belum ada SE Gubernur tentang Penyusunan Renja 2027',
        aksi: 'Upload SE Gubernur di menu File Referensi AI',
        detail: [],
      },
      {
        no: 10, komponen: 'Permendagri No. 86 Tahun 2017',
        sumber: 'Tabel FileReferensi',
        status: adaPermendagri ? 'lengkap' : 'tidak_ditemukan',
        catatan: adaPermendagri ? 'Permendagri 86/2017 tersedia' : 'Belum ada dokumen Permendagri 86/2017',
        aksi: 'Upload Permendagri 86/2017 di menu File Referensi AI',
        detail: [],
      },
      {
        no: 11, komponen: 'Checklist Bappeda',
        sumber: 'Tabel FileReferensi',
        status: adaChecklist ? 'lengkap' : 'belum_lengkap',
        catatan: adaChecklist ? 'Checklist Bappeda tersedia' : 'Belum ada checklist Bappeda (opsional)',
        aksi: 'Upload checklist di menu File Referensi AI',
        detail: [],
      },
    ];
  }, [dokumen, skorList, hasilList, fileRef]);

  const minimal = validasiItems.filter(v => [1,3,4,5,7].includes(v.no));
  const bisaLanjut = minimal.every(v => v.status !== 'tidak_ditemukan');
  const lengkap = validasiItems.filter(v => v.status === 'lengkap').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Validasi Data Sumber</h1>
          <p className="text-sm text-muted-foreground mt-1">Periksa kelengkapan data sebelum generate draft Renja Setda</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tahun} onValueChange={setTahun}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{lengkap}</p>
          <p className="text-xs text-emerald-600 mt-1">Komponen Lengkap</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{validasiItems.filter(v => v.status === 'belum_lengkap').length}</p>
          <p className="text-xs text-amber-600 mt-1">Belum Lengkap</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{validasiItems.filter(v => v.status === 'tidak_ditemukan').length}</p>
          <p className="text-xs text-red-600 mt-1">Tidak Ditemukan</p>
        </div>
      </div>

      {/* Tabel validasi */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Hasil Validasi Komponen Data</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Item bertanda * adalah syarat minimum untuk generate draft</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left w-8">No</th>
                <th className="px-4 py-2.5 text-left">Komponen Data</th>
                <th className="px-4 py-2.5 text-left">Sumber</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-left">Catatan Sistem</th>
                <th className="px-4 py-2.5 text-left">Aksi Perbaikan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {validasiItems.map((item) => {
                const cfg = STATUS_CFG[item.status];
                const Icon = cfg.icon;
                const isMinimal = [1,3,4,5,7].includes(item.no);
                return (
                  <tr key={item.no} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {item.no}{isMinimal ? <span className="text-red-500 ml-0.5">*</span> : ''}
                    </td>
                    <td className="px-4 py-3 font-medium">{item.komponen}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px]">{item.sumber}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px]">
                      <p>{item.catatan}</p>
                      {item.detail.length > 0 && (
                        <p className="text-red-500 mt-1">Belum: {item.detail.map(n => n.replace(/^Biro\s+/i,'')).join(', ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">{item.aksi}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      <div className={`rounded-xl p-5 border flex items-center justify-between ${bisaLanjut ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div>
          <p className={`font-semibold ${bisaLanjut ? 'text-emerald-800' : 'text-amber-800'}`}>
            {bisaLanjut ? '✓ Data minimum terpenuhi — siap generate draft' : '⚠ Masih ada komponen minimum yang belum tersedia'}
          </p>
          <p className={`text-xs mt-0.5 ${bisaLanjut ? 'text-emerald-700' : 'text-amber-700'}`}>
            {bisaLanjut 
              ? 'Klik tombol berikut untuk memulai proses generate Draft Renja Setda dengan AI'
              : 'Pastikan item bertanda * sudah tersedia sebelum melanjutkan'}
          </p>
        </div>
        <Link to={`/penyusunan/generate?tahun=${tahun}`}>
          <Button disabled={!bisaLanjut} className="gap-2">
            Lanjutkan Generate Draft <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}