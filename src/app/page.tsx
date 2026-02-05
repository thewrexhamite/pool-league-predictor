'use client';

import App from '@/components/App';
import { DataProvider } from '@/lib/data-provider';

export default function Home() {
  return (
    <DataProvider>
      <App />
    </DataProvider>
  );
}
