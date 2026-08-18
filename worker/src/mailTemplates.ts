// Template email SI-VERENA (dari template_email_si_verena.html)
// Dipakai untuk notifikasi "Dokumen Dikembalikan untuk Perbaikan".
// Nilai dinamis diisi via renderReturnedEmail().

export interface ReturnedEmailData {
  biro: string;
  tahun: number | string;
  version: number | string;
  nextVersion: number | string;
  verifikator: string;
  note: string;
  link?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderReturnedEmail(d: ReturnedEmailData): string {
  const link = d.link || 'https://siverena.id/perubahan';
  const note = escapeHtml(d.note);
  const verif = escapeHtml(d.verifikator);
  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Type" content="IE=edge">
    <title>[SI-VERENA] Dokumen Dikembalikan untuk Perbaikan</title>
    <style>
        body, table, td, a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
        }
        .btn-hover:hover {
            background-color: #1d4ed8 !important;
        }
        @media screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                padding: 10px !important;
            }
            .content-padding {
                padding: 20px 16px !important;
            }
            .detail-label {
                width: 100% !important;
                display: block !important;
                margin-bottom: 4px;
            }
            .detail-value {
                width: 100% !important;
                display: block !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">

    <!-- Wrapper Main Table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 0;">
        <tr>
            <td align="center">
                <!-- Email Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td align="left" style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 28px 32px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">
                                            SI-VERENA
                                        </div>
                                        <div style="font-size: 11px; color: #93c5fd; font-weight: 500; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
                                            Sistem Verifikasi Rencana Kerja - SETDA SUMBAR
                                        </div>
                                    </td>
                                    <td align="right" valign="middle">
                                        <span style="background-color: rgba(255, 255, 255, 0.15); color: #ffffff; font-size: 11px; padding: 6px 12px; border-radius: 20px; font-weight: 600; display: inline-block;">
                                            Notifikasi Sistem
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Status Alert Banner -->
                    <tr>
                        <td style="background-color: #fffbeeb0; border-bottom: 1px solid #fef3c7; padding: 16px 32px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="28" valign="top">
                                        <div style="background-color: #f59e0b; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 14px;">
                                            !
                                        </div>
                                    </td>
                                    <td style="padding-left: 10px; font-size: 14px; font-weight: 700; color: #b45309;">
                                        Dokumen Perlu Perbaikan (Dikembalikan)
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Body Content -->
                    <tr>
                        <td class="content-padding" style="padding: 32px;">
                            
                            <h1 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                                Yth. Pengguna SI-VERENA,
                            </h1>

                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                                Beritahukan bahwa dokumen berikut yang Anda ajukan telah diverifikasi dan <strong>dikembalikan</strong> oleh Verifikator untuk dilakukan perbaikan.
                            </p>

                            <!-- Document Information Details Box -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td class="detail-label" width="35%" style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Nama Dokumen</td>
                                                <td class="detail-value" width="65%" style="font-size: 14px; font-weight: 600; color: #1e293b;">
                                                    Dokumen Renja Perubahan ${d.biro} Tahun ${d.tahun} (V${d.version})
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td class="detail-label" width="35%" style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Dikembalikan Oleh</td>
                                                <td class="detail-value" width="65%" style="font-size: 14px; font-weight: 600; color: #1e293b;">
                                                    ${verif} <span style="font-weight: normal; color: #64748b;">(Verifikator)</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td class="detail-label" width="35%" style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Status Revisi</td>
                                                <td class="detail-value" width="65%" style="font-size: 14px;">
                                                    <span style="background-color: #fef2f2; color: #dc2626; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px; border: 1px solid #fecaca; display: inline-block;">
                                                        Perlu Unggah Versi V${d.nextVersion}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Catatan Verifikator Box -->
                            <div style="margin-bottom: 24px;">
                                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    📝 Catatan Verifikator:
                                </div>
                                <div style="background-color: #fff8f1; border-left: 4px solid #f59e0b; border-top: 1px solid #ffedd5; border-right: 1px solid #ffedd5; border-bottom: 1px solid #ffedd5; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #7c2d12; font-style: italic;">
                                        "${note}"
                                    </p>
                                </div>
                            </div>

                            <!-- Next Steps / Instructions -->
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                                Silakan perbaiki dokumen sesuai dengan catatan verifikator di atas, kemudian unggah versi baru <strong>(V${d.nextVersion})</strong> pada aplikasi SI-VERENA melalui tautan di bawah ini (Tab <em>Upload Renja Perubahan Biro</em>).
                            </p>

                            <!-- CTA Button -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 10px 0 20px 0;">
                                        <a href="${link}" target="_blank" class="btn-hover" style="background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); transition: all 0.2s ease;">
                                            Unggah Revisi Dokumen (V${d.nextVersion}) &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 10px;">
                                Atau buka langsung melalui URL: <a href="${link}" style="color: #2563eb; text-decoration: underline;">${link}</a>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="font-size: 12px; color: #64748b; line-height: 1.5;">
                                        <p style="margin: 0 0 8px 0; font-weight: 600;">
                                            SI-VERENA SETDA PROVINSI SUMATERA BARAT
                                        </p>
                                        <p style="margin: 0 0 12px 0; color: #94a3b8;">
                                            Ini adalah email otomatis dari sistem SI-VERENA SETDA. Mohon untuk tidak membalas email ini secara langsung.
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                                            &copy; 2026 Sekretariat Daerah Provinsi Sumatera Barat. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                <!-- End Email Container -->

            </td>
        </tr>
    </table>

</body>
</html>`;
}
