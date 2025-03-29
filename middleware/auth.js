const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/userModel');
require('dotenv').config();

const verifyToken = promisify(jwt.verify);

const auth = {
  authenticate: async (req, res, next) => {
    try {
      // 1. Check public routes
      const publicRoutes = [
        '/api/users/register',
        '/api/users/login',
        '/api/users/forgot-password',
        '/api/users/reset-password',
        '/api/health',
      ];

      if (publicRoutes.some((route) => req.originalUrl.includes(route))) {
        return next();
      }

      // 2. Get token
      let token;
      if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
      }

      if (!token) {
        return res.status(401).json({
          status: 'fail',
          message: 'You are not logged in! Please log in to get access.',
        });
      }

      // 3. Verify token
      const decoded = await verifyToken(token, process.env.JWT_SECRET);

      // 4. Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return res.status(401).json({
          status: 'fail',
          message: 'The user belonging to this token no longer exists.',
        });
      }

      // 5. Check if user changed password after token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          status: 'fail',
          message: 'User recently changed password! Please log in again.',
        });
      }

      // 6. Attach user to request
      req.user = {
        id: currentUser.id,
        role: currentUser.role,
        email: currentUser.email,
      };

      next();
    } catch (err) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token. Please log in again.',
      });
    }
  },

  authorize: (...roles) => {
    return (req, res, next) => {
      // First check if user exists
      if (!req.user) {
        return res.status(401).json({
          status: 'fail',
          message: 'You are not logged in!',
        });
      }

      // Then check roles
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'fail',
          message: 'You do not have permission to perform this action',
        });
      }

      next();
    };
  },
};

module.exports = auth;
