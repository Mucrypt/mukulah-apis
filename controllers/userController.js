const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const sendEmail = require('../utils/sendEmail');
require('dotenv').config();

// Generate JWT token
const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    }
  );
};

// Send JWT as cookie and JSON
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user);

  // Remove sensitive fields
  user.password = undefined;
  user.password_reset_token = undefined;
  user.password_reset_expires = undefined;

  // Cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + (Number(process.env.JWT_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const userController = {
  register: async (req, res) => {
    try {
      const { name, email, password, passwordConfirm } = req.body;

      if (password !== passwordConfirm) {
        return res.status(400).json({ status: 'fail', message: 'Passwords do not match' });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ status: 'fail', message: 'Email already in use' });
      }

      const newUser = await User.create({ name, email, password, role: 'customer' });
      createSendToken(newUser, 201, res);
    } catch (err) {
      console.error('Registration error:', err);
      res
        .status(500)
        .json({ status: 'error', message: 'Internal server error during registration' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ status: 'fail', message: 'Please provide email and password' });
      }

      const user = await User.findByEmail(email);
      if (!user || !(await User.correctPassword(password, user.password))) {
        return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });
      }

      createSendToken(user, 200, res);
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ status: 'error', message: 'Internal server error during login' });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const user = await User.findByEmail(req.body.email);
      if (!user) {
        return res.status(404).json({ status: 'fail', message: 'No user found with that email.' });
      }

      const resetToken = await User.createPasswordResetToken(user.email);
      const resetURL = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;

      const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}.\nIf you didn't forget your password, ignore this email.`;

      try {
        await sendEmail({
          email: user.email,
          subject: 'Your password reset token (valid for 10 min)',
          message,
        });

        res.status(200).json({ status: 'success', message: 'Token sent to email!' });
      } catch (emailErr) {
        await pool.execute(
          `UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE email = ?`,
          [user.email]
        );
        res.status(500).json({ status: 'error', message: 'Error sending email. Try again later.' });
      }
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const user = await User.findByResetToken(req.params.token);
      if (!user) {
        return res.status(400).json({ status: 'fail', message: 'Token is invalid or has expired' });
      }

      await User.updatePassword(user.id, req.body.password);
      createSendToken(user, 200, res);
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  updatePassword: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ status: 'fail', message: 'User not found' });
      }

      if (!(await User.correctPassword(req.body.passwordCurrent, user.password))) {
        return res.status(401).json({ status: 'fail', message: 'Your current password is wrong.' });
      }

      await User.updatePassword(user.id, req.body.password);
      createSendToken(user, 200, res);
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  getMe: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  updateMe: async (req, res) => {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { name: req.body.name, email: req.body.email },
        { new: true }
      );
      res.status(200).json({ status: 'success', data: { user: updatedUser } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  deleteMe: async (req, res) => {
    try {
      await User.findByIdAndDelete(req.user.id);
      res.clearCookie('jwt'); // Optional: log user out
      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await User.getAll();
      res.status(200).json({ status: 'success', results: users.length, data: { users } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  getUser: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  createUser: async (req, res) => {
    try {
      const newUser = await User.create(req.body);
      res.status(201).json({ status: 'success', data: { user: newUser } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  updateUser: async (req, res) => {
    try {
      const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.status(200).json({ status: 'success', data: { user: updatedUser } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  deleteUser: async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },
};

module.exports = userController;
