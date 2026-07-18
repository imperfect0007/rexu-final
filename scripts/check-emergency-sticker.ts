/**
 * ponytail: one runnable check for emergency + check-in sticker renders.
 * Run: npx tsx scripts/check-emergency-sticker.ts
 */
import assert from 'assert';
import {
  renderEmergencyStickerPng,
  renderCheckinStickerPng,
} from '../src/lib/renderEmergencySticker';

async function main() {
  const emergency = await renderEmergencyStickerPng('https://rexu.in/e/checktoken01', {
    vehicleNumber: 'KA 01 AB 1234',
    companyName: 'Admark Digitals',
  });
  assert.ok(emergency.length > 50_000, 'emergency PNG should be non-trivial');
  assert.equal(emergency[0], 0x89);

  const checkin = await renderCheckinStickerPng(
    'https://rexu.in/vehicle-checkin/checktoken01',
    {
      vehicleNumber: 'KA 01 AB 1234',
      companyName: 'Admark Digitals',
    }
  );
  assert.ok(checkin.length > 50_000, 'check-in PNG should be non-trivial');
  assert.equal(checkin[0], 0x89);

  console.log('ok emergency', emergency.length, 'bytes; checkin', checkin.length, 'bytes');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
