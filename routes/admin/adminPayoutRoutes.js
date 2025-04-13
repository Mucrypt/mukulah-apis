const express = require('express');
const router = express.Router();
const adminPayoutController = require('../../controllers/adminPayoutController');
const auth = require('../../middleware/auth');

router.use(auth.authenticate);
router.use(auth.authorize('admin', 'superAdmin'));

// ✅ Corrected this line:
router.get('/', adminPayoutController.getPendingPayouts);

router.get('/:id', adminPayoutController.getPayoutById);
router.patch('/:id/approve', adminPayoutController.approvePayout);
router.patch('/:id/reject', adminPayoutController.rejectPayout); // ⛔ rejectPayout is undefined


module.exports = router;
