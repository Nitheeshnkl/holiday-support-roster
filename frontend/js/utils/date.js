const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate YYYY-MM-DD calendar dates without timezone drift.
 */
export function isValidIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function compareIsoDates(a, b) {
  if (!a || !b) return 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function formatIsoDate(value) {
  if (!value) return '—';
  if (!isValidIsoDate(value)) return String(value);
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(dt);
}

export function formatMonthHeading(isoDate) {
  if (!isValidIsoDate(isoDate)) return 'Scheduled dates';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(dt);
}

export function formatDateTimeUtc(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return `${new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(dt)} UTC`;
}

/**
 * Convert an ISO date-time string to a datetime-local input value (UTC-trimmed).
 */
export function toDateTimeLocalValue(isoString) {
  if (!isoString) return '';
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 16);
}

/**
 * Convert a datetime-local string (or empty) to UTC RFC 3339 date-time or null.
 */
export function fromDateTimeLocalValue(localValue) {
  if (!localValue || !String(localValue).trim()) return null;
  const trimmed = String(localValue).trim();
  const dt = new Date(trimmed.endsWith('Z') ? trimmed : `${trimmed}:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}
