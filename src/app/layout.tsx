import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import Script from 'next/script';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/auth';
import { AnalyticsInit } from '@/components/AnalyticsInit';
import { LeagueProvider } from '@/lib/league-context';
import { LeagueBrandingProvider } from '@/lib/league-branding';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Pool League Pro',
  description:
    'Season simulation, match predictions, squad builder, and AI insights for pool leagues.',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2Y3WXKZYSD"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2Y3WXKZYSD');
          `}
        </Script>
        <Script id="service-worker-registration" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((error) => {
                  console.error('Service Worker registration failed:', error);
                });
              });
            }
          `}
        </Script>
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <Suspense>
              <LeagueProvider>
                <LeagueBrandingProvider>
                  <AnalyticsInit />
                  {children}
                </LeagueBrandingProvider>
              </LeagueProvider>
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
