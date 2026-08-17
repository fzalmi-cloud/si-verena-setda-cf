import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { queryClientInstance } from '@/lib/query-client';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';

import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Pemeriksaan from '@/pages/Pemeriksaan';
import HasilVerifikasi from '@/pages/HasilVerifikasi';
import RiwayatRevisi from '@/pages/RiwayatRevisi';
import MasterBiro from '@/pages/MasterBiro';
import KelolaPengguna from '@/pages/KelolaPengguna';
import UploadRenja from '@/pages/UploadRenja';
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
import PageNotFound from '@/lib/PageNotFound';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<ProtectedRoute />}>
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
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
