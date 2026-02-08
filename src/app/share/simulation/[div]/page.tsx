import type { Metadata } from 'next';
import { RedirectClient } from './RedirectClient';

interface PageProps {
  params: Promise<{
    div: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { div } = await params;
  const decodedDiv = decodeURIComponent(div);

  const title = `${decodedDiv} Season Simulation - Pool League Pro`;
  const description = `View the simulated season outcomes for ${decodedDiv} including win probabilities and final standings predictions`;
  const imageUrl = `/api/og/simulation?div=${encodeURIComponent(decodedDiv)}`;

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

export default async function ShareSimulationPage({ params }: PageProps) {
  const { div } = await params;
  const hashUrl = `/#/simulation/${div}`;

  return <RedirectClient hashUrl={hashUrl} />;
}
