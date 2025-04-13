const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/entities/User');
const Seller = require('../models/entities/Seller');
const { AppError } = require('../utils/appError');

// Extract JWT from Authorization, cookies, or query string
const extractToken = (req) => {
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  }
  return req.cookies?.jwt || req.query?.token || null;
};

// Verify JWT and return decoded payload
const verifyToken = async (token) => {
  if (!token) throw AppError.unauthorized('No authentication token provided');
  if (token.split('.').length !== 3) throw AppError.unauthorized('Invalid token format');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      clockTolerance: 15,
    });

    if (!decoded.id || !decoded.role) {
      throw AppError.unauthorized('Invalid token payload');
    }

    return decoded;
  } catch (err) {
    console.error('[JWT VERIFY ERROR]', err);
    if (err.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Token expired. Please log in again');
    }
    if (err.name === 'JsonWebTokenError') {
      throw AppError.unauthorized('Invalid authentication token');
    }

    throw AppError.unauthorized('Authentication failed');
  }
};

const auth = {
  authenticate: async (req, res, next) => {
    try {
      console.log(`[AUTH] ${req.method} ${req.originalUrl}`);

      const token = extractToken(req);
      console.log('[AUTH] Token:', token ? token.substring(0, 10) + '...' : 'None');

      const decoded = await verifyToken(token);
      console.log('[AUTH] Decoded:', decoded);

      let currentUser = null;

      if (decoded.role === 'seller') {
        currentUser = await Seller.findOne({
          where: {
            id: decoded.id,
            status: 'approved', // ✅ seller must be approved
          },
        });

        if (!currentUser) {
          throw AppError.unauthorized('Seller not found or not approved');
        }
      } else {
        currentUser = await User.findOne({
          where: {
            id: decoded.id,
            [Op.or]: [{ active: true }, { active: { [Op.is]: null } }],
          },
        });

        if (!currentUser) {
          throw AppError.unauthorized('User not found or inactive');
        }

        if (currentUser.password_changed_at) {
          const changedAt = Math.floor(currentUser.password_changed_at.getTime() / 1000);
          if (decoded.iat && changedAt > decoded.iat) {
            throw AppError.unauthorized('Password recently changed. Please log in again');
          }
        }
      }

      req.user = {
        id: currentUser.id,
        role: decoded.role,
        email: currentUser.email,
        name: currentUser.name || currentUser.business_name,
      };

      console.log(`[AUTH] Authenticated as ${req.user.role} (${req.user.email})`);
      next();
    } catch (error) {
      console.error('[AUTH ERROR]', {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
      next(error);
    }
  },

  authorize: (...allowedRoles) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw AppError.unauthorized('Authentication required');
        }

        if (!allowedRoles.includes(req.user.role)) {
          throw AppError.forbidden('Insufficient permissions', {
            requiredRoles: allowedRoles,
            yourRole: req.user.role,
          });
        }

        console.log(`[AUTH] Authorized ${req.user.role} for ${allowedRoles.join(', ')}`);
        next();
      } catch (error) {
        console.error('[AUTHORIZATION ERROR]', error);
        next(error);
      }
    };
  },
};

// Shortcut role-based access
auth.onlySeller = () => auth.authorize('seller');
auth.onlyAdmin = () => auth.authorize('admin', 'superAdmin');
auth.onlyCustomer = () => auth.authorize('customer');

module.exports = auth;
