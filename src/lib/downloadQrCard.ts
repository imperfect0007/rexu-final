/**
 * Download the branded emergency QR sticker (PNG) from /api/qr/[token].
 */
export async function downloadQrEmergencyCard(
  token: string,
  filename = 'rexu-emergency-card.png'
): Promise<void> {
  const res = await fetch(`/api/qr/${token}`, { cache: 'no-store' });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || 'Failed to download QR card');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const stamp = Date.now();
  const uniqueName = filename.includes('.')
    ? filename.replace(/(\.[^.]+)$/, `-${stamp}$1`)
    : `${filename}-${stamp}`;

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = uniqueName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Delay revoke so repeat clicks / slow browsers can finish the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

/**
 * Download a blob response (e.g. check-in QR SVG) with the same repeat-download behavior.
 */
export async function downloadBlobAsFile(
  blob: Blob,
  filename: string
): Promise<void> {
  const url = URL.createObjectURL(blob);
  const stamp = Date.now();
  const uniqueName = filename.includes('.')
    ? filename.replace(/(\.[^.]+)$/, `-${stamp}$1`)
    : `${filename}-${stamp}`;

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = uniqueName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
