'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera } from 'lucide-react';
import { ChalkButton } from '../shared/ChalkButton';

interface QRScannerProps {
  onScan: (tableId: string) => void;
  onClose: () => void;
}

function extractTableId(text: string): string | null {
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/join\/([^/]+)/);
    return match?.[1] ?? null;
  } catch {
    // Not a URL — check if it's a raw path like /join/abc123
    const match = text.match(/\/join\/([^/\s]+)/);
    return match?.[1] ?? null;
  }
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const handleStop = useCallback(async () => {
    try {
      const scanner = html5QrCodeRef.current;
      if (scanner?.isScanning) {
        await scanner.stop();
      }
    } catch {
      // ignore cleanup errors
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (cancelled) return;

        const scanner = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const tableId = extractTableId(decodedText);
            if (tableId) {
              handleStop();
              onScan(tableId);
            }
          },
          () => {
            // ignore scan failures (no QR in frame)
          }
        );

        if (!cancelled) {
          setStarting(false);
        }
      } catch (err) {
        if (cancelled) return;
        setStarting(false);

        if (err instanceof Error && err.message.includes('Permission')) {
          setError('Camera access denied. Please allow camera permissions in your browser settings and try again.');
        } else {
          setError('Could not start camera. Make sure no other app is using it.');
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      handleStop();
    };
  }, [onScan, handleStop]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Camera className="w-5 h-5" />
          <span className="font-semibold">Scan Table QR Code</span>
        </div>
        <button
          onClick={() => {
            handleStop();
            onClose();
          }}
          className="p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {error ? (
          <div className="text-center space-y-4 max-w-sm">
            <p className="text-loss text-sm">{error}</p>
            <ChalkButton variant="secondary" onClick={onClose}>
              Close
            </ChalkButton>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-4">
            <div
              id="qr-reader"
              ref={scannerRef}
              className="w-full rounded-xl overflow-hidden"
            />
            {starting && (
              <p className="text-center text-gray-400 text-sm">Starting camera...</p>
            )}
            <p className="text-center text-gray-500 text-xs">
              Point your camera at the QR code on the kiosk screen
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
