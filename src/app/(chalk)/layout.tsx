'use client';

import './chalk-globals.css';

export default function ChalkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="chalk-root dark">
      {children}
    </div>
  );
}
