const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const logger = require('../utils/logger');
// ARCHITECT NOTE: The Gatekeeper middleware
// [Architecture] Imported requireEventStaff to allow Ground Nodes to fetch their assigned events
const { requireTenantAdmin, requireEventStaff } = require('../middleware/authMiddleware');

/**
 * Route: GET /api/events
 * Purpose: Fetch all public events for the Global Hub.
 */
router.get('/', (req, res) => {
    logger.info('EventRoutes', 'Incoming GET request to fetch all public events.');
    eventController.getPublicEvents(req, res);
});

/**
 * Route: GET /api/events/admin/all
 * Purpose: Fetch ALL events (public & private) for the Master Admin Dashboard.
 * ARCHITECT NOTE: Placed above /:eventSlug to prevent route collision!
 */
router.get('/admin/all', requireEventStaff, (req, res) => {
    logger.info('EventRoutes', 'Incoming GET request for Master Admin event ledger.');
    eventController.getAllAdminEvents(req, res);
});

/**
 * Route: POST /api/events
 * Purpose: Admin creates a new event tenant. Protected by middleware.
 */
router.post('/', requireTenantAdmin, (req, res) => {
    logger.info('EventRoutes', 'Incoming POST request to create a new event.');
    eventController.createEvent(req, res);
});

/**
 * Route: GET /api/events/domain/:hostname
 * Purpose: Edge Proxy resolving MSaaS custom domains to internal slugs.
 * ARCHITECT NOTE: Placed strictly above /:eventSlug to prevent hijacking.
 */
router.get('/domain/:hostname', (req, res) => {
    logger.info('EventRoutes', `Incoming GET request from Edge Proxy for domain resolution: ${req.params.hostname}`);
    eventController.getEventByDomain(req, res);
});

// --- ITINERARY ENGINE ROUTES ---

/**
 * Route: GET /api/events/:eventSlug/schedule
 * Purpose: Fetch the raw temporal itinerary for a specific tenant.
 */
router.get('/:eventSlug/schedule', (req, res) => {
    logger.info('EventRoutes', `Incoming GET request for schedule of event: ${req.params.eventSlug}`);
    eventController.getEventSchedule(req, res);
});

/**
 * Route: PUT /api/events/:eventSlug/schedule
 * Purpose: Admin syncs a new Master Schedule array. Protected by middleware.
 * ARCHITECT NOTE: Using PUT because the controller performs an atomic wipe-and-replace of the schedule.
 */
router.put('/:eventSlug/schedule', requireTenantAdmin, (req, res) => {
    logger.info('EventRoutes', `Incoming PUT request to synchronize schedule for event: ${req.params.eventSlug}`);
    eventController.updateEventSchedule(req, res);
});

// --- VECTOR 2: TELEMETRY & KILL SWITCH ---

/**
 * Route: GET /api/events/:eventSlug/telemetry
 * Purpose: Admin fetches live WebSocket connection counts. Protected by middleware.
 */
router.get('/:eventSlug/telemetry', requireTenantAdmin, (req, res) => {
    logger.info('EventRoutes', `Incoming GET request for telemetry of event: ${req.params.eventSlug}`);
    eventController.getEventTelemetry(req, res);
});

/**
 * Route: POST /api/events/:eventSlug/dissolve
 * Purpose: Admin executes the Kill Switch to manually archive the event and fire emails. Strictly protected.
 */
router.post('/:eventSlug/dissolve', requireTenantAdmin, (req, res) => {
    logger.info('EventRoutes', `Incoming POST request to DISSOLVE mesh for event: ${req.params.eventSlug}`);
    eventController.dissolveEventMesh(req, res);
});

// --- END VECTOR 2 ROUTES ---

/**
 * Route: GET /api/events/:eventSlug
 * Purpose: Fetch metadata for a specific event to populate the Event Hub.
 */
router.get('/:eventSlug', (req, res) => {
    logger.info('EventRoutes', `Incoming GET request to fetch data for event: ${req.params.eventSlug}`);
    eventController.getEventBySlug(req, res);
});

/**
 * Route: PATCH /api/events/:eventSlug
 * Purpose: Admin updates an existing event tenant. Protected by middleware.
 */
router.patch('/:eventSlug', requireTenantAdmin, (req, res) => {
    logger.info('EventRoutes', `Incoming PATCH request to update event: ${req.params.eventSlug}`);
    eventController.updateEvent(req, res);
});

/**
 * Route: DELETE /api/events/:eventSlug
 * Purpose: Admin executes the destructive purge protocol. Strictly protected.
 */
router.delete('/:eventSlug', requireTenantAdmin, (req, res) => {
    logger.info('EventRoutes', `Incoming DELETE request to purge tenant: ${req.params.eventSlug}`);
    eventController.deleteEvent(req, res);
});

module.exports = router;