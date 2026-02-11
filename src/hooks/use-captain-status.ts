'use client';

import { useMemo } from 'react';
import { useUserProfile } from '@/lib/auth/auth-context';
import type { CaptainClaim } from '@/lib/auth/auth-utils';

export function useCaptainStatus() {
  const profile = useUserProfile();

  const claims = useMemo<CaptainClaim[]>(
    () => profile?.captainClaims ?? [],
    [profile]
  );

  const isCaptain = claims.length > 0;

  const isVerifiedCaptainFor = (league: string, season: string, team: string) =>
    claims.some(
      (c) => c.league === league && c.season === season && c.team === team && c.verified
    );

  const hasClaim = (league: string, season: string, team: string) =>
    claims.some(
      (c) => c.league === league && c.season === season && c.team === team
    );

  return {
    isCaptain,
    isVerifiedCaptainFor,
    hasClaim,
    claims,
  };
}
