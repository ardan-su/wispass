// Feature: wisatapass-refactor, Property tests for auth utilities
'use strict';
const fc = require('fast-check');

// Mock database before any module that imports it is loaded
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  pool: { end: jest.fn() },
}));

const { signAccess, verifyAccess, signRefresh, verifyRefresh } = require('../src/config/jwt');
const { requirePermission } = require('../src/middleware/auth');
const db = require('../src/config/database');

describe('Auth – Property-Based Tests', () => {

  // Property 10: JWT access token round-trip preserves userId
  test('Property 10: JWT access token round-trip preserves userId', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom('admin', 'owner', 'gate_officer', 'customer', 'cashier'),
        (userId, role) => {
          const token   = signAccess({ userId, role });
          const decoded = verifyAccess(token);
          expect(decoded.userId).toBe(userId);
          expect(decoded.role).toBe(role);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 10b: Refresh token round-trip
  test('Property 10b: JWT refresh token round-trip preserves userId', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          const token   = signRefresh({ userId });
          const decoded = verifyRefresh(token);
          expect(decoded.userId).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 12: requirePermission rejects users without the required permission
  test('Property 12: requirePermission returns 403 for user without permission', async () => {
    const permission = 'qr:generate';
    const middleware = requirePermission(permission);

    // Mock a request where the DB query returns empty rows (no permission)
    const mockReq = {
      user: { id: 'user-1', role: 'viewer', role_id: 7 },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json:   jest.fn(),
    };

    // Patch the database query to return empty rows
    const db = require('../src/config/database');
    const originalQuery = db.query;
    db.query = jest.fn().mockResolvedValue([]);  // no permission rows

    const nextFn = jest.fn();
    await middleware(mockReq, mockRes, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(nextFn).not.toHaveBeenCalled();

    // Restore
    db.query = originalQuery;
  });

  test('Property 12b: requirePermission calls next() when permission exists', async () => {
    const permission = 'qr:scan';
    const middleware = requirePermission(permission);

    const mockReq = {
      user: { id: 'user-2', role: 'gate_officer', role_id: 4 },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json:   jest.fn(),
    };

    const db = require('../src/config/database');
    const originalQuery = db.query;
    db.query = jest.fn().mockResolvedValue([{ 1: 1 }]);  // permission exists

    const nextFn = jest.fn();
    await middleware(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();

    db.query = originalQuery;
  });
});
