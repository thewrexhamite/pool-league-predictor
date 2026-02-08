import { NextRequest } from 'next/server';
import {
  OGLayout,
  OGHeading,
  OGSubheading,
  OGStat,
  OGVersus,
  createOGImage,
  formatPercentage,
} from '@/lib/og-image-utils';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const home = searchParams.get('home') || 'Home Team';
    const away = searchParams.get('away') || 'Away Team';
    const homeWin = parseFloat(searchParams.get('homeWin') || '33');
    const draw = parseFloat(searchParams.get('draw') || '33');
    const awayWin = parseFloat(searchParams.get('awayWin') || '34');

    // Determine which outcome has the highest probability for highlighting
    const maxProb = Math.max(homeWin, draw, awayWin);

    return createOGImage(
      <OGLayout>
        <OGSubheading>Match Prediction</OGSubheading>
        <OGHeading>{home} vs {away}</OGHeading>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
            marginTop: '40px',
          }}
        >
          <OGStat
            label={home}
            value={formatPercentage(homeWin)}
            highlight={homeWin === maxProb}
          />
          <OGStat
            label="Draw"
            value={formatPercentage(draw)}
            highlight={draw === maxProb}
          />
          <OGStat
            label={away}
            value={formatPercentage(awayWin)}
            highlight={awayWin === maxProb}
          />
        </div>
      </OGLayout>
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
