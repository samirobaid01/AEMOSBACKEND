'use strict';

require('dotenv').config();
const express = require('express');
const { Device, sequelize } = require('./src/models/initModels');

// Create a minimal Express server
const app = express();
app.use(express.json());

// Simple device route with no middleware
app.get('/devices/:id', async (req, res) => {
  try {
    const deviceId = req.params.id;
    console.log(`Getting device ${deviceId}...`);
    
    const device = await Device.findByPk(deviceId);
    console.log('Device result:', device);
    
    if (!device) {
      return res.status(404).json({
        status: 'error',
        message: `Device ${deviceId} not found`
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        device
      }
    });
  } catch (error) {
    console.error('Error getting device:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
}); 