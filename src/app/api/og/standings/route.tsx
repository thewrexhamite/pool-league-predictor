import { NextRequest } from 'next/server';
import {
  OGLayout,
  OGHeading,
  OGSubheading,
  createOGImage,
  getOrdinalSuffix,
} from '@/lib/og-image-utils';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const division = searchParams.get('div') || 'Division';
    const top3Param = searchParams.get('top3') || 'Team 1,Team 2,Team 3';

    // Parse comma-separated team names
    const teams = top3Param.split(',').map(team => team.trim()).slice(0, 3);

    // Ensure we have exactly 3 teams (pad with placeholders if needed)
    while (teams.length < 3) {
      teams.push(`Team ${teams.length + 1}`);
    }

    return createOGImage(
      <OGLayout>
        <OGSubheading>League Standings</OGSubheading>
        <OGHeading>{division}</OGHeading>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '40px',
            width: '100%',
            maxWidth: '800px',
          }}
        >
          {teams.map((team, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '24px 32px',
                backgroundColor: index === 0
                  ? 'rgba(59, 130, 246, 0.2)' // Highlight first place
                  : 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                borderLeft: index === 0
                  ? '6px solid #3b82f6'
                  : '6px solid transparent',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: index === 0 ? '#60a5fa' : '#64748b',
                  marginRight: '32px',
                  minWidth: '120px',
                }}
              >
                {getOrdinalSuffix(index + 1)}
              </div>
              <div
                style={{
                  fontSize: '42px',
                  fontWeight: '600',
                  color: '#f8fafc',
                  flex: 1,
                }}
              >
                {team}
              </div>
            </div>
          ))}
        </div>
      </OGLayout>
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
