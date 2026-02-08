import {
  Text,
  Section,
  Row,
  Column,
} from '@react-email/components';
import { BaseEmail } from './BaseEmail';

interface MatchResult {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  division: string;
  isUserTeam?: boolean;
}

interface UpcomingFixture {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  isUserTeam?: boolean;
}

interface StandingChange {
  teamName: string;
  positionChange: number;
  currentPosition: number;
  division: string;
}

interface WeeklyDigestEmailProps {
  weekRange: string;
  matchResults: MatchResult[];
  upcomingFixtures: UpcomingFixture[];
  standingsChanges?: StandingChange[];
  userTeamName?: string;
  unsubscribeUrl?: string;
}

/**
 * Email template for weekly digest notifications
 * Provides comprehensive weekly summary with results, fixtures, and standings
 */
export function WeeklyDigestEmail({
  weekRange,
  matchResults,
  upcomingFixtures,
  standingsChanges = [],
  userTeamName,
  unsubscribeUrl,
}: WeeklyDigestEmailProps) {
  const hasResults = matchResults.length > 0;
  const hasFixtures = upcomingFixtures.length > 0;
  const hasStandings = standingsChanges.length > 0;

  return (
    <BaseEmail
      preview={`Your weekly league digest for ${weekRange}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Weekly Digest Header */}
      <Section style={digestHeader}>
        <Text style={digestTitle}>📊 Weekly League Digest</Text>
        <Text style={weekRangeText}>{weekRange}</Text>
      </Section>

      {/* Intro Text */}
      <Section style={introSection}>
        <Text style={introText}>
          Here's your weekly summary of league activity{userTeamName ? ` and updates for ${userTeamName}` : ''}.
        </Text>
      </Section>

      {/* Match Results Section */}
      {hasResults && (
        <>
          <Section style={sectionHeader}>
            <Text style={sectionTitle}>🎱 Recent Results</Text>
            <Text style={sectionSubtitle}>
              {matchResults.length} {matchResults.length === 1 ? 'match' : 'matches'} completed this week
            </Text>
          </Section>

          {matchResults.map((result) => {
            const formattedDate = new Date(result.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const winner = result.homeScore > result.awayScore ? result.homeTeam : result.awayScore > result.homeScore ? result.awayTeam : null;
            const isDraw = result.homeScore === result.awayScore;

            return (
              <Section key={result.id} style={resultCard}>
                <Row>
                  <Column style={resultTeamColumn}>
                    <Text style={resultTeamName}>{result.homeTeam}</Text>
                  </Column>
                  <Column style={resultScoreColumn}>
                    <Text style={resultScoreText}>
                      {result.homeScore} - {result.awayScore}
                    </Text>
                  </Column>
                  <Column style={resultTeamColumn}>
                    <Text style={resultTeamName}>{result.awayTeam}</Text>
                  </Column>
                </Row>
                <Row>
                  <Column style={resultMetaColumn}>
                    <Text style={resultMetaText}>
                      {formattedDate} • {result.division}
                      {result.isUserTeam && <span style={inlineBadge}> ⭐ Your Team</span>}
                    </Text>
                    {!isDraw && winner && (
                      <Text style={resultWinnerText}>Winner: {winner}</Text>
                    )}
                    {isDraw && (
                      <Text style={resultDrawText}>Draw</Text>
                    )}
                  </Column>
                </Row>
              </Section>
            );
          })}
        </>
      )}

      {/* Upcoming Fixtures Section */}
      {hasFixtures && (
        <>
          <Section style={sectionHeader}>
            <Text style={sectionTitle}>📅 This Week's Fixtures</Text>
            <Text style={sectionSubtitle}>
              {upcomingFixtures.length} upcoming {upcomingFixtures.length === 1 ? 'match' : 'matches'}
            </Text>
          </Section>

          {upcomingFixtures.map((fixture) => {
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
                <Row>
                  <Column style={fixtureTeamColumn}>
                    <Text style={fixtureTeamName}>{fixture.homeTeam}</Text>
                  </Column>
                  <Column style={fixtureVsColumn}>
                    <Text style={fixtureVsText}>vs</Text>
                  </Column>
                  <Column style={fixtureTeamColumn}>
                    <Text style={fixtureTeamName}>{fixture.awayTeam}</Text>
                  </Column>
                </Row>
                <Row>
                  <Column style={fixtureMetaColumn}>
                    <Text style={fixtureMetaText}>
                      {formattedDate} at {formattedTime} • {fixture.division}
                      {fixture.isUserTeam && <span style={inlineBadge}> ⭐ Your Team</span>}
                    </Text>
                  </Column>
                </Row>
              </Section>
            );
          })}
        </>
      )}

      {/* Standings Changes Section */}
      {hasStandings && (
        <>
          <Section style={sectionHeader}>
            <Text style={sectionTitle}>📈 Standings Highlights</Text>
            <Text style={sectionSubtitle}>
              Notable position changes this week
            </Text>
          </Section>

          <Section style={standingsCard}>
            {standingsChanges.map((change, index) => {
              const isUp = change.positionChange > 0;
              const arrow = isUp ? '⬆️' : '⬇️';
              const changeText = isUp ? `Up ${change.positionChange}` : `Down ${Math.abs(change.positionChange)}`;

              return (
                <Section key={index} style={standingRow}>
                  <Text style={standingTeamText}>
                    {change.teamName}
                    {change.teamName === userTeamName && <span style={inlineBadge}> ⭐</span>}
                  </Text>
                  <Text style={standingChangeText}>
                    {arrow} {changeText} • Now #{change.currentPosition} in {change.division}
                  </Text>
                </Section>
              );
            })}
          </Section>
        </>
      )}

      {/* No Activity Message */}
      {!hasResults && !hasFixtures && !hasStandings && (
        <Section style={noActivitySection}>
          <Text style={noActivityText}>
            No league activity this week. Check back next week for updates!
          </Text>
        </Section>
      )}

      {/* Call to Action */}
      <Section style={ctaSection}>
        <Text style={ctaText}>
          Open the Pool League Predictor app to view detailed stats, player performance, and predictions.
        </Text>
      </Section>
    </BaseEmail>
  );
}

// Styles optimized for email clients
const digestHeader = {
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const digestTitle = {
  fontSize: '26px',
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
  marginBottom: '28px',
  paddingBottom: '20px',
  borderBottom: '2px solid #e5e7eb',
};

const introText = {
  fontSize: '16px',
  color: '#374151',
  margin: '0',
  lineHeight: '1.6',
  textAlign: 'center' as const,
};

const sectionHeader = {
  marginTop: '28px',
  marginBottom: '16px',
};

const sectionTitle = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 4px',
  lineHeight: '1.3',
};

const sectionSubtitle = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0',
  fontWeight: '500',
};

// Result card styles
const resultCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
  border: '1px solid #e5e7eb',
};

const resultTeamColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  width: '40%',
};

const resultScoreColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  width: '20%',
};

const resultTeamName = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#111827',
  margin: '0',
  lineHeight: '1.3',
};

const resultScoreText = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#1e40af',
  margin: '0',
  lineHeight: '1.3',
};

const resultMetaColumn = {
  textAlign: 'center' as const,
  width: '100%',
  paddingTop: '8px',
};

const resultMetaText = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 4px',
  lineHeight: '1.4',
};

const resultWinnerText = {
  fontSize: '11px',
  color: '#059669',
  margin: '0',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const resultDrawText = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '0',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

// Fixture card styles
const fixtureCard = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
  border: '1px solid #bfdbfe',
};

const fixtureTeamColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  width: '42%',
};

const fixtureVsColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  width: '16%',
};

const fixtureTeamName = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#111827',
  margin: '0',
  lineHeight: '1.3',
};

const fixtureVsText = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#9ca3af',
  margin: '0',
  lineHeight: '1.3',
};

const fixtureMetaColumn = {
  textAlign: 'center' as const,
  width: '100%',
  paddingTop: '8px',
};

const fixtureMetaText = {
  fontSize: '12px',
  color: '#1e40af',
  margin: '0',
  lineHeight: '1.4',
  fontWeight: '500',
};

// Standings styles
const standingsCard = {
  backgroundColor: '#fefce8',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
  border: '1px solid #fde047',
};

const standingRow = {
  marginBottom: '12px',
  paddingBottom: '12px',
  borderBottom: '1px solid #fde68a',
};

const standingTeamText = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 4px',
  lineHeight: '1.4',
};

const standingChangeText = {
  fontSize: '12px',
  color: '#854d0e',
  margin: '0',
  lineHeight: '1.4',
  fontWeight: '500',
};

// Shared styles
const inlineBadge = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#1e40af',
};

const noActivitySection = {
  textAlign: 'center' as const,
  padding: '32px 20px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  marginTop: '20px',
};

const noActivityText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.5',
  fontStyle: 'italic' as const,
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '24px 0 0',
  marginTop: '28px',
  borderTop: '2px solid #e5e7eb',
};

const ctaText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.6',
};

export default WeeklyDigestEmail;
