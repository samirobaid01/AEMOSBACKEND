const express = require('express');
const logger = require('./src/utils/logger');

// Create Express app
const app = express();
app.use(express.json());

// Simple test routes
app.get('/api/v1/device-tokens/test', (req, res) => {
  console.log('GET /api/v1/device-tokens/test route hit');
  res.status(200).json({
    status: 'success',
    message: 'Device token test route works!'
  });
});

app.post('/api/v1/device-tokens/test', (req, res) => {
  console.log('POST /api/v1/device-tokens/test route hit with body:', req.body);
  res.status(201).json({
    status: 'success',
    message: 'Device token POST test route works!',
    receivedData: req.body
  });
});

// Start server
const port = 3001;
app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  console.log('Try these routes:');
  console.log('GET http://localhost:3001/api/v1/device-tokens/test');
  console.log('POST http://localhost:3001/api/v1/device-tokens/test');
}); 