import { NextRequest } from 'next/server';
import {
  OGLayout,
  OGHeading,
  OGSubheading,
  OGStat,
  createOGImage,
  formatPercentage,
} from '@/lib/og-image-utils';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const division = searchParams.get('div') || 'Division';
    const winner = searchParams.get('winner') || 'Team Name';
    const titlePct = parseFloat(searchParams.get('titlePct') || '0');

    return createOGImage(
      <OGLayout>
        <OGSubheading>Season Simulation</OGSubheading>
        <OGHeading>{division}</OGHeading>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '40px',
          }}
        >
          <div
            style={{
              fontSize: '36px',
              color: '#64748b',
              marginBottom: '24px',
            }}
          >
            Predicted Champion
          </div>
          <div
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#f8fafc',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            {winner}
          </div>
          <OGStat
            label="Title Win Probability"
            value={formatPercentage(titlePct)}
            highlight={true}
          />
        </div>
      </OGLayout>
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
