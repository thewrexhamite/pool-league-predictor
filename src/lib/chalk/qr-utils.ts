export function getJoinUrl(tableId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/join/${tableId}`;
}

export function getTvUrl(tableId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/tv/${tableId}`;
}
