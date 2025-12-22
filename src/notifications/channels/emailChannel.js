// src/notifications/channels/emailChannel.js
const nodemailer = require('nodemailer');

module.exports = {
  name: 'email',

  send: async (payload) => {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });

    await transporter.sendMail({
      to: payload.email || payload.userEmail,
      subject: payload.title,
      text: payload.message,
    });
  }
};
