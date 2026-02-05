'use client';

import { LeagueProvider } from '@/lib/league-context';
import AppRouter from '@/components/AppRouter';

export default function Home() {
  return (
    <LeagueProvider>
      <AppRouter />
    </LeagueProvider>
  );
}
