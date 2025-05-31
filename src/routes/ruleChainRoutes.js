const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkPermission, checkResourceOwnership, checkOrgPermission } = require('../middlewares/permission');
const { ruleChainService, getRuleChainForOwnershipCheck } = require('../services/ruleChainService');
const validate = require('../middlewares/validate');
const { querySchema } = require('../validators/ruleChainValidators');

// Request handlers
const getAllChains = async (req, res) => {
  try {
    const { organizationId } = req.query;
    const ruleChains = await ruleChainService.findAllChains(organizationId);
    res.json({
      status: 'success',
      data: ruleChains
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const createChain = async (req, res) => {
  try {
    const ruleChain = await ruleChainService.createChain(req.body);
    res.status(201).json({
      status: 'success',
      data: ruleChain
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const getChainById = async (req, res) => {
  try {
    const ruleChain = await ruleChainService.findChainById(req.params.id);
    if (!ruleChain) {
      return res.status(404).json({
        status: 'error',
        message: 'Rule chain not found'
      });
    }
    res.json({
      status: 'success',
      data: ruleChain
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const updateChain = async (req, res) => {
  try {
    const ruleChain = await ruleChainService.updateChain(req.params.id, req.body);
    res.json({
      status: 'success',
      data: ruleChain
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const deleteChain = async (req, res) => {
  try {
    await ruleChainService.deleteChain(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const getAllNodes = async (req, res) => {
  try {
    const nodes = await ruleChainService.findAllNodes(req.params.ruleChainId);
    res.json({
      status: 'success',
      data: nodes
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const createNode = async (req, res) => {
  try {
    const node = await ruleChainService.createNode(req.body);
    res.status(201).json({
      status: 'success',
      data: node
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const getNodeById = async (req, res) => {
  try {
    const node = await ruleChainService.findNodeById(req.params.id);
    if (!node) {
      return res.status(404).json({
        status: 'error',
        message: 'Node not found'
      });
    }
    res.json({
      status: 'success',
      data: node
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const updateNode = async (req, res) => {
  try {
    const node = await ruleChainService.updateNode(req.params.id, req.body);
    res.json({
      status: 'success',
      data: node
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const deleteNode = async (req, res) => {
  try {
    await ruleChainService.deleteNode(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const executeChain = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!data) {
      return res.status(400).json({
        status: 'error',
        message: 'Sensor data is required'
      });
    }

    const result = await ruleChainService.execute(id, data);
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const triggerChain = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;
    const result = await ruleChainService.trigger(organizationId);
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// RuleChain routes
router
  .route('/')
  .get(
    authenticate,
    checkPermission('rule.view'),
    validate(querySchema, { query: true }),
    getAllChains
  )
  .post(
    authenticate,
    checkPermission('rule.create'),
    createChain
  );

router
  .route('/:id')
  .get(
    authenticate,
    checkPermission('rule.view'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    getChainById
  )
  .patch(
    authenticate,
    checkPermission('rule.update'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    updateChain
  )
  .delete(
    authenticate,
    checkPermission('rule.delete'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    deleteChain
  );

// RuleChainNode routes
router.get(
  '/:ruleChainId/nodes',
  authenticate,
  checkPermission('rule.view'),
  checkResourceOwnership(getRuleChainForOwnershipCheck, 'ruleChainId'),
  getAllNodes
);

router.post(
  '/nodes',
  authenticate,
  checkPermission('rule.update'),
  createNode
);

router
  .route('/nodes/:id')
  .get(
    authenticate,
    checkPermission('rule.view'),
    //checkResourceOwnership(getRuleChainForOwnershipCheck),
    getNodeById
  )
  .patch(
    authenticate,
    checkPermission('rule.update'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    updateNode
  )
  .delete(
    authenticate,
    checkPermission('rule.delete'),
    checkResourceOwnership(getRuleChainForOwnershipCheck),
    deleteNode
  );

// Execute route
router.post(
  '/:id/execute',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  executeChain
);

// Trigger route
router.post(
  '/:id/trigger',
  authenticate,
  checkPermission('rule.update'),
  checkResourceOwnership(getRuleChainForOwnershipCheck),
  triggerChain
);

module.exports = router;
