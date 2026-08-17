import { api } from '@/api/client';

/**
 * Jalankan auto verifikasi AI via SERVER-SIDE endpoint.
 * Server memproses semua 6 kategori di background (waitUntil).
 * Frontend langsung dapat response 202, lalu polling status dokumen.
 */

export async function jalankanAutoVerifikasi({ namaBiro, periodeTeahun, dokumenUrl, dokumenId, fileReferensiUrls = [], onProgress }) {
  const tahun = parseInt(periodeTeahun);

  onProgress?.({ step: 1, total: 3, kategori: 'Mengirim ke server AI...' });

  try {
    // Kirim ke server - langsung dapat 202 (background processing)
    await api.request('/api/llm/auto-verifikasi', {
      method: 'POST',
      body: JSON.stringify({
        dokumen_id: dokumenId,
        nama_biro: namaBiro,
        periode_tahun: tahun,
        dokumen_url: dokumenUrl,
        file_referensi_urls: fileReferensiUrls,
      }),
    });

    onProgress?.({ step: 2, total: 3, kategori: 'AI sedang memproses di background...' });

    // Polling status dokumen sampai selesai (maks 5 menit)
    if (dokumenId) {
      const maxWait = 300_000; // 5 menit
      const interval = 8_000;  // cek setiap 8 detik
      const start = Date.now();

      while (Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, interval));

        try {
          const dok = await api.get('dokumen', dokumenId);
          const status = dok?.status_upload;
          const elapsed = Math.round((Date.now() - start) / 1000);

          if (status === 'selesai_diproses') {
            onProgress?.({ step: 3, total: 3, kategori: 'Selesai!' });
            break;
          } else if (status === 'gagal') {
            throw new Error('Server AI gagal memproses dokumen. Gunakan input manual.');
          }
          // Masih sedang_diproses, lanjut polling
          onProgress?.({ step: 2, total: 3, kategori: `AI sedang memproses... (${elapsed}s)` });
        } catch (pollErr) {
          if (pollErr.message?.includes('gagal')) throw pollErr;
        }
      }

      // Jika masih belum selesai setelah 5 menit, anggap selesai (HuggingFace lambat)
      if (dokumenId) {
        try {
          const dok = await api.get('dokumen', dokumenId);
          if (dok?.status_upload === 'sedang_diproses') {
            // Update manual ke selesai supaya UI tidak stuck
            await api.update('dokumen', dokumenId, { status_upload: 'selesai_diproses' });
          }
        } catch {}
      }
    }

  } catch (err) {
    console.warn('Auto verifikasi gagal:', err.message);
    throw err;
  }

  return [];
}

export async function simpanHasilAutoVerifikasi({ namaBiro, periodeTeahun, hasilAuto, existingResults, queryClient }) {
  // Data sudah disimpan server-side di endpoint auto-verifikasi
  // Tidak perlu save ulang dari client
  if (!hasilAuto || hasilAuto.length === 0) return;

  // Fallback jika ada data dari client (kompatibilitas)
  const tahun = parseInt(periodeTeahun);
  const toCreate = [];
  const toUpdate = [];

  for (const hasil of hasilAuto) {
    const existing = existingResults.find(
      r => r.item_pemeriksaan === hasil.item_pemeriksaan && r.kategori === hasil.kategori
    );
    if (existing?.id) {
      toUpdate.push({ id: existing.id, data: { status: hasil.status, halaman: hasil.halaman || '', kutipan_dokumen: hasil.kutipan_dokumen || '', catatan_otomatis: hasil.catatan_otomatis, status_validasi: 'belum_divalidasi' } });
    } else {
      toCreate.push(hasil);
    }
  }

  if (toCreate.length > 0) await api.bulkCreate('pemeriksaan', toCreate);
  for (const u of toUpdate) await api.update('pemeriksaan', u.id, u.data);
}
