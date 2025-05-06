const organizationService = require('../../src/services/organizationService');
const { Organization } = require('../../src/models/initModels');

// Mock Sequelize models
jest.mock('../../src/models/initModels', () => ({
  Organization: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

describe('Organization Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllOrganizations', () => {
    it('should return all organizations', async () => {
      // Arrange
      const mockOrganizations = [
        { id: 1, name: 'Organization 1' },
        { id: 2, name: 'Organization 2' },
      ];
      Organization.findAll.mockResolvedValue(mockOrganizations);

      // Act
      const result = await organizationService.getAllOrganizations();

      // Assert
      expect(Organization.findAll).toHaveBeenCalledWith({
        include: [{
          model: Organization,
          as: 'children'
        }]
      });
      expect(result).toEqual(mockOrganizations);
    });
  });

  describe('getOrganizationById', () => {
    it('should return an organization by id', async () => {
      // Arrange
      const mockOrganization = { id: 1, name: 'Organization 1' };
      Organization.findByPk.mockResolvedValue(mockOrganization);

      // Act
      const result = await organizationService.getOrganizationById(1);

      // Assert
      expect(Organization.findByPk).toHaveBeenCalledWith(1, {
        include: [{
          model: Organization,
          as: 'children'
        }]
      });
      expect(result).toEqual(mockOrganization);
    });

    it('should return null if organization not found', async () => {
      // Arrange
      Organization.findByPk.mockResolvedValue(null);

      // Act
      const result = await organizationService.getOrganizationById(999);

      // Assert
      expect(Organization.findByPk).toHaveBeenCalledWith(999, expect.any(Object));
      expect(result).toBeNull();
    });
  });

  describe('createOrganization', () => {
    it('should create an organization', async () => {
      // Arrange
      const mockOrganizationData = { name: 'New Organization', detail: 'Test organization' };
      const mockCreatedOrganization = { 
        id: 1, 
        name: 'New Organization', 
        detail: 'Test organization',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };
      
      Organization.create.mockResolvedValue(mockCreatedOrganization);

      // Act
      const result = await organizationService.createOrganization(mockOrganizationData);

      // Assert
      expect(Organization.create).toHaveBeenCalled();
      // Verify timestamps were added
      expect(Organization.create.mock.calls[0][0].createdAt).toBeInstanceOf(Date);
      expect(Organization.create.mock.calls[0][0].updatedAt).toBeInstanceOf(Date);
      expect(result).toEqual(mockCreatedOrganization);
    });
  });

  describe('updateOrganization', () => {
    it('should update an organization', async () => {
      // Arrange
      const mockOrganization = { 
        id: 1, 
        name: 'Organization 1',
        update: jest.fn().mockResolvedValue(true)
      };
      const updateData = { name: 'Updated Organization' };
      
      Organization.findByPk.mockResolvedValue(mockOrganization);

      // Act
      const result = await organizationService.updateOrganization(1, updateData);

      // Assert
      expect(Organization.findByPk).toHaveBeenCalledWith(1);
      expect(mockOrganization.update).toHaveBeenCalled();
      // Verify updatedAt was added
      expect(mockOrganization.update.mock.calls[0][0].updatedAt).toBeInstanceOf(Date);
      expect(result).toEqual(mockOrganization);
    });

    it('should return null if organization not found', async () => {
      // Arrange
      Organization.findByPk.mockResolvedValue(null);

      // Act
      const result = await organizationService.updateOrganization(999, { name: 'Updated' });

      // Assert
      expect(Organization.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });
  });

  describe('deleteOrganization', () => {
    it('should delete an organization', async () => {
      // Arrange
      const mockOrganization = { 
        id: 1, 
        destroy: jest.fn().mockResolvedValue(true)
      };
      
      Organization.findByPk.mockResolvedValue(mockOrganization);

      // Act
      const result = await organizationService.deleteOrganization(1);

      // Assert
      expect(Organization.findByPk).toHaveBeenCalledWith(1);
      expect(mockOrganization.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if organization not found', async () => {
      // Arrange
      Organization.findByPk.mockResolvedValue(null);

      // Act
      const result = await organizationService.deleteOrganization(999);

      // Assert
      expect(Organization.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBe(false);
    });
  });
}); 