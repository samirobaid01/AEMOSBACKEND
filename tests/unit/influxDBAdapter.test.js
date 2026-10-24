/**
 * Unit tests for InfluxDBAdapter.
 * All outer variables referenced inside jest.mock() must be prefixed with "mock".
 */

/* eslint-disable no-var */
var mockWrittenPoints   = [];
var mockCloseResolve    = true;
var mockQueryRowsImpl   = null;

jest.mock('@influxdata/influxdb-client', () => {
  class Point {
    constructor() { this._tags = {}; this._fields = {}; this._ts = null; }
    tag(k, v)        { this._tags[k] = v;   return this; }
    floatField(k, v) { this._fields[k] = v; return this; }
    timestamp(t)     { this._ts = t;         return this; }
  }

  class InfluxDB {
    constructor() {}
    getWriteApi() {
      return {
        writePoint(pt) { mockWrittenPoints.push(pt); },
        close()        {
          return mockCloseResolve
            ? Promise.resolve()
            : Promise.reject(new Error('close failed'));
        },
      };
    }
    getQueryApi() {
      return {
        queryRows(flux, handlers) {
          if (mockQueryRowsImpl) mockQueryRowsImpl(flux, handlers);
          else handlers.complete();
        },
      };
    }
  }

  return { InfluxDB, Point };
});

const InfluxDBAdapter = require('../../src/repositories/timeseries/adapters/InfluxDBAdapter');

describe('InfluxDBAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter           = new InfluxDBAdapter();
    mockWrittenPoints = [];
    mockCloseResolve  = true;
    mockQueryRowsImpl = null;
  });

  describe('insert()', () => {
    it('writes one Point per row', async () => {
      const rows = [
        { telemetryDataId: 1, value: '12.5' },
        { telemetryDataId: 2, value: '7.0', recievedAt: new Date() },
      ];

      await adapter.insert(rows);

      expect(mockWrittenPoints).toHaveLength(2);
      expect(mockWrittenPoints[0]._tags.telemetryDataId).toBe('1');
      expect(mockWrittenPoints[0]._fields.value).toBe(12.5);
    });

    it('uses current timestamp when recievedAt is absent', async () => {
      await adapter.insert([{ telemetryDataId: 3, value: '5' }]);
      expect(typeof mockWrittenPoints[0]._ts).toBe('number');
    });
  });

  describe('queryLatest()', () => {
    it('returns mapped object when rows found', async () => {
      const fakeRow = { _value: 42, _time: '2025-01-01T00:00:00Z' };
      mockQueryRowsImpl = (flux, { next, complete }) => {
        next(fakeRow, { toObject: () => fakeRow });
        complete();
      };

      const result = await adapter.queryLatest(5);
      expect(result).not.toBeNull();
      expect(result.value).toBe('42');
      expect(result.recievedAt).toBeInstanceOf(Date);
    });

    it('returns null when no rows', async () => {
      mockQueryRowsImpl = (flux, { complete }) => complete();
      const result = await adapter.queryLatest(99);
      expect(result).toBeNull();
    });
  });

  describe('queryRange()', () => {
    it('returns mapped array of rows', async () => {
      const fakeRow = { _value: 10, _time: '2025-06-01T00:00:00Z' };
      mockQueryRowsImpl = (flux, { next, complete }) => {
        next(fakeRow, { toObject: () => fakeRow });
        complete();
      };

      const result = await adapter.queryRange(1, new Date(), new Date());
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('10');
    });

    it('propagates query errors', async () => {
      mockQueryRowsImpl = (flux, { error }) => error(new Error('Flux error'));
      await expect(adapter.queryRange(1, new Date(), new Date())).rejects.toThrow('Flux error');
    });
  });
});
