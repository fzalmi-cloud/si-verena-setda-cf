import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { filterBiroByRole, getSingleBiroForRole, isRestrictedRole } from '@/lib/roleAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, CheckCircle2, XCircle, Search, ClipboardList, Info } from 'lucide-react';
import CatatanBappedaCard from '@/components/verifikasi/CatatanBappedaCard';
import { CATATAN_BAPPEDA } from '@/lib/catatanBappeda';
import { Input } from '@/components/ui/input';

// Section Catatan Bappeda — referensi pelengkap yang TIDAK SELALU tersedia.
// Jika biro/unit tidak punya catatan (atau data catatan kosong), tampilkan
// pesan "belum tersedia" alih-alih halaman kosong yang menyesatkan.
export default function CatatanBappedaSection() {
  const { user } = useAuth();
  const role = user?.role;
  const [selectedBiro, setSelectedBiro] = useState(getSingleBiroForRole(role) || '');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [search, setSearch] = useState('');

  // Daftar biro dari DB (agar bisa menunjukkan biro yang BELUM punya catatan)
  const { data: biroResp } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => api.list('biro'),
  });
  const allBiro = Array.isArray(biroResp?.data) ? biroResp.data : [];
  const biroList = filterBiroByRole(role, allBiro);

  const adaCatatan = Object.keys(CATATAN_BAPPEDA).length > 0;
  const allBiroKeys = Object.keys(CATATAN_BAPPEDA);

  // Biro yang punya catatan
  const biroDenganCatatan = biroList
    .map(b => b.nama_biro)
    .concat(allBiroKeys)
    .filter(k => CATATAN_BAPPEDA[k]);
  const uniqueBiroDenganCatatan = [...new Set(biroDenganCatatan)];

  // Opsi dropdown: semua biro dari DB + biro dari catatan (jika ada di luar DB)
  const semuaNamaBiro = [...new Set([...biroList.map(b => b.nama_biro), ...allBiroKeys])];

  const dataBiro = selectedBiro ? CATATAN_BAPPEDA[selectedBiro] : null;

  const filteredData = dataBiro ? {
    ...dataBiro,
    catatan: dataBiro.catatan.filter(c => {
      const matchStatus = filterStatus === 'semua' || c.status === filterStatus;
      const matchSearch = !search ||
        c.item.toLowerCase().includes(search.toLowerCase()) ||
        c.catatan.toLowerCase().includes(search.toLowerCase()) ||
        c.bab.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    })
  } : null;

  const ringkasanSemua = uniqueBiroDenganCatatan.map(key => {
    const d = CATATAN_BAPPEDA[key];
    return {
      nama: key,
      total: d.catatan.length,
      sesuai: d.catatan.filter(c => c.status === 'sesuai').length,
      perlu: d.catatan.filter(c => c.status === 'perlu_perbaikan').length,
      tidakAda: d.catatan.filter(c => c.status === 'tidak_ditemukan').length,
      tanggal: d.tanggal_verifikasi,
    };
  });

  // Jika tidak ada data catatan sama sekali
  if (!adaCatatan) {
    return (
      <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Catatan Bappeda belum tersedia</p>
        <p className="text-xs mt-1">Jika Bappeda sudah mengeluarkan hasil verifikasi, catatan akan ditampilkan di sini per biro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
        <p className="text-xs text-blue-700">
          Catatan koreksi hasil verifikasi Renja oleh Bappeda — hanya biro yang sudah diverifikasi yang memiliki catatan.
          Biro tanpa catatan berarti <strong>belum ada catatan</strong> (belum diverifikasi / nihil).
        </p>
      </div>

      {/* Ringkasan biro yang punya catatan */}
      {!selectedBiro && ringkasanSemua.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ringkasanSemua.map(r => (
            <button
              key={r.nama}
              onClick={() => setSelectedBiro(r.nama)}
              className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <p className="text-xs font-bold text-foreground group-hover:text-primary truncate">{r.nama}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 mb-3">{r.tanggal}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {r.sesuai > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />{r.sesuai}
                  </span>
                )}
                {r.perlu > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                    <AlertTriangle className="w-3 h-3" />{r.perlu}
                  </span>
                )}
                {r.tidakAda > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700">
                    <XCircle className="w-3 h-3" />{r.tidakAda}
                  </span>
                )}
              </div>
              <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(r.sesuai / r.total) * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{r.sesuai}/{r.total} item sesuai</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter biro + status */}
      <div className="flex items-end gap-3 flex-wrap bg-card rounded-xl border border-border p-4">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biro / Unit</label>
          <Select value={selectedBiro} onValueChange={(v) => { setSelectedBiro(v); setFilterStatus('semua'); setSearch(''); }}>
            <SelectTrigger><SelectValue placeholder="Pilih biro/unit..." /></SelectTrigger>
            <SelectContent>
              {semuaNamaBiro.map(k => (
                <SelectItem key={k} value={k}>
                  {k}{CATATAN_BAPPEDA[k] ? '' : ' — belum ada catatan'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedBiro && dataBiro && (
          <>
            <div className="w-44">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Filter Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Status</SelectItem>
                  <SelectItem value="perlu_perbaikan">Perlu Perbaikan</SelectItem>
                  <SelectItem value="tidak_ditemukan">Tidak Ditemukan</SelectItem>
                  <SelectItem value="sesuai">Sesuai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cari item</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input className="pl-8 h-9 text-xs" placeholder="Cari item atau catatan..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail catatan biro terpilih */}
      {selectedBiro && !dataBiro && (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Belum ada catatan Bappeda untuk {selectedBiro}</p>
          <p className="text-xs mt-1">Catatan akan muncul jika Bappeda sudah memverifikasi biro ini.</p>
        </div>
      )}

      {selectedBiro && filteredData && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">{selectedBiro}</h2>
              <p className="text-xs text-muted-foreground">
                {filteredData.catatan.length} dari {dataBiro.catatan.length} item ditampilkan
              </p>
            </div>
          </div>
          {filteredData.catatan.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tidak ada item yang sesuai filter.</p>
            </div>
          ) : (
            <CatatanBappedaCard data={filteredData} />
          )}
        </div>
      )}

      {!selectedBiro && (
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Pilih biro di atas atau klik kartu ringkasan untuk melihat catatan koreksi.</p>
        </div>
      )}
    </div>
  );
}
