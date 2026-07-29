// Feature: wisatapass-refactor, Property tests for QR Service
'use strict';
const fc = require('fast-check');

// Load service after env setup (done in setup.js)
const { generateQR, verifyQR } = require('../src/modules/qr/qrService');

// Since encryptPayload/decryptPayload are not exported, we test through generateQR + verifyQR
// which exercises the full encrypt/sign/verify cycle.

describe('QR Service – Property-Based Tests', () => {

  // Property 2: Generated QR always passes signature verification
  test('Property 2: Generated QR always passes verifyQR', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          expiryHours: fc.integer({ min: 1, max: 8760 }),
          siteId:      fc.option(fc.uuid(), { nil: null }),
          branchId:    fc.option(fc.uuid(), { nil: null }),
        }),
        async ({ expiryHours, siteId, branchId }) => {
          const record = await generateQR({
            generatedBy: 'test-user-id',
            siteId,
            branchId,
            expiryHours,
          });
          const result = verifyQR(record.qrData);
          expect(result.valid).toBe(true);
          expect(result.payload).not.toBeNull();
        }
      ),
      { numRuns: 20 } // reduced for CI speed; increase locally
    );
  }, 60000);

  // Property 3: QR expiry is always issuedAt + expiryHours (within tolerance)
  test('Property 3: QR expiry is issuedAt + expiryHours', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 8760 }),
        async (expiryHours) => {
          const before = Date.now();
          const record = await generateQR({ generatedBy: 'test', expiryHours });
          const after  = Date.now();
          const expMs  = new Date(record.expiresAt).getTime();
          const expectedMin = before + expiryHours * 3_600_000;
          const expectedMax = after  + expiryHours * 3_600_000;
          expect(expMs).toBeGreaterThanOrEqual(expectedMin - 1000);
          expect(expMs).toBeLessThanOrEqual(expectedMax + 1000);
        }
      ),
      { numRuns: 30 }
    );
  }, 30000);

  // Property 4: Generated QR image is always a valid PNG data URL
  test('Property 4: QR image is always a valid PNG data URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 48 }),
        async (expiryHours) => {
          const record = await generateQR({ generatedBy: 'test', expiryHours });
          expect(record.qrImage).toMatch(/^data:image\/png;base64,/);
          const base64Part = record.qrImage.replace(/^data:image\/png;base64,/, '');
          expect(base64Part.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  // Property 5: Tampered signature always fails validation
  test('Property 5: Tampered signature always fails validation', async () => {
    // Generate one valid QR to tamper with
    const record = await generateQR({ generatedBy: 'test', expiryHours: 24 });
    const parsed = JSON.parse(record.qrData);

    await fc.assert(
      fc.property(
        fc.integer({ min: 0, max: parsed.s.length - 1 }),
        fc.char(),
        (pos, replacement) => {
          if (replacement === parsed.s[pos]) return true; // skip same char
          const tamperedSig = parsed.s.slice(0, pos) + replacement + parsed.s.slice(pos + 1);
          const tampered = JSON.stringify({ ...parsed, s: tamperedSig });
          const result = verifyQR(tampered);
          expect(result.valid).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  // Property 6: Expired QR always fails validation
  test('Property 6: Expired QR always fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 48 }),
        async (hours) => {
          const record = await generateQR({ generatedBy: 'test', expiryHours: hours });
          const parsed  = JSON.parse(record.qrData);
          // Rewrite exp to a past date
          const pastExp = new Date(Date.now() - 3600000).toISOString();
          const expired = JSON.stringify({ ...parsed, exp: pastExp });
          // The verifyQR will catch it at signature OR expiry level — either valid:false counts
          const result = verifyQR(expired);
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  // Property 7: Branch mismatch always fails validation
  test('Property 7: Branch mismatch always fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        async (branchId1, branchId2) => {
          if (branchId1 === branchId2) return; // skip equal
          const record = await generateQR({ generatedBy: 'test', branchId: branchId1 });
          const result = verifyQR(record.qrData, { expectedBranchId: branchId2 });
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);
});
