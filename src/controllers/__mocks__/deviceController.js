// Mock for the Device Controller
const mockController = {
  // Mock implementations for the controller functions
  getAllDevices: jest.fn((req, res) => {
    const devices = [
      { id: 1, name: 'Device 1' },
      { id: 2, name: 'Device 2' },
    ];
    
    res.status(200).json({
      status: 'success',
      results: devices.length,
      data: { devices }
    });
  }),
  
  getDeviceById: jest.fn((req, res) => {
    const device = { id: 1, name: 'Device 1' };
    
    res.status(200).json({
      status: 'success',
      data: { device }
    });
  }),
  
  createDevice: jest.fn((req, res) => {
    const deviceData = req.body;
    const device = { 
      id: 1, 
      ...deviceData,
      uuid: '123e4567-e89b-12d3-a456-426614174000'
    };
    
    res.status(201).json({
      status: 'success',
      data: { device }
    });
  }),
  
  updateDevice: jest.fn((req, res) => {
    const updateData = req.body;
    const device = { 
      id: 1, 
      name: 'Updated Device',
      description: 'Updated description',
      status: true
    };
    
    res.status(200).json({
      status: 'success',
      data: { device }
    });
  }),
  
  deleteDevice: jest.fn((req, res) => {
    res.status(204).json({
      status: 'success',
      data: null
    });
  })
};

module.exports = mockController; 