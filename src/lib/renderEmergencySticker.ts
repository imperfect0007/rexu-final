import path from 'path';
import { promises as fs } from 'fs';
import QRCode from 'qrcode';
import sharp from 'sharp';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type StickerLabels = {
  vehicleNumber?: string | null;
  companyName?: string | null;
};

export type QrBox = {
  innerL: number;
  innerT: number;
  innerR: number;
  innerB: number;
};

type RenderOpts = {
  templateRel: string;
  qrBox: QrBox;
  qrUrl: string;
  labels?: StickerLabels;
};

/**
 * Model H sticker: template art + QR in measured box + cut strip
 * (vehicle left-aligned, company slightly right).
 */
export async function renderModelHStickerPng(opts: RenderOpts): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), opts.templateRel);
  await fs.access(templatePath);

  const meta = await sharp(templatePath).metadata();
  const w = meta.width ?? 2000;
  const h = meta.height ?? 2000;
  const { qrBox } = opts;

  const boxW = qrBox.innerR - qrBox.innerL + 1;
  const boxH = qrBox.innerB - qrBox.innerT + 1;
  const qrSize = Math.floor(Math.min(boxW, boxH) * 0.93);
  const qrX = qrBox.innerL + Math.round((boxW - qrSize) / 2);
  const qrY = qrBox.innerT + Math.round((boxH - qrSize) / 2);

  const qrPng = await QRCode.toBuffer(opts.qrUrl, {
    type: 'png',
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const { data, info } = await sharp(templatePath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let lastInkY = 0;
  for (let y = Math.max(qrBox.innerB + 20, Math.floor(h * 0.7)); y < h; y++) {
    let dark = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      if (data[i] < 90 && data[i + 1] < 90 && data[i + 2] < 90) dark++;
    }
    if (dark > 80) lastInkY = y;
  }
  const cropH = Math.min(h, (lastInkY || h - 40) + 22);

  const card = await sharp(templatePath)
    .composite([{ input: qrPng, left: qrX, top: qrY }])
    .extract({ left: 0, top: 0, width: w, height: cropH })
    .png()
    .toBuffer();

  const labels = opts.labels ?? {};
  const vehicleLabel = labels.vehicleNumber?.trim()
    ? `Vehicle: ${labels.vehicleNumber.trim()}`
    : '';
  const companyLabel = labels.companyName?.trim()
    ? `Company: ${labels.companyName.trim()}`
    : '';

  const stripH = 78;
  const cutY = 16;
  const lineLeft = 60;
  const lineRight = w - 60;
  const vehicleX = lineLeft;
  const companyX = Math.round(w * 0.52);

  const stripSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${stripH}">
  <rect width="${w}" height="${stripH}" fill="#FFFFFF"/>
  <line x1="${lineLeft}" y1="${cutY}" x2="${lineRight}" y2="${cutY}" stroke="#475569" stroke-width="3" stroke-dasharray="14 10"/>
  ${
    vehicleLabel
      ? `<text x="${vehicleX}" y="${cutY + 44}" text-anchor="start" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${escapeXml(vehicleLabel)}</text>`
      : ''
  }
  ${
    companyLabel
      ? `<text x="${companyX}" y="${cutY + 44}" text-anchor="start" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${escapeXml(companyLabel)}</text>`
      : ''
  }
</svg>`;

  return sharp({
    create: {
      width: w,
      height: cropH + stripH,
      channels: 3,
      background: '#FFFFFF',
    },
  })
    .composite([
      { input: card, left: 0, top: 0 },
      { input: Buffer.from(stripSvg), left: 0, top: cropH },
    ])
    .png()
    .toBuffer();
}

/** Emergency Model H — QR on the right (2000×1250). */
export async function renderEmergencyStickerPng(
  emergencyUrl: string,
  labels: StickerLabels = {}
): Promise<Buffer> {
  return renderModelHStickerPng({
    templateRel: path.join('public', 'stickers', 'rexu-emergency-model-h.png'),
    qrBox: { innerL: 1085, innerT: 150, innerR: 1869, innerB: 916 },
    qrUrl: emergencyUrl,
    labels,
  });
}

/** Check-in Model H — QR on the left (2000×2000). */
export async function renderCheckinStickerPng(
  checkinUrl: string,
  labels: StickerLabels = {}
): Promise<Buffer> {
  return renderModelHStickerPng({
    templateRel: path.join('public', 'stickers', 'rexu-checkin-model-h.png'),
    qrBox: { innerL: 248, innerT: 698, innerR: 905, innerB: 1375 },
    qrUrl: checkinUrl,
    labels,
  });
}

// Back-compat type alias
export type EmergencyStickerLabels = StickerLabels;
