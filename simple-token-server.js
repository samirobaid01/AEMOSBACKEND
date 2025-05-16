const express = require('express');

// Create a simple Express app
const app = express();

// Enable JSON body parsing
app.use(express.json());

// Simple test route
app.get('/test', (req, res) => {
  console.log('GET /test route hit');
  res.status(200).json({
    status: 'success',
    message: 'Test route works!'
  });
});

// Start server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Simple server running at http://localhost:${PORT}`);
  console.log('Try: curl http://localhost:3002/test');
}); 