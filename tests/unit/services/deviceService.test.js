const deviceService = require('../../../src/services/deviceService');
const { Device, State } = require('../../../src/models/initModels');

// Mock Sequelize models
jest.mock('../../../src/models/initModels', () => ({
  Device: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  State: {}
}));

describe('Device Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllDevices', () => {
    it('should return all devices', async () => {
      // Arrange
      const mockDevices = [
        { id: 1, name: 'Device 1' },
        { id: 2, name: 'Device 2' },
      ];
      Device.findAll.mockResolvedValue(mockDevices);

      // Act
      const result = await deviceService.getAllDevices();

      // Assert
      expect(Device.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockDevices);
    });
  });

  describe('getDeviceById', () => {
    it('should return a device by id', async () => {
      // Arrange
      const mockDevice = { id: 1, name: 'Device 1' };
      Device.findByPk.mockResolvedValue(mockDevice);

      // Act
      const result = await deviceService.getDeviceById(1);

      // Assert
      expect(Device.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result).toEqual(mockDevice);
    });

    it('should return null if device not found', async () => {
      // Arrange
      Device.findByPk.mockResolvedValue(null);

      // Act
      const result = await deviceService.getDeviceById(999);

      // Assert
      expect(Device.findByPk).toHaveBeenCalledWith(999, expect.any(Object));
      expect(result).toBeNull();
    });
  });

  describe('createDevice', () => {
    it('should create a device', async () => {
      // Arrange
      const mockDeviceData = { name: 'New Device', description: 'Test device' };
      const mockCreatedDevice = { 
        id: 1, 
        name: 'New Device', 
        description: 'Test device',
        uuid: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      Device.create.mockResolvedValue(mockCreatedDevice);

      // Act
      const result = await deviceService.createDevice(mockDeviceData);

      // Assert
      expect(Device.create).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedDevice);
    });
  });
});