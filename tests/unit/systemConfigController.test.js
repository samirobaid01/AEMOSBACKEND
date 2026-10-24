/**
 * Unit tests for systemConfigController (P4.5 — admin config API).
 */

const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockUpsert  = jest.fn();
const mockDestroy = jest.fn();

jest.mock('../../src/models/initModels', () => ({
  SystemConfig: {
    findAll:  mockFindAll,
    findOne:  mockFindOne,
    upsert:   mockUpsert,
    destroy:  mockDestroy,
  },
}));

const {
  getAllConfigs,
  getConfig,
  upsertConfig,
  deleteConfig,
} = require('../../src/controllers/systemConfigController');

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    status: jest.fn().mockImplementation(function (s) { this._status = s; return this; }),
    json:   jest.fn().mockImplementation(function (b) { this._body = b; return this; }),
  };
  return res;
}

describe('systemConfigController', () => {
  let req, res, next;

  beforeEach(() => {
    req  = { params: {}, body: {}, user: { id: 1 } };
    res  = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllConfigs()', () => {
    it('returns all configs sorted by key', async () => {
      const rows = [{ key: 'A' }, { key: 'B' }];
      mockFindAll.mockResolvedValue(rows);

      await getAllConfigs(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: rows });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next on error', async () => {
      mockFindAll.mockRejectedValue(new Error('DB error'));
      await getAllConfigs(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getConfig()', () => {
    it('returns config when found', async () => {
      const record = { key: 'TIMESERIES_BACKEND', value: 'mysql' };
      mockFindOne.mockResolvedValue(record);
      req.params.key = 'TIMESERIES_BACKEND';

      await getConfig(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: record });
    });

    it('calls next with 404 ApiError when not found', async () => {
      mockFindOne.mockResolvedValue(null);
      req.params.key = 'NO_SUCH_KEY';

      await getConfig(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe('upsertConfig()', () => {
    it('rejects unknown keys with 400', async () => {
      req.body = { key: 'SOME_UNSAFE_KEY', value: 'x' };
      await upsertConfig(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('rejects missing key with 400', async () => {
      req.body = { value: 'mysql' };
      await upsertConfig(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('creates a new config and returns 201', async () => {
      const record = { key: 'TIMESERIES_BACKEND', value: 'timescale' };
      mockUpsert.mockResolvedValue([record, true]);
      req.body = { key: 'TIMESERIES_BACKEND', value: 'timescale' };

      await upsertConfig(req, res, next);

      expect(res._status).toBe(201);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: record });
    });

    it('updates an existing config and returns 200', async () => {
      const record = { key: 'MQTT_BROKER_MODE', value: 'external' };
      mockUpsert.mockResolvedValue([record, false]);
      req.body = { key: 'MQTT_BROKER_MODE', value: 'external' };

      await upsertConfig(req, res, next);

      expect(res._status).toBe(200);
    });
  });

  describe('deleteConfig()', () => {
    it('deletes an existing key and returns success', async () => {
      mockDestroy.mockResolvedValue(1);
      req.params.key = 'TIMESERIES_BACKEND';

      await deleteConfig(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      );
    });

    it('calls next with 404 when key does not exist', async () => {
      mockDestroy.mockResolvedValue(0);
      req.params.key = 'PHANTOM_KEY';

      await deleteConfig(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });
});
