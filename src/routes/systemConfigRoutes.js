const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/permission');
const {
  getAllConfigs,
  getConfig,
  upsertConfig,
  deleteConfig,
} = require('../controllers/systemConfigController');

// All system-config endpoints require authentication + system.config permission
router.use(authenticate);
router.use(checkPermission('system.config'));

router.get('/',          getAllConfigs);
router.get('/:key',      getConfig);
router.put('/',          upsertConfig);
router.delete('/:key',   deleteConfig);

module.exports = router;
