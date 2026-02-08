import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components';

interface BaseEmailProps {
  preview: string;
  children: React.ReactNode;
  unsubscribeUrl?: string;
}

/**
 * Base email template with branding and consistent layout
 * Provides header, footer, and unsubscribe link for all emails
 */
export function BaseEmail({ preview, children, unsubscribeUrl }: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with branding */}
          <Section style={header}>
            <Text style={title}>🎱 Pool League Predictor</Text>
            <Text style={subtitle}>Stay Updated with Your League</Text>
          </Section>

          {/* Main content */}
          <Section style={content}>
            {children}
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent because you opted in to receive notifications from Pool League Predictor.
            </Text>
            {unsubscribeUrl && (
              <Text style={footerText}>
                Don't want these emails?{' '}
                <Link href={unsubscribeUrl} style={unsubscribeLink}>
                  Unsubscribe here
                </Link>
              </Text>
            )}
            <Text style={footerCopyright}>
              © {new Date().getFullYear()} Pool League Predictor. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles optimized for email clients
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px 24px',
  backgroundColor: '#1e40af',
  textAlign: 'center' as const,
};

const title = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 8px',
  lineHeight: '1.2',
};

const subtitle = {
  fontSize: '14px',
  color: '#93c5fd',
  margin: '0',
  fontWeight: '500',
};

const content = {
  padding: '24px 24px 40px',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '0',
};

const footer = {
  padding: '24px 24px 0',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  color: '#6b7280',
  lineHeight: '1.5',
  margin: '0 0 8px',
};

const footerCopyright = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: '1.5',
  margin: '16px 0 0',
};

const unsubscribeLink = {
  color: '#1e40af',
  textDecoration: 'underline',
};

export default BaseEmail;
