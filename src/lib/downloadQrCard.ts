/**
 * Download the branded emergency QR card (SVG) from /api/qr/[token].
 */
export async function downloadQrEmergencyCard(
  token: string,
  filename = 'rexu-emergency-card.svg'
): Promise<void> {
  const res = await fetch(`/api/qr/${token}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || 'Failed to download QR card');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
