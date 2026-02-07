import { NextRequest } from 'next/server';
import {
  OGLayout,
  OGHeading,
  OGSubheading,
  OGStat,
  createOGImage,
  getOrdinalSuffix,
} from '@/lib/og-image-utils';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const team = searchParams.get('team') || 'Team Name';
    const pos = parseInt(searchParams.get('pos') || '1', 10);
    const pts = parseInt(searchParams.get('pts') || '0', 10);
    const form = searchParams.get('form') || 'N/A';

    return createOGImage(
      <OGLayout>
        <OGSubheading>Team Stats</OGSubheading>
        <OGHeading>{team}</OGHeading>

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
            label="Position"
            value={getOrdinalSuffix(pos)}
            highlight={true}
          />
          <OGStat
            label="Points"
            value={pts}
          />
          <OGStat
            label="Form"
            value={form}
          />
        </div>
      </OGLayout>
    );
  } catch (error) {
    return new Response('Failed to generate image', { status: 500 });
  }
}
