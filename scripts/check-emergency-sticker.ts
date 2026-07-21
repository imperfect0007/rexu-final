/**
 * ponytail: one runnable check for emergency (V+H) + check-in sticker renders.
 * Run: npx tsx scripts/check-emergency-sticker.ts
 */
import assert from 'assert';
import {
  renderEmergencyStickerPng,
  renderCheckinStickerPng,
} from '../src/lib/renderEmergencySticker';

async function main() {
  const labels = {
    vehicleNumber: 'KA 01 AB 1234',
    companyName: 'Admark Digitals',
  };
  const emergencyV = await renderEmergencyStickerPng(
    'https://rexu.in/e/checktoken01',
    labels,
    'v'
  );
  assert.ok(emergencyV.length > 50_000, 'emergency V PNG should be non-trivial');
  assert.equal(emergencyV[0], 0x89);

  const emergencyH = await renderEmergencyStickerPng(
    'https://rexu.in/e/checktoken01',
    labels,
    'h'
  );
  assert.ok(emergencyH.length > 50_000, 'emergency H PNG should be non-trivial');
  assert.equal(emergencyH[0], 0x89);

  const checkin = await renderCheckinStickerPng(
    'https://rexu.in/vehicle-checkin/checktoken01',
    labels
  );
  assert.ok(checkin.length > 50_000, 'check-in PNG should be non-trivial');
  assert.equal(checkin[0], 0x89);

  console.log(
    'ok emergencyV',
    emergencyV.length,
    'emergencyH',
    emergencyH.length,
    'checkin',
    checkin.length
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
