const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const UserModel = require('../models/UserModel');
const { query } = require('../config/database');
const { success, error } = require('../utils/helpers');
const logger    = require('../utils/logger');

function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

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

      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);
      const userId = uuidv4();

      const user = await UserModel.create({ id: userId, roleId, username, email, passwordHash, fullName, phone });

      // Create customer profile
      await query(
        `INSERT INTO customers (id, user_id) VALUES ($1, $2)`,
        [uuidv4(), userId]
      );

      const token = signToken({ id: user.id, role: 'customer' });
      logger.info(`New customer registered: ${email}`);

      return success(res, {
        token,
        user: { id: user.id, username: user.username, email: user.email, fullName: user.full_name, role: 'customer' }
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
      const token = signToken(user);

      return success(res, {
        token,
        user: {
          id:       user.id,
          username: user.username,
          email:    user.email,
          fullName: user.full_name,
          avatar:   user.avatar,
          role:     user.role,
        }
      }, 'Login successful.');
    } catch (err) { next(err); }
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id) DO UPDATE SET
           date_of_birth=$3, gender=$4, address=$5, city=$6, province=$7, postal_code=$8, updated_at=NOW()`,
        [uuidv4(), req.user.id, dateOfBirth||null, gender||null, address||null, city||null, province||null, postalCode||null]
      );

      return success(res, { user }, 'Profile updated successfully.');
    } catch (err) { next(err); }
  },

  // PUT /api/auth/change-password
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      const userFull = await query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id]);
      if (!userFull.rows.length) return error(res, 'User not found.', 404);

      const match = await bcrypt.compare(currentPassword, userFull.rows[0].password_hash);
      if (!match) return error(res, 'Current password is incorrect.', 400);

      const newHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS)||12);
      await UserModel.updatePassword(req.user.id, newHash);

      return success(res, {}, 'Password changed successfully.');
    } catch (err) { next(err); }
  },
};

module.exports = authController;
