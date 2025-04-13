const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/entities/User');

require('dotenv').config();

const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user);
  user.password = undefined;
  user.password_reset_token = undefined;
  user.password_reset_expires = undefined;

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + (Number(process.env.JWT_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(statusCode).json({ status: 'success', token, data: { user } });
};

const userController = {
  register: async (req, res) => {
    try {
      const { name, email, password, passwordConfirm, role = 'customer' } = req.body;
      if (password !== passwordConfirm)
        return res.status(400).json({ status: 'fail', message: 'Passwords do not match' });

      const existingUser = await User.findOne({ where: { email, active: true } });
      if (existingUser)
        return res.status(400).json({ status: 'fail', message: 'Email already in use' });

      if (!['customer', 'seller'].includes(role))
        return res.status(400).json({ status: 'fail', message: 'Invalid role specified' });

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await User.create({ name, email, password: hashedPassword, role });
      createSendToken(newUser, 201, res);
    } catch (err) {
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

      const user = await User.findOne({ where: { email, active: true } });
      if (!user) {
        return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });
      }

      createSendToken(user, 200, res);
    } catch (err) {
      console.error('[LOGIN ERROR]', err);
      res
        .status(500)
        .json({ status: 'error', message: err.message || 'Internal server error during login' });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const user = await User.findOne({ where: { email: req.body.email, active: true } });
      if (!user)
        return res.status(404).json({ status: 'fail', message: 'No user found with that email.' });

      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.password_reset_token = hashedToken;
      user.password_reset_expires = Date.now() + 10 * 60 * 1000;
      await user.save();

      const resetURL = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;
      const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}`;

      await sendEmail({
        email: user.email,
        subject: 'Your password reset token (valid for 10 min)',
        message,
      });
      res.status(200).json({ status: 'success', message: 'Token sent to email!' });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Error sending email. Try again later.' });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
      const user = await User.findOne({
        where: {
          password_reset_token: hashedToken,
          password_reset_expires: { [Op.gt]: Date.now() },
          active: true,
        },
      });

      if (!user)
        return res.status(400).json({ status: 'fail', message: 'Token is invalid or has expired' });

      user.password = await bcrypt.hash(req.body.password, 12);
      user.password_reset_token = null;
      user.password_reset_expires = null;
      user.password_changed_at = new Date();
      await user.save();

      createSendToken(user, 200, res);
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  updatePassword: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user || !(await bcrypt.compare(req.body.passwordCurrent, user.password)))
        return res.status(401).json({ status: 'fail', message: 'Your current password is wrong.' });

      user.password = await bcrypt.hash(req.body.password, 12);
      user.password_changed_at = new Date();
      await user.save();

      createSendToken(user, 200, res);
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  getMe: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  updateMe: async (req, res) => {
    try {
      const { name, email } = req.body;
      const [updated] = await User.update(
        { name, email },
        { where: { id: req.user.id, active: true } }
      );
      if (!updated) {
        return res.status(404).json({ status: 'fail', message: 'User not found' });
      }
      const user = await User.findByPk(req.user.id);
      res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },
  deleteMe: async (req, res) => {
    try {
      await User.update({ active: false }, { where: { id: req.user.id } });
      res.clearCookie('jwt');
      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await User.findAll({
        where: { active: true },
        attributes: { exclude: ['password'] },
      });
      res.status(200).json({ status: 'success', results: users.length, data: { users } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  getUser: async (req, res) => {
    try {
      const user = await User.findOne({ where: { id: req.params.id, active: true } });
      res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

  createUser: async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 12);
      const newUser = await User.create({ ...req.body, password: hashedPassword });
      res.status(201).json({ status: 'success', data: { user: newUser } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },

 updateUser: async (req, res) => {
  try {
    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 12);
    }
    await User.update(req.body, { where: { id: req.params.id, active: true } });
    const user = await User.findByPk(req.params.id);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Something went wrong' });
  }
}
,

  deleteUser: async (req, res) => {
    try {
      await User.update({ active: false }, { where: { id: req.params.id } });
      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Something went wrong' });
    }
  },
};

module.exports = userController;
