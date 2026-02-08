import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RedirectClient } from './RedirectClient';

interface PageProps {
  params: {
    div: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { div } = params;
  const decodedDiv = decodeURIComponent(div);

  const title = `${decodedDiv} Standings - Pool League Pro`;
  const description = `Check out the current standings for ${decodedDiv}`;
  const imageUrl = `/api/og/standings?div=${encodeURIComponent(decodedDiv)}`;

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

export default function ShareStandingsPage({ params }: PageProps) {
  const { div } = params;
  const hashUrl = `/#/standings/${div}`;

  return <RedirectClient hashUrl={hashUrl} />;
}
