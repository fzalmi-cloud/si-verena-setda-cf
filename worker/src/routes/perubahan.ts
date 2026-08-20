import { Hono } from 'hono';
import type { Bindings } from '../index';
import { getLLMProvider } from '../llm/provider';
import { extractTextFromR2 } from '../storage/extract';
import { renderReturnedEmail } from '../mailTemplates';

// ══════════════════════════════════════════════════════════════════
// MODUL RENJA PERUBAHAN — SI-VERENA
// Alur: Dokumen Acuan → Upload Biro (versioning) → Pemeriksaan AI →
//       Temuan/Rekomendasi → Perbaikan → Versi baru → Final →
//       Konsolidasi Renja Perubahan Setda → Final → Export
// ══════════════════════════════════════════════════════════════════
export const perubahanRoutes = new Hono<{ Bindings: Bindings }>();

// ── Helper ─────────────────────────────────────────────────────────
async function logAudit(c: any, action: string, object_type: string, object_id: string, notes?: string) {
  try {
    const payload = (c as any).get('jwtPayload') as any;
    await c.env.DB.prepare(
      `INSERT INTO audit_log (id, user_id, user_name, user_role, action, object_type, object_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(), payload?.sub || '', payload?.email || '', payload?.role || '',
      action, object_type, object_id, notes || null
    ).run();
  } catch { /* audit tidak blokir */ }
}

async function createNotification(env: any, target_role: string, nama_biro: string, type: string, message: string) {
  try {
    await env.DB.prepare(
      `INSERT INTO renja_perubahan_notifications (id, target_role, nama_biro, type, message) VALUES (?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), target_role, nama_biro || '', type, message).run();
  } catch { /* tidak blokir */ }
}

function computeScore(findings: any[]) {
  const open = findings.filter(f => ['terbuka', 'diduga_diperbaiki', 'dibuka_kembali'].includes(f.status || 'terbuka'));
  let skor = 100;
  skor -= open.filter(f => f.severity === 'kritis').length * 25;
  skor -= open.filter(f => f.severity === 'mayor').length * 12;
  skor -= open.filter(f => f.severity === 'minor').length * 5;
  skor -= open.filter(f => f.severity === 'informasi').length * 1;
  skor = Math.max(0, Math.min(100, Math.round(skor)));
  const hasCritical = open.some(f => f.severity === 'kritis');
  const level = skor >= 90 ? 'sangat_baik' : skor >= 80 ? 'baik' : skor >= 70 ? 'cukup' : 'perlu_perbaikan';
  return { skor_total: skor, has_critical_open: hasCritical, level_kesiapan: level };
}

// ══════════════ DASHBOARD ══════════════
perubahanRoutes.get('/dashboard', async (c) => {
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  const { results: subs } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_submissions WHERE year = ? ORDER BY nama_biro ASC'
  ).bind(year).all();
  const { results: findings } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_findings WHERE year = ?'
  ).bind(year).all();
  const { results: versions } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_versions WHERE submission_id IN (SELECT id FROM renja_perubahan_submissions WHERE year = ?) ORDER BY created_at DESC'
  ).bind(year).all();
  const { results: biros } = await c.env.DB.prepare(
    "SELECT * FROM biro WHERE status = 'aktif' ORDER BY nama_biro ASC"
  ).all();
  const { results: periode } = await c.env.DB.prepare(
    "SELECT * FROM periode_renja WHERE tahun = ? AND jenis = 'perubahan'"
  ).bind(year).all();

  const subByBiro: Record<string, any> = {};
  (subs as any[]).forEach(s => { subByBiro[s.nama_biro] = s; });

  const monitoring = (biros as any[]).map(b => {
    const sub: any = subByBiro[b.nama_biro];
    const biroFindings = (findings as any[]).filter(f => f.nama_biro === b.nama_biro);
    const biroVersions = (versions as any[]).filter(v => {
      const s: any = subByBiro[b.nama_biro];
      return s && v.submission_id === s.id;
    });
    const latestVersion = biroVersions[0] || null;
    const openCount = biroFindings.filter(f => ['terbuka', 'diduga_diperbaiki', 'dibuka_kembali'].includes(f.status)).length;
    const kritisOpen = biroFindings.filter(f => f.severity === 'kritis' && ['terbuka', 'diduga_diperbaiki', 'dibuka_kembali'].includes(f.status)).length;
    const versionNumbers = biroVersions.map(v => v.version_number);
    const v1 = Math.min(...versionNumbers.length ? versionNumbers : [0]);
    const latest = Math.max(...versionNumbers.length ? versionNumbers : [0]);
    const v1Findings = v1 > 0 ? biroFindings.filter(f => f.version_number === v1) : [];
    const latestFindings = latest > 0 ? biroFindings.filter(f => f.version_number === latest) : [];
    const scoreAwal = v1Findings.length ? computeScore(v1Findings).skor_total : null;
    const scoreTerbaru = latestFindings.length ? computeScore(latestFindings).skor_total : sub?.score;
    const v1Codes = new Set(v1Findings.map(f => f.finding_code));
    const latestCodes = new Set(latestFindings.map(f => f.finding_code));
    const diperbaiki = [...v1Codes].filter(c => !latestCodes.has(c)).length;
    const tetap = [...v1Codes].filter(c => latestCodes.has(c)).length;
    const baru = [...latestCodes].filter(c => !v1Codes.has(c)).length;

    return {
      nama_biro: b.nama_biro,
      biro_id: b.id,
      status: sub?.status || 'belum_upload',
      stage: sub?.stage || 'rancangan_perubahan',
      current_version: sub?.current_version || 0,
      score: sub?.score ?? scoreTerbaru,
      score_awal: scoreAwal,
      score_terbaru: scoreTerbaru,
      tanggal_upload: latestVersion?.created_at || null,
      latest_version_number: latest || 0,
      first_version_number: v1 || 0,
      open_count: openCount,
      kritis_open: kritisOpen,
      v1_findings: v1Findings.length,
      latest_findings: latestFindings.length,
      diperbaiki,
      tetap,
      baru,
      submission_id: sub?.id || null,
      has_critical_open: sub?.has_critical_open || 0,
    };
  });

  const totalBiro = monitoring.length;
  const sudahUpload = monitoring.filter(m => m.status !== 'belum_upload').length;
  const belumUpload = monitoring.filter(m => m.status === 'belum_upload').length;
  const sedangDiproses = monitoring.filter(m => ['sedang_diproses', 'sedang_diperiksa'].includes(m.status)).length;
  const perluPerbaikan = monitoring.filter(m => ['perlu_perbaikan', 'dikembalikan'].includes(m.status)).length;
  const sudahDiperbaiki = monitoring.filter(m => m.status === 'sudah_diperbaiki').length;
  const menungguVerif = monitoring.filter(m => ['menunggu_verifikator', 'selesai_diperiksa'].includes(m.status)).length;
  const final = monitoring.filter(m => m.status === 'final').length;
  const progress = totalBiro > 0 ? Math.round((final / totalBiro) * 100) : 0;

  const stats = {
    totalBiro, sudahUpload, belumUpload, sedangDiproses, perluPerbaikan,
    sudahDiperbaiki, menungguVerif, final,
    progress,
    totalTemuan: (findings as any[]).length,
    kritis: (findings as any[]).filter(f => f.severity === 'kritis').length,
    mayor: (findings as any[]).filter(f => f.severity === 'mayor').length,
    minor: (findings as any[]).filter(f => f.severity === 'minor').length,
    informasi: (findings as any[]).filter(f => f.severity === 'informasi').length,
    temuan_terbuka: (findings as any[]).filter(f => ['terbuka', 'diduga_diperbaiki', 'dibuka_kembali'].includes(f.status)).length,
    temuan_selesai: (findings as any[]).filter(f => ['selesai', 'ditutup'].includes(f.status)).length,
    periode: (periode as any[])[0] || null,
  };

  // Biro yang butuh perhatian
  const perhatian = monitoring
    .filter(m => m.status === 'belum_upload' || m.kritis_open > 0 || (m.score != null && m.score < 70) || m.status === 'dikembalikan' || (m.score_awal != null && m.score_terbaru != null && m.score_terbaru < m.score_awal))
    .sort((a, b) => {
      const rank = (m: any) => (m.status === 'belum_upload' ? 0 : m.kritis_open > 0 ? 1 : m.status === 'dikembalikan' ? 2 : m.score < 70 ? 3 : 4);
      return rank(a) - rank(b);
    });

  return c.json({ monitoring, stats, perhatian });
});

// ══════════════ DOKUMEN ACUAN ══════════════
perubahanRoutes.get('/references', async (c) => {
  const year = c.req.query('year');
  const active = c.req.query('active');
  let q = 'SELECT * FROM renja_perubahan_references WHERE 1=1';
  const p: any[] = [];
  if (year) { q += ' AND year = ?'; p.push(parseInt(year)); }
  if (active !== undefined) { q += ' AND active = ?'; p.push(active === 'true' ? 1 : 0); }
  q += ' ORDER BY priority ASC, created_at DESC';
  const { results } = await c.env.DB.prepare(q).bind(...p).all();
  return c.json({ data: results });
});

perubahanRoutes.post('/references', async (c) => {
  const body = await c.req.json();
  const payload = (c as any).get('jwtPayload') as any;
  if (!body.title || !body.file_url) return c.json({ error: 'title dan file_url wajib' }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO renja_perubahan_references (id, year, document_type, title, nama_file, file_url, file_key, version, active, priority, keterangan, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.year || new Date().getFullYear(), body.document_type || 'lainnya', body.title,
    body.nama_file || null, body.file_url, body.file_key || null, body.version || '1',
    body.active !== false ? 1 : 0, body.priority || 4, body.keterangan || null,
    payload?.email || 'sistem'
  ).run();
  await logAudit(c, 'create', 'rp_reference', id, `Upload dokumen acuan: ${body.title}`);
  return c.json({ id, ...body }, 201);
});

perubahanRoutes.put('/references/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key !== 'id' && value !== undefined) {
      if (key === 'active') { sets.push('active = ?'); params.push(value ? 1 : 0); }
      else if (key === 'priority') { sets.push('priority = ?'); params.push(parseInt(String(value))); }
      else { sets.push(`${key} = ?`); params.push(value); }
    }
  }
  if (sets.length === 0) return c.json({ error: 'Tidak ada field' }, 400);
  params.push(id);
  await c.env.DB.prepare(`UPDATE renja_perubahan_references SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  await logAudit(c, 'update', 'rp_reference', id, 'Perbarui dokumen acuan');
  return c.json({ id, ...body });
});

perubahanRoutes.delete('/references/:id', async (c) => {
  const id = c.req.param('id');
  const ref: any = await c.env.DB.prepare('SELECT id, file_key FROM renja_perubahan_references WHERE id = ?').bind(id).first();
  if (!ref) return c.json({ error: 'Tidak ditemukan' }, 404);
  await c.env.DB.prepare('DELETE FROM renja_perubahan_references WHERE id = ?').bind(id).run();
  if (ref.file_key && c.env.R2) { try { await c.env.R2.delete(ref.file_key); } catch {} }
  await logAudit(c, 'delete', 'rp_reference', id, 'Hapus dokumen acuan');
  return c.json({ message: 'Dokumen acuan dihapus' });
});

// ══════════════ SUBMISSIONS ══════════════
perubahanRoutes.get('/submissions', async (c) => {
  const year = c.req.query('year');
  const namaBiro = c.req.query('nama_biro');
  let q = 'SELECT * FROM renja_perubahan_submissions WHERE 1=1';
  const p: any[] = [];
  if (year) { q += ' AND year = ?'; p.push(parseInt(year)); }
  if (namaBiro) { q += ' AND nama_biro = ?'; p.push(namaBiro); }
  q += ' ORDER BY nama_biro ASC';
  const { results } = await c.env.DB.prepare(q).bind(...p).all();
  return c.json({ data: results });
});

perubahanRoutes.post('/submissions', async (c) => {
  const body = await c.req.json();
  const existing: any = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_submissions WHERE nama_biro = ? AND year = ?'
  ).bind(body.nama_biro, body.year).first();
  const payload = (c as any).get('jwtPayload') as any;
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE renja_perubahan_submissions SET stage = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(body.stage || existing.stage, existing.id).run();
    return c.json(existing);
  }
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO renja_perubahan_submissions (id, bureau_id, nama_biro, year, stage, status, current_version, submitted_by, submitted_at)
     VALUES (?, ?, ?, ?, ?, 'belum_upload', 0, ?, datetime('now'))`
  ).bind(id, body.bureau_id || null, body.nama_biro, body.year, body.stage || 'rancangan_perubahan', payload?.email || 'sistem').run();
  await createNotification(c.env, 'admin', body.nama_biro, 'submission', `Submission Renja Perubahan ${body.nama_biro} ${body.year} dibuat`);
  return c.json({ id, ...body, status: 'belum_upload', current_version: 0 }, 201);
});

perubahanRoutes.put('/submissions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key !== 'id' && value !== undefined) {
      if (key === 'has_critical_open') { sets.push('has_critical_open = ?'); params.push(value ? 1 : 0); }
      else { sets.push(`${key} = ?`); params.push(value); }
    }
  }
  if (sets.length === 0) return c.json({ error: 'Tidak ada field' }, 400);
  sets.push("updated_at = datetime('now')");
  params.push(id);
  await c.env.DB.prepare(`UPDATE renja_perubahan_submissions SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  return c.json({ id, ...body });
});

// Kembalikan untuk perbaikan (verifikator, wajib catatan)
// Opsi send_email: kirim notifikasi email ke pengguna Biro terkait.
perubahanRoutes.post('/submissions/:id/return', async (c) => {
  const id = c.req.param('id');
  const { note, send_email } = await c.req.json();
  if (!note || !note.trim()) return c.json({ error: 'Catatan pengembalian wajib diisi' }, 400);
  const payload = (c as any).get('jwtPayload') as any;
  const sub: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_submissions WHERE id = ?').bind(id).first();
  if (!sub) return c.json({ error: 'Submission tidak ditemukan' }, 404);
  await c.env.DB.prepare(
    `UPDATE renja_perubahan_submissions SET status = 'dikembalikan', approval_note = ?, verifikator = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(note, payload?.email, id).run();
  await logAudit(c, 'return', 'rp_submission', id, `Kembalikan untuk perbaikan: ${note}`);
  await createNotification(c.env, 'biro', sub.nama_biro, 'returned', `Dokumen ${sub.nama_biro} dikembalikan: ${note}`);

  // Notifikasi email (opsional, bila diminta & email terkonfigurasi)
  let mail = null;
  if (send_email) {
    const { sendMail } = await import('../mail');
    const { results: biroUsers } = await c.env.DB.prepare(
      'SELECT id, email, full_name FROM users WHERE nama_biro = ? AND is_active = 1'
    ).bind(sub.nama_biro).all();
    const emails = (biroUsers as any[]).map(u => u.email).filter(Boolean);
    const verifName = payload?.email || 'Verifikator';
    if (emails.length > 0) {
      mail = await sendMail(c.env, {
        to: emails,
        subject: `[SI-VERENA] Dokumen Renja Perubahan ${sub.nama_biro} dikembalikan untuk perbaikan`,
        html: renderReturnedEmail({
          biro: sub.nama_biro,
          tahun: sub.year,
          version: sub.current_version || 0,
          nextVersion: (sub.current_version || 0) + 1,
          verifikator: verifName,
          note,
          link: 'https://siverena.id/perubahan',
        }),
      });
      await logAudit(c, 'email_sent', 'rp_submission', id, `Email pengembalian dikirim ke ${emails.join(', ')} — ${mail.ok ? 'OK' : 'GAGAL: ' + (mail.error || '')}`);
    } else {
      await logAudit(c, 'email_sent', 'rp_submission', id, 'Email pengembalian tidak dikirim — tidak ada user biro dengan email');
    }
  }

  return c.json({
    message: 'Dokumen dikembalikan untuk perbaikan',
    email: mail ? (mail.ok ? 'terkirim' : `gagal: ${mail.error}`) : (send_email ? 'tidak dikirim (tidak ada penerima)' : 'tidak diminta'),
  });
});

// GET /api/perubahan/mail-status — status konfigurasi email (tanpa membocorkan key)
perubahanRoutes.get('/mail-status', async (c) => {
  const { getMailConfig } = await import('../mail');
  const cfg = getMailConfig(c.env);
  return c.json({
    enabled: cfg.enabled,
    provider: cfg.provider,
    from: cfg.from || null,
    configured: cfg.enabled && !!cfg.apiKey && !!cfg.from,
    hint: cfg.enabled && cfg.apiKey && cfg.from
      ? 'Email aktif.'
      : 'Email belum dikonfigurasi. Jalankan: wrangler secret put MAIL_API_KEY, MAIL_FROM, MAIL_ENABLED=true',
  });
});

// Tetapkan Final (blokir jika masih ada temuan kritis terbuka)
perubahanRoutes.post('/submissions/:id/final', async (c) => {
  const id = c.req.param('id');
  const { note } = await c.req.json();
  const payload = (c as any).get('jwtPayload') as any;
  const sub: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_submissions WHERE id = ?').bind(id).first();
  if (!sub) return c.json({ error: 'Submission tidak ditemukan' }, 404);
  if (sub.has_critical_open) return c.json({ error: 'Tidak dapat menetapkan Final — masih ada temuan kritis terbuka' }, 409);
  await c.env.DB.prepare(
    `UPDATE renja_perubahan_submissions SET status = 'final', approved_by = ?, approved_at = datetime('now'), approval_note = ?, verifikator = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(payload?.email, note || 'Ditetapkan Final', payload?.email, id).run();
  await logAudit(c, 'set_final', 'rp_submission', id, `Tetapkan Final ${sub.nama_biro} v${sub.current_version}`);
  await createNotification(c.env, 'admin', sub.nama_biro, 'final', `${sub.nama_biro} ditetapkan FINAL`);
  return c.json({ message: 'Ditetapkan Final' });
});

// ══════════════ VERSIONS ══════════════
perubahanRoutes.get('/versions', async (c) => {
  const submissionId = c.req.query('submission_id');
  const year = c.req.query('year');
  let q = 'SELECT * FROM renja_perubahan_versions WHERE 1=1';
  const p: any[] = [];
  if (submissionId) { q += ' AND submission_id = ?'; p.push(submissionId); }
  if (year) {
    q += ' AND submission_id IN (SELECT id FROM renja_perubahan_submissions WHERE year = ?)';
    p.push(parseInt(year));
  }
  q += ' ORDER BY version_number DESC';
  const { results } = await c.env.DB.prepare(q).bind(...p).all();
  return c.json({ data: results });
});

perubahanRoutes.post('/versions', async (c) => {
  const body = await c.req.json();
  const payload = (c as any).get('jwtPayload') as any;
  if (!body.submission_id || !body.main_file_url) return c.json({ error: 'submission_id dan file wajib' }, 400);

  // Hitung versi berikutnya
  const sub: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_submissions WHERE id = ?').bind(body.submission_id).first();
  if (!sub) return c.json({ error: 'Submission tidak ditemukan' }, 404);
  const nextVersion = (sub.current_version || 0) + 1;
  const kode = (sub.nama_biro || 'BR').substring(0, 4).toUpperCase().replace(/\s+/g, '');
  const registrasi = `RPB-${sub.year}-${kode}-V${nextVersion}-${Date.now().toString(36).toUpperCase()}`;
  const checksum = body.checksum || null;

  // Deteksi duplikat (file sama persis dengan versi sebelumnya)
  if (checksum) {
    const dup: any = await c.env.DB.prepare(
      'SELECT id, version_number FROM renja_perubahan_versions WHERE submission_id = ? AND checksum = ?'
    ).bind(body.submission_id, checksum).first();
    if (dup) {
      return c.json({
        warning: `File yang diunggah sama dengan versi sebelumnya (V${dup.version_number}).`,
        duplicate_of_version: dup.version_number,
      }, 409);
    }
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO renja_perubahan_versions (id, submission_id, version_number, stage, main_file_url, main_file_name, lampiran_urls, checksum, extraction_status, nomor_registrasi, tanggal_dokumen, nama_penyusun, pejabat_penanggung_jawab, catatan, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.submission_id, nextVersion, body.stage || sub.stage || 'rancangan_perubahan',
    body.main_file_url, body.main_file_name, JSON.stringify(body.lampiran || []), checksum, registrasi,
    body.tanggal_dokumen || null, body.nama_penyusun || null, body.pejabat_penanggung_jawab || null,
    body.catatan || null, payload?.email || 'sistem'
  ).run();

  await c.env.DB.prepare(
    `UPDATE renja_perubahan_submissions SET current_version = ?, status = 'sedang_diproses', stage = ?, submitted_by = ?, submitted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).bind(nextVersion, body.stage || sub.stage || 'rancangan_perubahan', payload?.email, body.submission_id).run();

  await logAudit(c, 'upload_version', 'rp_version', id, `Upload V${nextVersion} ${sub.nama_biro} (${registrasi})`);
  await createNotification(c.env, 'verifikator', sub.nama_biro, 'upload', `V${nextVersion} ${sub.nama_biro} diunggah`);
  return c.json({ id, version_number: nextVersion, nomor_registrasi: registrasi }, 201);
});

// DELETE /api/perubahan/versions/:id — hapus versi yang salah upload
// (ikut menghapus temuan, program, file R2; versi & status submission menyesuaikan)
perubahanRoutes.delete('/versions/:id', async (c) => {
  const id = c.req.param('id');
  const version: any = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_versions WHERE id = ?'
  ).bind(id).first();
  if (!version) return c.json({ error: 'Versi tidak ditemukan' }, 404);

  // Hapus temuan & data program versi ini
  await c.env.DB.prepare('DELETE FROM renja_perubahan_findings WHERE version_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM renja_perubahan_programs WHERE version_id = ?').bind(id).run();

  // Hapus file fisik dari R2 (dokumen utama + lampiran)
  if (version.main_file_url && c.env.R2) {
    const m = version.main_file_url.match(/\/api\/files\/(.+)$/);
    if (m) { try { await c.env.R2.delete(decodeURIComponent(m[1])); } catch { /* sudah tidak ada */ } }
  }
  try {
    const lamp = JSON.parse(version.lampiran_urls || '[]');
    for (const l of (lamp as any[])) {
      const mm = String(l?.url || '').match(/\/api\/files\/(.+)$/);
      if (mm) { try { await c.env.R2.delete(decodeURIComponent(mm[1])); } catch {} }
    }
  } catch { /* lampiran tidak valid */ }

  await c.env.DB.prepare('DELETE FROM renja_perubahan_versions WHERE id = ?').bind(id).run();

  // Perbarui submission: hitung ulang versi & status
  const { results: remaining } = await c.env.DB.prepare(
    'SELECT version_number FROM renja_perubahan_versions WHERE submission_id = ? ORDER BY version_number DESC'
  ).bind(version.submission_id).all();
  if (remaining.length === 0) {
    await c.env.DB.prepare(
      "UPDATE renja_perubahan_submissions SET current_version = 0, status = 'belum_upload', score = NULL, has_critical_open = 0, level_kesiapan = NULL, updated_at = datetime('now') WHERE id = ?"
    ).bind(version.submission_id).run();
  } else {
    const maxV = Math.max(...(remaining as any[]).map((r: any) => r.version_number));
    await c.env.DB.prepare(
      "UPDATE renja_perubahan_submissions SET current_version = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(maxV, version.submission_id).run();
  }

  await logAudit(c, 'delete_version', 'rp_version', id, `Hapus versi V${version.version_number} ${version.main_file_name || ''} (${version.submission_id})`);
  return c.json({ message: `Versi V${version.version_number} dihapus`, sisa: remaining.length });
});

// GET /api/perubahan/versions — list data program
// ══════════════ FINDINGS ══════════════
perubahanRoutes.get('/findings', async (c) => {
  const submissionId = c.req.query('submission_id');
  const versionId = c.req.query('version_id');
  const namaBiro = c.req.query('nama_biro');
  const year = c.req.query('year');
  const severity = c.req.query('severity');
  const status = c.req.query('status');
  let q = 'SELECT * FROM renja_perubahan_findings WHERE 1=1';
  const p: any[] = [];
  if (submissionId) { q += ' AND submission_id = ?'; p.push(submissionId); }
  if (versionId) { q += ' AND version_id = ?'; p.push(versionId); }
  if (namaBiro) { q += ' AND nama_biro = ?'; p.push(namaBiro); }
  if (year) { q += ' AND year = ?'; p.push(parseInt(year)); }
  if (severity) { q += ' AND severity = ?'; p.push(severity); }
  if (status) { q += ' AND status = ?'; p.push(status); }
  q += ' ORDER BY created_at DESC LIMIT 500';
  const { results } = await c.env.DB.prepare(q).bind(...p).all();
  return c.json({ data: results });
});

perubahanRoutes.post('/findings', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO renja_perubahan_findings (id, version_id, submission_id, nama_biro, year, version_number, category, severity, chapter, page, item_pemeriksaan, description, document_value, reference_value, reference_source, recommendation, status, is_ai_generated, finding_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.version_id || null, body.submission_id || null, body.nama_biro || '',
    body.year || new Date().getFullYear(), body.version_number || 1, body.category || '',
    body.severity || 'minor', body.chapter || '', body.page || '', body.item_pemeriksaan || '',
    body.description || '', body.document_value || '', body.reference_value || '', body.reference_source || '',
    body.recommendation || '', body.status || 'terbuka', body.is_ai_generated ? 1 : 0,
    body.finding_code || `FND-${Date.now().toString(36).toUpperCase()}`
  ).run();
  return c.json({ id, ...body }, 201);
});

perubahanRoutes.post('/findings/bulk', async (c) => {
  const { items } = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'items wajib array' }, 400);
  let created = 0;
  for (const item of items) {
    await c.env.DB.prepare(
      `INSERT INTO renja_perubahan_findings (id, version_id, submission_id, nama_biro, year, version_number, category, severity, chapter, page, item_pemeriksaan, description, document_value, reference_value, reference_source, recommendation, status, is_ai_generated, finding_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(), item.version_id || null, item.submission_id || null, item.nama_biro || '',
      item.year || new Date().getFullYear(), item.version_number || 1, item.category || '',
      item.severity || 'minor', item.chapter || '', item.page || '', item.item_pemeriksaan || '',
      item.description || '', item.document_value || '', item.reference_value || '', item.reference_source || '',
      item.recommendation || '', item.status || 'terbuka', item.is_ai_generated ? 1 : 0,
      item.finding_code || `FND-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`
    ).run();
    created++;
  }
  return c.json({ message: `${created} temuan dibuat`, created }, 201);
});

perubahanRoutes.put('/findings/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key !== 'id' && value !== undefined) {
      if (key === 'is_ai_generated') { sets.push('is_ai_generated = ?'); params.push(value ? 1 : 0); }
      else { sets.push(`${key} = ?`); params.push(value); }
    }
  }
  if (sets.length === 0) return c.json({ error: 'Tidak ada field' }, 400);
  sets.push("updated_at = datetime('now')");
  params.push(id);
  await c.env.DB.prepare(`UPDATE renja_perubahan_findings SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  return c.json({ id, ...body });
});

// Perbandingan versi: bandingkan temuan versi tertentu dengan versi sebelumnya
perubahanRoutes.get('/compare', async (c) => {
  const versionId = c.req.query('version_id');
  const version: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_versions WHERE id = ?').bind(versionId).first();
  if (!version) return c.json({ error: 'Versi tidak ditemukan' }, 404);
  const prevVersion: any = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_versions WHERE submission_id = ? AND version_number < ? ORDER BY version_number DESC LIMIT 1'
  ).bind(version.submission_id, version.version_number).first();
  const { results: current } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_findings WHERE version_id = ?'
  ).bind(versionId).all();
  let prev: any[] = [];
  if (prevVersion) {
    const r = await c.env.DB.prepare('SELECT * FROM renja_perubahan_findings WHERE version_id = ?').bind(prevVersion.id).all();
    prev = r.results as any[];
  }
  const prevCodes = new Set((prev as any[]).map(f => f.finding_code));
  const curCodes = new Set((current as any[]).map(f => f.finding_code));
  const rows = (prev as any[]).map(p => {
    const same = (current as any[]).find(cd => cd.finding_code === p.finding_code);
    return {
      finding_code: p.finding_code, item: p.item_pemeriksaan, severity: p.severity,
      prev_status: p.status, cur_status: same?.status || 'dihapus',
      status: same ? (same.status === 'selesai' || same.status === 'ditutup' ? 'Selesai' : 'Belum Selesai') : 'Baru/Selesai',
      description: p.description,
    };
  });
  const baru = (current as any[]).filter(cd => !prevCodes.has(cd.finding_code)).map(f => ({
    finding_code: f.finding_code, item: f.item_pemeriksaan, severity: f.severity, status: 'Baru', description: f.description,
  }));
  return c.json({
    version_number: version.version_number,
    prev_version_number: prevVersion?.version_number || null,
    rows: [...rows, ...baru],
    prev_total: (prev as any[]).length,
    cur_total: (current as any[]).length,
    diperbaiki: rows.filter(r => r.status === 'Selesai').length,
    tetap: rows.filter(r => r.status === 'Belum Selesai').length,
    baru_total: baru.length,
  });
});

// ══════════════ PEMERIKSAAN AI ══════════════
const KATEGORI_PERUBAHAN = [
  { key: 'kelengkapan_administratif', label: 'Kelengkapan Administratif', bobot: 10 },
  { key: 'sistematika_permendagri', label: 'Sistematika Permendagri 86/2017', bobot: 15 },
  { key: 'bab_i_pendahuluan', label: 'BAB I Pendahuluan', bobot: 10 },
  { key: 'bab_ii_evaluasi', label: 'BAB II Evaluasi s.d. Triwulan II', bobot: 15 },
  { key: 'bab_iii_rencana_kerja', label: 'BAB III Rencana Kerja & Pendanaan', bobot: 20 },
  { key: 'bab_iv_penutup', label: 'BAB IV Penutup', bobot: 5 },
  { key: 'keselarasan_rkpd', label: 'Keselarasan dengan Perubahan RKPD', bobot: 15 },
  { key: 'konsistensi_internal', label: 'Konsistensi Internal', bobot: 5 },
  { key: 'redaksional', label: 'Redaksional', bobot: 5 },
];

perubahanRoutes.post('/pemeriksaan', async (c) => {
  const { version_id } = await c.req.json();
  const version: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_versions WHERE id = ?').bind(version_id).first();
  if (!version) return c.json({ error: 'Versi tidak ditemukan' }, 404);
  const sub: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_submissions WHERE id = ?').bind(version.submission_id).first();
  if (!sub) return c.json({ error: 'Submission tidak ditemukan' }, 404);

  // Referensi aktif
  const { results: refs } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_references WHERE active = 1 ORDER BY priority ASC'
  ).all();
  const refContext = (refs as any[]).map(r => `- ${r.title} (Tipe: ${r.document_type}, Tahun: ${r.year || '-'}, Prioritas: ${r.priority})`).join('\n');

  // Hapus temuan lama versi ini (re-pemeriksaan)
  await c.env.DB.prepare('DELETE FROM renja_perubahan_findings WHERE version_id = ?').bind(version_id).run();

  // Ekstraksi teks
  let konten = '';
  let extractInfo = '';
  if (version.main_file_url && c.env.R2) {
    const ext = await extractTextFromR2(c.env.R2, version.main_file_url, version.main_file_name);
    konten = ext.text; extractInfo = ext.format;
  }
  const adaKonten = konten.trim().length > 100;

  const provider = getLLMProvider(c.env);
  const allFindings: any[] = [];

  if (adaKonten) {
    const hasilPerKategori = await Promise.allSettled(
      KATEGORI_PERUBAHAN.map(async (kat) => {
        const prompt = `Kamu adalah sistem pemeriksa otomatis dokumen Renja PERUBAHAN Perangkat Daerah (Permendagri 86/2017, Perubahan RKPD, SE Gubernur).

Biro: ${sub.nama_biro}
Tahun: ${sub.year}
Versi: V${version.version_number}
Kategori: ${kat.label}

${refContext ? `DOKUMEN ACUAN AKTIF (gunakan sebagai standar):\n${refContext}\n` : 'PERHATIAN: Tidak ada dokumen acuan aktif. Untuk item yang membutuhkan pembanding nyatakan "Belum dapat diverifikasi karena dokumen acuan belum tersedia".'}

ISI DOKUMEN (ekstraksi):
"""
${konten.slice(0, 60000)}
"""

Tugas: periksa kategori "${kat.label}". Temukan TEMUAN (hanya yang bermasalah). Untuk setiap temuan berikan:
- category: "${kat.key}"
- severity: kritis|mayor|minor|informasi (kritis: tahun salah/BAB utama hilang/program tidak ada di acuan/pagu berbeda material/dokumen tak terbaca; mayor: indikator/target/evaluasi TW2/alasan perubahan; minor: format/tabel/istilah; informasi: typo/redaksional)
- chapter: BAB/subbab
- page: halaman jika diketahui, jika tidak ""
- item: nama item pemeriksaan
- description: TEMUAN spesifik (apa yang salah/kurang) — LOKASI — KONDISI DOKUMEN aktual
- document_value: isi aktual di dokumen (kutipan), jika tidak ada ""
- reference_value: data dari dokumen acuan (atau "Tidak dapat diverifikasi karena dokumen acuan belum tersedia")
- reference_source: nama acuan yang dibandingkan (atau "")
- recommendation: tindakan perbaikan konkret untuk Biro

ATURAN MUTLAK:
- JANGAN mengarang data/halaman/angka. Jika tidak ada di dokumen: "Tidak ditemukan dalam dokumen."
- Hanya buat temuan untuk masalah nyata. JANGAN buat temuan palsu.
- Jika dokumen tidak dapat dibaca: satu temuan kritis "Dokumen tidak dapat dibaca".

Format JSON (hanya JSON):
{"hasil": [{"category":"...","severity":"...","chapter":"...","page":"...","item":"...","description":"...","document_value":"...","reference_value":"...","reference_source":"...","recommendation":"..."}]}`;

        try {
          const resp = await provider.generate(prompt);
          let parsed: any = null;
          try { parsed = JSON.parse(String(resp).replace(/^```(?:json)?/i, '').replace(/```$/g, '').trim()); } catch {}
          if (!parsed) {
            const a = String(resp).indexOf('{'), b = String(resp).lastIndexOf('}');
            try { parsed = JSON.parse(String(resp).slice(a, b + 1)); } catch { parsed = { hasil: [] }; }
          }
          return { kategori: kat.key, hasil: Array.isArray(parsed?.hasil) ? parsed.hasil : [] };
        } catch (e: any) {
          return { kategori: kat.key, hasil: [{ category: kat.key, severity: 'mayor', chapter: '', page: '', item: `Pemeriksaan ${kat.label}`, description: `Gagal diproses AI: ${e.message}`, document_value: '', reference_value: '', reference_source: '', recommendation: 'Lakukan pemeriksaan manual.' }] };
        }
      })
    );

    for (const r of hasilPerKategori) {
      if (r.status !== 'fulfilled') continue;
      for (const f of r.value.hasil || []) {
        allFindings.push({
          ...f, severity: ['kritis', 'mayor', 'minor', 'informasi'].includes(f.severity) ? f.severity : 'minor',
          finding_code: `FND-${String(allFindings.length + 1).padStart(3, '0')}`,
        });
      }
    }
  } else {
    allFindings.push({
      category: 'kelengkapan_administratif', severity: 'kritis', chapter: '', page: '',
      item: 'Keterbacaan Dokumen', description: `Dokumen tidak dapat dianalisis (ekstraksi ${extractInfo || 'gagal'}). Silakan unggah dokumen DOCX atau PDF yang dapat dibaca.`,
      document_value: '', reference_value: '', reference_source: '', recommendation: 'Unggah ulang dokumen yang dapat dibaca.', finding_code: 'FND-001',
    });
  }

  // Simpan findings
  if (allFindings.length > 0) {
    const stmt = `INSERT INTO renja_perubahan_findings (id, version_id, submission_id, nama_biro, year, version_number, category, severity, chapter, page, item_pemeriksaan, description, document_value, reference_value, reference_source, recommendation, status, is_ai_generated, finding_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'terbuka', 1, ?)`;
    for (const f of allFindings) {
      await c.env.DB.prepare(stmt).bind(
        crypto.randomUUID(), version_id, sub.id, sub.nama_biro, sub.year, version.version_number,
        f.category || '', f.severity || 'minor', f.chapter || '', f.page || '', f.item || '',
        f.description || '', f.document_value || '', f.reference_value || '', f.reference_source || '',
        f.recommendation || '', f.finding_code || ''
      ).run();
    }
  }

  // Skor
  const score = computeScore(allFindings);
  await c.env.DB.prepare(
    `UPDATE renja_perubahan_submissions SET status = 'menunggu_verifikator', score = ?, level_kesiapan = ?, has_critical_open = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(score.skor_total, score.level_kesiapan, score.has_critical_open ? 1 : 0, sub.id).run();
  await c.env.DB.prepare(
    `UPDATE renja_perubahan_versions SET extraction_status = 'berhasil', extracted_content = ? WHERE id = ?`
  ).bind(konten.slice(0, 60000), version_id).run();
  await logAudit(c, 'pemeriksaan', 'rp_version', version_id, `Pemeriksaan V${version.version_number} ${sub.nama_biro}: ${allFindings.length} temuan, skor ${score.skor_total}`);
  await createNotification(c.env, 'biro', sub.nama_biro, 'selesai', `Pemeriksaan V${version.version_number} selesai: ${allFindings.length} temuan, skor ${score.skor_total}`);
  if (score.has_critical_open) {
    await createNotification(c.env, 'admin', sub.nama_biro, 'kritis', `Temuan KRITIS terbuka pada ${sub.nama_biro} V${version.version_number}`);
  }

  return c.json({
    message: `Pemeriksaan selesai. ${allFindings.length} temuan.`,
    findings: allFindings.length,
    skor_total: score.skor_total,
    level_kesiapan: score.level_kesiapan,
    has_critical_open: score.has_critical_open,
    extract: extractInfo,
  });
});

// ══════════════ RENJA PERUBAHAN SETDA ══════════════
// Sistematika Renja Perubahan Perangkat Daerah sesuai Lampiran Permendagri 86/2017
// (Petunjuk Teknis Penyusunan Renja PD — berlaku juga utk Renja Perubahan):
//   BAB I   PENDAHULUAN                            (1.1–1.4)
//   BAB II  EVALUASI PELAKSANAAN RENJA PD          (2.1–2.5, wajib memuat Tabel 2.1–2.4)
//   BAB III TUJUAN, SASARAN, PROGRAM DAN KEGIATAN  (3.1–3.4, wajib memuat Tabel 3.1–3.4)
//   BAB IV  PENUTUP                                (4.1–4.3)
const SETDA_TEMPLATE = [
  // BAB I PENDAHULUAN
  { chapter: '1', sub: '1.1', judul: 'Latar Belakang', urutan: 1 },
  { chapter: '1', sub: '1.2', judul: 'Landasan Hukum', urutan: 2 },
  { chapter: '1', sub: '1.3', judul: 'Maksud dan Tujuan', urutan: 3 },
  { chapter: '1', sub: '1.4', judul: 'Sistematika Penulisan', urutan: 4 },
  // BAB II EVALUASI PELAKSANAAN RENJA PERANGKAT DAERAH — wajib memuat Tabel 2.1–2.4
  { chapter: '2', sub: '2.1', judul: 'Evaluasi Pelaksanaan Renja Setda Tahun Lalu dan Capaian Renstra', urutan: 5, tabel: '2.1' },
  { chapter: '2', sub: '2.2', judul: 'Analisis Kinerja Pelayanan Sekretariat Daerah', urutan: 6, tabel: '2.2' },
  { chapter: '2', sub: '2.3', judul: 'Isu-Isu Penting Penyelenggaraan Tugas dan Fungsi', urutan: 7 },
  { chapter: '2', sub: '2.4', judul: 'Review terhadap Rancangan Awal Perubahan RKPD', urutan: 8, tabel: '2.3' },
  { chapter: '2', sub: '2.5', judul: 'Penelaahan Usulan Program dan Kegiatan Masyarakat', urutan: 9, tabel: '2.4' },
  // BAB III TUJUAN, SASARAN, PROGRAM DAN KEGIATAN
  { chapter: '3', sub: '3.1', judul: 'Telaahan terhadap Kebijakan Nasional', urutan: 10 },
  { chapter: '3', sub: '3.2', judul: 'Tujuan dan Sasaran', urutan: 11 },
  { chapter: '3', sub: '3.3', judul: 'Program dan Kegiatan', urutan: 12, tabel: '3.1' },
  { chapter: '3', sub: '3.4', judul: 'Matriks Renja Perubahan Setda', urutan: 13, tabel: '3.4' },
  // BAB IV PENUTUP
  { chapter: '4', sub: '4.1', judul: 'Kesimpulan', urutan: 14 },
  { chapter: '4', sub: '4.2', judul: 'Kaidah Pelaksanaan', urutan: 15 },
  { chapter: '4', sub: '4.3', judul: 'Tindak Lanjut', urutan: 16 },
];

// ── Helper kompilasi otomatis (Fase 1) ──────────────────────────────
function parseJSONStrict(raw: string): any {
  let s = String(raw).replace(/^```(?:json)?/i, '').replace(/```$/g, '').trim();
  try { return JSON.parse(s); } catch { /* lanjut */ }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch { /* gagal */ } }
  return null;
}

// Ekstrak program/kegiatan dari satu versi dokumen biro (AI).
// force=false → skip jika versi sudah punya data program (hemat biaya AI).
async function extractProgramsForVersion(env: any, provider: any, version: any, sub: any, force = false) {
  if (!force) {
    const existing: any = await env.DB.prepare('SELECT COUNT(*) AS t FROM renja_perubahan_programs WHERE version_id = ?').bind(version.id).first();
    if ((existing?.t || 0) > 0) return { saved: existing.t, skipped: true };
  }
  let konten = '';
  if (version.main_file_url && env.R2) {
    try { const ext = await extractTextFromR2(env.R2, version.main_file_url, version.main_file_name); konten = ext.text; } catch { /* best effort */ }
  }
  if (konten.trim().length < 500) konten = (version.extracted_content || '').slice(0, 60000);
  const { results: refs } = await env.DB.prepare(
    "SELECT * FROM renja_perubahan_references WHERE active = 1 AND document_type IN ('perubahan_rkpd','rancangan_perubahan_rkpd') ORDER BY priority ASC"
  ).all();
  const refContext = (refs as any[]).map(r => `- ${r.title}`).join('\n');
  const prompt = `Ekstrak SEMUA Program, Kegiatan dan Subkegiatan dari dokumen Renja Perubahan Biro ${sub?.nama_biro} tahun ${sub?.year} V${version.version_number}.

ISI DOKUMEN:
"""
${konten}
"""

${refContext ? `DOKUMEN ACUAN (Perubahan RKPD):\n${refContext}\n` : ''}

Untuk setiap item, ekstrak: kode program, nama program, kode kegiatan, nama kegiatan, kode subkegiatan, nama subkegiatan, indikator, target awal, target perubahan, satuan, pagu awal (angka), pagu perubahan (angka), sumber dana, lokasi, kelompok sasaran.
FOKUS pada tabel (mis. T-C.29 / T-C.33 / matriks) di BAB III dan BAB IV. Jika dokumen memuat tabel program/kegiatan, WAJIB ekstrak baris-barisnya.
ATURAN: hanya data yang BENAR-BENAR ada di dokumen. JANGAN mengarang. Jika tidak ada, kosongkan. TANPA indentasi/spasi berlebih agar output ringkas (format padat).

Format JSON (hanya JSON, padat):
{"programs": [{"program_code":"","program_name":"","activity_code":"","activity_name":"","subactivity_code":"","subactivity_name":"","indicator":"","target_awal":"","target_perubahan":"","satuan":"","pagu_awal":0,"pagu_perubahan":0,"sumber_dana":"","lokasi":"","kelompok_sasaran":""}]}`;

  let programs: any[] = [];
  try {
    const resp = await provider.generate(prompt);
    const parsed = parseJSONStrict(resp);
    programs = parsed?.programs || [];
  } catch (e: any) { programs = []; console.log('[extract] parse gagal:', e.message); }

  if (force) await env.DB.prepare('DELETE FROM renja_perubahan_programs WHERE version_id = ?').bind(version.id).run();
  let saved = 0;
  for (const p of programs) {
    if (!p.program_name && !p.activity_name) continue;
    await env.DB.prepare(
      `INSERT INTO renja_perubahan_programs (id, version_id, submission_id, nama_biro, year, version_number, program_code, program_name, activity_code, activity_name, subactivity_code, subactivity_name, indicator, target_awal, target_perubahan, satuan, pagu_awal, pagu_perubahan, sumber_dana, lokasi, kelompok_sasaran, source_location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(), version.id, sub?.id || null, sub?.nama_biro || '', sub?.year || 0, version.version_number,
      p.program_code || '', p.program_name || '', p.activity_code || '', p.activity_name || '',
      p.subactivity_code || '', p.subactivity_name || '', p.indicator || '', p.target_awal || '',
      p.target_perubahan || '', p.satuan || '', Number(p.pagu_awal) || 0, Number(p.pagu_perubahan) || 0,
      p.sumber_dana || '', p.lokasi || '', p.kelompok_sasaran || '',
      `V${version.version_number} — ${sub?.nama_biro || ''}`
    ).run();
    saved++;
  }
  return { saved, skipped: false };
}

// Ringkas dokumen biro per BAB (I–IV) sebagai bahan kompilasi Setda.
async function digestBiroDoc(provider: any, sub: any, version: any, konten: string) {
  const prompt = `Buat RINGKASAN TERSTRUKTUR dokumen Renja PERUBAHAN Biro ${sub.nama_biro} Provinsi Sumatera Barat tahun ${sub.year} versi V${version.version_number} sesuai sistematika Permendagri 86/2017.

ISI DOKUMEN:
"""
${konten.slice(0, 25000)}
"""

Hasilkan JSON (hanya JSON, padat):
{"bab1":"Ringkasan BAB I Pendahuluan: latar belakang, landasan hukum, maksud dan tujuan, keterkaitan dengan Perubahan RKPD, sistematika penulisan. Maks 250 kata.",
"bab2":"Ringkasan BAB II Evaluasi Pelaksanaan Renja Setda Tahun Lalu: evaluasi pelaksanaan Renja tahun lalu dan capaian Renstra, analisis kinerja pelayanan, isu-isu penting penyelenggaraan tugas dan fungsi, review terhadap rancangan awal Perubahan RKPD, penelaahan usulan program dan kegiatan masyarakat. Sertakan ANGKA realisasi kinerja dan anggaran s.d. Triwulan II. Maks 350 kata.",
"bab3":"Ringkasan BAB III Rencana Kerja dan Pendanaan: rencana program/kegiatan/subkegiatan perubahan, indikator dan target, pagu awal, pagu perubahan, selisih, sumber dana, lokasi. Sertakan ANGKA PENTING. Maks 350 kata.",
"bab4":"Ringkasan BAB IV Penutup: kesimpulan, kaidah pelaksanaan, tindak lanjut. Maks 200 kata."}
ATURAN: hanya gunakan data yang benar-benar ada di dokumen. JANGAN mengarang. Gunakan bahasa Indonesia formal.`;
  const resp = await provider.generate(prompt);
  const parsed = parseJSONStrict(resp);
  return { bab1: parsed?.bab1 || '', bab2: parsed?.bab2 || '', bab3: parsed?.bab3 || '', bab4: parsed?.bab4 || '' };
}

// Tabel-tabel standar Permendagri 86/2017 utk Renja Perubahan Setda (BAB III):
//  Tabel 3.1 — Rekapitulasi Rencana Program dan Kegiatan per Bidang Urusan (per Program)
//  Tabel 3.3 — Rekapitulasi Pagu Awal, Pagu Perubahan dan Selisih (per Program/Kegiatan)
//  Tabel 3.4 — Matriks Renja Perubahan Setda (per Program/Kegiatan/Subkegiatan)
function fmtNum(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n || 0);
}
function buildSetdaTables(programs: any[]) {
  const progMap = new Map<string, any>();
  const kegMap = new Map<string, any>();
  const subMap = new Map<string, any>();
  for (const pr of programs) {
    const pk = `${pr.program_code || ''}`;
    const kk = `${pr.program_code || ''}.${pr.activity_code || ''}`;
    const sk = `${pr.program_code || ''}.${pr.activity_code || ''}.${pr.subactivity_code || ''}`;
    const p = progMap.get(pk) || { kode: pr.program_code || '', nama: pr.program_name || '', kegiatan: new Set(), pagu_awal: 0, pagu_perubahan: 0, biro: new Set() };
    p.kegiatan.add(pr.activity_name || pr.activity_code || '');
    p.pagu_awal += Number(pr.pagu_awal) || 0;
    p.pagu_perubahan += Number(pr.pagu_perubahan) || 0;
    p.biro.add(pr.nama_biro);
    progMap.set(pk, p);
    const k = kegMap.get(kk) || { kode: kk, nama: [pr.program_name, pr.activity_name].filter(Boolean).join(' — '), pagu_awal: 0, pagu_perubahan: 0, biro: new Set() };
    k.pagu_awal += Number(pr.pagu_awal) || 0;
    k.pagu_perubahan += Number(pr.pagu_perubahan) || 0;
    k.biro.add(pr.nama_biro);
    kegMap.set(kk, k);
    const s = subMap.get(sk) || { kode: sk, nama: [pr.program_name, pr.activity_name, pr.subactivity_name].filter(Boolean).join(' — '), pagu_awal: 0, pagu_perubahan: 0, biro: new Set() };
    s.pagu_awal += Number(pr.pagu_awal) || 0;
    s.pagu_perubahan += Number(pr.pagu_perubahan) || 0;
    s.biro.add(pr.nama_biro);
    subMap.set(sk, s);
  }
  const sortByKode = (a: any, b: any) => a.kode.localeCompare(b.kode, 'en', { numeric: true });
  const header = `${'Kode'.padEnd(26)}| ${'Program / Kegiatan / Subkegiatan'.padEnd(72)}| Pagu Awal | Pagu Perubahan | Selisih | Biro`;
  const row = (kode: string, nama: string, paguA: number, paguP: number, extra: string) => {
    const selisih = (paguP || 0) - (paguA || 0);
    return `${String(kode).padEnd(26)}| ${String(nama).slice(0, 72).padEnd(72)}| ${fmtNum(paguA).padStart(12)} | ${fmtNum(paguP).padStart(14)} | ${fmtNum(selisih).padStart(14)} | ${extra}`;
  };
  const rekapProgram = [
    header,
    ...[...progMap.values()].sort(sortByKode).map(p => row(p.kode, p.nama, p.pagu_awal, p.pagu_perubahan, `${p.kegiatan.size} kegiatan (${[...p.biro].join(', ')})`)),
  ].join('\n');
  const rekapKegiatan = [
    header,
    ...[...kegMap.values()].sort(sortByKode).map(k => row(k.kode, k.nama, k.pagu_awal, k.pagu_perubahan, [...k.biro].join(', '))),
  ].join('\n');
  const matriks = [
    header,
    ...[...subMap.values()].sort(sortByKode).map(s => row(s.kode, s.nama, s.pagu_awal, s.pagu_perubahan, [...s.biro].join(', '))),
  ].join('\n');
  return { rekapProgram, rekapKegiatan, matriks };
}

// ── Tabel-tabel BAB II yang WAJIB ada menurut Permendagri 86/2017 ──────────
// (Lampiran Petunjuk Teknis Penyusunan Renja PD):
//   Tabel 2.1 — Rekapitulasi Evaluasi Hasil Pelaksanaan Renja PD dan Pencapaian Renstra PD
//   Tabel 2.2 — Pencapaian Kinerja Pelayanan Perangkat Daerah
//   Tabel 2.3 — Review terhadap Rancangan Awal RKPD
//   Tabel 2.4 — Usulan Program dan Kegiatan dari Para Pemangku Kepentingan
// Data yang belum tersedia di sistem ditandai "—" agar reviewer mengisinya;
// baris program/kegiatan diisi dari hasil ekstraksi renja_perubahan_programs.
function buildSetdaBab2Tables(programs: any[], year: number) {
  const sorted = [...(programs || [])].sort((a, b) =>
    `${a.program_code || ''}.${a.activity_code || ''}`.localeCompare(`${b.program_code || ''}.${b.activity_code || ''}`, 'en', { numeric: true })
  );
  const seen = new Set<string>();
  const progRows = sorted.filter(p => { const k = `${p.program_code || ''}|${p.program_name || ''}`; if (seen.has(k)) return false; seen.add(k); return true; });

  // Tabel 2.1 — Rekapitulasi Evaluasi Hasil Pelaksanaan Renja PD dan Pencapaian Renstra PD
  const t21Header = [
    'Kode',
    'Urusan/Bidang Urusan/Program/Kegiatan',
    'Indikator Kinerja Program (outcome)/Kegiatan (output)',
    'Target Renstra PD Tahun ' + year,
    'Realisasi Renja s.d. Tahun Lalu',
    'Tingkat Realisasi (%)',
    'Realisasi Capaian Program dan Kegiatan s.d. Tahun ' + year,
    'Target Kinerja dan Anggaran Renja PD Tahun Berjalan (Rp)',
    'Realisasi Kinerja dan Anggaran Renja PD s.d. Triwulan II (Rp)',
    'Tingkat Capaian Kinerja dan Realisasi Anggaran Renja PD',
    'Unit Kerja Penanggung Jawab',
  ];
  const t21Rows = progRows.length
    ? progRows.map(p => [
        `${p.program_code || ''}.${p.activity_code || ''}`.trim(),
        [p.program_name, p.activity_name].filter(Boolean).join(' — '),
        p.indicator || '—',
        p.target_awal || '—',
        '—',
        '—',
        '—',
        fmtNum(p.pagu_awal),
        '—',
        '—',
        p.nama_biro || '—',
      ])
    : [['—', 'Data evaluasi akan dilengkapi setelah seluruh biro menetapkan Renja Perubahan', '—', '—', '—', '—', '—', '—', '—', '—', '—']];
  const tabel21 = `Tabel 2.1 — Rekapitulasi Evaluasi Hasil Pelaksanaan Renja Setda dan Pencapaian Renstra s.d. Tahun ${year} (Permendagri 86/2017):\n` +
    t21Header.join(' | ') + '\n' + t21Rows.map(r => r.join(' | ')).join('\n');

  // Tabel 2.2 — Pencapaian Kinerja Pelayanan Perangkat Daerah
  const t22Header = ['Indikator', 'SPM/Standar Nasional', 'IKK', 'Target Renstra PD', 'Realisasi', 'Capaian (%)', 'Proyeksi', 'Catatan Analisis'];
  const t22Rows = progRows.length
    ? progRows.map((p, i) => [
        `Kinerja ${[p.program_name, p.activity_name].filter(Boolean).join(' — ')}`,
        '—',
        '—',
        p.target_awal || '—',
        '—',
        '—',
        '—',
        p.nama_biro || '—',
      ])
    : [['—', 'Data capaian kinerja pelayanan akan dilengkapi', '—', '—', '—', '—', '—', '—']];
  const tabel22 = `Tabel 2.2 — Pencapaian Kinerja Pelayanan Sekretariat Daerah Tahun ${year} (Permendagri 86/2017):\n` +
    t22Header.join(' | ') + '\n' + t22Rows.map(r => r.join(' | ')).join('\n');

  // Tabel 2.3 — Review terhadap Rancangan Awal Perubahan RKPD
  const t23Header = [
    'Rancangan Awal Perubahan RKPD — Program/Kegiatan', 'Lokasi', 'Target Capaian Kinerja', 'Pagu Indikatif (Rp)',
    'Hasil Analisis Kebutuhan — Program/Kegiatan', 'Lokasi', 'Target Capaian Kinerja', 'Kebutuhan Dana (Rp)', 'Catatan Penting',
  ];
  const t23Rows = progRows.length
    ? progRows.map(p => [
        [p.program_name, p.activity_name].filter(Boolean).join(' — '),
        p.lokasi || '—',
        p.target_perubahan || p.target_awal || '—',
        fmtNum(p.pagu_awal),
        [p.program_name, p.activity_name].filter(Boolean).join(' — '),
        p.lokasi || '—',
        p.target_perubahan || '—',
        fmtNum(p.pagu_perubahan),
        '—',
      ])
    : [['—', '—', '—', '—', '—', '—', '—', '—', 'Data review akan dilengkapi']];
  const tabel23 = `Tabel 2.3 — Review terhadap Rancangan Awal Perubahan RKPD Tahun ${year} (Permendagri 86/2017):\n` +
    t23Header.join(' | ') + '\n' + t23Rows.map(r => r.join(' | ')).join('\n');

  // Tabel 2.4 — Usulan Program dan Kegiatan dari Para Pemangku Kepentingan
  const t24Header = ['No', 'Program/Kegiatan', 'Lokasi', 'Indikator Kinerja', 'Besaran/Volume', 'Catatan'];
  const t24Rows = progRows.length
    ? progRows.map((p, i) => [String(i + 1), [p.program_name, p.activity_name].filter(Boolean).join(' — '), p.lokasi || '—', p.indicator || '—', p.target_perubahan || p.target_awal || '—', p.nama_biro || '—'])
    : [['1', '—', '—', '—', '—', 'Data usulan masyarakat akan dilengkapi']];
  const tabel24 = `Tabel 2.4 — Usulan Program dan Kegiatan dari Para Pemangku Kepentingan Tahun ${year} (Permendagri 86/2017):\n` +
    t24Header.join(' | ') + '\n' + t24Rows.map(r => r.join(' | ')).join('\n');

  return { tabel21, tabel22, tabel23, tabel24 };
}

// Susun isi section untuk satu BAB dari ringkasan seluruh biro + data program.
async function compileBAB(provider: any, ctx: {
  year: number; bab: number; template: any[]; digests: any[]; matrixText: string;
  refContext: string; finalCount: number; compiledCount: number;
}) {
  const { year, bab, template, digests, matrixText, refContext, finalCount, compiledCount } = ctx;
  const key = `bab${bab}`;
  const biroData = digests.map(d => {
    const isi = d.digest?.[key] || '';
    return `### ${d.nama_biro} — ${d.final ? 'FINAL' : 'BELUM FINAL'} (${d.status}) V${d.version}\n${isi || '(Tidak dapat diekstrak dari dokumen.)'}`;
  }).join('\n\n');

  const prompt = `Anda adalah penyusun dokumen perencanaan daerah. KOMPILASIKAN data biro-biro di bawah ini menjadi isi resmi BAB ${bab} draft Renja PERUBAHAN SETDA Provinsi Sumatera Barat tahun ${year}.

SUBBAB YANG HARUS DIISI:
${template.map((t: any) => `- ${t.sub} ${t.judul}`).join('\n')}

DATA PER BIRO (ringkasan ekstraksi):
${biroData}

${matrixText ? `MATRIKS RENJA PERUBAHAN TERKOMPILASI (semua biro):\n${matrixText}\n` : ''}

${refContext ? `DOKUMEN ACUAN AKTIF:\n${refContext}\n` : ''}

CATATAN: ${finalCount} dari ${compiledCount} biro sudah FINAL. Biro belum final ditandai "BELUM FINAL" — data tetap dipakai sebagai draft awal.

TUGAS: tulis isi setiap subbab dengan mengkompilasi data SEMUA biro (bukan hanya satu biro), bahasa Indonesia formal sesuai kaidah dokumen perencanaan daerah, angka ditulis konsisten. Jika suatu subbab belum ada datanya, tulis: "Data belum tersedia dan akan dilengkapi setelah seluruh biro ditetapkan final."
PENTING: JANGAN salin matriks/tabel secara verbatim ke dalam konten; cukup rangkum polanya dan rujuk pada "Matriks Renja Perubahan Setda" (lampiran).

Format JSON (hanya JSON):
{"sections":[{"sub":"${template[0]?.sub}","content":"isi subbab (gunakan \\n untuk paragraf baru)"}]}
Semua subbab wajib ada: ${template.map((t: any) => t.sub).join(', ')}.`;

  const resp = await provider.generate(prompt);
  const parsed = parseJSONStrict(resp);
  const sections: Record<string, string> = {};
  for (const s of (parsed?.sections || [])) {
    if (s?.sub && s?.content) sections[s.sub] = String(s.content);
  }
  return { sections, status: 'otomatis' };
}

perubahanRoutes.get('/setda', async (c) => {
  const year = c.req.query('year');
  const limit = parseInt(c.req.query('limit') || '20');
  let q = 'SELECT * FROM renja_perubahan_setda WHERE 1=1';
  const p: any[] = [];
  if (year) { q += ' AND year = ?'; p.push(parseInt(year)); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  p.push(limit);
  const { results } = await c.env.DB.prepare(q).bind(...p).all();
  return c.json({ data: results });
});

// GET /api/perubahan/years — daftar tahun yang punya data submissions (untuk default tahun)
perubahanRoutes.get('/years', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT s.year, COUNT(*) AS total, SUM(CASE WHEN s.status = 'final' THEN 1 ELSE 0 END) AS final_count
     FROM renja_perubahan_submissions s GROUP BY s.year ORDER BY s.year DESC`
  ).all();
  return c.json({ data: results });
});

perubahanRoutes.get('/setda/:id', async (c) => {
  const id = c.req.param('id');
  const setda: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_setda WHERE id = ?').bind(id).first();
  if (!setda) return c.json({ error: 'Tidak ditemukan' }, 404);
  const { results: sections } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_sections WHERE setda_id = ? ORDER BY urutan ASC'
  ).bind(id).all();
  const { results: sources } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_sources WHERE setda_id = ?'
  ).bind(id).all();
  return c.json({ ...setda, sections, sources });
});

// Generate / Generate Ulang draft Renja Perubahan Setda — KOMPILASI OTOMATIS
// dari SEMUA biro yang sudah mengunggah dokumen (final maupun belum final).
perubahanRoutes.post('/setda/generate', async (c) => {
  const { year, mode, setda_id } = await c.req.json();
  const payload = (c as any).get('jwtPayload') as any;

  const allSubs: any[] = (await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_submissions WHERE year = ? AND current_version > 0 ORDER BY nama_biro ASC'
  ).bind(year).all()).results;
  const finalSubs = allSubs.filter(s => s.status === 'final');

  if (allSubs.length === 0) {
    return c.json({ error: 'Belum ada biro yang mengunggah dokumen untuk tahun ini.' }, 409);
  }
  if (mode !== 'draft' && finalSubs.length < allSubs.length) {
    return c.json({
      error: `Belum semua biro Final (${finalSubs.length}/${allSubs.length}). Gunakan mode DRAFT untuk kompilasi awal.`,
      final: finalSubs.length, total: allSubs.length,
      belum_final: allSubs.filter(s => s.status !== 'final').map(s => s.nama_biro),
    }, 409);
  }

  const provider = getLLMProvider(c.env);
  const id = setda_id || crypto.randomUUID();
  let sv = 1;
  if (setda_id) {
    const existing: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_setda WHERE id = ?').bind(setda_id).first();
    if (!existing) return c.json({ error: 'Draft tidak ditemukan' }, 404);
    if (existing.year !== year) return c.json({ error: 'Tahun draft tidak cocok' }, 400);
    sv = (existing.version || 1) + 1;
    await c.env.DB.prepare('DELETE FROM renja_perubahan_sections WHERE setda_id = ?').bind(setda_id).run();
    await c.env.DB.prepare('DELETE FROM renja_perubahan_sources WHERE setda_id = ?').bind(setda_id).run();
  }

  // 1) Versi terakhir tiap biro + ekstraksi program (paralel, skip jika sudah ada)
  const biroData: any[] = [];
  for (const s of allSubs) {
    const vers: any = await c.env.DB.prepare(
      'SELECT * FROM renja_perubahan_versions WHERE submission_id = ? ORDER BY version_number DESC LIMIT 1'
    ).bind(s.id).first();
    if (!vers) continue;
    biroData.push({ sub: s, version: vers, prog: { saved: 0, skipped: false }, digest: null });
  }
  await Promise.allSettled(biroData.map(async (b) => {
    b.prog = await extractProgramsForVersion(c.env, provider, b.version, b.sub).catch(() => ({ saved: 0, skipped: false }));
  }));

  // 2) Ekstrak teks + ringkasan per biro (paralel, best-effort)
  await Promise.allSettled(biroData.map(async (b) => {
    let konten = '';
    if (b.version.main_file_url && c.env.R2) {
      try { const ext = await extractTextFromR2(c.env.R2, b.version.main_file_url, b.version.main_file_name); konten = ext.text; } catch { /* best effort */ }
    }
    if (konten.trim().length < 500) konten = (b.version.extracted_content || '').slice(0, 60000);
    if (konten.trim().length > 100) {
      b.digest = await digestBiroDoc(provider, b.sub, b.version, konten).catch(() => null);
    }
  }));

  // 3) Program hasil ekstraksi → tabel Permendagri & BAB III
  const biroNames = biroData.map(b => b.sub.nama_biro);
  const { results: programs } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_programs WHERE year = ? AND nama_biro IN (SELECT value FROM json_each(?))'
  ).bind(year, JSON.stringify(biroNames)).all();
  const { results: refs } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_references WHERE active = 1 ORDER BY priority ASC'
  ).all();
  const refContext = (refs as any[]).map(r => `- ${r.title} (Tipe: ${r.document_type}, Prioritas: ${r.priority})`).join('\n');
  const tables = buildSetdaTables(programs as any[]);
  const promptMatrix = tables.matriks.split('\n').slice(0, 120).join('\n');

  // 4) Kompilasi section per BAB (paralel, best-effort); section 3.4 matriks diisi langsung
  const compiledContent: Record<string, string> = {};
  const sectionStatus: Record<string, string> = {};
  const digests = biroData.map(b => ({ nama_biro: b.sub.nama_biro, status: b.sub.status, final: b.sub.status === 'final', version: b.version.version_number, digest: b.digest }));
  // Tabel-tabel wajib Permendagri 86/2017 (BAB II & III) disusun dari data agregasi,
  // lalu ditambahkan ke subbab yang bersangkutan (tidak perlu dikompilasi AI).
  const bab2 = buildSetdaBab2Tables(programs as any[], year);
  if (tables.matriks) {
    compiledContent['3.4'] = `Tabel 3.4 — Matriks Renja Perubahan Setda Tahun ${year} (kompilasi ${biroData.length} biro; Permendagri 86/2017):\n\n${tables.matriks}`;
    sectionStatus['3.4'] = 'otomatis';
  }
  const babResults = await Promise.allSettled([1, 2, 3, 4].map(async (bab) => {
    // 3.4 matriks diisi langsung dari hasil agregasi, tidak perlu dikompilasi AI
    const tpl = SETDA_TEMPLATE.filter(t => Number(t.chapter) === bab && t.sub !== '3.4');
    // Batasi matriks pada prompt BAB III agar respons AI tidak terpotong (hindari salin tabel verbatim)
    const r = await compileBAB(provider, { year, bab, template: tpl, digests, matrixText: bab === 3 ? promptMatrix : '', refContext, finalCount: finalSubs.length, compiledCount: biroData.length });
    return { bab, r };
  }));
  for (const br of babResults) {
    if (br.status !== 'fulfilled') continue;
    for (const t of SETDA_TEMPLATE.filter(x => Number(x.chapter) === br.value.bab)) {
      if (compiledContent[t.sub]) continue; // jangan timpa 3.4
      if (br.value.r.sections[t.sub]) { compiledContent[t.sub] = br.value.r.sections[t.sub]; sectionStatus[t.sub] = 'otomatis'; }
      else sectionStatus[t.sub] = 'perlu_review';
    }
  }
  // Sisipkan Tabel 2.1–2.4 (wajib Permendagri 86/2017) ke subbab BAB II yang bersangkutan —
  // disisipkan SELALU (meski AI belum menghasilkan narasi) agar tabel wajib tidak pernah hilang
  const appendBab2 = (sub: string, table: string) => {
    if (!table) return;
    const prev = compiledContent[sub];
    compiledContent[sub] = (prev && prev.trim().length > 0 ? prev + '\n\n' : 'Data evaluasi per biro di bawah ini merupakan kompilasi dari dokumen Renja Perubahan biro yang diunggah.\n\n') + table;
    sectionStatus[sub] = 'otomatis';
  };
  appendBab2('2.1', bab2.tabel21);
  appendBab2('2.2', bab2.tabel22);
  appendBab2('2.4', bab2.tabel23);
  appendBab2('2.5', bab2.tabel24);
  // Sisipkan Tabel 3.1 & 3.3 (Permendagri 86/2017) ke subbab 3.3 Program dan Kegiatan
  if (compiledContent['3.3'] && tables.rekapProgram) {
    compiledContent['3.3'] += `\n\nTabel 3.1 — Rumusan Rencana Program dan Kegiatan Sekretariat Daerah Tahun ${year} (Permendagri 86/2017 Tabel T-C.29):\n${tables.rekapProgram}`;
  }
  if (compiledContent['3.3'] && tables.rekapKegiatan) {
    compiledContent['3.3'] += `\n\nTabel 3.3 — Rekapitulasi Pagu Awal, Pagu Perubahan dan Selisih per Program/Kegiatan (Permendagri 86/2017 Tabel T-C.33):\n${tables.rekapKegiatan}`;
  }

  // 5) Simpan / perbarui setda
  const totalPagu = (programs as any[]).reduce((acc: any, p: any) => {
    acc.pagu_awal += Number(p.pagu_awal) || 0;
    acc.pagu_perubahan += Number(p.pagu_perubahan) || 0;
    return acc;
  }, { pagu_awal: 0, pagu_perubahan: 0 });
  const ringkasan = `${finalSubs.length} final dari ${biroData.length} biro dikompilasi. Mode: ${mode === 'draft' ? 'KOMPILASI AWAL — BELUM FINAL' : 'FINAL'}.`;

  if (setda_id) {
    await c.env.DB.prepare(
      `UPDATE renja_perubahan_setda SET version = ?, status = 'draft', ringkasan = ?, generated_by = ?, generated_at = datetime('now'), mode = 'draft_konsolidasi', total_pagu_awal = ?, total_pagu_perubahan = ?, jumlah_biro_final = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(sv, ringkasan, payload?.email || 'sistem', totalPagu.pagu_awal, totalPagu.pagu_perubahan, finalSubs.length, id).run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO renja_perubahan_setda (id, year, version, status, ringkasan, generated_by, generated_at, mode, total_pagu_awal, total_pagu_perubahan, jumlah_biro_final)
       VALUES (?, ?, ?, 'draft', ?, ?, datetime('now'), 'draft_konsolidasi', ?, ?, ?)`
    ).bind(id, year, sv, ringkasan, payload?.email || 'sistem', totalPagu.pagu_awal, totalPagu.pagu_perubahan, finalSubs.length).run();
  }

  // 6) Sections
  for (const t of SETDA_TEMPLATE) {
    const content = compiledContent[t.sub] ?? (biroData.length ? 'Data belum tersedia dan akan dilengkapi setelah seluruh biro ditetapkan final.' : 'Data Belum Tersedia');
    const status = sectionStatus[t.sub] || (content.startsWith('Data belum tersedia') ? 'perlu_review' : 'otomatis');
    await c.env.DB.prepare(
      `INSERT INTO renja_perubahan_sections (id, setda_id, chapter, subchapter, judul, content, status, urutan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), id, t.chapter, t.sub, t.judul, content, status, t.urutan).run();
  }

  // 7) Sources (traceability + status final/draft)
  for (const b of biroData) {
    await c.env.DB.prepare(
      `INSERT INTO renja_perubahan_sources (id, setda_id, nama_biro, version_id, version_number, source_location, source_type, data_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(), id, b.sub.nama_biro, b.version.id, b.version.version_number,
      `Dokumen ${b.sub.nama_biro} V${b.version.version_number}`,
      b.sub.status === 'final' ? 'renja_perubahan_biro_final' : 'renja_perubahan_biro_draft',
      `status: ${b.sub.status}${b.sub.has_critical_open ? ' (temuan kritis terbuka)' : ''} · program terekstrak: ${b.prog?.saved || 0}`
    ).run();
  }

  await logAudit(c, setda_id ? 'regenerate_setda' : 'generate_setda', 'rp_setda', id, `Kompilasi Renja Perubahan Setda ${year}: ${biroData.length} biro (${finalSubs.length} final), mode ${mode}`);
  await createNotification(c.env, 'verifikator', '', 'setda', `Draft Renja Perubahan Setda ${year} dikompilasi dari ${biroData.length} biro`);
  return c.json({ id, message: `Draft Renja Perubahan Setda dikompilasi dari ${biroData.length} biro (${finalSubs.length} final)` }, setda_id ? 200 : 201);
});

perubahanRoutes.put('/sections/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key !== 'id' && value !== undefined) { sets.push(`${key} = ?`); params.push(value); }
  }
  if (sets.length === 0) return c.json({ error: 'Tidak ada field' }, 400);
  params.push(id);
  await c.env.DB.prepare(`UPDATE renja_perubahan_sections SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  return c.json({ id, ...body });
});

// Pemeriksaan Renja Perubahan Setda (AI, best-effort)
perubahanRoutes.post('/setda/:id/pemeriksaan', async (c) => {
  const id = c.req.param('id');
  const setda: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_setda WHERE id = ?').bind(id).first();
  if (!setda) return c.json({ error: 'Tidak ditemukan' }, 404);
  const { results: sections } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_sections WHERE setda_id = ?'
  ).bind(id).all();
  const konten = (sections as any[]).filter(s => s.content).map(s => `${s.chapter}.${s.subchapter} ${s.judul}\n${s.content}`).join('\n\n').slice(0, 50000);

  const provider = getLLMProvider(c.env);
  const prompt = `Periksa draft Renja Perubahan Setda tahun ${setda.year} berikut untuk: kelengkapan BAB, sistematika, konsistensi angka, duplikasi, dan data tanpa sumber.

ISI DRAFT:
"""
${konten || 'Draft masih kosong.'}
"""

Hasilkan temuan JSON (hanya masalah nyata):
{"hasil":[{"chapter":"","item":"","description":"temuan spesifik","recommendation":"perbaikan","severity":"kritis|mayor|minor|informasi"}]}`;

  let hasil: any[] = [];
  try {
    const resp = await provider.generate(prompt);
    const a = String(resp).indexOf('{'), b = String(resp).lastIndexOf('}');
    const parsed = JSON.parse(String(resp).slice(a, b + 1));
    hasil = parsed?.hasil || [];
  } catch { hasil = []; }

  // Simpan temuan (Fase 4) — tabel dibuat otomatis bila belum ada
  await c.env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS renja_perubahan_setda_findings (
      id TEXT PRIMARY KEY, setda_id TEXT, chapter TEXT, item TEXT, description TEXT,
      recommendation TEXT, severity TEXT DEFAULT 'minor', status TEXT DEFAULT 'terbuka',
      created_at TEXT DEFAULT (datetime('now'))
    )`
  ).run();
  await c.env.DB.prepare('DELETE FROM renja_perubahan_setda_findings WHERE setda_id = ?').bind(id).run();
  for (const f of hasil) {
    await c.env.DB.prepare(
      `INSERT INTO renja_perubahan_setda_findings (id, setda_id, chapter, item, description, recommendation, severity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), id, f.chapter || '', f.item || '', f.description || '', f.recommendation || '', ['kritis','mayor','minor','informasi'].includes(f.severity) ? f.severity : 'minor').run();
  }

  await logAudit(c, 'pemeriksaan_setda', 'rp_setda', id, `Pemeriksaan Renja Perubahan Setda: ${hasil.length} temuan (tersimpan)`);
  return c.json({ message: `Pemeriksaan selesai (${hasil.length} temuan)`, findings: hasil });
});

// GET /api/perubahan/setda/:id/findings — daftar temuan pemeriksaan draft Setda (Fase 4)
perubahanRoutes.get('/setda/:id/findings', async (c) => {
  const id = c.req.param('id');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_setda_findings WHERE setda_id = ? ORDER BY created_at DESC'
  ).bind(id).all();
  return c.json({ data: results });
});

perubahanRoutes.post('/setda/:id/approve', async (c) => {
  const id = c.req.param('id');
  const { type, note } = await c.req.json();
  const payload = (c as any).get('jwtPayload') as any;
  if (type === 'final') {
    const setda: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_setda WHERE id = ?').bind(id).first();
    const belumFinal: any = (await c.env.DB.prepare(
      "SELECT COUNT(*) AS t FROM renja_perubahan_submissions WHERE year = ? AND current_version > 0 AND status != 'final'"
    ).bind(setda.year).first());
    if ((belumFinal?.t || 0) > 0) {
      return c.json({ error: `Tidak dapat Final — masih ada ${belumFinal.t} biro belum Final` }, 409);
    }
    await c.env.DB.prepare(
      `UPDATE renja_perubahan_setda SET status = 'final', approved_by = ?, approved_at = datetime('now'), approval_note = ?, mode = 'final_konsolidasi', updated_at = datetime('now') WHERE id = ?`
    ).bind(payload?.email, note || 'Ditetapkan Final', id).run();
    await logAudit(c, 'set_final', 'rp_setda', id, 'Tetapkan Final Renja Perubahan Setda');
    await createNotification(c.env, 'pimpinan', '', 'setda_final', `Renja Perubahan Setda ${setda.year} FINAL`);
    return c.json({ message: 'Renja Perubahan Setda ditetapkan FINAL' });
  }
  await c.env.DB.prepare(
    `UPDATE renja_perubahan_setda SET status = 'disetujui', approved_by = ?, approved_at = datetime('now'), approval_note = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(payload?.email, note || 'Disetujui', id).run();
  await logAudit(c, 'approve', 'rp_setda', id, 'Setujui Renja Perubahan Setda');
  return c.json({ message: 'Renja Perubahan Setda disetujui' });
});

// ══════════════ NOTIFIKASI & AUDIT ══════════════
perubahanRoutes.get('/notifications', async (c) => {
  const role = c.req.query('role');
  const namaBiro = c.req.query('nama_biro');
  const limit = parseInt(c.req.query('limit') || '50');
  let q = 'SELECT * FROM renja_perubahan_notifications WHERE 1=1';
  const p: any[] = [];
  if (role) { q += ' AND (target_role = ? OR target_role = \'\')'; p.push(role); }
  if (namaBiro) { q += ' AND (nama_biro = ? OR nama_biro = \'\')'; p.push(namaBiro); }
  q += ' ORDER BY created_at DESC LIMIT ?';
  p.push(limit);
  const { results } = await c.env.DB.prepare(q).bind(...p).all();
  return c.json({ data: results });
});

perubahanRoutes.post('/notifications/:id/read', async (c) => {
  await c.env.DB.prepare('UPDATE renja_perubahan_notifications SET is_read = 1 WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'dibaca' });
});

perubahanRoutes.get('/audit', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?'
  ).bind(limit).all();
  return c.json({ data: results });
});

// ══════════════ PROGRAM & MATRIKS (konsolidasi Setda) ══════════════

// POST /api/perubahan/programs/extract — ekstrak program/kegiatan dari satu versi (AI)
perubahanRoutes.post('/programs/extract', async (c) => {
  const { version_id } = await c.req.json();
  const version: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_versions WHERE id = ?').bind(version_id).first();
  if (!version) return c.json({ error: 'Versi tidak ditemukan' }, 404);
  const sub: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_submissions WHERE id = ?').bind(version.submission_id).first();
  const provider = getLLMProvider(c.env);
  const { saved } = await extractProgramsForVersion(c.env, provider, version, sub, true);
  await logAudit(c, 'extract_programs', 'rp_version', version_id, `Ekstrak program V${version.version_number} ${sub?.nama_biro}: ${saved} item`);
  return c.json({ message: `${saved} program/kegiatan diekstrak`, programs: saved });
});

// GET /api/perubahan/programs — list data program
perubahanRoutes.get('/programs', async (c) => {
  const versionId = c.req.query('version_id');
  const namaBiro = c.req.query('nama_biro');
  const year = c.req.query('year');
  const limit = parseInt(c.req.query('limit') || '500');
  let q = 'SELECT * FROM renja_perubahan_programs WHERE 1=1';
  const p: any[] = [];
  if (versionId) { q += ' AND version_id = ?'; p.push(versionId); }
  if (namaBiro) { q += ' AND nama_biro = ?'; p.push(namaBiro); }
  if (year) { q += ' AND year = ?'; p.push(parseInt(year)); }
  q += ' ORDER BY program_code, activity_code LIMIT ?';
  p.push(limit);
  const { results } = await c.env.DB.prepare(q).bind(...p).all();
  return c.json({ data: results });
});

// GET /api/perubahan/setda/:id/matriks — agregasi matriks dari biro FINAL
perubahanRoutes.get('/setda/:id/matriks', async (c) => {
  const id = c.req.param('id');
  const setda: any = await c.env.DB.prepare('SELECT * FROM renja_perubahan_setda WHERE id = ?').bind(id).first();
  if (!setda) return c.json({ error: 'Tidak ditemukan' }, 404);
  const { results: sources } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_sources WHERE setda_id = ?'
  ).bind(id).all();
  const biroNames = (sources as any[]).map(s => s.nama_biro);
  // Status tiap biro utk penanda FINAL/DRAFT pada matriks
  const { results: subsYear } = await c.env.DB.prepare(
    'SELECT nama_biro, status, has_critical_open FROM renja_perubahan_submissions WHERE year = ?'
  ).bind(setda.year).all();
  const biroStatus: Record<string, any> = {};
  (subsYear as any[]).forEach(s => { biroStatus[s.nama_biro] = { status: s.status, kritis: !!s.has_critical_open }; });
  // Biro yang belum "sesuai acuan": ada temuan kritis/mayor terbuka pada keselarasan/sistematika
  const { results: findingsKeselarasan } = await c.env.DB.prepare(
    "SELECT DISTINCT nama_biro FROM renja_perubahan_findings WHERE year = ? AND status IN ('terbuka','diduga_diperbaiki','dibuka_kembali') AND severity IN ('kritis','mayor') AND category IN ('keselarasan_rkpd','sistematika_permendagri')"
  ).bind(setda.year).all();
  const belumSesuaiAcuan = new Set((findingsKeselarasan as any[]).map(f => f.nama_biro));
  const { results: programs } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_programs WHERE year = ? AND nama_biro IN (SELECT value FROM json_each(?))'
  ).bind(setda.year, JSON.stringify(biroNames)).all();
  // Keputusan konflik terdahulu (Fase 2: benar-benar diterapkan pada angka matriks)
  const { results: decisions } = await c.env.DB.prepare(
    'SELECT * FROM renja_perubahan_conflicts WHERE setda_id = ?'
  ).bind(id).all();
  const decisionMap = new Map<string, any>();
  (decisions as any[]).forEach(d => { decisionMap.set(`${d.kode}|${d.field}`, d); });

  // Agregasi per kode program+kegiatan, akumulasi pagu per biro, deteksi konflik
  const map = new Map<string, any>();
  const perBiro: Record<string, any> = {};
  let totalPaguAwal = 0, totalPaguPerubahan = 0;
  for (const pr of (programs as any[])) {
    const key = `${pr.program_code || '?'}|${pr.activity_code || '?'}|${pr.subactivity_code || '?'}`;
    const cur: any = map.get(key) || { ...pr, biro: [], sumber: [], pagu_awal: 0, pagu_perubahan: 0 };
    cur.biro = [...new Set([...(cur.biro || []), pr.nama_biro])];
    cur.sumber = [...new Set([...(cur.sumber || []), `${pr.nama_biro} (V${pr.version_number})`])];
    cur.pagu_awal += Number(pr.pagu_awal) || 0;
    cur.pagu_perubahan += Number(pr.pagu_perubahan) || 0;
    map.set(key, cur);
    perBiro[pr.nama_biro] = perBiro[pr.nama_biro] || { pagu_awal: 0, pagu_perubahan: 0, program: 0 };
    perBiro[pr.nama_biro].pagu_awal += Number(pr.pagu_awal) || 0;
    perBiro[pr.nama_biro].pagu_perubahan += Number(pr.pagu_perubahan) || 0;
    perBiro[pr.nama_biro].program++;
    totalPaguAwal += Number(pr.pagu_awal) || 0;
    totalPaguPerubahan += Number(pr.pagu_perubahan) || 0;
  }
  const rows = [...map.values()].map((r: any) => {
    // Terapkan keputusan konflik (pagu) bila ada
    const paKey = `${r.program_code || '?'}.${r.activity_code || '?'}`;
    let paguAwal = r.pagu_awal, paguPerubahan = r.pagu_perubahan, keputusan: any = null;
    const decPerubahan = decisionMap.get(`${paKey}|pagu_perubahan`);
    if (decPerubahan) {
      keputusan = { field: 'pagu_perubahan', pilih: decPerubahan.keputusan };
      paguPerubahan = decPerubahan.keputusan === 'acuan' ? (Number(decPerubahan.nilai_acuan) || 0) : (Number(decPerubahan.nilai_biro) || 0);
    }
    const decAwal = decisionMap.get(`${paKey}|pagu_awal`);
    if (decAwal) {
      keputusan = { field: 'pagu_awal', pilih: decAwal.keputusan };
      paguAwal = decAwal.keputusan === 'acuan' ? (Number(decAwal.nilai_acuan) || 0) : (Number(decAwal.nilai_biro) || 0);
    }
    const biros = (r.biro || []) as string[];
    return {
      kode: `${r.program_code || ''}.${r.activity_code || ''}.${r.subactivity_code || ''}`,
      program: r.program_name || '', kegiatan: r.activity_name || '', subkegiatan: r.subactivity_name || '',
      indikator: r.indicator || '', target_awal: r.target_awal || '', target_perubahan: r.target_perubahan || '',
      satuan: r.satuan || '', pagu_awal: paguAwal, pagu_perubahan: paguPerubahan,
      selisih: (Number(paguPerubahan) || 0) - (Number(paguAwal) || 0),
      biro: biros.join(', '), sumber: (r.sumber || []).join(', '),
      duplikat: biros.length > 1,
      keputusan,
      sesuai_acuan: !biros.some(b => belumSesuaiAcuan.has(b)),
    };
  }).sort((a, b) => a.kode.localeCompare(b.kode));

  // Konflik: kode sama tapi pagu berbeda antar biro (double counting / beda nilai)
  const conflicts: any[] = [];
  const byKode = new Map<string, any[]>();
  for (const pr of (programs as any[])) {
    const key = `${pr.program_code || '?'}.${pr.activity_code || '?'}`;
    if (!byKode.has(key)) byKode.set(key, []);
    byKode.get(key)!.push(pr);
  }
  for (const [kode, items] of byKode) {
    const nama = items[0].activity_name || items[0].program_name || kode;
    const paguP = new Set(items.map(i => Number(i.pagu_perubahan) || 0));
    const paguA = new Set(items.map(i => Number(i.pagu_awal) || 0));
    const namaSet = new Set(items.map(i => `${i.program_name}|${i.activity_name}`));
    const targetSet = new Set(items.map(i => `${i.target_awal}|${i.target_perubahan}`));
    if (paguP.size > 1) {
      const first = items[0];
      const others = items.slice(1).find(i => (Number(i.pagu_perubahan) || 0) !== (Number(first.pagu_perubahan) || 0));
      conflicts.push({ kode, nama, field: 'pagu_perubahan', tipe: 'angka',
        nilai_biro: Number(first.pagu_perubahan) || 0, nilai_acuan: Number(others?.pagu_perubahan) || 0,
        nama_biro: first.nama_biro, acuan_source: others?.nama_biro || '',
        keputusan: decisionMap.get(`${kode}|pagu_perubahan`)?.keputusan || null });
    }
    if (paguA.size > 1) {
      const first = items[0];
      const others = items.slice(1).find(i => (Number(i.pagu_awal) || 0) !== (Number(first.pagu_awal) || 0));
      conflicts.push({ kode, nama, field: 'pagu_awal', tipe: 'angka',
        nilai_biro: Number(first.pagu_awal) || 0, nilai_acuan: Number(others?.pagu_awal) || 0,
        nama_biro: first.nama_biro, acuan_source: others?.nama_biro || '',
        keputusan: decisionMap.get(`${kode}|pagu_awal`)?.keputusan || null });
    }
    if (namaSet.size > 1) {
      conflicts.push({ kode, nama, field: 'nama', tipe: 'informasi', nilai_biro: 0, nilai_acuan: 0,
        nama_biro: items[0].nama_biro, acuan_source: items[1]?.nama_biro || '', keputusan: null });
    }
    if (targetSet.size > 1) {
      conflicts.push({ kode, nama, field: 'target_perubahan', tipe: 'informasi', nilai_biro: 0, nilai_acuan: 0,
        nama_biro: items[0].nama_biro, acuan_source: items[1]?.nama_biro || '', keputusan: null });
    }
  }

  return c.json({
    rows, perBiro, totalPaguAwal, totalPaguPerubahan,
    totalSelisih: totalPaguPerubahan - totalPaguAwal,
    conflicts, biroNames, biroStatus,
  });
});

// POST /api/perubahan/setda/:id/resolve-conflict — keputusan verifikator atas konflik
// (Fase 2: keputusan disimpan beserta nilai & benar-benar diterapkan di matriks)
perubahanRoutes.post('/setda/:id/resolve-conflict', async (c) => {
  const id = c.req.param('id');
  const { kode, pilih, field = 'pagu_perubahan', nilai_biro, nilai_acuan, nama } = await c.req.json(); // pilih: 'biro' | 'acuan'
  const payload = (c as any).get('jwtPayload') as any;
  await c.env.DB.prepare('DELETE FROM renja_perubahan_conflicts WHERE setda_id = ? AND kode = ? AND field = ?').bind(id, kode || '', field).run();
  await c.env.DB.prepare(
    `INSERT INTO renja_perubahan_conflicts (id, setda_id, kode, nama, field, nilai_biro, nilai_acuan, keputusan, decided_by, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(crypto.randomUUID(), id, kode || '', nama || 'Konflik data', field, Number(nilai_biro) || 0, Number(nilai_acuan) || 0, pilih, payload?.email || 'sistem').run();
  await logAudit(c, 'resolve_conflict', 'rp_setda', id, `Konflik ${kode} (${field}) diputuskan: pakai ${pilih}`);
  return c.json({ message: `Keputusan dicatat: pakai ${pilih === 'acuan' ? 'nilai acuan' : 'nilai biro'} (${field})` });
});
