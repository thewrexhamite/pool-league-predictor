import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RedirectClient } from './RedirectClient';

interface PageProps {
  params: Promise<{
    div: string;
    home: string;
    away: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { div, home, away } = await params;
  const decodedHome = decodeURIComponent(home);
  const decodedAway = decodeURIComponent(away);

  const title = `${decodedHome} vs ${decodedAway} - Pool League Pro`;
  const description = `Check out the match prediction for ${decodedHome} vs ${decodedAway} in ${div}`;
  const imageUrl = `/api/og/prediction?home=${encodeURIComponent(decodedHome)}&away=${encodeURIComponent(decodedAway)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [imageUrl],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePredictPage({ params }: PageProps) {
  const { div, home, away } = await params;
  const hashUrl = `/#/predict/${div}/${home}/vs/${away}`;

  return <RedirectClient hashUrl={hashUrl} />;
}
