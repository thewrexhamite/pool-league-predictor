import {
  KIOSK_PERSISTENCE_KEY,
  KIOSK_PERSISTENCE_MAX_AGE_DAYS,
} from '@/lib/chalk/constants';

export interface KioskPersistence {
  tableId: string;
  tableName: string;
  venueId: string | null;
  savedAt: number;
}

const MAX_AGE_MS = KIOSK_PERSISTENCE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export function saveKioskConfig(config: Omit<KioskPersistence, 'savedAt'>): void {
  try {
    const data: KioskPersistence = { ...config, savedAt: Date.now() };
    localStorage.setItem(KIOSK_PERSISTENCE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}

export function loadKioskConfig(): KioskPersistence | null {
  try {
    const raw = localStorage.getItem(KIOSK_PERSISTENCE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as KioskPersistence;
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KIOSK_PERSISTENCE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearKioskConfig(): void {
  try {
    localStorage.removeItem(KIOSK_PERSISTENCE_KEY);
  } catch {
    // Ignore
  }
}
