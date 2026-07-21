/** Normalize for duplicate checks (KA 01 ab → KA01AB). */
export function normalizeVehicleNumber(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}
