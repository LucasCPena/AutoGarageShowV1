import { describe, it, expect } from 'vitest';
import { normalizeOverride } from '../useListingOverrides';

describe('normalizeOverride', () => {
  it('parses boolean and string fields and numeric order', () => {
    const out = normalizeOverride('abc', { isFeatured: true, featuredUntil: '2026-03-01T00:00:00Z', order: '5' });
    expect(out.id).toBe('abc');
    expect(out.isFeatured).toBe(true);
    expect(out.featuredUntil).toBe('2026-03-01T00:00:00Z');
    expect(out.order).toBe(5);
  });

  it('handles null order and missing fields', () => {
    const out = normalizeOverride('x', { order: null });
    expect(out.order).toBeNull();
    expect(out.id).toBe('x');
  });
});
