/**
 * JWT Authentication & Role-Based Authorization Middleware
 */
const jwt    = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Verify JWT token and attach user to req.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.avatar, u.is_active,
              r.name AS role
       FROM   users u
       JOIN   roles r ON r.id = u.role_id
       WHERE  u.id = $1`,
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
 * Require a specific role (or one of several roles).
 * Usage: authorize('admin') or authorize('admin', 'customer')
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
 * Optional authentication – attaches user if token present, continues otherwise.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.avatar, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [decoded.userId]
    );
    if (rows.length) req.user = rows[0];
  } catch (_) { /* ignore */ }
  next();
}

module.exports = { authenticate, authorize, optionalAuth };
