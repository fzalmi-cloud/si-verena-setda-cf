/**
 * Mapping role → nama biro yang boleh diakses.
 * null  = akses semua biro (admin, kabag, verifikator tanpa pembagian, pimpinan)
 * array = hanya biro-biro tersebut
 *
 * Nama biro harus cocok persis dengan field nama_biro di entitas Biro.
 */
export const ROLE_BIRO_ACCESS = {
  // Verifikator 1: Pemerintahan & Otda, Kesra, Hukum
  verifikator_1: [
    'Biro Pemerintahan dan Otonomi Daerah',
    'Biro Kesejahteraan Rakyat',
    'Biro Hukum',
  ],
  // Verifikator 2: PBJ, Perekonomian, Adm Pembangunan
  verifikator_2: [
    'Biro Pengadaan Barang dan Jasa',
    'Biro Perekonomian',
    'Biro Administrasi Pembangunan',
  ],
  // Verifikator 3: Adpim, Umum, Organisasi
  verifikator_3: [
    'Biro Administrasi Pimpinan',
    'Biro Umum',
    'Biro Organisasi',
  ],
  // Setiap biro hanya melihat dirinya sendiri
  biro_pemerintahan: ['Biro Pemerintahan dan Otonomi Daerah'],
  biro_kesra:        ['Biro Kesejahteraan Rakyat'],
  biro_hukum:        ['Biro Hukum'],
  biro_adpem:        ['Biro Administrasi Pembangunan'],
  biro_perekonomian: ['Biro Perekonomian'],
  biro_pbj:          ['Biro Pengadaan Barang dan Jasa'],
  biro_adpim:        ['Biro Administrasi Pimpinan'],
  biro_umum:         ['Biro Umum'],
  biro_organisasi:   ['Biro Organisasi'],
  biro_pengusul:     null, // fallback generik, akses semua
};

/**
 * Kembalikan daftar nama biro yang boleh dilihat oleh role tertentu.
 * @param {string} role - role pengguna
 * @param {Array}  allBiro - array objek biro dari database { nama_biro, ... }
 * @returns {Array} array objek biro yang boleh diakses
 */
export function filterBiroByRole(role, allBiro) {
  if (!Array.isArray(allBiro)) return [];
  if (!role) return allBiro;
  const allowed = ROLE_BIRO_ACCESS[role];
  if (!allowed) return allBiro; // null atau role tidak terdaftar = semua
  return allBiro.filter(b => allowed.includes(b.nama_biro));
}

/**
 * Kembalikan nama biro tunggal untuk role biro (role yang hanya punya 1 biro).
 * Berguna untuk auto-select.
 */
export function getSingleBiroForRole(role) {
  const allowed = ROLE_BIRO_ACCESS[role];
  if (allowed && allowed.length === 1) return allowed[0];
  return null;
}

/**
 * Apakah role ini hanya boleh melihat biro-biro tertentu?
 */
export function isRestrictedRole(role) {
  const allowed = ROLE_BIRO_ACCESS[role];
  return Array.isArray(allowed);
}