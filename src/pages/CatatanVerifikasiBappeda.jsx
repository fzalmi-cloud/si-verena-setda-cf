import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { filterBiroByRole, getSingleBiroForRole, isRestrictedRole } from '@/lib/roleAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, CheckCircle2, XCircle, Search } from 'lucide-react';
import CatatanBappedaCard from '@/components/verifikasi/CatatanBappedaCard';
import { CATATAN_BAPPEDA } from '@/lib/catatanBappeda';
import { Input } from '@/components/ui/input';

const ALL_BIRO_KEYS = Object.keys(CATATAN_BAPPEDA);

export default function CatatanVerifikasiBappeda() {
  const { user } = useOutletContext() || {};
  const role = user?.role;
  const [selectedBiro, setSelectedBiro] = useState(getSingleBiroForRole(role) || '');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [search, setSearch] = useState('');

  // Filter kunci biro sesuai kewenangan role
  const { data: allBiroList = [] } = { data: [] }; // tidak perlu fetch, pakai nama dari CATATAN_BAPPEDA
  const allowedBiroNames = useMemo(() => {
    if (!isRestrictedRole(role)) return ALL_BIRO_KEYS;
    // filterBiroByRole butuh objek {nama_biro}, buat dari ALL_BIRO_KEYS
    const fakeList = ALL_BIRO_KEYS.map(k => ({ id: k, nama_biro: k }));
    return filterBiroByRole(role, fakeList).map(b => b.nama_biro);
  }, [role]);
  const BIRO_KEYS = allowedBiroNames;

  const dataBiro = selectedBiro ? CATATAN_BAPPEDA[selectedBiro] : null;

  // Filter catatan berdasarkan status dan pencarian
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

  // Ringkasan semua biro
  const ringkasanSemua = BIRO_KEYS.map(key => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Catatan Koreksi Bappeda</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hasil verifikasi Renja 2027 dari Bappeda Provinsi Sumatera Barat — spesifik per biro
        </p>
      </div>

      {/* Ringkasan semua biro */}
      {!selectedBiro && (
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
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(r.sesuai / r.total) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {r.sesuai}/{r.total} item sesuai
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Filter biro + status */}
      <div className="flex items-end gap-3 flex-wrap bg-card rounded-xl border border-border p-4">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biro</label>
          <Select value={selectedBiro} onValueChange={(v) => { setSelectedBiro(v); setFilterStatus('semua'); setSearch(''); }}>
            <SelectTrigger><SelectValue placeholder="Pilih biro..." /></SelectTrigger>
            <SelectContent>
              {BIRO_KEYS.map(k => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedBiro && (
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
                <Input
                  className="pl-8 h-9 text-xs"
                  placeholder="Cari item atau catatan..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail catatan biro terpilih */}
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