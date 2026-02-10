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
import { OfflineIndicator } from '@/components/OfflineIndicator';

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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pool League Pro" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
      <body className="font-sans antialiased scroll-state-container">
        <ThemeProvider>
          <AuthProvider>
            <Suspense>
              <LeagueProvider>
                <LeagueBrandingProvider>
                  <AnalyticsInit />
                  <OfflineIndicator />
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
