import { NextResponse } from 'next/server';
import { generateICalendar } from '@/lib/calendar-export';
import { FIXTURES } from '@/lib/data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division');
    const team = searchParams.get('team');

    // Validate required fields
    if (!division) {
      return NextResponse.json(
        { error: 'Missing required query parameter: division' },
        { status: 400 }
      );
    }

    // Filter fixtures by division
    const divisionFixtures = FIXTURES.filter(f => f.division === division);

    if (divisionFixtures.length === 0) {
      return NextResponse.json(
        { error: `No fixtures found for division: ${division}` },
        { status: 404 }
      );
    }

    // Generate iCalendar content (optionally filtered by team)
    const icalContent = generateICalendar(divisionFixtures, team || undefined);

    // Generate filename
    const filename = team
      ? `${team.replace(/\s+/g, '-')}-fixtures.ics`
      : `${division}-fixtures.ics`;

    // Return .ics file with appropriate headers
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar;charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to generate calendar export',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
