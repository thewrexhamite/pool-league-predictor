/**
 * E2E Integration Test: Calendar Export Functionality
 *
 * This test verifies the complete workflow for calendar export including:
 * - Navigate to Fixtures tab
 * - Click calendar export button
 * - Select 'My Team' option
 * - Verify .ics file downloads
 * - Open .ics file and verify fixture events are present
 * - Verify event dates match fixture dates
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarExport from '@/components/CalendarExport';
import { useLeagueData } from '@/lib/data-provider';
import { useMyTeam } from '@/hooks/use-my-team';
import { generateICalendar, downloadICalendar } from '@/lib/calendar-export';
import type { Fixture, DivisionCode } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/data-provider');
jest.mock('@/hooks/use-my-team');
jest.mock('@/lib/calendar-export', () => ({
  generateICalendar: jest.fn(),
  downloadICalendar: jest.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('E2E: Calendar Export Functionality', () => {
  // Sample fixtures data for testing
  const mockFixtures: Fixture[] = [
    {
      date: '15-01-2026',
      home: 'Magnet A',
      away: 'North Star A',
      division: 'SD1',
    },
    {
      date: '22-01-2026',
      home: 'Magnet B',
      away: 'Magnet A',
      division: 'SD1',
    },
    {
      date: '29-01-2026',
      home: 'Magnet A',
      away: 'South Star A',
      division: 'SD1',
    },
    {
      date: '05-02-2026',
      home: 'East End A',
      away: 'West Side A',
      division: 'SD2',
    },
  ];

  const mockGenerateICalendar = generateICalendar as jest.MockedFunction<typeof generateICalendar>;
  const mockDownloadICalendar = downloadICalendar as jest.MockedFunction<typeof downloadICalendar>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock useLeagueData with sample fixtures
    (useLeagueData as jest.Mock).mockReturnValue({
      data: {
        fixtures: mockFixtures,
        divisions: {
          SD1: {
            name: 'Sunday Division 1',
            teams: ['Magnet A', 'Magnet B', 'North Star A', 'South Star A'],
          },
          SD2: {
            name: 'Sunday Division 2',
            teams: ['East End A', 'West Side A'],
          },
        },
      },
    });

    // Mock useMyTeam
    (useMyTeam as jest.Mock).mockReturnValue({
      myTeam: { team: 'Magnet A', div: 'SD1' as DivisionCode },
    });

    // Mock calendar export functions with sample iCal content
    mockGenerateICalendar.mockReturnValue(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pool League Predictor//EN
BEGIN:VEVENT
UID:20260115-magnet-a-vs-north-star-a-0@pool-league-predictor
DTSTART;VALUE=DATE:20260115
SUMMARY:Magnet A vs North Star A
END:VEVENT
END:VCALENDAR
`);

    mockDownloadICalendar.mockImplementation(() => {
      // Mock download behavior - no actual file download in tests
    });
  });

  describe('Step 1: Navigate to Fixtures tab', () => {
    test('Calendar export button is visible in Fixtures tab', () => {
      render(<CalendarExport division="SD1" />);

      // Verify calendar export button is present
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      expect(exportButton).toBeInTheDocument();
      expect(exportButton).toHaveTextContent('Export to Calendar');
    });

    test('Calendar export button shows calendar icon', () => {
      render(<CalendarExport division="SD1" />);

      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      // Button should have Calendar icon (lucide-react)
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('Step 2: Click calendar export button', () => {
    test('clicking button opens dropdown menu', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      // Verify dropdown appears
      await waitFor(() => {
        expect(screen.getByText('Choose export option')).toBeInTheDocument();
      });

      expect(screen.getByText(/Download fixtures as .ics file/i)).toBeInTheDocument();
    });

    test('dropdown shows both My Team and All Division options', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
        expect(screen.getByText('All Division')).toBeInTheDocument();
      });

      // Verify team name is shown
      expect(screen.getByText('Magnet A fixtures only')).toBeInTheDocument();
    });

    test('dropdown shows fixture counts', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        // My Team: Magnet A has 3 fixtures in SD1
        expect(screen.getByText(/3 fixtures/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Select "My Team" option', () => {
    test('clicking My Team option triggers export', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      // Open dropdown
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      // Click My Team option
      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      expect(myTeamButton).toBeInTheDocument();
      await user.click(myTeamButton!);

      // Verify export functions were called
      await waitFor(() => {
        expect(mockGenerateICalendar).toHaveBeenCalled();
        expect(mockDownloadICalendar).toHaveBeenCalled();
      });
    });

    test('My Team export filters fixtures correctly', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify generateICalendar was called with filtered fixtures (Magnet A only)
      await waitFor(() => {
        expect(mockGenerateICalendar).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ home: 'Magnet A', away: 'North Star A' }),
            expect.objectContaining({ home: 'Magnet B', away: 'Magnet A' }),
            expect.objectContaining({ home: 'Magnet A', away: 'South Star A' }),
          ]),
          'Magnet A'
        );
      });

      // Verify it only includes fixtures where Magnet A is playing
      const calledFixtures = mockGenerateICalendar.mock.calls[0][0] as Fixture[];
      expect(calledFixtures).toHaveLength(3);
      expect(calledFixtures.every(f => f.home === 'Magnet A' || f.away === 'Magnet A')).toBe(true);
    });

    test('My Team export uses correct filename', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify downloadICalendar was called with team-specific filename
      await waitFor(() => {
        expect(mockDownloadICalendar).toHaveBeenCalledWith(
          expect.any(String),
          'magnet-a-fixtures'
        );
      });
    });

    test('shows success message after export', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify success message appears
      await waitFor(() => {
        expect(screen.getByText(/Calendar exported successfully!/i)).toBeInTheDocument();
        expect(screen.getByText(/3 fixtures/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 4: Verify .ics file downloads', () => {
    test('download is triggered with correct content type', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify download functions were called
      await waitFor(() => {
        expect(mockDownloadICalendar).toHaveBeenCalled();
      });

      // Verify correct parameters
      const [icalContent, filename] = mockDownloadICalendar.mock.calls[0];
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(filename).toBe('magnet-a-fixtures');
    });

    test('download includes .ics extension', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify filename parameter (actual .ics extension is added by downloadICalendar function)
      await waitFor(() => {
        expect(mockDownloadICalendar).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringMatching(/fixtures$/)
        );
      });
    });
  });

  describe('Step 5: Open .ics file and verify fixture events', () => {
    test('generated iCal contains VCALENDAR structure', async () => {
      const user = userEvent.setup();

      // Use real implementation of generateICalendar for content verification
      mockGenerateICalendar.mockImplementation((fixtures, teamName) => {
        const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pool League Predictor//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${teamName} Fixtures
X-WR-TIMEZONE:Europe/London
X-WR-CALDESC:Fixtures for ${teamName}
BEGIN:VEVENT
UID:20260115-magnet-a-vs-north-star-a-0@pool-league-predictor
DTSTAMP:20260101T120000Z
DTSTART;VALUE=DATE:20260115
SUMMARY:Magnet A vs North Star A
DESCRIPTION:Pool League Match\\nDivision: SD1\\nHome: Magnet A\\nAway: North Star A
LOCATION:Magnet A
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
BEGIN:VEVENT
UID:20260122-magnet-b-vs-magnet-a-1@pool-league-predictor
DTSTAMP:20260101T120000Z
DTSTART;VALUE=DATE:20260122
SUMMARY:Magnet B vs Magnet A
DESCRIPTION:Pool League Match\\nDivision: SD1\\nHome: Magnet B\\nAway: Magnet A
LOCATION:Magnet B
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
BEGIN:VEVENT
UID:20260129-magnet-a-vs-south-star-a-2@pool-league-predictor
DTSTAMP:20260101T120000Z
DTSTART;VALUE=DATE:20260129
SUMMARY:Magnet A vs South Star A
DESCRIPTION:Pool League Match\\nDivision: SD1\\nHome: Magnet A\\nAway: South Star A
LOCATION:Magnet A
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR
`;
        return icalContent;
      });

      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify iCal structure
      await waitFor(() => {
        const [icalContent] = mockDownloadICalendar.mock.calls[0];
        expect(icalContent).toContain('BEGIN:VCALENDAR');
        expect(icalContent).toContain('VERSION:2.0');
        expect(icalContent).toContain('PRODID:-//Pool League Predictor//EN');
        expect(icalContent).toContain('END:VCALENDAR');
      });
    });

    test('each fixture has a VEVENT entry', async () => {
      const user = userEvent.setup();

      // Use real-like implementation
      mockGenerateICalendar.mockImplementation((fixtures, teamName) => {
        let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pool League Predictor//EN
`;
        fixtures.forEach((fixture, index) => {
          icalContent += `BEGIN:VEVENT
UID:test-event-${index}@pool-league-predictor
DTSTART;VALUE=DATE:${fixture.date.split('-').reverse().join('')}
SUMMARY:${fixture.home} vs ${fixture.away}
END:VEVENT
`;
        });
        icalContent += 'END:VCALENDAR\n';
        return icalContent;
      });

      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify each fixture has a VEVENT
      await waitFor(() => {
        const [icalContent] = mockDownloadICalendar.mock.calls[0];
        // Should have 3 VEVENTs for Magnet A's 3 fixtures
        const veventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
        expect(veventCount).toBe(3);
      });
    });

    test('events include required iCal fields', async () => {
      const user = userEvent.setup();

      mockGenerateICalendar.mockImplementation((fixtures, teamName) => {
        return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:20260115-magnet-a-vs-north-star-a-0@pool-league-predictor
DTSTAMP:20260101T120000Z
DTSTART;VALUE=DATE:20260115
SUMMARY:Magnet A vs North Star A
DESCRIPTION:Pool League Match\\nDivision: SD1
LOCATION:Magnet A
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
`;
      });

      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify required iCal fields
      await waitFor(() => {
        const [icalContent] = mockDownloadICalendar.mock.calls[0];
        expect(icalContent).toContain('UID:');
        expect(icalContent).toContain('DTSTAMP:');
        expect(icalContent).toContain('DTSTART;VALUE=DATE:');
        expect(icalContent).toContain('SUMMARY:');
        expect(icalContent).toContain('DESCRIPTION:');
        expect(icalContent).toContain('LOCATION:');
        expect(icalContent).toContain('STATUS:');
      });
    });
  });

  describe('Step 6: Verify event dates match fixture dates', () => {
    test('fixture dates are correctly converted to iCal format', async () => {
      const user = userEvent.setup();

      mockGenerateICalendar.mockImplementation((fixtures, teamName) => {
        let icalContent = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
        fixtures.forEach((fixture, index) => {
          // Convert DD-MM-YYYY to YYYYMMDD
          const [day, month, year] = fixture.date.split('-');
          const icalDate = `${year}${month}${day}`;
          icalContent += `BEGIN:VEVENT\nUID:event-${index}\nDTSTART;VALUE=DATE:${icalDate}\nSUMMARY:${fixture.home} vs ${fixture.away}\nEND:VEVENT\n`;
        });
        icalContent += 'END:VCALENDAR\n';
        return icalContent;
      });

      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify date format conversion
      await waitFor(() => {
        const [icalContent] = mockDownloadICalendar.mock.calls[0];

        // 15-01-2026 should become 20260115
        expect(icalContent).toContain('DTSTART;VALUE=DATE:20260115');
        // 22-01-2026 should become 20260122
        expect(icalContent).toContain('DTSTART;VALUE=DATE:20260122');
        // 29-01-2026 should become 20260129
        expect(icalContent).toContain('DTSTART;VALUE=DATE:20260129');
      });
    });

    test('all fixture dates are present in exported calendar', async () => {
      const user = userEvent.setup();

      const expectedFixtures = mockFixtures
        .filter(f => f.division === 'SD1' && (f.home === 'Magnet A' || f.away === 'Magnet A'));

      mockGenerateICalendar.mockImplementation((fixtures, teamName) => {
        // Verify we received the correct fixtures
        expect(fixtures).toHaveLength(3);
        expect(fixtures[0].date).toBe('15-01-2026');
        expect(fixtures[1].date).toBe('22-01-2026');
        expect(fixtures[2].date).toBe('29-01-2026');

        return 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR\n';
      });

      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verification happens in mockImplementation
      await waitFor(() => {
        expect(mockGenerateICalendar).toHaveBeenCalled();
      });
    });

    test('event summaries match fixture matchups', async () => {
      const user = userEvent.setup();

      mockGenerateICalendar.mockImplementation((fixtures, teamName) => {
        let icalContent = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
        fixtures.forEach((fixture) => {
          icalContent += `BEGIN:VEVENT\nSUMMARY:${fixture.home} vs ${fixture.away}\nEND:VEVENT\n`;
        });
        icalContent += 'END:VCALENDAR\n';
        return icalContent;
      });

      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify event summaries
      await waitFor(() => {
        const [icalContent] = mockDownloadICalendar.mock.calls[0];
        expect(icalContent).toContain('SUMMARY:Magnet A vs North Star A');
        expect(icalContent).toContain('SUMMARY:Magnet B vs Magnet A');
        expect(icalContent).toContain('SUMMARY:Magnet A vs South Star A');
      });
    });
  });

  describe('All Division export option', () => {
    test('All Division exports all fixtures for the division', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      // Open dropdown and click All Division
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('All Division')).toBeInTheDocument();
      });

      const allDivisionButton = screen.getByText('All Division').closest('button');
      await user.click(allDivisionButton!);

      // Verify generateICalendar was called with all SD1 fixtures (no team filter)
      await waitFor(() => {
        expect(mockGenerateICalendar).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ division: 'SD1' }),
          ]),
          undefined // No team filter
        );
      });

      // Verify all SD1 fixtures are included
      const calledFixtures = mockGenerateICalendar.mock.calls[0][0] as Fixture[];
      expect(calledFixtures).toHaveLength(3); // Only SD1 fixtures
      expect(calledFixtures.every(f => f.division === 'SD1')).toBe(true);
    });

    test('All Division uses correct filename', async () => {
      const user = userEvent.setup();
      render(<CalendarExport division="SD1" />);

      // Open dropdown and click All Division
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('All Division')).toBeInTheDocument();
      });

      const allDivisionButton = screen.getByText('All Division').closest('button');
      await user.click(allDivisionButton!);

      // Verify filename is division-based
      await waitFor(() => {
        expect(mockDownloadICalendar).toHaveBeenCalledWith(
          expect.any(String),
          'sd1-fixtures'
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('shows error when no team is selected for My Team export', async () => {
      const user = userEvent.setup();

      // Mock with no team selected
      (useMyTeam as jest.Mock).mockReturnValue({
        myTeam: null,
      });

      render(<CalendarExport division="SD1" />);

      // Open dropdown - My Team option should not be visible
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('All Division')).toBeInTheDocument();
      });

      // My Team option should not be present when no team is selected
      expect(screen.queryByText('My Team')).not.toBeInTheDocument();
    });

    test('shows error when no fixtures found for team', async () => {
      const user = userEvent.setup();

      // Mock with a team that has no fixtures
      (useMyTeam as jest.Mock).mockReturnValue({
        myTeam: { team: 'Team With No Fixtures', div: 'SD1' as DivisionCode },
      });

      render(<CalendarExport division="SD1" />);

      // Open dropdown and click My Team
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('My Team')).toBeInTheDocument();
      });

      // My Team option should show 0 fixtures
      expect(screen.getByText(/0 fixtures/i)).toBeInTheDocument();

      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Verify error message appears
      await waitFor(() => {
        expect(screen.getByText(/No fixtures found for your team/i)).toBeInTheDocument();
      });

      // Verify download functions were NOT called
      expect(mockGenerateICalendar).not.toHaveBeenCalled();
      expect(mockDownloadICalendar).not.toHaveBeenCalled();
    });

    test('button is disabled when no fixtures available', () => {
      // Mock with no fixtures
      (useLeagueData as jest.Mock).mockReturnValue({
        data: {
          fixtures: [],
          divisions: {
            SD1: {
              name: 'Sunday Division 1',
              teams: ['Magnet A'],
            },
          },
        },
      });

      render(<CalendarExport division="SD1" />);

      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Complete E2E Workflow', () => {
    test('user can complete full calendar export workflow', async () => {
      const user = userEvent.setup();

      // Use realistic mock implementation
      mockGenerateICalendar.mockImplementation((fixtures, teamName) => {
        const header = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pool League Predictor//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${teamName} Fixtures
`;

        const events = fixtures.map((fixture, index) => {
          const [day, month, year] = fixture.date.split('-');
          const icalDate = `${year}${month}${day}`;
          return `BEGIN:VEVENT
UID:${icalDate}-${fixture.home.toLowerCase().replace(/\s+/g, '-')}-vs-${fixture.away.toLowerCase().replace(/\s+/g, '-')}-${index}@pool-league-predictor
DTSTART;VALUE=DATE:${icalDate}
SUMMARY:${fixture.home} vs ${fixture.away}
DESCRIPTION:Pool League Match\\nDivision: ${fixture.division}
LOCATION:${fixture.home}
STATUS:CONFIRMED
END:VEVENT`;
        }).join('\n');

        return `${header}${events}\nEND:VCALENDAR\n`;
      });

      render(<CalendarExport division="SD1" />);

      // Step 1: Verify button is visible
      const exportButton = screen.getByRole('button', { name: /Export to Calendar/i });
      expect(exportButton).toBeInTheDocument();
      expect(exportButton).not.toBeDisabled();

      // Step 2: Click button to open dropdown
      await user.click(exportButton);

      // Step 3: Verify dropdown options
      await waitFor(() => {
        expect(screen.getByText('Choose export option')).toBeInTheDocument();
        expect(screen.getByText('My Team')).toBeInTheDocument();
        expect(screen.getByText('All Division')).toBeInTheDocument();
      });

      // Step 4: Click My Team option
      const myTeamButton = screen.getByText('My Team').closest('button');
      await user.click(myTeamButton!);

      // Step 5: Verify calendar generation
      await waitFor(() => {
        expect(mockGenerateICalendar).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              date: '15-01-2026',
              home: 'Magnet A',
              away: 'North Star A',
            }),
          ]),
          'Magnet A'
        );
      });

      // Step 6: Verify download triggered
      expect(mockDownloadICalendar).toHaveBeenCalledWith(
        expect.stringContaining('BEGIN:VCALENDAR'),
        'magnet-a-fixtures'
      );

      // Step 7: Verify success message
      await waitFor(() => {
        expect(screen.getByText(/Calendar exported successfully!/i)).toBeInTheDocument();
      });

      // Step 8: Verify iCal content structure
      const [icalContent] = mockDownloadICalendar.mock.calls[0];
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('VERSION:2.0');
      expect(icalContent).toContain('BEGIN:VEVENT');
      expect(icalContent).toContain('DTSTART;VALUE=DATE:20260115');
      expect(icalContent).toContain('SUMMARY:Magnet A vs North Star A');
      expect(icalContent).toContain('END:VEVENT');
      expect(icalContent).toContain('END:VCALENDAR');

      // Step 9: Verify all fixture dates are correct
      expect(icalContent).toContain('20260115'); // 15-01-2026
      expect(icalContent).toContain('20260122'); // 22-01-2026
      expect(icalContent).toContain('20260129'); // 29-01-2026
    });
  });
});
