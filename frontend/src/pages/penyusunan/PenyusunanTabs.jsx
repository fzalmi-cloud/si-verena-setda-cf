import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardPenyusunan from '@/pages/penyusunan/DashboardPenyusunan';
import KompilasiRenjaBiro from '@/pages/penyusunan/KompilasiRenjaBiro';
import ValidasiDataSumber from '@/pages/penyusunan/ValidasiDataSumber';
import GenerateDraft from '@/pages/penyusunan/GenerateDraft';
import RiwayatDraft from '@/pages/penyusunan/RiwayatDraft';
import ExportDokumen from '@/pages/penyusunan/ExportDokumen';
import EditorDraft from '@/pages/penyusunan/EditorDraft';

const SUB_TABS = [
  { value: 'dashboard', label: 'Dashboard', component: DashboardPenyusunan },
  { value: 'kompilasi', label: 'Kompilasi Biro', component: KompilasiRenjaBiro },
  { value: 'validasi', label: 'Validasi Sumber', component: ValidasiDataSumber },
  { value: 'generate', label: 'Generate Draft', component: GenerateDraft },
  { value: 'riwayat', label: 'Riwayat Draft', component: RiwayatDraft },
  { value: 'export', label: 'Export Dokumen', component: ExportDokumen },
];

// Sub-tab Penyusunan Renja Setda — menu pilihan cepat + mudah kembali ke tab utama.
export default function PenyusunanTabs() {
  const [sub, setSub] = useState(() => new URLSearchParams(window.location.search).get('sub') || 'dashboard');
  const [editorId, setEditorId] = useState(null);

  const go = (value) => {
    setSub(value);
    if (value !== 'editor') setEditorId(null);
    const u = new URLSearchParams(window.location.search);
    u.set('tab', 'penyusunan');
    u.set('sub', value);
    window.history.replaceState({}, '', `?${u.toString()}`);
  };

  // Tangkap navigasi antar sub-halaman penyusunan agar tetap di dalam tab
  const onNavigate = (path) => {
    const m = path.match(/\/penyusunan\/editor\/([^/]+)/);
    if (m) { setEditorId(m[1]); go('editor'); return; }
    const key = path.replace(/^\/penyusunan\/?/, '') || 'dashboard';
    const found = SUB_TABS.find(t => t.value === key);
    go(found ? found.value : 'dashboard');
  };

  const onOpenDraft = (id) => { setEditorId(id); go('editor'); };

  const active = sub === 'editor' ? 'editor' : (SUB_TABS.some(t => t.value === sub) ? sub : 'dashboard');

  const renderContent = () => {
    if (active === 'editor' && editorId) {
      return <EditorDraft draftId={editorId} onBack={() => go('riwayat')} />;
    }
    const tab = SUB_TABS.find(t => t.value === active) || SUB_TABS[0];
    const Comp = tab.component;
    const props = {};
    if (tab.value === 'dashboard' || tab.value === 'riwayat') props.onNavigate = onNavigate;
    if (tab.value === 'riwayat' || tab.value === 'generate') props.onOpenDraft = onOpenDraft;
    return <Comp {...props} />;
  };

  return (
    <div className="space-y-3">
      <Tabs value={active} onValueChange={go}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
          {SUB_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs px-3 py-1.5 data-[state=active]:bg-card whitespace-nowrap">
              {t.label}
            </TabsTrigger>
          ))}
          {editorId && (
            <TabsTrigger value="editor" className="text-xs px-3 py-1.5 data-[state=active]:bg-card whitespace-nowrap text-primary">
              ✏️ Editor Draft
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value={active} className="mt-3">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
