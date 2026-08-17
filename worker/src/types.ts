// ============================================
// SI-VERENA Shared Types
// ============================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'verifikator' | 'biro_pengusul';
  biro_id?: string;
  nama_biro?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Biro {
  id: string;
  nama_biro: string;
  kode_biro?: string;
  kepala_biro?: string;
  status: 'aktif' | 'nonaktif';
  created_at: string;
}

export interface PeriodeRenja {
  id: string;
  tahun: number;
  status: 'aktif' | 'selesai' | 'draft';
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  created_at: string;
}

export interface DokumenRenja {
  id: string;
  biro_id?: string;
  nama_biro: string;
  periode_tahun: number;
  level_unit: 'biro' | 'unit' | 'sub_unit';
  jenis_dokumen: 'rkp' | 'rka' | 'rkpd' | 'lainnya';
  sub_jenis?: string;
  nama_file?: string;
  file_url?: string;
  file_key?: string;
  file_size?: number;
  status_upload: 'diunggah' | 'diverifikasi' | 'ditolak';
  status_dokumen: 'diunggah' | 'dalam_review' | 'selesai';
  sumber_dokumen?: string;
  parent_document_id?: string;
  versi: number;
  catatan_upload?: string;
  created_at: string;
  updated_at: string;
}

export interface HasilPemeriksaan {
  id: string;
  dokumen_renja_id?: string;
  biro_id?: string;
  nama_biro: string;
  periode_tahun?: number;
  kategori: 'kelengkapan' | 'sistematika' | 'tabel_data' | 'konsistensi' | 'substansi';
  sub_kategori?: string;
  item_pemeriksaan: string;
  status: 'sesuai' | 'tidak_sesuai' | 'perlu_review_manual';
  halaman?: string;
  kutipan_dokumen?: string;
  catatan_otomatis?: string;
  catatan_verifikator?: string;
  status_validasi: 'belum_divalidasi' | 'divalidasi' | 'ditolak';
  divalidasi_oleh?: string;
  tanggal_validasi?: string;
  created_at: string;
  updated_at: string;
}

export interface SkorDokumen {
  id: string;
  biro_id?: string;
  nama_biro: string;
  periode_tahun: number;
  skor_kelengkapan?: number;
  skor_sistematika?: number;
  skor_tabel?: number;
  skor_matriks?: number;
  skor_konsistensi?: number;
  skor_substansi?: number;
  skor_total?: number;
  level_kesiapan?: 'siap' | 'perlu_perbaikan' | 'belum_siap';
  status_final: 'draft' | 'final';
  tanggal_pemeriksaan?: string;
  created_at: string;
  updated_at: string;
}

export interface FileReferensi {
  id: string;
  judul: string;
  deskripsi?: string;
  jenis: 'pedoman_renja' | 'template' | 'contoh' | 'lainnya';
  nama_file?: string;
  file_url: string;
  file_key?: string;
  diunggah_oleh?: string;
  aktif: boolean;
  created_at: string;
}

export interface DraftRenjaSetda {
  id: string;
  tahun: number;
  versi: number;
  judul: string;
  status: 'draft_otomatis' | 'dalam_review' | 'disetujui' | 'final';
  generated_by?: string;
  validated_by?: string;
  generated_at?: string;
  validated_at?: string;
  catatan_umum?: string;
  jumlah_biro?: number;
  biro_digunakan?: string;
  ringkasan_eksekutif?: string;
  created_at: string;
  updated_at: string;
}

export interface DraftRenjaBab {
  id: string;
  draft_id: string;
  nomor_bab: string;
  judul_bab: string;
  isi_bab?: string;
  status_bab: 'draft_otomatis' | 'diedit_manual' | 'divalidasi';
  catatan_verifikator?: string;
  sumber_data?: string;
  urutan?: number;
  created_at: string;
  updated_at: string;
}

export interface RiwayatRevisi {
  id: string;
  biro_id?: string;
  nama_biro: string;
  periode_tahun?: number;
  versi?: number;
  jenis_dokumen?: string;
  file_url?: string;
  file_key?: string;
  catatan_revisi?: string;
  diunggah_oleh?: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  offset: number;
}

// JWT Payload
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  biro_id?: string;
  nama_biro?: string;
  exp: number;
  iat: number;
}
