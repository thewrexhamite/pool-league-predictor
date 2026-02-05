'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StoredTeamReport } from '@/lib/types';

const STORAGE_KEY = 'pool-league-team-reports';
const MAX_PER_TEAM = 10;

function loadAll(): StoredTeamReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(reports: StoredTeamReport[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export function useTeamReports(teamName: string | null) {
  const [all, setAll] = useState<StoredTeamReport[]>([]);

  useEffect(() => {
    setAll(loadAll());
  }, []);

  const reports = teamName
    ? all
        .filter(r => r.teamName === teamName)
        .sort((a, b) => b.generatedAt - a.generatedAt)
    : [];

  const addReport = useCallback((report: StoredTeamReport) => {
    setAll(prev => {
      const updated = [report, ...prev];
      // Cap per team
      const counts: Record<string, number> = {};
      const pruned = updated.filter(r => {
        counts[r.teamName] = (counts[r.teamName] || 0) + 1;
        return counts[r.teamName] <= MAX_PER_TEAM;
      });
      saveAll(pruned);
      return pruned;
    });
  }, []);

  const deleteReport = useCallback((id: string) => {
    setAll(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveAll(updated);
      return updated;
    });
  }, []);

  return { reports, addReport, deleteReport };
}
