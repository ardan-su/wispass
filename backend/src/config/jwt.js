/**
 * JWT Configuration & Helpers
 */
const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET         || 'wisatapass_jwt_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'wisatapass_refresh_secret';
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN     || '7d';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}

function signRefresh(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
}

function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
