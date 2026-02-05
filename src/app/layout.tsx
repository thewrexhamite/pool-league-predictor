import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Pool League Pro - Wrexham & District 25/26',
  description:
    'Season simulation, match predictions, squad builder, and AI insights for the Wrexham & District Pool League 2025/26.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0C1222" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
