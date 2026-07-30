/**
 * User Model – MariaDB
 * All PostgreSQL $N placeholders replaced with ?
 * RETURNING * → separate SELECT
 * ILIKE → LIKE (utf8mb4 is case-insensitive by default)
 * ON CONFLICT → ON DUPLICATE KEY
 */
const { query } = require('../../config/database');

const UserModel = {
  async findByEmail(email) {
    const rows = await query(
      `SELECT u.*, r.name AS role FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.email = ? AND u.deleted_at IS NULL`,
      [email]
    );
    return rows[0] || null;
  },

  async findByUsername(username) {
    const rows = await query(
      `SELECT u.*, r.name AS role FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.username = ? AND u.deleted_at IS NULL`,
      [username]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar, u.is_active,
              u.last_login_at, u.created_at, r.name AS role, r.id AS role_id
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  async findWithCustomer(userId) {
    const rows = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar, u.is_active,
              u.last_login_at, u.created_at, r.name AS role,
              c.id AS customer_id, c.date_of_birth, c.gender,
              c.address, c.city, c.province, c.postal_code, c.id_number
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN customers c ON c.user_id = u.id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [userId]
    );
    return rows[0] || null;
  },

  async create({ id, roleId, username, email, passwordHash, fullName, phone }) {
    await query(
      `INSERT INTO users (id, role_id, username, email, password_hash, full_name, phone)
       VALUES (?,?,?,?,?,?,?)`,
      [id, roleId, username, email, passwordHash, fullName, phone]
    );
    return this.findById(id);
  },

  async updateLastLogin(id) {
    await query(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [id]);
  },

  async updateProfile(id, { fullName, phone, avatar }) {
    const sets   = [];
    const params = [];
    if (fullName !== undefined) { sets.push('full_name = ?'); params.push(fullName ?? null); }
    if (phone    !== undefined) { sets.push('phone = ?');     params.push(phone ?? null); }
    if (avatar   !== undefined) { sets.push('avatar = ?');    params.push(avatar ?? null); }
    if (!sets.length) return this.findById(id);
    params.push(id);
    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  },

  async updatePassword(id, passwordHash) {
    await query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, id]);
  },

  async setActive(id, isActive) {
    await query(`UPDATE users SET is_active = ? WHERE id = ?`, [isActive ? 1 : 0, id]);
  },

  async softDelete(id) {
    await query(`UPDATE users SET deleted_at = NOW() WHERE id = ?`, [id]);
  },

  async getRoleId(roleName) {
    const rows = await query(`SELECT id FROM roles WHERE name = ?`, [roleName]);
    return rows[0]?.id || null;
  },

  async list({ limit, offset, search, role }) {
    let sql    = `
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active,
             u.last_login_at, u.created_at, r.name AS role
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL`;
    let countSql = `SELECT COUNT(*) AS total FROM users u JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL`;
    const params = [];
    const countParams = [];

    if (search) {
      const clause = ` AND (u.email LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)`;
      const like   = `%${search}%`;
      sql      += clause;
      countSql += clause;
      params.push(like, like, like);
      countParams.push(like, like, like);
    }
    if (role) {
      const clause = ` AND r.name = ?`;
      sql      += clause;
      countSql += clause;
      params.push(role);
      countParams.push(role);
    }

    const countRows = await query(countSql, countParams);
    const total     = parseInt(countRows[0].total);

    sql += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const rows = await query(sql, params);
    return { rows, total };
  },
};

module.exports = UserModel;
