'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLeague } from './league-context';

interface LeagueBrandingContextValue {
  primaryColor: string;
  logo?: string;
}

const LeagueBrandingContext = createContext<LeagueBrandingContextValue>({
  primaryColor: '#3b82f6', // default blue
  logo: undefined,
});

export function useLeagueBranding() {
  return useContext(LeagueBrandingContext);
}

interface LeagueBrandingProviderProps {
  children: ReactNode;
}

export function LeagueBrandingProvider({ children }: LeagueBrandingProviderProps) {
  const { selected } = useLeague();

  // Extract branding from selected league
  const primaryColor = selected?.league.primaryColor || '#3b82f6';
  const logo = selected?.league.logo;

  // Inject CSS variables into document root
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--league-primary', primaryColor);

    // Derive lighter/darker variants for UI consistency
    // These can be used for hover states, backgrounds, etc.
    const hslMatch = primaryColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      const [, h, s, l] = hslMatch;
      root.style.setProperty('--league-primary-light', `hsl(${h}, ${s}%, ${Math.min(Number(l) + 10, 95)}%)`);
      root.style.setProperty('--league-primary-dark', `hsl(${h}, ${s}%, ${Math.max(Number(l) - 10, 5)}%)`);
    } else {
      // Fallback for hex colors - use opacity variations
      root.style.setProperty('--league-primary-light', `${primaryColor}20`);
      root.style.setProperty('--league-primary-dark', `${primaryColor}dd`);
    }

    return () => {
      // Cleanup on unmount
      root.style.removeProperty('--league-primary');
      root.style.removeProperty('--league-primary-light');
      root.style.removeProperty('--league-primary-dark');
    };
  }, [primaryColor]);

  return (
    <LeagueBrandingContext.Provider value={{ primaryColor, logo }}>
      {children}
    </LeagueBrandingContext.Provider>
  );
}
