// src/notifications/NotificationPayload.js

module.exports = {
    validate(payload) {
      if (!payload.type) return { success: false, error: "type is required" };
      if (!payload.title) return { success: false, error: "title is required" };
      if (!payload.message) return { success: false, error: "message is required" };
      if (!payload.severity) return { success: false, error: "severity is required" };
  
      return { success: true };
    }
  };
  