/**
 * ponytail: one runnable check for emergency sticker render.
 * Ceiling: needs public/stickers/rexu-emergency-model-h.png present.
 * Run: npx tsx scripts/check-emergency-sticker.ts
 */
import assert from 'assert';
import { renderEmergencyStickerPng } from '../src/lib/renderEmergencySticker';

async function main() {
  const png = await renderEmergencyStickerPng('https://rexu.in/e/checktoken01', {
    vehicleNumber: 'KA 01 AB 1234',
    companyName: 'Admark Digitals',
  });
  assert.ok(png.length > 50_000, 'PNG should be a non-trivial sticker');
  assert.equal(png[0], 0x89);
  assert.equal(png[1], 0x50); // P
  console.log('ok emergency sticker', png.length, 'bytes');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
