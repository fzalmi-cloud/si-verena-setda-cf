// Pengiriman email dari Cloudflare Workers via provider API HTTP.
// Pilihan provider:
//   resend   -> https://api.resend.com/emails (API key dari resend.com)
//   generic  -> MAIL_API_URL kustom (mis. SendGrid / Mailgun / endpoint sendiri)
// Konfigurasi via secrets (jangan di wrangler.toml):
//   wrangler secret put MAIL_API_KEY
//   wrangler secret put MAIL_FROM
//   wrangler secret put MAIL_ENABLED  (nilai 'true' untuk aktif)
//   wrangler secret put MAIL_PROVIDER (resend | generic)
//   wrangler secret put MAIL_API_URL  (hanya untuk generic)

export interface MailConfig {
  enabled: boolean;
  provider: string;
  apiKey: string;
  from: string;
  apiUrl?: string;
}

export function getMailConfig(env: any): MailConfig {
  return {
    enabled: env.MAIL_ENABLED === 'true',
    provider: env.MAIL_PROVIDER || 'resend',
    apiKey: env.MAIL_API_KEY || '',
    from: env.MAIL_FROM || '',
    apiUrl: env.MAIL_API_URL || '',
  };
}

export async function sendMail(
  env: any,
  opts: { to: string | string[]; subject: string; html: string; text?: string }
): Promise<{ ok: boolean; error?: string }> {
  const cfg = getMailConfig(env);
  if (!cfg.enabled) return { ok: false, error: 'MAIL_ENABLED belum diaktifkan' };
  if (!cfg.apiKey) return { ok: false, error: 'MAIL_API_KEY belum dikonfigurasi' };
  if (!cfg.from) return { ok: false, error: 'MAIL_FROM belum dikonfigurasi' };

  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  if (to.length === 0 || !to[0]) return { ok: false, error: 'Tidak ada penerima email' };

  try {
    let res: Response;
    if (cfg.provider === 'generic' && cfg.apiUrl) {
      res = await fetch(cfg.apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: cfg.from, to, subject: opts.subject,
          html: opts.html, text: opts.text || opts.html.replace(/<[^>]*>/g, ' '),
        }),
      });
    } else {
      // Default: Resend
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: cfg.from,
          to,
          subject: opts.subject,
          html: opts.html,
          text: opts.text || opts.html.replace(/<[^>]*>/g, ' '),
        }),
      });
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
