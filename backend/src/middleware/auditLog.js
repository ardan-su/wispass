/**
 * Audit Log Middleware
 * Writes to audit_logs table for destructive/sensitive operations.
 */
const { v4: uuid } = require('uuid');
const { query }    = require('../config/database');

/**
 * Factory – wraps a controller to auto-log after success.
 * @param {string} action  e.g. 'delete', 'update', 'create'
 * @param {string} module  e.g. 'qr', 'users', 'tickets'
 * @param {function} entityIdFn  (req) => id string
 */
function auditLog(action, module, entityIdFn = null) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      try {
        if (body && body.success !== false) {
          const entityId = entityIdFn ? entityIdFn(req) : req.params?.id || null;
          await query(
            `INSERT INTO audit_logs (id, user_id, action, module, entity_id, ip_address, user_agent)
             VALUES (?,?,?,?,?,?,?)`,
            [
              uuid(),
              req.user?.id || null,
              action,
              module,
              entityId,
              req.ip,
              req.headers['user-agent']?.substring(0, 499) || null,
            ]
          );
        }
      } catch (e) {
        // Non-fatal: log but don't block response
        console.error('Audit log error:', e.message);
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = auditLog;
