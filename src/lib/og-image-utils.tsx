import { ImageResponse } from 'next/og';

/**
 * OG Image utilities for generating dynamic Open Graph images
 */

// Standard OG image dimensions (recommended by Open Graph protocol)
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

// Pool League Pro brand colors
export const BRAND_COLORS = {
  primary: '#3b82f6', // Blue
  secondary: '#1e40af', // Dark blue
  accent: '#60a5fa', // Light blue
  background: '#0f172a', // Dark slate
  text: '#f8fafc', // Light slate
  muted: '#64748b', // Gray
} as const;

/**
 * Base layout component for OG images with Pool League Pro branding
 */
export interface OGLayoutProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

export function OGLayout({ children, showLogo = true }: OGLayoutProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: BRAND_COLORS.background,
        padding: '60px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {children}
      </div>

      {/* Footer with branding */}
      {showLogo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* Pool League Pro logo placeholder */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: BRAND_COLORS.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                color: BRAND_COLORS.text,
              }}
            >
              8
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: BRAND_COLORS.text,
                  lineHeight: 1.2,
                }}
              >
                Pool League Pro
              </div>
              <div
                style={{
                  fontSize: '18px',
                  color: BRAND_COLORS.muted,
                  lineHeight: 1.2,
                }}
              >
                AI-Powered Match Predictions
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Large text display component for main headings
 */
export interface OGHeadingProps {
  children: React.ReactNode;
  color?: string;
}

export function OGHeading({ children, color = BRAND_COLORS.text }: OGHeadingProps) {
  return (
    <div
      style={{
        fontSize: '72px',
        fontWeight: 'bold',
        color,
        lineHeight: 1.2,
        textAlign: 'center',
        marginBottom: '24px',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Subheading text component
 */
export interface OGSubheadingProps {
  children: React.ReactNode;
  color?: string;
}

export function OGSubheading({ children, color = BRAND_COLORS.muted }: OGSubheadingProps) {
  return (
    <div
      style={{
        fontSize: '36px',
        color,
        lineHeight: 1.4,
        textAlign: 'center',
        marginBottom: '16px',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Stat display component for highlighting key metrics
 */
export interface OGStatProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export function OGStat({ label, value, highlight = false }: OGStatProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 40px',
        backgroundColor: highlight ? BRAND_COLORS.primary : 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        minWidth: '200px',
      }}
    >
      <div
        style={{
          fontSize: '56px',
          fontWeight: 'bold',
          color: highlight ? BRAND_COLORS.background : BRAND_COLORS.text,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '24px',
          color: highlight ? BRAND_COLORS.background : BRAND_COLORS.muted,
          lineHeight: 1.2,
          marginTop: '8px',
        }}
      >
        {label}
      </div>
    </div>
  );
}

/**
 * VS divider component for match predictions
 */
export function OGVersus() {
  return (
    <div
      style={{
        fontSize: '48px',
        fontWeight: 'bold',
        color: BRAND_COLORS.muted,
        margin: '0 40px',
      }}
    >
      VS
    </div>
  );
}

/**
 * Helper function to create ImageResponse with standard settings
 */
export function createOGImage(element: React.ReactElement) {
  return new ImageResponse(element, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
  });
}

/**
 * Helper to format percentage values
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Helper to get ordinal suffix for positions (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
