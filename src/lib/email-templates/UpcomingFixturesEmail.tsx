import {
  Text,
  Section,
  Row,
  Column,
} from '@react-email/components';
import { BaseEmail } from './BaseEmail';

interface Fixture {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  venue?: string;
  isUserTeam?: boolean;
}

interface UpcomingFixturesEmailProps {
  fixtures: Fixture[];
  weekRange?: string;
  unsubscribeUrl?: string;
}

/**
 * Email template for upcoming fixtures notifications
 * Displays a list of scheduled matches with dates and teams
 */
export function UpcomingFixturesEmail({
  fixtures,
  weekRange,
  unsubscribeUrl,
}: UpcomingFixturesEmailProps) {
  const fixtureCount = fixtures.length;
  const previewText = weekRange
    ? `${fixtureCount} upcoming ${fixtureCount === 1 ? 'fixture' : 'fixtures'} - ${weekRange}`
    : `${fixtureCount} upcoming ${fixtureCount === 1 ? 'fixture' : 'fixtures'}`;

  return (
    <BaseEmail
      preview={previewText}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Fixtures Header */}
      <Section style={fixturesHeader}>
        <Text style={fixturesTitle}>Upcoming Fixtures</Text>
        {weekRange && (
          <Text style={weekRangeText}>{weekRange}</Text>
        )}
      </Section>

      {/* Intro Text */}
      <Section style={introSection}>
        <Text style={introText}>
          {fixtureCount === 1
            ? "You have 1 upcoming fixture scheduled:"
            : `You have ${fixtureCount} upcoming fixtures scheduled:`}
        </Text>
      </Section>

      {/* Fixtures List */}
      {fixtures.map((fixture) => {
        const formattedDate = new Date(fixture.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const formattedTime = new Date(fixture.date).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        return (
          <Section key={fixture.id} style={fixtureCard}>
            {/* Date/Time Badge */}
            <Section style={dateSection}>
              <Text style={dateText}>{formattedDate}</Text>
              <Text style={timeText}>{formattedTime}</Text>
            </Section>

            {/* Teams Display */}
            <Section style={teamsSection}>
              <Row>
                <Column style={teamColumn}>
                  <Text style={teamName}>{fixture.homeTeam}</Text>
                  <Text style={teamLabel}>Home</Text>
                </Column>
                <Column style={vsColumn}>
                  <Text style={vsText}>vs</Text>
                </Column>
                <Column style={teamColumn}>
                  <Text style={teamName}>{fixture.awayTeam}</Text>
                  <Text style={teamLabel}>Away</Text>
                </Column>
              </Row>
            </Section>

            {/* Match Details */}
            <Section style={fixtureDetails}>
              <Text style={detailRow}>
                <span style={detailLabel}>Division:</span> {fixture.division}
              </Text>
              {fixture.venue && (
                <Text style={detailRow}>
                  <span style={detailLabel}>Venue:</span> {fixture.venue}
                </Text>
              )}
              {fixture.isUserTeam && (
                <Text style={myTeamBadge}>⭐ Your Team Playing</Text>
              )}
            </Section>
          </Section>
        );
      })}

      {/* Call to Action */}
      <Section style={ctaSection}>
        <Text style={ctaText}>
          View complete fixture schedule and team details in the app.
        </Text>
      </Section>
    </BaseEmail>
  );
}

// Styles optimized for email clients
const fixturesHeader = {
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const fixturesTitle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 8px',
  lineHeight: '1.2',
};

const weekRangeText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
  fontWeight: '500',
};

const introSection = {
  marginBottom: '20px',
};

const introText = {
  fontSize: '16px',
  color: '#374151',
  margin: '0',
  lineHeight: '1.5',
};

const fixtureCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '16px',
  border: '1px solid #e5e7eb',
};

const dateSection = {
  marginBottom: '12px',
  textAlign: 'center' as const,
  backgroundColor: '#1e40af',
  borderRadius: '6px',
  padding: '8px 12px',
};

const dateText = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#ffffff',
  margin: '0 0 2px',
  lineHeight: '1.3',
};

const timeText = {
  fontSize: '12px',
  color: '#93c5fd',
  margin: '0',
  fontWeight: '500',
};

const teamsSection = {
  marginBottom: '12px',
};

const teamColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  width: '42%',
};

const vsColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  width: '16%',
};

const teamName = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 4px',
  lineHeight: '1.3',
};

const teamLabel = {
  fontSize: '11px',
  color: '#6b7280',
  margin: '0',
  textTransform: 'uppercase' as const,
  fontWeight: '500',
  letterSpacing: '0.5px',
};

const vsText = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#9ca3af',
  margin: '0',
  lineHeight: '1.3',
};

const fixtureDetails = {
  paddingTop: '12px',
  borderTop: '1px solid #e5e7eb',
};

const detailRow = {
  fontSize: '13px',
  color: '#374151',
  margin: '0 0 6px',
  lineHeight: '1.5',
};

const detailLabel = {
  fontWeight: '600',
  color: '#111827',
};

const myTeamBadge = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: '600',
  color: '#1e40af',
  backgroundColor: '#dbeafe',
  padding: '4px 10px',
  borderRadius: '10px',
  margin: '8px 0 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '16px 0 0',
};

const ctaText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.5',
};

export default UpcomingFixturesEmail;
