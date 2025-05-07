const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const authSchema = require('../validators/authValidators');

const router = express.Router();

// Login route - no authentication required
router.post('/login', validate(authSchema.login), authController.login);

// Signup route - no authentication required
router.post('/signup', validate(authSchema.signup), authController.signup);

// Refresh token route - no authentication required
router.post('/refresh-token', validate(authSchema.refreshToken), authController.refreshToken);

// Logout route - authentication required
router.post('/logout', authenticate, authController.logout);

// Get current user - authentication required
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router; 