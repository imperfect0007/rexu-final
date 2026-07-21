/**
 * Download the branded emergency QR sticker (PNG) from /api/qr/[token].
 * style: 'v' = Model V (rear), 'h' = Model H (horizontal / second safety).
 */
export async function downloadQrEmergencyCard(
  token: string,
  filename?: string,
  style: 'v' | 'h' = 'v'
): Promise<void> {
  const res = await fetch(`/api/qr/${token}?style=${style}`, { cache: 'no-store' });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || 'Failed to download QR card');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const stamp = Date.now();
  const base =
    filename ??
    (style === 'h' ? 'rexu-safety-card-h.png' : 'rexu-safety-card-v.png');
  const uniqueName = base.includes('.')
    ? base.replace(/(\.[^.]+)$/, `-${stamp}$1`)
    : `${base}-${stamp}`;

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
