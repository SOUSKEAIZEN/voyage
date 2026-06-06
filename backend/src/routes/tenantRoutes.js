const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const logger = require('../utils/logger');
// [Architecture] Strict RBAC Gatekeepers
const { requireSuperadmin, requireTenantAdmin } = require('../middleware/authMiddleware');

// --- LEVEL 0: SUPERADMIN ROUTES ---
// Only Superadmins can create Organizations or view all Organizations
router.post('/organizations', requireSuperadmin, (req, res) => {
    logger.info('TenantRoutes', 'Incoming POST request to create an Organization.');
    tenantController.createOrganization(req, res);
});

router.get('/organizations', requireSuperadmin, (req, res) => {
    logger.info('TenantRoutes', 'Incoming GET request for Organizations list.');
    tenantController.getOrganizations(req, res);
});

router.delete('/organizations/:orgId', requireSuperadmin, (req, res) => {
    logger.info('TenantRoutes', `Incoming DELETE request to purge Organization: ${req.params.orgId}`);
    tenantController.deleteOrganization(req, res);
});

// --- LEVEL 1: TENANT ROUTES ---
// Tenant Admins (and Superadmins) can provision users and view their network users
router.post('/users', requireTenantAdmin, (req, res) => {
    logger.info('TenantRoutes', 'Incoming POST request to provision a user.');
    tenantController.provisionUser(req, res);
});

router.get('/users', requireTenantAdmin, (req, res) => {
    logger.info('TenantRoutes', 'Incoming GET request for Network Users.');
    tenantController.getNetworkUsers(req, res);
});

router.delete('/users/:userId', requireTenantAdmin, (req, res) => {
    logger.info('TenantRoutes', `Incoming DELETE request to purge identity: ${req.params.userId}`);
    tenantController.deleteUser(req, res);
});

// Assigning staff to specific events
router.post('/staff/assign', requireTenantAdmin, (req, res) => {
    logger.info('TenantRoutes', 'Incoming POST request to assign staff to an event.');
    tenantController.assignStaffToEvent(req, res);
});

router.delete('/staff/assign', requireTenantAdmin, (req, res) => {
    logger.info('TenantRoutes', 'Incoming DELETE request to sever staff-event assignment.');
    tenantController.removeStaffFromEvent(req, res);
});

module.exports = router;