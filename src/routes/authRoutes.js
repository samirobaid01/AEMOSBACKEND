const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const authSchema = require('../validators/authValidators');

const router = express.Router();

// Login route - no authentication required
router.post('/login', validate(authSchema.login), authController.login);

// Logout route - authentication required
router.post('/logout', authenticate, authController.logout);

// Get current user - authentication required
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router; 