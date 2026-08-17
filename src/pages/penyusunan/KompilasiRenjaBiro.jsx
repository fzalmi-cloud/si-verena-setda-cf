import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, CheckCircle2, AlertTriangle, XCircle, Eye, ArrowRight, 
  ChevronRight, Upload, Clock, Star
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const BIRO_LIST = [
  'Biro Pemerintahan dan Otonomi Daerah',
  'Biro Kesejahteraan Rakyat',
  'Biro Hukum',
  'Biro Pengadaan Barang dan Jasa',
  'Biro Perekonomian',
  'Biro Administrasi Pembangunan',
  'Biro Administrasi Pimpinan',
  'Biro Umum',
  'Biro Organisasi',
];
const SETDA_NAME = 'Sekretariat Daerah / SETDA';

const STATUS_DOK = {
  selesai_diproses: { label: 'Terverifikasi', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  layak_kirim: { label: 'Layak Kirim', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  sudah_dikirim: { label: 'Sudah Dikirim', cls: 'bg-primary/10 text-primary border-primary/20', icon: Star },
  sedang_diperiksa: { label: 'Sedang Diperiksa', cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  diunggah: { label: 'Diunggah', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: FileText },
  perlu_revisi: { label: 'Perlu Revisi', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
};

function statusKelayakan(dokumen, skor) {
  if (!dokumen) return { label: 'Belum Upload', cls: 'bg-red-100 text-red-700', icon: XCircle, siap: false };
  const s = skor?.status_final;
  if (s === 'layak_kirim' || s === 'sudah_dikirim') return { label: 'Siap Dikompilasi', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, siap: true };
  if (s === 'sedang_diperiksa') return { label: 'Sedang Diperiksa', cls: 'bg-blue-100 text-blue-700', icon: Clock, siap: false };
  if (s === 'perlu_revisi') return { label: 'Perlu Revisi', cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle, siap: false };
  return { label: 'Perlu Review', cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle, siap: false };
}

export default function KompilasiRenjaBiro() {
  const { user } = useOutletContext() || {};
  const [tahun, setTahun] = useState('2027');
  const [selected, setSelected] = useState([]);

  const { data: allDokumen = [] } = useQuery({
    queryKey: ['dokumen-renja-kompilasi', tahun],
    queryFn: () => base44.entities.DokumenRenja.filter({ periode_tahun: parseInt(tahun) }, '-created_date', 200),
  });
  const { data: skorList = [] } = useQuery({
    queryKey: ['skor-dokumen-kompilasi', tahun],
    queryFn: () => base44.entities.SkorDokumen.filter({ periode_tahun: parseInt(tahun) }),
  });
  const { data: hasilList = [] } = useQuery({
    queryKey: ['hasil-kompilasi', tahun],
    queryFn: () => base44.entities.HasilPemeriksaan.filter({ periode_tahun: parseInt(tahun) }),
  });

  // Ambil dokumen terbaru per biro (prioritas: terverifikasi/layak/final_internal)
  function getLatestDokBiro(namaBiro) {
    const docs = allDokumen
      .filter(d => d.nama_biro === namaBiro && ['renja_biro', 'draft_renja_setda', 'revisi_renja'].includes(d.jenis_dokumen))
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const final = docs.find(d => ['selesai_diproses'].includes(d.status_upload));
    return final || docs[0] || null;
  }

  function getSkor(namaBiro) {
    return skorList.find(s => s.nama_biro === namaBiro) || null;
  }

  function getCatatanBelumSelesai(namaBiro) {
    return hasilList.filter(h => h.nama_biro === namaBiro && h.status === 'perlu_perbaikan').length;
  }

  const allBiros = [...BIRO_LIST, SETDA_NAME];
  const rows = allBiros.map(nama => {
    const dok = getLatestDokBiro(nama);
    const skor = getSkor(nama);
    const kel = statusKelayakan(dok, skor);
    const catatan = getCatatanBelumSelesai(nama);
    return { nama, dok, skor, kel, catatan };
  });

  const siapCount = rows.filter(r => r.kel.siap).length;

  const toggleSelect = (nama) => {
    setSelected(prev => prev.includes(nama) ? prev.filter(n => n !== nama) : [...prev, nama]);
  };
  const selectAll = () => setSelected(rows.filter(r => r.kel.siap).map(r => r.nama));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Kompilasi Renja 9 Biro</h1>
          <p className="text-sm text-muted-foreground mt-1">Status dokumen terakhir setiap biro untuk tahun {tahun}</p>
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
          <Link to="/penyusunan/validasi">
            <Button disabled={siapCount === 0}>
              Lanjut Validasi <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Unit', val: rows.length, cls: 'text-primary' },
          { label: 'Siap Dikompilasi', val: siapCount, cls: 'text-emerald-600' },
          { label: 'Perlu Review', val: rows.filter(r => !r.kel.siap && r.dok).length, cls: 'text-amber-600' },
          { label: 'Belum Upload', val: rows.filter(r => !r.dok).length, cls: 'text-red-600' },
        ].map(({ label, val, cls }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-display font-bold ${cls}`}>{val}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Daftar Unit dan Status Dokumen</h3>
          <button onClick={selectAll} className="text-xs text-primary hover:underline">
            Pilih semua yang siap
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left w-8"></th>
                <th className="px-4 py-2.5 text-left">Nama Unit</th>
                <th className="px-4 py-2.5 text-center">Tahun</th>
                <th className="px-4 py-2.5 text-center">Upload Terakhir</th>
                <th className="px-4 py-2.5 text-center">Skor</th>
                <th className="px-4 py-2.5 text-center">Catatan Terbuka</th>
                <th className="px-4 py-2.5 text-center">Kelayakan</th>
                <th className="px-4 py-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ nama, dok, skor, kel, catatan }) => {
                const KelIcon = kel.icon;
                const isSetda = nama === SETDA_NAME;
                return (
                  <tr key={nama} className={`hover:bg-muted/20 ${selected.includes(nama) ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(nama)}
                        onChange={() => toggleSelect(nama)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSetda ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isSetda ? 'SETDA' : 'BIRO'}
                        </span>
                        <span className="font-medium text-sm">{nama.replace(/^Biro\s+/i, '')}</span>
                      </div>
                      {!dok && (
                        <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Belum ada dokumen
                        </p>
                      )}
                      {dok && !kel.siap && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          ⚠ Belum tervalidasi, perlu review sebelum digunakan
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{dok?.periode_tahun || '—'}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {dok?.created_date ? format(new Date(dok.created_date), 'd MMM yyyy', { locale: idLocale }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {skor?.skor_total != null ? (
                        <span className={`font-bold text-base ${skor.skor_total >= 75 ? 'text-emerald-600' : skor.skor_total >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                          {skor.skor_total}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {catatan > 0 ? (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">{catatan} catatan</span>
                      ) : (
                        <span className="text-xs text-emerald-600">Bersih</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${kel.cls}`}>
                        <KelIcon className="w-3 h-3" /> {kel.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {dok?.file_url && (
                          <a href={dok.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                              <Eye className="w-3 h-3" /> Dok
                            </Button>
                          </a>
                        )}
                        <Link to={`/hasil?biro=${encodeURIComponent(nama)}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                            <FileText className="w-3 h-3" /> Verif
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-primary">{selected.length} unit dipilih sebagai sumber Draft Renja Setda</p>
          <Link to={`/penyusunan/validasi?tahun=${tahun}`}>
            <Button size="sm">
              Lanjut Validasi Data <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}