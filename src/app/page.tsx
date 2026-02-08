'use client';

import { useLeague } from '@/lib/league-context';
import { DataProvider } from '@/lib/data-provider';
import LeagueSelector from '@/components/LeagueSelector';
import App from '@/components/App';

function HomeContent() {
  const { selected, loading } = useLeague();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="skeleton w-12 h-12 rounded-full" />
      </div>
    );
  }

  if (!selected) {
    return <LeagueSelector />;
  }

  return (
    <DataProvider leagueId={selected.leagueId} seasonId={selected.seasonId}>
      <App league={selected.league} />
    </DataProvider>
  );
}

export default function Home() {
  return <HomeContent />;
}
