// src/notifications/channels/smsChannel.js
const twilio = require('twilio');

module.exports = {
  name: 'sms',

  send: async (payload) => {
    if (!payload.phone) return;

    const client = twilio(
      process.env.TWILIO_SID,
      process.env.TWILIO_AUTH
    );

    await client.messages.create({
      body: payload.message,
      from: process.env.TWILIO_PHONE,
      to: payload.phone,
    });
  }
};
