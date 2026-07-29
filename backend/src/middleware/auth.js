/**
 * JWT Authentication & Role-Based Authorization Middleware
 * MariaDB edition – uses ? placeholders
 */
const jwt    = require('jsonwebtoken');
const { query } = require('../config/database');

const ROLES_HIERARCHY = {
  owner:        8,
  super_admin:  7,
  admin:        6,
  cashier:      5,
  gate_officer: 4,
  marketing:    3,
  viewer:       2,
  customer:     1,
};

/**
 * Verify JWT and attach req.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required.' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const rows = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.avatar, u.is_active,
              r.name AS role, r.id AS role_id
       FROM   users u
       JOIN   roles r ON r.id = u.role_id
       WHERE  u.id = ? AND u.deleted_at IS NULL`,
      [decoded.userId]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    next(err);
  }
}

/**
 * Require one of the specified roles.
 * Usage: authorize('admin') or authorize('owner', 'admin')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Require minimum role level in the hierarchy.
 * e.g. requireLevel('admin') allows admin, super_admin, owner
 */
function requireLevel(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    const userLevel = ROLES_HIERARCHY[req.user.role] || 0;
    const minLevel  = ROLES_HIERARCHY[minRole]       || 0;
    if (userLevel < minLevel) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Permission-based authorization using the role_permissions table.
 * Usage: requirePermission('qr:scan')
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    try {
      const rows = await query(
        `SELECT 1
         FROM   role_permissions rp
         JOIN   permissions p ON p.id = rp.permission_id
         WHERE  rp.role_id = ? AND p.name = ?`,
        [req.user.role_id, permission]
      );
      if (!rows.length) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Optional authentication – attaches user if token present, continues otherwise.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const rows = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.avatar, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [decoded.userId]
    );
    if (rows.length) req.user = rows[0];
  } catch (_) { /* ignore */ }
  next();
}

module.exports = { authenticate, authorize, requireLevel, requirePermission, optionalAuth, ROLES_HIERARCHY };
