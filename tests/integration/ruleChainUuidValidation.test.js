const request = require('supertest');
const app = require('../../src/app');
const { RuleChain, RuleChainNode } = require('../../src/models/initModels');
const sequelize = require('../../src/config/database');

describe('Rule Chain UUID Validation - Integration Tests', () => {
  let testRuleChain;
  let authToken;
  let testOrganizationId = 1;

  beforeAll(async () => {
    await sequelize.authenticate();
    
    testRuleChain = await RuleChain.create({
      name: 'Test Rule Chain for UUID Validation',
      description: 'Test chain',
      organizationId: testOrganizationId
    });
  });

  afterAll(async () => {
    if (testRuleChain) {
      await RuleChainNode.destroy({ where: { ruleChainId: testRuleChain.id } });
      await testRuleChain.destroy();
    }
    await sequelize.close();
  });

  describe('POST /api/v1/rulechains/:ruleChainId/nodes', () => {
    test('should create node with valid UUID', async () => {
      const response = await request(app)
        .post(`/api/v1/rulechains/${testRuleChain.id}/nodes`)
        .send({
          name: 'Valid Filter Node',
          ruleChainId: testRuleChain.id,
          type: 'filter',
          config: JSON.stringify({
            sourceType: 'sensor',
            UUID: '550e8400-e29b-41d4-a716-446655440000',
            key: 'temperature',
            operator: '>',
            value: 30
          })
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
    });

    test('should reject node with invalid UUID', async () => {
      const response = await request(app)
        .post(`/api/v1/rulechains/${testRuleChain.id}/nodes`)
        .send({
          name: 'Invalid Filter Node',
          ruleChainId: testRuleChain.id,
          type: 'filter',
          config: JSON.stringify({
            sourceType: 'sensor',
            UUID: 'invalid-uuid',
            key: 'temperature',
            operator: '>',
            value: 30
          })
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('invalid');
      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors.length).toBeGreaterThan(0);
      expect(response.body.validationErrors[0].path).toContain('UUID');
    });

    test('should reject node with invalid device UUID in action', async () => {
      const response = await request(app)
        .post(`/api/v1/rulechains/${testRuleChain.id}/nodes`)
        .send({
          name: 'Invalid Action Node',
          ruleChainId: testRuleChain.id,
          type: 'action',
          config: JSON.stringify({
            type: 'device_command',
            command: {
              deviceUuid: 'invalid-uuid',
              value: 'on'
            }
          })
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors[0].path).toContain('deviceUuid');
    });

    test('should create action node with valid device UUID', async () => {
      const response = await request(app)
        .post(`/api/v1/rulechains/${testRuleChain.id}/nodes`)
        .send({
          name: 'Valid Action Node',
          ruleChainId: testRuleChain.id,
          type: 'action',
          config: JSON.stringify({
            type: 'device_command',
            command: {
              deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
              value: 'on'
            }
          })
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
    });

    test('should reject nested AND expression with invalid UUID', async () => {
      const response = await request(app)
        .post(`/api/v1/rulechains/${testRuleChain.id}/nodes`)
        .send({
          name: 'Invalid Nested Expression',
          ruleChainId: testRuleChain.id,
          type: 'filter',
          config: JSON.stringify({
            type: 'AND',
            expressions: [
              {
                sourceType: 'sensor',
                UUID: 'invalid-uuid',
                key: 'temperature',
                operator: '>',
                value: 30
              }
            ]
          })
        });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors[0].path).toContain('expressions[0]');
    });

    test('should create node with nested AND expression with valid UUIDs', async () => {
      const response = await request(app)
        .post(`/api/v1/rulechains/${testRuleChain.id}/nodes`)
        .send({
          name: 'Valid Nested Expression',
          ruleChainId: testRuleChain.id,
          type: 'filter',
          config: JSON.stringify({
            type: 'AND',
            expressions: [
              {
                sourceType: 'sensor',
                UUID: '550e8400-e29b-41d4-a716-446655440000',
                key: 'temperature',
                operator: '>',
                value: 30
              },
              {
                sourceType: 'device',
                UUID: '660e8400-e29b-41d4-a716-446655440001',
                key: 'status',
                operator: '==',
                value: 'active'
              }
            ]
          })
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
    });
  });

  describe('PUT /api/v1/rulechains/nodes/:id', () => {
    let testNode;

    beforeEach(async () => {
      testNode = await RuleChainNode.create({
        name: 'Test Node for Update',
        ruleChainId: testRuleChain.id,
        type: 'filter',
        config: JSON.stringify({
          sourceType: 'sensor',
          UUID: '550e8400-e29b-41d4-a716-446655440000',
          key: 'temperature',
          operator: '>',
          value: 30
        })
      });
    });

    afterEach(async () => {
      if (testNode) {
        await testNode.destroy();
        testNode = null;
      }
    });

    test('should update node with valid UUID', async () => {
      const response = await request(app)
        .put(`/api/v1/rulechains/nodes/${testNode.id}`)
        .send({
          config: JSON.stringify({
            sourceType: 'sensor',
            UUID: '660e8400-e29b-41d4-a716-446655440001',
            key: 'humidity',
            operator: '<',
            value: 50
          })
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    test('should reject update with invalid UUID', async () => {
      const response = await request(app)
        .put(`/api/v1/rulechains/nodes/${testNode.id}`)
        .send({
          config: JSON.stringify({
            sourceType: 'sensor',
            UUID: 'invalid-uuid',
            key: 'temperature',
            operator: '>',
            value: 30
          })
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.validationErrors).toBeDefined();
    });

    test('should allow setting config to null', async () => {
      const response = await request(app)
        .put(`/api/v1/rulechains/nodes/${testNode.id}`)
        .send({
          config: null
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
});
