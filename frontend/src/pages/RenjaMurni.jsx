import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookMarked } from 'lucide-react';

import Dashboard from '@/pages/Dashboard';
import UploadRenja from '@/pages/UploadRenja';
import UploadRevisi from '@/pages/UploadRevisi';
import StatusPemeriksaan from '@/pages/StatusPemeriksaan';
import HasilVerifikasi from '@/pages/HasilVerifikasi';
import RiwayatRevisi from '@/pages/RiwayatRevisi';
import DokumenDiunggah from '@/pages/DokumenDiunggah';
import FileReferensi from '@/pages/FileReferensi';
import DashboardPenyusunan from '@/pages/penyusunan/DashboardPenyusunan';

// Role biro pengusul (tab admin disembunyikan untuk mereka)
const BIRO_ROLES = ['biro_pengusul', 'biro_pemerintahan', 'biro_kesra', 'biro_hukum', 'biro_adpem', 'biro_perekonomian', 'biro_pbj', 'biro_adpim', 'biro_umum', 'biro_organisasi'];
const ADMIN_LIKE = ['admin', 'kabag', 'reviewer', 'verifikator', 'verifikator_1', 'verifikator_2', 'verifikator_3'];

const BASE_TABS = [
  { value: 'dashboard', label: 'Dashboard', component: Dashboard },
  { value: 'upload-renja', label: 'Upload Renja', component: UploadRenja },
  { value: 'upload-revisi', label: 'Upload Revisi', component: UploadRevisi },
  { value: 'pemeriksaan', label: 'Pemeriksaan', component: StatusPemeriksaan },
  { value: 'hasil-verifikasi', label: 'Hasil Verifikasi', component: HasilVerifikasi },
  { value: 'riwayat-revisi', label: 'Riwayat Revisi', component: RiwayatRevisi },
];

const ADMIN_TABS = [
  { value: 'semua-dokumen', label: 'Semua Dokumen', component: DokumenDiunggah },
  { value: 'file-referensi', label: 'File Referensi AI', component: FileReferensi },
  { value: 'penyusunan', label: 'Penyusunan Renja Setda', component: DashboardPenyusunan },
];

export default function RenjaMurni() {
  const { user } = useAuth();
  const role = user?.role || 'biro_pengusul';
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t || 'dashboard';
  });

  // Sinkronkan tab ke URL (mis. ?tab=upload-renja) agar refresh tidak kehilangan posisi
  const setTabAndUrl = (v) => {
    setTab(v);
    const u = new URLSearchParams(window.location.search);
    u.set('tab', v);
    window.history.replaceState({}, '', `?${u.toString()}`);
  };

  const isAdminLike = ADMIN_LIKE.includes(role);
  const isBiro = BIRO_ROLES.includes(role);
  const tabs = isAdminLike ? [...BASE_TABS, ...ADMIN_TABS] : BASE_TABS;
  // Default tab pertama yang tersedia
  const activeTab = tabs.some(t => t.value === tab) ? tab : tabs[0]?.value;

  return (
    <div className="space-y-5">
      {/* Header halaman gabungan */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookMarked className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">RENJA (MURNI/AWAL)</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sistem penyusunan, verifikasi dan monitoring Renja Murni/Awal — {isBiro ? 'untuk Biro' : 'untuk Biro, Verifikator dan Administrator'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setTabAndUrl}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs px-3 py-2 data-[state=active]:bg-card whitespace-nowrap">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <t.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
