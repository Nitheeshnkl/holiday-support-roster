const textEncoder = new TextEncoder();

export function utf8ByteLength(value) {
  return textEncoder.encode(String(value ?? '')).length;
}

/**
 * Generate a fresh 8..128 character Idempotency-Key per command invocation.
 */
export function generateIdempotencyKey(prefix = 'roster') {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  const bytes = new Uint8Array(16);
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${hex}`;
}

export function formatEnumLabel(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');
}

export function formatPageSummary(page) {
  if (!page || typeof page !== 'object') return '';
  const total = Number(page.totalElements ?? 0);
  const number = Number(page.number ?? 0);
  const size = Number(page.size ?? 25);
  if (total === 0) return '0 items';
  const start = number * size + 1;
  const end = Math.min((number + 1) * size, total);
  return `Showing ${start}–${end} of ${total}`;
}

export function buildFieldLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}
