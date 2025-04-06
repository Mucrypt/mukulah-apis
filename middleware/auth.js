const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
require('dotenv').config();

const auth = {
  authenticate: async (req, res, next) => {
    try {
      // Debugging log: Check incoming request
      console.log(`[AUTH] Incoming request: ${req.method} ${req.path}`);

      // Skip authentication for public routes
      const publicRoutes = [
        { method: 'GET', path: /^\/api\/products(?:\/|$)/ },
        { method: 'GET', path: /^\/api\/products\/\d+/ },
        { method: 'PATCH', path: /^\/api\/products\/\d+\/views/ },
        // Add other public routes...
      ];

      const isPublic = publicRoutes.some(
        (route) => req.method === route.method && route.path.test(req.path)
      );

      if (isPublic) return next();

      // Token extraction with multiple sources
      const token =
        (req.headers.authorization?.startsWith('Bearer') &&
          req.headers.authorization.split(' ')[1]) ||
        req.cookies?.jwt ||
        req.query?.token;

      // Debugging log: Check extracted token
      console.log(`[AUTH] Extracted token: ${token}`);

      if (!token) {
        return res.status(401).json({
          status: 'fail',
          message: 'Authentication required',
        });
      }

      // Verify token with enhanced options
      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(
          token,
          process.env.JWT_SECRET,
          {
            algorithms: ['HS256'],
            ignoreExpiration: false, // Ensure expiration is respected
          },
          (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded);
          }
        );
      });

      // Debugging log: Check decoded token
      console.log(`[AUTH] Decoded token:`, decoded);

      // Check user exists and is active
      const currentUser = await User.findById(decoded.id);
      if (!currentUser || !currentUser.active) {
        return res.status(401).json({
          status: 'fail',
          message: 'User account is disabled or does not exist',
        });
      }

      // Debugging log: Check current user
      console.log(`[AUTH] Current user:`, currentUser);

      // Password changed check
      if (User.changedPasswordAfter(decoded.iat, currentUser.password_changed_at)) {
        return res.status(401).json({
          status: 'fail',
          message: 'Password was changed. Please log in again.',
        });
      }

      // Attach user to request
      req.user = {
        id: currentUser.id,
        role: currentUser.role,
        email: currentUser.email,
        // Add other necessary fields
      };

      next();
    } catch (err) {
      // Enhanced error handling
      console.error(`[AUTH] Error:`, err);

      let message = 'Authentication failed';
      if (err.name === 'TokenExpiredError') {
        message = 'Session expired. Please log in again.';
      } else if (err.name === 'JsonWebTokenError') {
        message = 'Invalid authentication token';
      }

      res.status(401).json({
        status: 'fail',
        message,
        suggestion: 'Please log in to get a new token',
      });
    }
  },

  authorize: (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          status: 'fail',
          message: 'Authentication required',
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'fail',
          message: 'Insufficient permissions',
          requiredRoles: roles,
          yourRole: req.user.role,
          suggestion: 'Contact administrator for access',
        });
      }

      next();
    };
  },
};
module.exports = auth;
