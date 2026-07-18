import path from 'path';
import { promises as fs } from 'fs';
import QRCode from 'qrcode';
import sharp from 'sharp';

const TEMPLATE_REL = path.join('public', 'stickers', 'rexu-emergency-model-h.png');

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Measured inner QR box on Model H (2000×1250 empty template).
 * Keep a quiet zone so scanners work — QR fills ~93% of the white area.
 */
const QR_BOX = {
  innerL: 1085,
  innerT: 150,
  innerR: 1869,
  innerB: 916,
} as const;

export type EmergencyStickerLabels = {
  vehicleNumber?: string | null;
  companyName?: string | null;
};

/**
 * Build the emergency sticker PNG: Model H art + token QR + cut strip
 * with vehicle (left) and company/profile name (slightly right).
 */
export async function renderEmergencyStickerPng(
  emergencyUrl: string,
  labels: EmergencyStickerLabels = {}
): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), TEMPLATE_REL);
  await fs.access(templatePath);

  const template = sharp(templatePath);
  const meta = await template.metadata();
  const w = meta.width ?? 2000;
  const h = meta.height ?? 1250;

  const boxW = QR_BOX.innerR - QR_BOX.innerL + 1;
  const boxH = QR_BOX.innerB - QR_BOX.innerT + 1;
  const qrSize = Math.floor(Math.min(boxW, boxH) * 0.93);
  const qrX = QR_BOX.innerL + Math.round((boxW - qrSize) / 2);
  const qrY = QR_BOX.innerT + Math.round((boxH - qrSize) / 2);

  const qrPng = await QRCode.toBuffer(emergencyUrl, {
    type: 'png',
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // Trim empty template padding under footer (Model H has ~190px dead space)
  const { data, info } = await sharp(templatePath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let lastInkY = 0;
  for (let y = Math.max(QR_BOX.innerB + 40, Math.floor(h * 0.75)); y < h; y++) {
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
