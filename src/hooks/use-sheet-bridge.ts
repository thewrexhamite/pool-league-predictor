'use client';

import { useEffect, useRef } from 'react';
import { useDetailSheet } from '@/components/ui/DetailSheetProvider';
import type { TabId } from '@/lib/router';
import type { DivisionCode } from '@/lib/types';

/**
 * Bridges the hash router with the detail sheet system.
 * When the router navigates to team/player, opens the sheet overlay.
 * When the sheet closes, the provider restores the previous hash.
 */
export function useSheetBridge(routerTab: TabId, routerTeam?: string, routerPlayer?: string, routerDiv?: DivisionCode) {
  const sheet = useDetailSheet();
  const prevTab = useRef<TabId>(routerTab);

  useEffect(() => {
    if (routerTab === 'team' && routerTeam) {
      sheet.openTeam(routerTeam, routerDiv);
    } else if (routerTab === 'player' && routerPlayer) {
      sheet.openPlayer(routerPlayer);
    } else if (prevTab.current === 'team' || prevTab.current === 'player') {
      // Navigated away from team/player — close sheets if open
      if (sheet.isOpen) {
        sheet.closeAll();
      }
    }
    prevTab.current = routerTab;
    // Only react to router changes, not sheet state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerTab, routerTeam, routerPlayer, routerDiv]);

  return sheet;
}
