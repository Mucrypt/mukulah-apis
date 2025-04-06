// routes/testEmailRoute.js
const express = require('express');
const router = express.Router();
const { sendMail } = require('../services/emailService');

router
  .route('/send-test-email')
  .get(async (req, res) => {
    console.log(`[${new Date().toISOString()}] Incoming GET request to /send-test-email`);
    try {
      await sendMail({
        to: 'romeomukulah@email.com',
        subject: '✅ Test Email from Mukulah Shop',
        html: '<h1>Hello from Nodemailer!</h1><p>Your setup works.</p>',
      });

      res.status(200).json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  })
  .post(async (req, res) => {
    console.log(`[${new Date().toISOString()}] Incoming POST request to /send-test-email`);
    try {
      await sendMail({
        to: 'romeoyongsi@email.com',
        subject: '✅ Test Email from Mukulah Shop',
        html: '<h1>Hello from Nodemailer!</h1><p>Your setup works.</p>',
      });

      res.status(200).json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  });

module.exports = router;
