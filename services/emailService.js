// backend/services/emailService.js
const nodemailer = require('nodemailer');
const { email } = require('../config/envConfig'); // 👈 pulls config from env

if (!email.user || !email.pass) {
  console.warn('⚠️ Warning: Email credentials are missing. Please check your .env file.');
}

console.log('Email User:', email.user);
console.log('Email Pass:', email.pass ? 'Loaded' : 'Not Loaded');

const transporter = nodemailer.createTransport({
  host: email.host,
  port: email.port,
  secure: false, // use TLS
  auth: {
    user: email.user,
    pass: email.pass,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error with email configuration:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

exports.sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: email.from,
    to,
    subject,
    html,
  });
};
