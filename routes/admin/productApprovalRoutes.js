const express = require('express');
const router = express.Router();

const {
  approveSellerProduct,
  rejectSellerProduct,
  getPendingApprovals,
} = require('../../controllers/adminProductApprovalController');

const auth = require('../../middleware/auth');

// Protect all routes & restrict access to admin and superAdmin only
router.use(auth.authenticate, auth.onlyAdmin);

// Approve a seller product
router.patch('/:id/approve', approveSellerProduct);

// Reject a seller product
router.patch('/:id/reject', rejectSellerProduct);

// Get all pending seller product approvals
router.get('/pending', getPendingApprovals);

module.exports = router;
