const UNIT_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
} as const;

/**
 * Parses a duration such as "15m", "7d", "3600s" or "900" (seconds) into milliseconds.
 */
export function parseDuration(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: "${value}"`);
  const amount = Number(match[1]);
  const unit = (match[2] ?? 's') as keyof typeof UNIT_MS;
  return amount * UNIT_MS[unit];
}
