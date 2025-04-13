// backend/controllers/sellerAuthController.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');
const crypto = require('crypto');
const { Op } = require('sequelize');
const Seller = require('../../models/entities/Seller'); // Correct path
const AppError = require('../../utils/appError');
const { sendMail } = require('../../services/emailService');

const signToken = (seller) => {
  return jwt.sign({ id: seller.id, role: seller.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/seller/register
exports.registerSeller = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      business_name,
      business_description,
      business_email,
      business_phone,
      business_address,
      tax_id,
      business_registration_number,
      website_url,
      payment_method,
    } = req.body;

    const existing = await Seller.findOne({ where: { email } });
    if (existing) return next(new AppError('Email is already registered', 400));

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const seller = await Seller.create({
      name,
      email,
      password: hashedPassword,
      verification_token: verificationToken,
      business_name,
      business_slug: slugify(business_name, { lower: true, strict: true }),
      business_description,
      business_email,
      business_phone,
      business_address,
      tax_id,
      business_registration_number,
      website_url,
      payment_method,
      status: 'pending',
    });

    await sendMail({
      to: email,
      subject: 'Verify Your Seller Account',
      html: `<p>Please verify your account by clicking <a href="${process.env.CLIENT_URL}/verify-seller?token=${verificationToken}">here</a>.</p>`,
    });

    const token = signToken(seller);
    res.status(201).json({ status: 'success', token, data: { seller } });
  } catch (error) {
    next(error);
  }
};

// GET /api/seller/verify-email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return next(new AppError('Verification token missing', 400));

    const seller = await Seller.findOne({ where: { verification_token: token } });
    if (!seller) return next(new AppError('Invalid token or seller already verified', 400));

    seller.verification_token = null;
    seller.email_verified = true;
    await seller.save();

    res.status(200).json({ status: 'success', message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/seller/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const seller = await Seller.findOne({ where: { email } });
    if (!seller) return next(new AppError('Seller not found', 404));

    const resetToken = crypto.randomBytes(32).toString('hex');
    seller.password_reset_token = resetToken;
    seller.password_reset_expires = Date.now() + 10 * 60 * 1000;
    await seller.save();

    await sendMail({
      to: email,
      subject: 'Reset your password',
      html: `<p>Reset your password <a href="${process.env.CLIENT_URL}/reset-seller-password?token=${resetToken}">here</a>.</p>`,
    });

    res.status(200).json({ status: 'success', message: 'Reset link sent to email' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/seller/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const seller = await Seller.findOne({
      where: {
        password_reset_token: token,
        password_reset_expires: { [Op.gt]: Date.now() },
      },
    });

    if (!seller) return next(new AppError('Token is invalid or expired', 400));

    seller.password = await bcrypt.hash(password, 12);
    seller.password_reset_token = null;
    seller.password_reset_expires = null;
    await seller.save();

    const newToken = signToken(seller);
    res.status(200).json({ status: 'success', token: newToken });
  } catch (err) {
    next(err);
  }
};

// POST /api/seller/login
exports.loginSeller = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Please provide email and password', 400));

    const seller = await Seller.findOne({ where: { email } });
    if (!seller || !(await bcrypt.compare(password, seller.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    const token = signToken(seller);
    res.status(200).json({ status: 'success', token, data: { seller } });
  } catch (error) {
    next(error);
  }
};

// GET /api/seller/profile
exports.getSellerProfile = async (req, res, next) => {
  try {
    const seller = await Seller.findByPk(req.user.id);
    if (!seller) return next(new AppError('Seller not found', 404));
    res.status(200).json({ status: 'success', data: { seller } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/seller/profile
exports.updateSellerProfile = async (req, res, next) => {
  try {
    const seller = await Seller.findByPk(req.user.id);
    if (!seller) return next(new AppError('Seller not found', 404));

    const updatableFields = [
      'name',
      'email',
      'password',
      'business_name',
      'business_description',
      'business_email',
      'business_phone',
      'business_address',
      'tax_id',
      'business_registration_number',
      'website_url',
      'payment_method',
      'meta_title',
      'meta_description',
      'meta_keywords',
    ];

    for (let field of updatableFields) {
      if (req.body[field] !== undefined) {
        seller[field] =
          field === 'password' ? await bcrypt.hash(req.body[field], 12) : req.body[field];
      }
    }

    if (req.body.business_name) {
      seller.business_slug = slugify(req.body.business_name, { lower: true, strict: true });
    }

    await seller.save();
    res.status(200).json({ status: 'success', message: 'Profile updated', data: { seller } });
  } catch (error) {
    next(error);
  }
};

// POST /api/seller/logout
exports.logoutSeller = (req, res) => {
  res.status(200).json({ status: 'success', message: 'Logged out' });
};
