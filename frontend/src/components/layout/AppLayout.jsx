import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { PreviewRoleProvider, usePreviewRole } from '@/lib/PreviewRoleContext';

function AppLayoutInner() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { previewRole, exitPreview } = usePreviewRole();

  // Buat user tiruan saat preview role aktif
  const effectiveUser = previewRole
    ? { ...user, role: previewRole }
    : user;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} user={effectiveUser} realUser={user} />
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        collapsed ? "ml-16" : "ml-64"
      )}>
        {previewRole && (
          <div className="bg-amber-500 text-amber-950 text-xs font-semibold px-4 py-2 flex items-center justify-between">
            <span>👁 Mode Preview: Anda melihat tampilan sebagai <strong className="uppercase">{previewRole.replace(/_/g, ' ')}</strong></span>
            <button onClick={exitPreview} className="underline hover:no-underline">Keluar Preview</button>
          </div>
        )}
        <div className="p-6 lg:p-8 max-w-[1400px]">
          <Outlet context={{ user: effectiveUser }} />
        </div>
      </main>
    </div>
  );
}

export default function AppLayout() {
  return (
    <PreviewRoleProvider>
      <AppLayoutInner />
    </PreviewRoleProvider>
  );
}