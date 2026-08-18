import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users, BookOpen, Shield, ChevronLeft, ChevronRight, LogOut, Eye, X,
  Sparkles, ClipboardList, CheckSquare, PenTool, FileSearch, Clock, Download, ChevronDown, ChevronUp,
  CalendarRange, UserCircle, GitBranch, BookMarked
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { usePreviewRole } from '@/lib/PreviewRoleContext';

// Roles yang termasuk "biro pengusul"
const BIRO_ROLES = ['biro_pengusul', 'biro_pemerintahan', 'biro_kesra', 'biro_hukum', 'biro_adpem', 'biro_perekonomian', 'biro_pbj', 'biro_adpim', 'biro_umum', 'biro_organisasi'];
// Roles verifikator
const VERIF_ROLES = ['verifikator', 'verifikator_1', 'verifikator_2', 'verifikator_3'];

const PENYUSUNAN_ITEMS = [
  { label: 'Dashboard Penyusunan', icon: Sparkles, path: '/penyusunan' },
  { label: 'Kompilasi Renja Biro', icon: ClipboardList, path: '/penyusunan/kompilasi' },
  { label: 'Validasi Data Sumber', icon: CheckSquare, path: '/penyusunan/validasi' },
  { label: 'Generate Draft', icon: PenTool, path: '/penyusunan/generate' },
  { label: 'Editor Draft', icon: FileSearch, path: '/penyusunan/riwayat' },
  { label: 'Riwayat Draft', icon: Clock, path: '/penyusunan/riwayat' },
  { label: 'Export Dokumen', icon: Download, path: '/penyusunan/export' },
];

// Menu utama — halaman-halaman yang sudah menjadi tab di "Renja (Murni/Awal)"
// (Dashboard, Upload Renja, Upload Revisi, Pemeriksaan, Hasil Verifikasi,
//  Riwayat Revisi, Semua Dokumen, File Referensi AI) TIDAK lagi tampil terpisah.
const navItems = [
  { label: 'Renja (Murni/Awal)', icon: BookMarked, path: '/renja', roles: ['admin', 'kabag', ...VERIF_ROLES, 'pimpinan', ...BIRO_ROLES] },
  { label: 'Renja Perubahan', icon: GitBranch, path: '/perubahan', roles: ['admin', 'kabag', ...VERIF_ROLES, 'pimpinan', ...BIRO_ROLES], notif: true },
  { label: 'Master Biro', icon: BookOpen, path: '/master-biro', roles: ['admin', 'kabag'] },
  { label: 'Periode Renja', icon: CalendarRange, path: '/periode', roles: ['admin', 'kabag'] },
  { label: 'Kelola Pengguna', icon: Users, path: '/pengguna', roles: ['admin', 'kabag'] },
];

const PREVIEW_ROLES = [
  { value: 'kabag', label: 'Kepala Bagian (Kabag)' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'verifikator_1', label: 'Verifikator 1' },
  { value: 'verifikator_2', label: 'Verifikator 2' },
  { value: 'verifikator_3', label: 'Verifikator 3' },
  { value: 'biro_pemerintahan', label: 'Biro Pemerintahan & Otda' },
  { value: 'biro_kesra', label: 'Biro Kesra' },
  { value: 'biro_hukum', label: 'Biro Hukum' },
  { value: 'biro_adpem', label: 'Biro Administrasi Pembangunan' },
  { value: 'biro_perekonomian', label: 'Biro Perekonomian' },
  { value: 'biro_pbj', label: 'Biro PBJ' },
  { value: 'biro_adpim', label: 'Biro Administrasi Pimpinan' },
  { value: 'biro_umum', label: 'Biro Umum' },
  { value: 'biro_organisasi', label: 'Biro Organisasi' },
  { value: 'pimpinan', label: 'Pimpinan' },
];

export default function Sidebar({ collapsed, setCollapsed, user, realUser }) {
  const location = useLocation();
  const { previewRole, setPreviewRole, exitPreview } = usePreviewRole();
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const userRole = user?.role || 'biro_pengusul';
  const navRole = userRole === 'reviewer' ? 'kabag' : userRole;

  // Badge notifikasi global (modul Renja Perubahan) sesuai role
  useEffect(() => {
    let active = true;
    const load = () => {
      api.list('perubahan/notifications', { role: userRole, nama_biro: user?.nama_biro || '', limit: 30 })
        .then(r => { if (active) setNotifCount((Array.isArray(r?.data) ? r.data : []).filter(n => !n.is_read).length); })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 60000);
    return () => { active = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);
  const [showPenyusunan, setShowPenyusunan] = useState(() =>
    location.pathname.startsWith('/penyusunan')
  );
  const isAdminReal = realUser?.role === 'admin' || realUser?.role === 'kabag' || realUser?.role === 'reviewer';

  const filteredNav = navItems.filter(item => item.roles.includes(navRole));

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold font-heading tracking-tight text-sidebar-foreground">SI-VERENA</h1>
            <p className="text-[10px] text-sidebar-foreground/60">Verifikasi Renja Setda</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
              {!collapsed && <span>{item.label}</span>}
              {item.notif && notifCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {notifCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* Sub-menu Penyusunan Renja Setda — hanya admin/kabag/verifikator */}
        {['admin', 'kabag', ...VERIF_ROLES].includes(navRole) && (
          <div>
            <button
              onClick={() => setShowPenyusunan(v => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                location.pathname.startsWith('/penyusunan')
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Penyusunan Renja</span>
                  {showPenyusunan ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </>
              )}
            </button>
            {showPenyusunan && !collapsed && (
              <div className="ml-3 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                {PENYUSUNAN_ITEMS.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path + item.label}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User info & collapse */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
              {(realUser || user).full_name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-medium truncate">{(realUser || user).full_name || 'User'}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize">
                {previewRole ? (
                  <span className="text-amber-400">Preview: {previewRole.replace(/_/g, ' ')}</span>
                ) : userRole.replace(/_/g, ' ')}
              </p>
            </div>
            {isAdminReal && !collapsed && (
              <button
                onClick={() => { if (previewRole) { exitPreview(); setShowRolePicker(false); } else setShowRolePicker(v => !v); }}
                className={cn(
                  "p-1.5 rounded-md text-xs transition-colors flex-shrink-0",
                  previewRole
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                title={previewRole ? "Keluar preview" : "Switch preview role"}
              >
                {previewRole ? <X className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}

        {/* Role Picker */}
        {showRolePicker && !collapsed && isAdminReal && (
          <div className="bg-sidebar-accent/60 rounded-lg p-2 space-y-1 max-h-52 overflow-y-auto">
            <p className="text-[10px] text-sidebar-foreground/50 px-1 mb-1.5 font-semibold uppercase tracking-wide">Preview sebagai:</p>
            {PREVIEW_ROLES.map(r => (
              <button
                key={r.value}
                onClick={() => { setPreviewRole(r.value); setShowRolePicker(false); }}
                className={cn(
                  "w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors",
                  previewRole === r.value
                    ? "bg-amber-500/30 text-amber-300 font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground text-xs transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Tutup</span></>}
          </button>
          {!collapsed && (
            <>
              <Link
                to="/profil"
                title="Profil"
                className="px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground text-xs transition-colors"
              >
                <UserCircle className="w-4 h-4" />
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  window.location.href = '/login';
                }}
                className="px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-destructive/20 hover:text-destructive text-xs transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}