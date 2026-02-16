import { CHALK_DEFAULTS } from './constants';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 to avoid confusion

export function generateShortCode(): string {
  const code = Array.from({ length: CHALK_DEFAULTS.SHORT_CODE_LENGTH }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
  return `${CHALK_DEFAULTS.SHORT_CODE_PREFIX}-${code}`;
}

export function isValidShortCode(code: string): boolean {
  const pattern = new RegExp(
    `^${CHALK_DEFAULTS.SHORT_CODE_PREFIX}-[A-HJ-NP-Z2-9]{${CHALK_DEFAULTS.SHORT_CODE_LENGTH}}$`
  );
  return pattern.test(code.toUpperCase());
}

export function normalizeShortCode(code: string): string {
  return code.toUpperCase().trim();
}
