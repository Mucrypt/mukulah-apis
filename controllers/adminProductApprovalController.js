// backend/controllers/adminProductApprovalController.js
const SellerProduct = require('../models/entities/SellerProduct');
const Product = require('../models/entities/Product');
const AppError = require('../utils/appError');

// ✅ Approve a seller's product
exports.approveSellerProduct = async (req, res, next) => {
  try {
    const sellerProduct = await SellerProduct.findByPk(req.params.id);
    if (!sellerProduct) return next(new AppError('Seller product not found', 404));

    await sellerProduct.update({ is_approved: true, rejection_reason: null });

    res.status(200).json({
      status: 'success',
      message: 'Product approved successfully',
      data: sellerProduct,
    });
  } catch (err) {
    next(new AppError(err.message || 'Failed to approve product', 500));
  }
};

// ✅ Reject a seller's product
exports.rejectSellerProduct = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const sellerProduct = await SellerProduct.findByPk(req.params.id);
    if (!sellerProduct) return next(new AppError('Seller product not found', 404));

    await sellerProduct.update({
      is_approved: false,
      rejection_reason: reason || 'No reason provided',
    });

    res.status(200).json({
      status: 'success',
      message: 'Product rejected',
      data: sellerProduct,
    });
  } catch (err) {
    next(new AppError(err.message || 'Failed to reject product', 500));
  }
};

// ✅ List all pending seller product approvals
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const pending = await SellerProduct.findAll({
      where: { is_approved: false },
      include: ['product', 'seller'],
    });

    res.status(200).json({
      status: 'success',
      count: pending.length,
      data: pending,
    });
  } catch (err) {
    next(new AppError(err.message || 'Failed to fetch pending approvals', 500));
  }
};
