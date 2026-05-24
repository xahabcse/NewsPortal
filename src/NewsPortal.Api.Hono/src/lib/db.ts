// D1 query helpers — kept tiny on purpose so routes do most of the work inline.

export function nowIso(): string {
  return new Date().toISOString();
}

export function toDbBool(value: boolean | undefined | null): number {
  return value === true ? 1 : 0;
}

export function fromDbBool(value: number | null | undefined): boolean {
  return value === 1;
}

/** Map a SQLite TEXT timestamp to an ISO string (already ISO) or null. */
export function toIso(value: string | null | undefined): string | null {
  return value ?? null;
}

/**
 * Compute LIMIT / OFFSET from page/size with sane caps.
 * Matches the legacy API's [Range(1, 100)] validation.
 */
export function paginate(rawPage: string | undefined, rawSize: string | undefined, defaultSize = 10) {
  const page = Math.max(1, parseInt(rawPage || '1') || 1);
  const size = Math.min(100, Math.max(1, parseInt(rawSize || String(defaultSize)) || defaultSize));
  const offset = (page - 1) * size;
  return { page, size, offset };
}

export type Row = Record<string, any>;
