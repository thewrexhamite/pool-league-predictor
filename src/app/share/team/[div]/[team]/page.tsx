import type { Metadata } from 'next';
import { RedirectClient } from './RedirectClient';

interface PageProps {
  params: {
    div: string;
    team: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { div, team } = params;
  const decodedTeam = decodeURIComponent(team);
  const decodedDiv = decodeURIComponent(div);

  const title = `${decodedTeam} - ${decodedDiv} - Pool League Pro`;
  const description = `View ${decodedTeam}'s stats, standings position, and performance in ${decodedDiv}`;
  const imageUrl = `/api/og/team?team=${encodeURIComponent(decodedTeam)}&div=${encodeURIComponent(decodedDiv)}`;

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

export default function ShareTeamPage({ params }: PageProps) {
  const { div, team } = params;
  const hashUrl = `/#/team/${div}/${team}`;

  return <RedirectClient hashUrl={hashUrl} />;
}
