const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = {
  // Create a new user
  async create({ name, email, password, role = 'customer' }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, role) 
       VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, role]
    );
    return this.findById(result.insertId);
  },

  // Find user by email (only active users)
  async findByEmail(email) {
    const [rows] = await pool.execute(`SELECT * FROM users WHERE email = ? AND active = TRUE`, [
      email,
    ]);
    return rows[0] || null;
  },

  // Find user by ID (only active users)
  async findById(id) {
    const [rows] = await pool.execute(`SELECT * FROM users WHERE id = ? AND active = TRUE`, [id]);
    return rows[0] || null;
  },

  // Validate password
  async correctPassword(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
  },

  // Generate and store password reset token
  async createPasswordResetToken(email) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await pool.execute(
      `UPDATE users SET password_reset_token = ?, password_reset_expires = ?, password_changed_at = NULL WHERE email = ?`,
      [hashedToken, expiresAt, email]
    );

    return resetToken;
  },

  // Find user by reset token
  async findByResetToken(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await pool.execute(
      `SELECT * FROM users 
       WHERE password_reset_token = ? 
       AND password_reset_expires > NOW() 
       AND active = TRUE`,
      [hashedToken]
    );
    return rows[0] || null;
  },

  // Update user password
  async updatePassword(id, password) {
    const hashedPassword = await bcrypt.hash(password, 12);
    await pool.execute(
      `UPDATE users 
       SET password = ?, 
           password_reset_token = NULL, 
           password_reset_expires = NULL,
           password_changed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND active = TRUE`,
      [hashedPassword, id]
    );
  },

  // JWT token validation helper (for auth.js)
  changedPasswordAfter(JWTTimestamp) {
    if (this.password_changed_at) {
      const changedTimestamp = parseInt(new Date(this.password_changed_at).getTime() / 1000, 10);
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  },

  // Get all active users
  async getAll() {
    const [rows] = await pool.execute(
      `SELECT id, name, email, role, created_at, updated_at 
       FROM users WHERE active = TRUE`
    );
    return rows;
  },

  // Update a user by ID
  async findByIdAndUpdate(id, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    values.push(id);

    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND active = TRUE`,
      values
    );
    return this.findById(id);
  },

  // Soft delete (deactivate) user
  async findByIdAndDelete(id) {
    await pool.execute(`UPDATE users SET active = FALSE WHERE id = ?`, [id]);
  },

  // Set email verification token
  async setEmailVerificationToken(email) {
    const token = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    await pool.execute(`UPDATE users SET verification_token = ? WHERE email = ?`, [hashed, email]);
    return token;
  },

  // Verify email
  async verifyEmail(token) {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE verification_token = ? AND active = TRUE`,
      [hashed]
    );
    const user = rows[0];
    if (user) {
      await pool.execute(
        `UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = ?`,
        [user.id]
      );
    }
    return user || null;
  },
};

module.exports = User;
