import React, { useMemo } from 'react';
import BiroStatusCard from './BiroStatusCard';
import { Building2 } from 'lucide-react';

const STATUS_ORDER = ['perlu_revisi', 'sedang_diperiksa', 'draft', 'layak_kirim', 'sudah_dikirim'];

export default function BiroStatusGrid({ biroList = [], skorData = [], dokumenData = [] }) {
  // Gabungkan biro yang ada di DB dengan yang sudah punya skor
  const cards = useMemo(() => {
    // Semua nama biro dari biro master
    const allBiroNames = biroList.map(b => b.nama_biro);
    // Skor per biro (ambil terbaru per biro — ambil tahun terbesar)
    const skorByBiro = {};
    skorData.forEach(s => {
      if (!skorByBiro[s.nama_biro] || (s.periode_tahun > skorByBiro[s.nama_biro].periode_tahun)) {
        skorByBiro[s.nama_biro] = s;
      }
    });
    // Hitung jumlah dokumen per biro
    const dokByBiro = {};
    dokumenData.forEach(d => {
      dokByBiro[d.nama_biro] = (dokByBiro[d.nama_biro] || 0) + 1;
    });

    // Gabungkan — prioritas biro dari master list
    const result = allBiroNames.map(nama => ({
      nama,
      skor: skorByBiro[nama] || null,
      dokumenCount: dokByBiro[nama] || 0,
    }));

    // Biro yang ada di skor tapi tidak di master, tambahkan juga
    Object.keys(skorByBiro).forEach(nama => {
      if (!allBiroNames.includes(nama)) {
        result.push({ nama, skor: skorByBiro[nama], dokumenCount: dokByBiro[nama] || 0 });
      }
    });

    // Urutkan: yang perlu perhatian dulu (perlu_revisi, sedang_diperiksa, draft, layak_kirim, sudah_dikirim)
    result.sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a.skor?.status_final || 'draft');
      const bi = STATUS_ORDER.indexOf(b.skor?.status_final || 'draft');
      if (ai !== bi) return ai - bi;
      return (b.skor?.skor_total ?? -1) - (a.skor?.skor_total ?? -1);
    });

    return result;
  }, [biroList, skorData, dokumenData]);

  // Ringkasan distribusi status
  const summary = useMemo(() => {
    const counts = { draft: 0, sedang_diperiksa: 0, perlu_revisi: 0, layak_kirim: 0, sudah_dikirim: 0 };
    cards.forEach(c => {
      const s = c.skor?.status_final || 'draft';
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [cards]);

  if (!biroList.length && !skorData.length) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm flex flex-col items-center gap-2">
        <Building2 className="w-8 h-8 opacity-30" />
        Belum ada data biro
      </div>
    );
  }

  const PILL_CONFIG = [
    { key: 'perlu_revisi', label: 'Perlu Revisi', cls: 'bg-amber-100 text-amber-700' },
    { key: 'sedang_diperiksa', label: 'Sedang Diperiksa', cls: 'bg-blue-100 text-blue-700' },
    { key: 'draft', label: 'Belum Diperiksa', cls: 'bg-slate-100 text-slate-600' },
    { key: 'layak_kirim', label: 'Layak Kirim', cls: 'bg-emerald-100 text-emerald-700' },
    { key: 'sudah_dikirim', label: 'Sudah Dikirim', cls: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="space-y-4">
      {/* Distribusi status ringkas */}
      <div className="flex flex-wrap gap-2">
        {PILL_CONFIG.map(({ key, label, cls }) =>
          summary[key] > 0 ? (
            <span key={key} className={`text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>
              {summary[key]} {label}
            </span>
          ) : null
        )}
        {cards.length > 0 && (
          <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted">
            {cards.length} unit total
          </span>
        )}
      </div>

      {/* Grid kartu biro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map(({ nama, skor, dokumenCount }) => (
          <BiroStatusCard
            key={nama}
            skor={skor ? { ...skor } : { nama_biro: nama, status_final: 'draft', skor_total: null }}
            dokumenCount={dokumenCount}
          />
        ))}
      </div>
    </div>
  );
}