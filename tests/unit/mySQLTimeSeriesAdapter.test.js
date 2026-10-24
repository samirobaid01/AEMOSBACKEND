/**
 * Unit tests for MySQLTimeSeriesAdapter.
 */

const mockDataStream = {
  bulkCreate: jest.fn(),
  findOne:    jest.fn(),
  findAll:    jest.fn(),
  destroy:    jest.fn(),
};

jest.mock('../../src/models/initModels', () => ({
  DataStream: mockDataStream,
}));

const MySQLTimeSeriesAdapter = require('../../src/repositories/timeseries/adapters/MySQLTimeSeriesAdapter');

describe('MySQLTimeSeriesAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new MySQLTimeSeriesAdapter();
    jest.clearAllMocks();
  });

  describe('insert()', () => {
    it('inserts rows via bulkCreate', async () => {
      const rows = [{ telemetryDataId: 1, value: '25.5' }];
      mockDataStream.bulkCreate.mockResolvedValue(rows);

      await adapter.insert(rows);

      expect(mockDataStream.bulkCreate).toHaveBeenCalledTimes(1);
      const [prepared] = mockDataStream.bulkCreate.mock.calls[0];
      expect(prepared[0].telemetryDataId).toBe(1);
      expect(prepared[0].recievedAt).toBeInstanceOf(Date);
    });

    it('preserves existing recievedAt timestamp', async () => {
      const ts = new Date('2025-01-01T00:00:00Z');
      const rows = [{ telemetryDataId: 2, value: '10', recievedAt: ts }];
      mockDataStream.bulkCreate.mockResolvedValue(rows);

      await adapter.insert(rows);

      const [prepared] = mockDataStream.bulkCreate.mock.calls[0];
      expect(prepared[0].recievedAt).toBe(ts);
    });
  });

  describe('queryLatest()', () => {
    it('calls findOne with DESC order on recievedAt', async () => {
      const row = { id: 1, telemetryDataId: 5, value: '42', recievedAt: new Date() };
      mockDataStream.findOne.mockResolvedValue(row);

      const result = await adapter.queryLatest(5);

      expect(result).toBe(row);
      expect(mockDataStream.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { telemetryDataId: 5 },
          order: [['recievedAt', 'DESC']],
        })
      );
    });
  });

  describe('queryRange()', () => {
    it('calls findAll with BETWEEN filter and ASC order', async () => {
      const from = new Date('2025-01-01');
      const to   = new Date('2025-01-02');
      mockDataStream.findAll.mockResolvedValue([]);

      await adapter.queryRange(3, from, to);

      expect(mockDataStream.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ telemetryDataId: 3 }),
          order: [['recievedAt', 'ASC']],
          limit: 1000,
        })
      );
    });

    it('respects custom limit', async () => {
      mockDataStream.findAll.mockResolvedValue([]);
      await adapter.queryRange(1, new Date(), new Date(), { limit: 50 });
      const [opts] = mockDataStream.findAll.mock.calls[0];
      expect(opts.limit).toBe(50);
    });
  });

  describe('deleteOlderThan()', () => {
    it('calls destroy with a cutoff date', async () => {
      mockDataStream.destroy.mockResolvedValue(5);
      await adapter.deleteOlderThan(30);
      expect(mockDataStream.destroy).toHaveBeenCalledTimes(1);
      const [opts] = mockDataStream.destroy.mock.calls[0];
      expect(opts.where.recievedAt).toBeDefined();
    });
  });

  describe('healthCheck()', () => {
    it('returns { ok: true, backend: "mysql" }', async () => {
      mockDataStream.findOne.mockResolvedValue(null);
      const result = await adapter.healthCheck();
      expect(result).toEqual({ ok: true, backend: 'mysql' });
    });

    it('propagates errors from findOne', async () => {
      mockDataStream.findOne.mockRejectedValue(new Error('DB down'));
      await expect(adapter.healthCheck()).rejects.toThrow('DB down');
    });
  });
});
