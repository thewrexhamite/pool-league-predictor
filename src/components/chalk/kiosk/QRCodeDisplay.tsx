'use client';

import { getJoinUrl } from '@/lib/chalk/qr-utils';

interface QRCodeDisplayProps {
  tableId: string;
  shortCode: string;
  size?: number;
  showLabel?: boolean;
}

export function QRCodeDisplay({ tableId, shortCode, size = 128, showLabel = true }: QRCodeDisplayProps) {
  const joinUrl = getJoinUrl(tableId);

  // Use a QR code API for generation. This is a simple approach
  // that works without additional dependencies.
  // Use high-contrast dark-on-light colors so phone cameras can reliably scan
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(joinUrl)}&bgcolor=FFFFFF&color=0C1222&format=svg`;

  return (
    <div className="flex flex-col items-center gap-[1.1vmin]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrUrl}
        alt={`QR code for ${shortCode}`}
        width={size}
        height={size}
        className="rounded-[0.7vmin]"
      />
      {showLabel && (
        <div className="text-center">
          <p className="text-[1.1vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>Scan to join</p>
          <p className="text-[1.3vmin] font-mono text-baize">{shortCode}</p>
        </div>
      )}
    </div>
  );
}
