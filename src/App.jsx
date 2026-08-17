import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PreviewRoleProvider } from '@/lib/PreviewRoleContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Pemeriksaan from '@/pages/Pemeriksaan';
import HasilVerifikasi from '@/pages/HasilVerifikasi';
import RiwayatRevisi from '@/pages/RiwayatRevisi';
import MasterBiro from '@/pages/MasterBiro';
import KelolaPengguna from '@/pages/KelolaPengguna';
import UploadRenja from '@/pages/UploadRenja.jsx';
import StatusPemeriksaan from '@/pages/StatusPemeriksaan';
import UploadRevisi from '@/pages/UploadRevisi';
import CatatanVerifikasiBappeda from '@/pages/CatatanVerifikasiBappeda';
import FileReferensi from '@/pages/FileReferensi';
import DokumenDiunggah from '@/pages/DokumenDiunggah';
import DashboardPenyusunan from '@/pages/penyusunan/DashboardPenyusunan';
import KompilasiRenjaBiro from '@/pages/penyusunan/KompilasiRenjaBiro';
import ValidasiDataSumber from '@/pages/penyusunan/ValidasiDataSumber';
import GenerateDraft from '@/pages/penyusunan/GenerateDraft';
import EditorDraft from '@/pages/penyusunan/EditorDraft';
import RiwayatDraft from '@/pages/penyusunan/RiwayatDraft';
import ExportDokumen from '@/pages/penyusunan/ExportDokumen';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground font-medium">Memuat SI-VERENA...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pemeriksaan" element={<Pemeriksaan />} />
          <Route path="/hasil" element={<HasilVerifikasi />} />
          <Route path="/riwayat" element={<RiwayatRevisi />} />
          <Route path="/master-biro" element={<MasterBiro />} />
          <Route path="/pengguna" element={<KelolaPengguna />} />
          <Route path="/upload-renja" element={<UploadRenja />} />
          <Route path="/status-pemeriksaan" element={<StatusPemeriksaan />} />
          <Route path="/upload-revisi" element={<UploadRevisi />} />
          <Route path="/catatan-bappeda" element={<CatatanVerifikasiBappeda />} />
          <Route path="/file-referensi" element={<FileReferensi />} />
          <Route path="/dokumen-diunggah" element={<DokumenDiunggah />} />
          <Route path="/penyusunan" element={<DashboardPenyusunan />} />
          <Route path="/penyusunan/kompilasi" element={<KompilasiRenjaBiro />} />
          <Route path="/penyusunan/validasi" element={<ValidasiDataSumber />} />
          <Route path="/penyusunan/generate" element={<GenerateDraft />} />
          <Route path="/penyusunan/editor/:id" element={<EditorDraft />} />
          <Route path="/penyusunan/riwayat" element={<RiwayatDraft />} />
          <Route path="/penyusunan/export" element={<ExportDokumen />} />
        </Route>
      </Route>
      
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App