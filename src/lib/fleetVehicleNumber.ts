/** Normalize for duplicate checks (KA 01 ab → KA01AB). */
export function normalizeVehicleNumber(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

/** Per-company duplicate message (same number allowed across different fleets). */
export function duplicateVehicleMessage(vehicleNumber: string): string {
  return `Vehicle ${normalizeVehicleNumber(vehicleNumber)} already exists in your fleet.`;
}
