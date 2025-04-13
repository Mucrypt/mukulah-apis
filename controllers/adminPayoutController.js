const { Payout, Seller, User } = require('../models/associations');
const AppError = require('../utils/appError');
const { sendMail } = require('../services/emailService');
const { Op } = require('sequelize');

// ✅ Get all pending payouts
exports.getPendingPayouts = async (req, res, next) => {
  try {
    const payouts = await Payout.findAll({
      where: { approval_status: 'pending' },
      include: [{ model: Seller, attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
    });

    res.status(200).json({ status: 'success', data: { payouts } });
  } catch (err) {
    next(err);
  }
};

// ✅ Get a specific payout
exports.getPayoutById = async (req, res, next) => {
  try {
    const payout = await Payout.findByPk(req.params.id, {
      include: [{ model: Seller, attributes: ['id', 'name', 'email'] }],
    });
    if (!payout) return next(new AppError('Payout not found', 404));

    res.status(200).json({ status: 'success', data: { payout } });
  } catch (err) {
    next(err);
  }
};

// ✅ Approve payout
exports.approvePayout = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const payout = await Payout.findByPk(req.params.id);
    if (!payout || payout.approval_status !== 'pending') {
      return next(new AppError('Payout not found or already processed', 404));
    }

    payout.approval_status = 'approved';
    payout.approval_reason = reason || null;
    payout.approval_at = new Date();
    payout.approved_by = req.user.id;

    await payout.save();

    const seller = await Seller.findByPk(payout.seller_id);
    if (seller) {
      await sendMail({
        to: seller.email,
        subject: 'Your payout was approved ✅',
        html: `<p>Your payout (ID: ${payout.id}) was <strong>approved</strong>.</p><p>${reason || ''}</p>`,
      });
    }

    res.status(200).json({ status: 'success', message: 'Payout approved successfully' });
  } catch (err) {
    next(err);
  }
};

// ✅ Reject payout — FIXED
exports.rejectPayout = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const payout = await Payout.findByPk(req.params.id);
    if (!payout || payout.approval_status !== 'pending') {
      return next(new AppError('Payout not found or already processed', 404));
    }

    payout.approval_status = 'rejected';
    payout.approval_reason = reason || null;
    payout.approval_at = new Date();
    payout.approved_by = req.user.id;

    await payout.save();

    const seller = await Seller.findByPk(payout.seller_id);
    if (seller) {
      await sendMail({
        to: seller.email,
        subject: 'Your payout was rejected ❌',
        html: `<p>Your payout (ID: ${payout.id}) was <strong>rejected</strong>.</p><p>${reason || ''}</p>`,
      });
    }

    res.status(200).json({ status: 'success', message: 'Payout rejected successfully' });
  } catch (err) {
    next(err);
  }
};
