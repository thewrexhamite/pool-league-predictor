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
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(joinUrl)}&bgcolor=0C1222&color=10B981&format=svg`;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrUrl}
        alt={`QR code for ${shortCode}`}
        width={size}
        height={size}
        className="rounded-lg"
      />
      {showLabel && (
        <div className="text-center">
          <p className="text-xs text-gray-400">Scan to join</p>
          <p className="text-sm font-mono text-baize">{shortCode}</p>
        </div>
      )}
    </div>
  );
}
