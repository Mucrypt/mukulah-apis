//backend/routes/adminDashboard.js
const express = require('express');
const { Product, Seller } = require('../../models/associations');
const router = express.Router();

router.get('/overview', async (req, res) => {
  try {
    const totalProducts = await Product.count();
    const totalSellers = await Seller.count();
    const topSellers = await Seller.findAll({
      order: [['total_sales', 'DESC']],
      limit: 5,
      attributes: ['id', 'business_name', 'total_sales'],
    });

    res.json({
      stats: { totalProducts, totalSellers },
      topSellers,
    });
  } catch (err) {
    res.status(500).json({ error: 'Dashboard failed' });
  }
});

module.exports = router;
