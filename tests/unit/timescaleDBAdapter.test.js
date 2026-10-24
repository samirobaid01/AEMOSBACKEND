/**
 * Unit tests for TimescaleDBAdapter.
 */

const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({ query: mockQuery })),
}));

const TimescaleDBAdapter = require('../../src/repositories/timeseries/adapters/TimescaleDBAdapter');

describe('TimescaleDBAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new TimescaleDBAdapter();
    mockQuery.mockReset();
  });

  describe('insert()', () => {
    it('does nothing for an empty rows array', async () => {
      await adapter.insert([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('issues a single INSERT for multiple rows', async () => {
      mockQuery.mockResolvedValue({ rowCount: 2 });
      const rows = [
        { telemetryDataId: 1, value: '10' },
        { telemetryDataId: 2, value: '20', recievedAt: new Date('2025-06-01') },
      ];

      await adapter.insert(rows);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toMatch(/INSERT INTO datastream/);
      // 2 rows × 3 params each = 6 params
      expect(params).toHaveLength(6);
    });

    it('fills in recievedAt when absent', async () => {
      mockQuery.mockResolvedValue({});
      await adapter.insert([{ telemetryDataId: 1, value: '5' }]);
      const [, params] = mockQuery.mock.calls[0];
      expect(params[2]).toBeInstanceOf(Date);
    });
  });

  describe('queryLatest()', () => {
    it('returns the first row when found', async () => {
      const row = { telemetryDataId: 3, value: '7', recievedAt: new Date() };
      mockQuery.mockResolvedValue({ rows: [row] });

      const result = await adapter.queryLatest(3);
      expect(result).toBe(row);
    });

    it('returns null when no rows found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await adapter.queryLatest(99);
      expect(result).toBeNull();
    });
  });

  describe('queryRange()', () => {
    it('uses time_bucket aggregation', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await adapter.queryRange(1, new Date(), new Date());

      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toMatch(/time_bucket/);
    });

    it('passes granularity as first param', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await adapter.queryRange(1, new Date(), new Date(), { granularity: '5 minutes' });

      const [, params] = mockQuery.mock.calls[0];
      expect(params[0]).toBe('5 minutes');
    });
  });

  describe('deleteOlderThan()', () => {
    it('issues a DELETE with an interval', async () => {
      mockQuery.mockResolvedValue({});
      await adapter.deleteOlderThan(7);

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toMatch(/DELETE FROM datastream/);
      expect(params[0]).toBe(7);
    });
  });

  describe('healthCheck()', () => {
    it('returns { ok: true, backend: "timescale" } on success', async () => {
      mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
      const result = await adapter.healthCheck();
      expect(result).toEqual({ ok: true, backend: 'timescale' });
    });

    it('propagates errors', async () => {
      mockQuery.mockRejectedValue(new Error('PG down'));
      await expect(adapter.healthCheck()).rejects.toThrow('PG down');
    });
  });
});
