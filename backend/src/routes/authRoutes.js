const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const logger = require('../utils/logger');
// [Architecture] Import the baseline Gatekeeper
const { requireEventStaff } = require('../middleware/authMiddleware');

console.log('[AuthRoutes] Step 1: Mounting Master Security pipelines...');

/**
 * Route: POST /api/auth/login
 * Purpose: Authenticates an admin and mints a cryptographic JWT.
 */
router.post('/login', (req, res, next) => {
    logger.info('AuthRoutes', 'Incoming POST request for Master Admin login sequence.');
    next();
}, authController.adminLogin);

/**
 * Route: POST /api/auth/logout
 * Purpose: Explicitly dissolves the Valkey single-session lock.
 */
router.post('/logout', requireEventStaff, (req, res, next) => {
    logger.info('AuthRoutes', 'Incoming POST request to dissolve Master Admin session lock.');
    next();
}, authController.adminLogout);

console.log('[AuthRoutes] Step 2: Security pipelines successfully mounted.');

module.exports = router;