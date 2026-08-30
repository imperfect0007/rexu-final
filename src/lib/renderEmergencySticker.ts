import path from 'path';
import { promises as fs } from 'fs';
import QRCode from 'qrcode';

// Dynamic load — avoids hard-crashing the route module if native bindings fail to init.
async function loadSharp(): Promise<typeof import('sharp')> {
  return import('sharp');
}

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

type CardCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type RenderOpts = {
  templateRel: string;
  qrBox: QrBox;
  qrUrl: string;
  labels?: StickerLabels;
  /** When set, crop to the white placard (drops gray canvas) before the cut strip. */
  cardCrop?: CardCrop;
};

/** Load sticker art from disk (traced into the lambda) or CDN public URL. */
async function loadTemplateBuffer(templateRel: string): Promise<Buffer> {
  const localPath = path.join(process.cwd(), templateRel);
  try {
    await fs.access(localPath);
    return await fs.readFile(localPath);
  } catch {
    const origin = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://rexu.in'
    ).replace(/\/$/, '');
    const publicPath = templateRel.replace(/^public[\\/]/, '').replace(/\\/g, '/');
    const url = `${origin}/${publicPath}`;
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) {
      throw new Error(`Sticker template missing (${res.status}): ${publicPath}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}

/**
 * Model H sticker: template art + QR in measured box + cut strip
 * (vehicle left-aligned, company slightly right).
 */
export async function renderModelHStickerPng(opts: RenderOpts): Promise<Buffer> {
  const { default: sharp } = await loadSharp();
  const templateBuf = await loadTemplateBuffer(opts.templateRel);

  const meta = await sharp(templateBuf).metadata();
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

  // Composite QR on full template first, then crop — sharp may reorder
  // extract-before-composite if chained, which shifts QR by the crop offset.
  const withQr = await sharp(templateBuf)
    .composite([{ input: qrPng, left: qrX, top: qrY }])
    .png()
    .toBuffer();

  let extract: CardCrop;
  if (opts.cardCrop) {
    extract = opts.cardCrop;
  } else {
    // Emergency templates fill the frame — trim trailing empty space via footer ink.
    const { data, info } = await sharp(templateBuf)
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
    extract = {
      left: 0,
      top: 0,
      width: w,
      height: Math.min(h, (lastInkY || h - 40) + 22),
    };
  }

  let card = await sharp(withQr).extract(extract).png().toBuffer();
  // Gray canvas + soft rim around the rounded placard — flood-fill from the
  // crop edges, then bleach any leftover gray stroke that isn't next to ink
  // (so QR/text anti-aliasing is left alone).
  if (opts.cardCrop) {
    const { data, info } = await sharp(card)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: cw, height: chh, channels: cch } = info;
    const out = Buffer.from(data);
    const idx = (x: number, y: number) => (y * cw + x) * cch;
    const isOutsideGray = (i: number) => {
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      return chroma < 28 && r >= 90 && r < 252;
    };
    const stack: number[] = [];
    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= cw || y >= chh) return;
      const i = idx(x, y);
      if (!isOutsideGray(i)) return;
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      stack.push(x, y);
    };
    for (let x = 0; x < cw; x++) {
      push(x, 0);
      push(x, chh - 1);
    }
    for (let y = 0; y < chh; y++) {
      push(0, y);
      push(cw - 1, y);
    }
    while (stack.length) {
      const y = stack.pop()!;
      const x = stack.pop()!;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
    // Closed gray stroke around the card sits between white-outside and white-card.
    for (let y = 1; y < chh - 1; y++) {
      for (let x = 1; x < cw - 1; x++) {
        const i = idx(x, y);
        if (!isOutsideGray(i)) continue;
        let nearInk = false;
        for (let dy = -1; dy <= 1 && !nearInk; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const j = idx(x + dx, y + dy);
            const rr = out[j];
            const gg = out[j + 1];
            const bb = out[j + 2];
            // ink (dark) or brand green — don't bleach AA next to these
            if (rr < 90 && gg < 90 && bb < 90) nearInk = true;
            else if (gg > 140 && gg > rr + 35 && gg > bb + 35) nearInk = true;
          }
        }
        if (!nearInk) {
          out[i] = 255;
          out[i + 1] = 255;
          out[i + 2] = 255;
        }
      }
    }
    // Template card fill is off-white (~252); flatten so it matches the cut strip.
    for (let i = 0; i < out.length; i += cch) {
      if (out[i] >= 248 && out[i + 1] >= 248 && out[i + 2] >= 248) {
        out[i] = 255;
        out[i + 1] = 255;
        out[i + 2] = 255;
      }
    }
    card = await sharp(out, {
      raw: { width: cw, height: chh, channels: cch },
    })
      .png()
      .toBuffer();
  }
  const outW = extract.width;
  const cropH = extract.height;

  const labels = opts.labels ?? {};
  const vehicleText = labels.vehicleNumber?.trim()
    ? `Vehicle: ${labels.vehicleNumber.trim()}`
    : '';
  const companyText = labels.companyName?.trim()
    ? `Company: ${labels.companyName.trim()}`
    : '';

  // Stack labels under the cut line so both always read clearly.
  const hasBoth = !!(vehicleText && companyText);
  const stripH = hasBoth ? 110 : vehicleText || companyText ? 78 : 56;
  const cutY = 16;
  const lineLeft = 60;
  const lineRight = outW - 60;
  const textX = lineLeft;
  const fontSize = Math.min(36, Math.max(26, Math.round(outW / 36)));

  const stripSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${stripH}">
  <rect width="${outW}" height="${stripH}" fill="#FFFFFF"/>
  <line x1="${lineLeft}" y1="${cutY}" x2="${lineRight}" y2="${cutY}" stroke="#475569" stroke-width="3" stroke-dasharray="14 10"/>
  ${
    vehicleText
      ? `<text x="${textX}" y="${cutY + 40}" text-anchor="start" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700">${escapeXml(vehicleText)}</text>`
      : ''
  }
  ${
    companyText
      ? `<text x="${textX}" y="${cutY + (vehicleText ? 78 : 40)}" text-anchor="start" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700">${escapeXml(companyText)}</text>`
      : ''
  }
</svg>`;

  return sharp({
    create: {
      width: outW,
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

/** Emergency Model V — vertical rear-vehicle safety card. */
export async function renderEmergencyStickerVPng(
  emergencyUrl: string,
  labels: StickerLabels = {}
): Promise<Buffer> {
  return renderModelHStickerPng({
    templateRel: path.join('public', 'stickers', 'rexu-emergency-model-v.png'),
    qrBox: { innerL: 680, innerT: 578, innerR: 1311, innerB: 1191 },
    cardCrop: { left: 406, top: 206, width: 1188, height: 1588 },
    qrUrl: emergencyUrl,
    labels,
  });
}

/** Emergency Model H — horizontal safety card (side / second placement). */
export async function renderEmergencyStickerHPng(
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

/** @deprecated prefer V/H explicit helpers; defaults to Model V (rear). */
export async function renderEmergencyStickerPng(
  emergencyUrl: string,
  labels: StickerLabels = {},
  style: 'v' | 'h' = 'v'
): Promise<Buffer> {
  return style === 'h'
    ? renderEmergencyStickerHPng(emergencyUrl, labels)
    : renderEmergencyStickerVPng(emergencyUrl, labels);
}

/** Check-in Model H — QR on the left (2000×2000 gray canvas; crop to white card). */
export async function renderCheckinStickerPng(
  checkinUrl: string,
  labels: StickerLabels = {}
): Promise<Buffer> {
  return renderModelHStickerPng({
    templateRel: path.join('public', 'stickers', 'rexu-checkin-model-h.png'),
    qrBox: { innerL: 248, innerT: 698, innerR: 905, innerB: 1375 },
    // Measured white placard on the gray Model H (2) canvas; inset past soft gray rim.
    cardCrop: { left: 136, top: 560, width: 1747, height: 997 },
    qrUrl: checkinUrl,
    labels,
  });
}

// Back-compat type alias
export type EmergencyStickerLabels = StickerLabels;
