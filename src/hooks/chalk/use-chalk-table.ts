'use client';

import { useChalkTableContext } from '@/lib/chalk/table-provider';

export function useChalkTable() {
  return useChalkTableContext();
}
