require('./notifications/NotificationWorker');
if (process.env.NODE_ENV === 'test') {
    module.exports.__testProcessor = processor;
  }
  
console.log("Notification Worker started...");
