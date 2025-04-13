// utils/logActivity.js
const ActivityLog = require('../models/entities/ActivityLog');

const logActivity = async (req, sellerId, action, metadata = {}) => {
  try {
    await ActivityLog.create({
      seller_id: sellerId,
      action,
      metadata,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
    });
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
};

module.exports = logActivity;
