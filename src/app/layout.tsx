import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pool League Predictor - Wrexham & District 25/26',
  description:
    'Monte Carlo season simulation, match predictions, squad builder, and AI-powered insights for the Wrexham & District Pool League 2025/26 season.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
