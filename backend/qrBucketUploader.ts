import QRCode from 'qrcode';
import { supabaseAdmin } from './supabaseAdminClient';

const QR_BUCKET_NAME = process.env.SUPABASE_QR_BUCKET || 'QR';
const QR_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://rexu.in';

/**
 * Generate a PNG QR code for the given token and store it in the Supabase
 * Storage bucket named `QR_BUCKET_NAME`, at `{token}.png`.
 *
 * The QR encodes ONLY: `${QR_BASE_URL.replace(/\/$/, '')}/e/{token}`
 * — no personal data is embedded in the QR itself.
 */
export async function uploadQrPngToBucket(token: string) {
  if (!token) return;

  const url = `${QR_BASE_URL.replace(/\/$/, '')}/e/${token}`;

  // Generate PNG buffer
  const pngBuffer = await QRCode.toBuffer(url, {
    type: 'png',
    width: 512,
    margin: 2,
  });

  const filePath = `${token}.png`;

  const { error } = await supabaseAdmin.storage
    .from(QR_BUCKET_NAME)
    .upload(filePath, pngBuffer, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: true,
    });

  if (error) {
    throw error;
  }
}

