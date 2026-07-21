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
  const headerName = filenameFromContentDisposition(
    res.headers.get('Content-Disposition')
  );
  await downloadBlobAsFile(
    blob,
    filename ??
      headerName ??
      (style === 'h' ? 'rexu-safety-card-h.png' : 'rexu-safety-card-v.png')
  );
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = /filename="([^"]+)"/i.exec(header);
  return m?.[1] ?? null;
}

/**
 * Download a blob (PNG/zip). Uses the given filename as-is (no timestamp).
 */
export async function downloadBlobAsFile(
  blob: Blob,
  filename: string
): Promise<void> {
  const url = URL.createObjectURL(blob);

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
