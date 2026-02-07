'use client';

import { Share2 } from 'lucide-react';
import clsx from 'clsx';
import { shareContent, type ShareData } from '@/lib/share-utils';
import { useToast } from './ToastProvider';

interface ShareButtonProps {
  /** Share data (title, text, url) */
  data: ShareData;
  /** Optional className for custom styling */
  className?: string;
  /** Optional title/tooltip text */
  title?: string;
  /** Optional icon size */
  size?: number;
  /** Optional label text to show alongside icon */
  label?: string;
}

/**
 * Reusable share button component
 * Uses Web Share API on supported devices, falls back to clipboard copy
 */
export default function ShareButton({
  data,
  className,
  title = 'Share',
  size = 18,
  label,
}: ShareButtonProps) {
  const { addToast } = useToast();

  const handleShare = async () => {
    const result = await shareContent(data);

    switch (result) {
      case 'shared':
        addToast('Shared successfully', 'success');
        break;
      case 'copied':
        addToast('Copied to clipboard', 'info');
        break;
      case 'failed':
        addToast('Failed to share', 'warning');
        break;
    }
  };

  return (
    <button
      onClick={handleShare}
      className={clsx(
        'p-1.5 text-gray-400 hover:text-white transition flex items-center gap-1.5',
        className
      )}
      title={title}
      aria-label={title}
    >
      <Share2 size={size} />
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}
