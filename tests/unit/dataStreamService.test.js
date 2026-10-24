/**
 * Unit tests for dataStreamService — verifies P4 routing:
 * time-series writes/reads go through tsRepo; relational queries stay on Sequelize.
 */

const mockInsert      = jest.fn();
const mockQueryLatest = jest.fn();
const mockQueryRange  = jest.fn();

jest.mock('../../src/repositories/timeseries/TimeSeriesRepositoryFactory', () => ({
  insert:       mockInsert,
  queryLatest:  mockQueryLatest,
  queryRange:   mockQueryRange,
}));

const mockDataStream = {
  findAll:  jest.fn(),
  findByPk: jest.fn(),
  update:   jest.fn(),
  destroy:  jest.fn(),
};
const mockTelemetryData = {};

jest.mock('../../src/models/initModels', () => ({
  DataStream:    mockDataStream,
  TelemetryData: mockTelemetryData,
}));

const service = require('../../src/services/dataStreamService');

describe('dataStreamService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createDataStream()', () => {
    it('delegates to tsRepo.insert()', async () => {
      mockInsert.mockResolvedValue([{ id: 1 }]);
      await service.createDataStream({ telemetryDataId: 1, value: '10' });
      expect(mockInsert).toHaveBeenCalledWith([{ telemetryDataId: 1, value: '10' }]);
    });
  });

  describe('createBatchDataStreams()', () => {
    it('delegates batch to tsRepo.insert()', async () => {
      mockInsert.mockResolvedValue([]);
      const batch = [
        { telemetryDataId: 1, value: '1' },
        { telemetryDataId: 2, value: '2' },
      ];
      await service.createBatchDataStreams(batch);
      expect(mockInsert).toHaveBeenCalledWith(batch);
    });

    it('throws for empty array', async () => {
      await expect(service.createBatchDataStreams([])).rejects.toThrow('non-empty array');
    });

    it('throws for non-array input', async () => {
      await expect(service.createBatchDataStreams('oops')).rejects.toThrow('non-empty array');
    });
  });

  describe('getDataStreamsByTelemetryId()', () => {
    it('delegates to tsRepo.queryLatest()', async () => {
      mockQueryLatest.mockResolvedValue({ id: 5, value: '99' });
      const result = await service.getDataStreamsByTelemetryId(5);
      expect(mockQueryLatest).toHaveBeenCalledWith(5);
      expect(result.value).toBe('99');
    });
  });

  describe('getDataStreamRangeByTelemetryId()', () => {
    it('delegates to tsRepo.queryRange()', async () => {
      mockQueryRange.mockResolvedValue([]);
      const from = new Date('2025-01-01');
      const to   = new Date('2025-01-02');
      await service.getDataStreamRangeByTelemetryId(3, from, to, { limit: 100 });
      expect(mockQueryRange).toHaveBeenCalledWith(3, from, to, { limit: 100 });
    });
  });

  describe('getAllDataStreams()', () => {
    it('uses Sequelize directly (no tsRepo)', async () => {
      mockDataStream.findAll.mockResolvedValue([]);
      await service.getAllDataStreams();
      expect(mockDataStream.findAll).toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('getDataStreamById()', () => {
    it('uses Sequelize directly (no tsRepo)', async () => {
      mockDataStream.findByPk.mockResolvedValue({ id: 1 });
      await service.getDataStreamById(1);
      expect(mockDataStream.findByPk).toHaveBeenCalledWith(1, expect.anything());
      expect(mockQueryLatest).not.toHaveBeenCalled();
    });
  });

  describe('updateDataStream()', () => {
    it('returns false when record not found', async () => {
      mockDataStream.findByPk.mockResolvedValue(null);
      const result = await service.updateDataStream(999, { value: 'x' });
      expect(result).toBe(false);
    });

    it('updates and returns the record when found', async () => {
      const rec = { id: 1, update: jest.fn().mockResolvedValue(true) };
      mockDataStream.findByPk.mockResolvedValue(rec);
      const result = await service.updateDataStream(1, { value: 'new' });
      expect(rec.update).toHaveBeenCalledWith({ value: 'new' });
      expect(result).toBe(rec);
    });
  });

  describe('deleteDataStream()', () => {
    it('returns false when record not found', async () => {
      mockDataStream.findByPk.mockResolvedValue(null);
      expect(await service.deleteDataStream(999)).toBe(false);
    });

    it('destroys the record and returns true', async () => {
      const rec = { destroy: jest.fn().mockResolvedValue(true) };
      mockDataStream.findByPk.mockResolvedValue(rec);
      expect(await service.deleteDataStream(1)).toBe(true);
      expect(rec.destroy).toHaveBeenCalled();
    });
  });
});
