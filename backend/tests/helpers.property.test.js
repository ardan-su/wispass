// Feature: wisatapass-refactor, Property tests for backend utilities
'use strict';
const fc = require('fast-check');
const { getPagination, sanitize } = require('../src/utils/helpers');

describe('Helpers – Property-Based Tests', () => {

  // Property 8: Pagination offset is always (page - 1) × limit
  test('Property 8: Pagination offset is always (page - 1) × limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        (page, limit) => {
          const result = getPagination({ page: String(page), limit: String(limit) });
          expect(result.offset).toBe((page - 1) * result.limit);
          expect(result.page).toBe(page);
          expect(result.limit).toBeGreaterThanOrEqual(1);
          expect(result.limit).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 9: sanitize strips all HTML tags
  test('Property 9: sanitize strips all HTML tags', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (s) => {
          const result = sanitize(s);
          // Result must not contain any HTML tags
          expect(result).not.toMatch(/<[^>]*>/);
          // Result must be a string
          expect(typeof result).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9b: sanitize is idempotent on already-clean strings', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !/<[^>]*>/.test(s)),
        (s) => {
          const once  = sanitize(s);
          const twice = sanitize(once);
          expect(twice).toBe(once);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sanitize: non-string input returned unchanged', () => {
    expect(sanitize(42)).toBe(42);
    expect(sanitize(null)).toBe(null);
    expect(sanitize(undefined)).toBe(undefined);
    expect(sanitize([])).toEqual([]);
  });
});
