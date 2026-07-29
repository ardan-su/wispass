const { query, getClient } = require('../config/database');

const UserModel = {
  async findByEmail(email) {
    const { rows } = await query(
      `SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = $1`,
      [email]
    );
    return rows[0] || null;
  },

  async findByUsername(username) {
    const { rows } = await query(
      `SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.username = $1`,
      [username]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar, u.is_active,
              u.last_login_at, u.created_at, r.name AS role, r.id AS role_id
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async findWithCustomer(userId) {
    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar, u.is_active,
              u.last_login_at, u.created_at, r.name AS role,
              c.id AS customer_id, c.date_of_birth, c.gender,
              c.address, c.city, c.province, c.postal_code, c.id_number
       FROM users u
       JOIN roles r    ON r.id = u.role_id
       LEFT JOIN customers c ON c.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    return rows[0] || null;
  },

  async create({ id, roleId, username, email, passwordHash, fullName, phone }) {
    const { rows } = await query(
      `INSERT INTO users (id, role_id, username, email, password_hash, full_name, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, roleId, username, email, passwordHash, fullName, phone]
    );
    return rows[0];
  },

  async updateLastLogin(id) {
    await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [id]);
  },

  async updateProfile(id, { fullName, phone, avatar }) {
    const { rows } = await query(
      `UPDATE users SET full_name=$1, phone=$2, avatar=COALESCE($3, avatar), updated_at=NOW()
       WHERE id=$4 RETURNING id, username, email, full_name, phone, avatar`,
      [fullName, phone, avatar, id]
    );
    return rows[0];
  },

  async updatePassword(id, passwordHash) {
    await query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [passwordHash, id]);
  },

  async setActive(id, isActive) {
    await query(`UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2`, [isActive, id]);
  },

  async getRoleId(roleName) {
    const { rows } = await query(`SELECT id FROM roles WHERE name=$1`, [roleName]);
    return rows[0]?.id || null;
  },

  async list({ limit, offset, search, role }) {
    let sql = `
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active,
             u.last_login_at, u.created_at, r.name AS role
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE 1=1`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR u.username ILIKE $${params.length})`;
    }
    if (role) {
      params.push(role);
      sql += ` AND r.name = $${params.length}`;
    }
    const countSql = sql.replace(
      'SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active,\n             u.last_login_at, u.created_at, r.name AS role',
      'SELECT COUNT(*) AS total'
    );
    const { rows: countRows } = await query(countSql, params);
    const total = parseInt(countRows[0].total);

    params.push(limit, offset);
    sql += ` ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const { rows } = await query(sql, params);
    return { rows, total };
  },
};

module.exports = UserModel;
