import {
  Text,
  Section,
  Row,
  Column,
} from '@react-email/components';
import { BaseEmail } from './BaseEmail';

interface MatchResultsEmailProps {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  division: string;
  frames: number;
  isUserTeam?: boolean;
  unsubscribeUrl?: string;
}

/**
 * Email template for match results notifications
 * Displays final score with team names and match details
 */
export function MatchResultsEmail({
  date,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  division,
  frames,
  isUserTeam = false,
  unsubscribeUrl,
}: MatchResultsEmailProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : null;
  const isDraw = homeScore === awayScore;

  return (
    <BaseEmail
      preview={`Match Result: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Match Result Header */}
      <Section style={resultHeader}>
        <Text style={resultTitle}>Match Result</Text>
        {isUserTeam && (
          <Text style={myTeamBadge}>⭐ Your Team</Text>
        )}
      </Section>

      {/* Score Display */}
      <Section style={scoreSection}>
        <Row>
          <Column style={teamColumn}>
            <Text style={teamName}>{homeTeam}</Text>
            <Text style={teamLabel}>Home</Text>
          </Column>
          <Column style={scoreColumn}>
            <Text style={scoreText}>
              {homeScore} - {awayScore}
            </Text>
            {isDraw ? (
              <Text style={resultLabel}>Draw</Text>
            ) : (
              <Text style={resultLabel}>
                {winner === homeTeam ? 'Home Win' : 'Away Win'}
              </Text>
            )}
          </Column>
          <Column style={teamColumn}>
            <Text style={teamName}>{awayTeam}</Text>
            <Text style={teamLabel}>Away</Text>
          </Column>
        </Row>
      </Section>

      {/* Match Details */}
      <Section style={detailsSection}>
        <Text style={detailRow}>
          <span style={detailLabel}>Division:</span> {division}
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Date:</span> {formattedDate}
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Frames Played:</span> {frames}
        </Text>
      </Section>

      {/* Call to Action */}
      <Section style={ctaSection}>
        <Text style={ctaText}>
          View full match details and player stats in the app.
        </Text>
      </Section>
    </BaseEmail>
  );
}

// Styles optimized for email clients
const resultHeader = {
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const resultTitle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 8px',
  lineHeight: '1.2',
};

const myTeamBadge = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#1e40af',
  backgroundColor: '#dbeafe',
  padding: '4px 12px',
  borderRadius: '12px',
  margin: '0',
};

const scoreSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
  border: '1px solid #e5e7eb',
};

const teamColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  width: '35%',
};

const scoreColumn = {
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  width: '30%',
};

const teamName = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 4px',
  lineHeight: '1.3',
};

const teamLabel = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0',
  textTransform: 'uppercase' as const,
  fontWeight: '500',
  letterSpacing: '0.5px',
};

const scoreText = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#1e40af',
  margin: '0 0 4px',
  lineHeight: '1.2',
};

const resultLabel = {
  fontSize: '12px',
  color: '#059669',
  margin: '0',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const detailsSection = {
  padding: '16px 0',
  borderTop: '1px solid #e5e7eb',
  borderBottom: '1px solid #e5e7eb',
  marginBottom: '24px',
};

const detailRow = {
  fontSize: '14px',
  color: '#374151',
  margin: '0 0 8px',
  lineHeight: '1.5',
};

const detailLabel = {
  fontWeight: '600',
  color: '#111827',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '16px 0',
};

const ctaText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.5',
};

export default MatchResultsEmail;
