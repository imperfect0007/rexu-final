/** Safe base for sticker / zip filenames: VEHICLENUMBER-CompanyName */
export function stickerNameBase(
  vehicleNumber: string | null | undefined,
  companyName: string | null | undefined
): string {
  const vehicle =
    (vehicleNumber || 'vehicle')
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toUpperCase() || 'VEHICLE';
  const company =
    (companyName || 'company')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '') || 'company';
  return `${vehicle}-${company}`;
}
