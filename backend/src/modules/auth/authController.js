/**
 * Auth Controller – MariaDB edition
 * Supports login, register, refresh token, profile update, password change
 */
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const UserModel = require('../users/UserModel');
const { query }  = require('../../config/database');
const { signAccess, signRefresh, verifyRefresh } = require('../../config/jwt');
const { success, error } = require('../../utils/helpers');
const logger = require('../../utils/logger');

const authController = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { username, email, password, fullName, phone } = req.body;

      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) return error(res, 'Email is already registered.', 409);

      const existingUser = await UserModel.findByUsername(username);
      if (existingUser) return error(res, 'Username is already taken.', 409);

      const roleId = await UserModel.getRoleId('customer');
      if (!roleId) return error(res, 'Customer role not found. Run seed first.', 500);

      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      const userId = uuid();

      const user = await UserModel.create({ id: userId, roleId, username, email, passwordHash, fullName, phone });

      // Create customer profile
      await query(`INSERT IGNORE INTO customers (id, user_id) VALUES (?, ?)`, [uuid(), userId]);

      const accessToken  = signAccess({ userId: user.id, role: 'customer' });
      const refreshToken = signRefresh({ userId: user.id });
      logger.info(`New customer registered: ${email}`);

      return success(res, {
        accessToken,
        refreshToken,
        user: { id: user.id, username: user.username, email: user.email, fullName: user.full_name, role: 'customer' },
      }, 'Registration successful.', 201);
    } catch (err) { next(err); }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) return error(res, 'Invalid email or password.', 401);
      if (!user.is_active) return error(res, 'Account is deactivated.', 403);

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return error(res, 'Invalid email or password.', 401);

      await UserModel.updateLastLogin(user.id);
      const accessToken  = signAccess({ userId: user.id, role: user.role });
      const refreshToken = signRefresh({ userId: user.id });

      logger.info(`Login: ${email} (${user.role})`);

      return success(res, {
        accessToken,
        refreshToken,
        // Legacy alias for existing frontend
        token: accessToken,
        user: {
          id:       user.id,
          username: user.username,
          email:    user.email,
          fullName: user.full_name,
          avatar:   user.avatar,
          role:     user.role,
        },
      }, 'Login successful.');
    } catch (err) { next(err); }
  },

  // POST /api/auth/refresh
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return error(res, 'Refresh token required.', 400);

      const decoded = verifyRefresh(refreshToken);
      const user    = await UserModel.findById(decoded.userId);
      if (!user || !user.is_active) return error(res, 'Invalid refresh token.', 401);

      const newAccess  = signAccess({ userId: user.id, role: user.role });
      const newRefresh = signRefresh({ userId: user.id });

      return success(res, { accessToken: newAccess, refreshToken: newRefresh, token: newAccess }, 'Token refreshed.');
    } catch (err) {
      if (err.name === 'TokenExpiredError') return error(res, 'Refresh token expired. Please log in again.', 401);
      next(err);
    }
  },

  // GET /api/auth/me
  async me(req, res, next) {
    try {
      const user = await UserModel.findWithCustomer(req.user.id);
      if (!user) return error(res, 'User not found.', 404);
      return success(res, { user });
    } catch (err) { next(err); }
  },

  // PUT /api/auth/profile
  async updateProfile(req, res, next) {
    try {
      const { fullName, phone, dateOfBirth, gender, address, city, province, postalCode } = req.body;
      const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

      const user = await UserModel.updateProfile(req.user.id, { fullName, phone, avatar: avatarPath });

      // Upsert customer profile
      await query(
        `INSERT INTO customers (id, user_id, date_of_birth, gender, address, city, province, postal_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           date_of_birth=VALUES(date_of_birth), gender=VALUES(gender),
           address=VALUES(address), city=VALUES(city),
           province=VALUES(province), postal_code=VALUES(postal_code)`,
        [uuid(), req.user.id, dateOfBirth || null, gender || null,
         address || null, city || null, province || null, postalCode || null]
      );

      return success(res, { user }, 'Profile updated successfully.');
    } catch (err) { next(err); }
  },

  // PUT /api/auth/change-password
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      const rows = await query(`SELECT password_hash FROM users WHERE id = ?`, [req.user.id]);
      if (!rows.length) return error(res, 'User not found.', 404);

      const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!match) return error(res, 'Current password is incorrect.', 400);

      const newHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      await UserModel.updatePassword(req.user.id, newHash);

      return success(res, {}, 'Password changed successfully.');
    } catch (err) { next(err); }
  },
};

module.exports = authController;
