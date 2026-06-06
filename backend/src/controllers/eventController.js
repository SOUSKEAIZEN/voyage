const db = require('../config/db');
const logger = require('../utils/logger');
// [Architecture] Importing the Automated Edge Deployment Service
const vercelService = require('../services/vercelService');
// [Architecture] Importing the Engine Telemetry for Vector 2
const { getMeshTelemetry } = require('./abyssController');

// --- HELPER: TENANT SANDBOX ---
// [Architecture] Ensures queries are scoped to the Admin's Organization
const getTenantFilter = (admin, tableAlias = 'e') => {
    if (admin.role === 'superadmin') {
        return ''; 
    }
    return ` AND ${tableAlias}.organization_id = ${admin.organization_id} `;
};

// --- READ PIPELINES ---

const getPublicEvents = async (req, res) => {
    const context = 'EventController - getPublicEvents';
    logger.info(context, 'Fetching all public, active events for Global Hub.');

    try {
        const query = `
            SELECT e.slug, e.name as title, e.start_date, e.end_date, e.description as desc, e.location, 
                   e.custom_domain, e.theme_config,
                   COALESCE(
                       (SELECT json_agg(ei.image_url ORDER BY ei.display_order) 
                        FROM event_images ei WHERE ei.event_id = e.id), '[]'::json
                   ) as images
            FROM events e
            WHERE e.is_public = TRUE 
            AND (e.end_date IS NULL OR e.end_date > CURRENT_TIMESTAMP)
            ORDER BY e.created_at DESC;
        `;
        const result = await db.query(query);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error(context, 'Failure Point EV1: CRITICAL FAILURE fetching public events.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getAllAdminEvents = async (req, res) => {
    const context = 'EventController - getAllAdminEvents';
    logger.info(context, `Admin [${req.admin.email}] fetching ALL tenants for Master Control Plane. Role: ${req.admin.role}`);

    try {
        let query = '';
        let values = [];

        // ARCHITECTURE: Three-Tiered Ledger Resolution
        if (req.admin.role === 'superadmin') {
            // [Architecture] Modified to LEFT JOIN organizations for Superadmin grouped multi-tenant UI
            query = `
                SELECT e.id, e.slug, e.name as title, e.start_date, e.end_date, e.description as desc, e.location, e.is_public,
                       e.custom_domain, e.theme_config, e.organization_id, o.name as organization_name,
                       (e.end_date IS NOT NULL AND e.end_date < CURRENT_TIMESTAMP) as is_expired,
                       COALESCE(
                           (SELECT json_agg(ei.image_url ORDER BY ei.display_order) 
                            FROM event_images ei WHERE ei.event_id = e.id), '[]'::json
                       ) as images
                FROM events e
                LEFT JOIN organizations o ON e.organization_id = o.id
                ORDER BY e.created_at DESC;
            `;
        } else if (req.admin.role === 'tenant_admin') {
            query = `
                SELECT e.id, e.slug, e.name as title, e.start_date, e.end_date, e.description as desc, e.location, e.is_public,
                       e.custom_domain, e.theme_config, e.organization_id,
                       (e.end_date IS NOT NULL AND e.end_date < CURRENT_TIMESTAMP) as is_expired,
                       COALESCE(
                           (SELECT json_agg(ei.image_url ORDER BY ei.display_order) 
                            FROM event_images ei WHERE ei.event_id = e.id), '[]'::json
                       ) as images
                FROM events e
                WHERE e.organization_id = $1
                ORDER BY e.created_at DESC;
            `;
            values = [req.admin.organization_id];
        } else if (req.admin.role === 'staff') {
            // Ground Nodes ONLY see explicitly mapped assignments
            query = `
                SELECT e.id, e.slug, e.name as title, e.start_date, e.end_date, e.description as desc, e.location, e.is_public,
                       e.custom_domain, e.theme_config, e.organization_id,
                       (e.end_date IS NOT NULL AND e.end_date < CURRENT_TIMESTAMP) as is_expired,
                       COALESCE(
                           (SELECT json_agg(ei.image_url ORDER BY ei.display_order) 
                            FROM event_images ei WHERE ei.event_id = e.id), '[]'::json
                       ) as images
                FROM events e
                JOIN event_staff_assignments esa ON e.id = esa.event_id
                WHERE esa.admin_id = $1
                ORDER BY e.created_at DESC;
            `;
            values = [req.admin.id];
        }

        const result = await db.query(query, values);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error(context, 'Failure Point EV11: CRITICAL FAILURE fetching all admin events.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getEventBySlug = async (req, res) => {
    const context = 'EventController - getEventBySlug';
    const { eventSlug } = req.params;
    logger.info(context, `Fetching details and schedule for event: ${eventSlug}`);

    try {
        // ARCHITECT NOTE: The query now automatically resolves the temporal itinerary engine (event_schedules)
        const query = `
            SELECT e.id, e.slug, e.name as title, e.start_date, e.end_date, e.description as desc, e.location, e.is_public,
                   e.custom_domain, e.theme_config, e.organization_id,
                   (e.end_date IS NOT NULL AND e.end_date < CURRENT_TIMESTAMP) as is_expired,
                   COALESCE(
                       (SELECT json_agg(ei.image_url ORDER BY ei.display_order) 
                        FROM event_images ei WHERE ei.event_id = e.id), '[]'::json
                   ) as images,
                   COALESCE(
                       (SELECT json_agg(json_build_object(
                           'id', es.id,
                           'title', es.title,
                           'description', es.description,
                           'speaker_name', es.speaker_name,
                           'location', es.location,
                           'start_time', es.start_time,
                           'end_time', es.end_time
                       ) ORDER BY es.start_time ASC) 
                        FROM event_schedules es WHERE es.event_id = e.id), '[]'::json
                   ) as schedule
            FROM events e
            WHERE e.slug = $1;
        `;
        const result = await db.query(query, [eventSlug]);

        if (result.rowCount === 0) {
            logger.warn(context, `Failure Point EV2: Event not found for slug: ${eventSlug}`);
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        const event = result.rows[0];

        // Ensure Tenant Admins don't read settings for other agency's events
        if (req.admin && req.admin.role === 'tenant_admin') {
            if (event.organization_id !== req.admin.organization_id) {
                return res.status(403).json({ success: false, message: 'Forbidden: You do not own this Event Node.' });
            }
        }

        res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        logger.error(context, `Failure Point EV3: CRITICAL FAILURE fetching event ${eventSlug}.`, error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getEventByDomain = async (req, res) => {
    const context = 'EventController - getEventByDomain';
    const { hostname } = req.params;
    logger.info(context, `Step 1: Edge Proxy requesting domain resolution for: ${hostname}`);

    try {
        const query = `
            SELECT slug, theme_config 
            FROM events 
            WHERE custom_domain = $1 
            AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP);
        `;
        const result = await db.query(query, [hostname]);

        if (result.rowCount === 0) {
            logger.warn(context, `Failure Point EV-Domain: Domain [${hostname}] is not mapped to any active MSaaS Node.`);
            return res.status(404).json({ success: false, message: 'Domain unallocated or event expired.' });
        }

        logger.info(context, `Step 2: Domain [${hostname}] securely resolved to Node [${result.rows[0].slug}]. Transmitting payload...`);

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error(context, `Failure Point EV-Domain-Crit: CRITICAL FAILURE resolving domain ${hostname}.`, error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// --- ITINERARY ENGINE (SCHEDULE) PIPELINES ---

const getEventSchedule = async (req, res) => {
    const context = 'EventController - getEventSchedule';
    const { eventSlug } = req.params;
    logger.info(context, `Step 1: Fetching raw itinerary for tenant: ${eventSlug}`);

    try {
        const query = `
            SELECT es.id, es.title, es.description, es.speaker_name, es.location, es.start_time, es.end_time 
            FROM event_schedules es
            JOIN events e ON es.event_id = e.id
            WHERE e.slug = $1
            ORDER BY es.start_time ASC;
        `;
        
        const result = await db.query(query, [eventSlug]);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error(context, `Failure Point EV-SCH-1: CRITICAL FAILURE fetching schedule for ${eventSlug}.`, error);
        res.status(500).json({ success: false, message: 'Internal server error fetching schedule.' });
    }
};

const updateEventSchedule = async (req, res) => {
    const context = 'EventController - updateEventSchedule';
    const { eventSlug } = req.params;
    const { schedule } = req.body; // Expects an array of schedule items
    
    logger.info(context, `Step 1: Admin initiating Master Itinerary Override for tenant: ${eventSlug}`);

    const client = await db.connect();

    try {
        await client.query('BEGIN'); // Start atomic transaction

        // 1. Resolve slug to Event ID + Apply Tenant Sandbox
        const tenantFilter = getTenantFilter(req.admin, 'events');
        const eventQuery = `SELECT id FROM events WHERE slug = $1 ${tenantFilter};`;
        const eventResult = await client.query(eventQuery, [eventSlug]);

        if (eventResult.rowCount === 0) {
            await client.query('ROLLBACK');
            logger.warn(context, `Failure Point EV-SCH-2: Target tenant not found or insufficient clearance: ${eventSlug}`);
            return res.status(404).json({ success: false, message: 'Event not found or insufficient clearance.' });
        }

        const eventId = eventResult.rows[0].id;

        // 2. Erase existing schedule (Atomic wipe)
        logger.info(context, `Step 2: Purging legacy temporal data...`);
        await client.query(`DELETE FROM event_schedules WHERE event_id = $1;`, [eventId]);

        // 3. Inject new schedule items
        if (schedule && Array.isArray(schedule) && schedule.length > 0) {
            logger.info(context, `Step 3: Injecting ${schedule.length} new temporal nodes into the ledger...`);
            
            for (const item of schedule) {
                const insertQuery = `
                    INSERT INTO event_schedules (event_id, title, description, speaker_name, location, start_time, end_time)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `;
                // Architect Note: The DB enforces absolute UTC. Ensure frontend passes ISO 8601 strings.
                await client.query(insertQuery, [
                    eventId, 
                    item.title, 
                    item.description || null, 
                    item.speaker_name || null, 
                    item.location || null, 
                    item.start_time, 
                    item.end_time
                ]);
            }
        }

        await client.query('COMMIT'); // Seal the transaction
        logger.info(context, `Step 4: Master Itinerary successfully synchronized.`);

        res.status(200).json({
            success: true,
            message: 'Schedule successfully updated.'
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Abort on any failure to maintain data integrity
        logger.error(context, `Failure Point EV-SCH-3: Transaction severed during schedule sync for ${eventSlug}.`, error);
        res.status(500).json({ success: false, message: 'Internal server error during schedule sync.' });
    } finally {
        client.release();
    }
};

// --- VECTOR 2: TELEMETRY & KILL SWITCH ---

const getEventTelemetry = async (req, res) => {
    const context = `EventController - getEventTelemetry`;
    const { eventSlug } = req.params;
    
    logger.info(context, `Step 1: Admin requesting live telemetry for node ${eventSlug}...`);

    try {
        const tenantFilter = getTenantFilter(req.admin, 'events');
        const eventQuery = `SELECT id FROM events WHERE slug = $1 ${tenantFilter};`;
        const eventResult = await db.query(eventQuery, [eventSlug]);

        if (eventResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Event not found or insufficient clearance.' });
        }

        const eventId = eventResult.rows[0].id;
        const io = req.app.get('io'); // Retrieve the mounted Socket.io instance
        
        // Execute the telemetry ping across the horizontal Valkey cluster
        const telemetry = await getMeshTelemetry(io, eventId);

        if (!telemetry.success) {
            throw new Error(telemetry.error);
        }

        // We can also fetch the total registered guests to provide a ratio
        const registeredQuery = `SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND current_state = 2;`;
        const registeredResult = await db.query(registeredQuery, [eventId]);
        const totalRegistered = parseInt(registeredResult.rows[0].count, 10);

        res.status(200).json({
            success: true,
            data: {
                activeConnections: telemetry.activeConnections,
                totalRegisteredVerified: totalRegistered
            }
        });

    } catch (error) {
        logger.error(context, `Failure Point EV-TEL: Failed to extract live telemetry.`, error);
        res.status(500).json({ success: false, message: 'Internal server error extracting telemetry.' });
    }
};

const dissolveEventMesh = async (req, res) => {
    const context = 'EventController - dissolveEventMesh';
    const { eventSlug } = req.params;

    logger.warn(context, `!!! CRITICAL COMMAND RECEIVED: Admin initiated THE DISSOLVE for Node [${eventSlug}] !!!`);

    try {
        const tenantFilter = getTenantFilter(req.admin, 'events');
        const eventQuery = `SELECT id, name FROM events WHERE slug = $1 ${tenantFilter};`;
        const eventResult = await db.query(eventQuery, [eventSlug]);

        if (eventResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Event not found or insufficient clearance.' });
        }

        const eventId = eventResult.rows[0].id;
        const eventName = eventResult.rows[0].name;
        const io = req.app.get('io');
        const { redisClient } = require('../config/cache');

        // 1. Terminate all active Socket connections
        logger.info(context, `Step 1: Severing all active WebSockets for Node [${eventId}]...`);
        const meshRoom = `node:${eventId}:abyss`;
        const sockets = await io.in(meshRoom).fetchSockets();
        
        // Inform clients of the forced ejection before dropping them
        io.to(meshRoom).emit('mesh_dissolved', { message: 'The event has concluded. The mesh is permanently dissolved.' });
        
        sockets.forEach(socket => {
            socket.disconnect(true);
        });

        // 2. Wipe the presence cache in Valkey
        if (redisClient) {
            logger.info(context, `Step 2: Purging Ephemeral Node State from Valkey...`);
            const presenceKey = `abyss:node:${eventId}:online`;
            await redisClient.del(presenceKey);
        }

        // 3. Mark the event as expired in the Global Ledger
        logger.info(context, `Step 3: Committing temporal archive stamp to Global Ledger...`);
        const archiveQuery = `UPDATE events SET end_date = CURRENT_TIMESTAMP WHERE id = $1;`;
        await db.query(archiveQuery, [eventId]);

        // 4. Trigger the Background Worker for Final Export
        // Note: Instead of doing it synchronously and blocking the request, we trigger it 
        // to run in the background. If you have a dedicated queue (like BullMQ), you'd use that here.
        // For zero-cost setup, we execute an async function without awaiting it.
        logger.info(context, `Step 4: Arming background worker to dispatch Mesh Exports...`);
        const { processMeshExportForEvent } = require('../services/meshDissolver'); // You may need to create this specific function in meshDissolver.js
        processMeshExportForEvent(eventId, eventName).catch(err => {
            logger.error(context, `BACKGROUND WORKER FAILURE: Mesh Export failed.`, err);
        });

        logger.info(context, `!!! DISSOLVE COMPLETE. Node [${eventSlug}] is archived. !!!`);

        res.status(200).json({
            success: true,
            message: 'The Ephemeral Mesh has been permanently dissolved.'
        });

    } catch (error) {
        logger.error(context, `Failure Point EV-DISSOLVE: The Kill Switch failed to execute properly.`, error);
        res.status(500).json({ success: false, message: 'Internal server error during mesh dissolution.' });
    }
};

// --- WRITE PIPELINES ---

const createEvent = async (req, res) => {
    const context = 'EventController - createEvent';
    logger.info(context, 'Step 1: Admin attempting to deploy a new tenant.');

    try {
        const { name, slug, description, startDate, endDate, location, isPublic, images, customDomain, themeConfig } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ success: false, message: 'Event Name and Slug are required.' });
        }

        const safeCustomDomain = customDomain && customDomain.trim() !== '' ? customDomain.trim() : null;
        const safeThemeConfig = themeConfig || {};

        logger.info(context, 'Step 2: Scanning ledger for Name, Slug, or Domain collisions...');
        const checkQuery = `
            SELECT slug, name, custom_domain 
            FROM events 
            WHERE slug = $1 OR name ILIKE $2 OR (custom_domain = $3 AND custom_domain IS NOT NULL);
        `;
        const checkResult = await db.query(checkQuery, [slug, name, safeCustomDomain]);

        if (checkResult.rowCount > 0) {
            const collision = checkResult.rows[0];
            if (collision.slug === slug) {
                return res.status(409).json({ success: false, message: 'An event with this URL slug already exists.' });
            }
            if (collision.name.toLowerCase() === name.toLowerCase()) {
                return res.status(409).json({ success: false, message: 'An event with this exact Name already exists.' });
            }
            if (collision.custom_domain === safeCustomDomain) {
                return res.status(409).json({ success: false, message: 'This Custom Domain is already mapped to another event.' });
            }
        }

        // [Architecture] Automated Vercel Domain Injection
        if (safeCustomDomain) {
            try {
                await vercelService.addCustomDomain(safeCustomDomain);
            } catch (vercelError) {
                return res.status(400).json({ success: false, message: vercelError.message });
            }
        }

        logger.info(context, 'Step 3: Collision check passed. Inserting into database with MSaaS Edge configs...');
        
        // Resolve Org ID based on Admin Tier
        const orgId = req.admin.role === 'superadmin' ? null : req.admin.organization_id;

        const insertQuery = `
            INSERT INTO events (name, slug, description, start_date, end_date, location, is_public, custom_domain, theme_config, organization_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, name, slug, custom_domain, is_public;
        `;
        
        const publicFlag = isPublic !== undefined ? isPublic : true;
        const safeStartDate = startDate ? startDate : null;
        const safeEndDate = endDate ? endDate : null;

        const values = [name, slug, description, safeStartDate, safeEndDate, location, publicFlag, safeCustomDomain, safeThemeConfig, orgId];
        const result = await db.query(insertQuery, values);
        const newEvent = result.rows[0];

        if (images && Array.isArray(images) && images.length > 0) {
            logger.info(context, `Step 3.5: Provisioning ${images.length} images for tenant...`);
            const insertPromises = images.map((url, idx) => {
                return db.query(
                    `INSERT INTO event_images (event_id, image_url, display_order) VALUES ($1, $2, $3)`,
                    [newEvent.id, url, idx]
                );
            });
            await Promise.all(insertPromises);
            newEvent.images = images;
        } else {
            newEvent.images = [];
        }

        logger.info(context, `Step 4: Successfully deployed new tenant: ${newEvent.slug}`);

        res.status(201).json({
            success: true,
            message: 'Event successfully created.',
            data: newEvent
        });

    } catch (error) {
        logger.error(context, 'Failure Point EV6: CRITICAL FAILURE deploying tenant.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const updateEvent = async (req, res) => {
    const context = 'EventController - updateEvent';
    const currentSlug = req.params.eventSlug;
    logger.info(context, `Step 1: Admin attempting to update tenant: ${currentSlug}`);

    try {
        const { name, slug, description, startDate, endDate, location, isPublic, images, customDomain, themeConfig } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ success: false, message: 'Event Name and Slug are required.' });
        }

        logger.info(context, 'Step 2: Verifying target tenant exists...');
        const tenantFilter = getTenantFilter(req.admin, 'events');
        const checkExistQuery = `SELECT id, custom_domain FROM events WHERE slug = $1 ${tenantFilter};`;
        const existResult = await db.query(checkExistQuery, [currentSlug]);

        if (existResult.rowCount === 0) {
            logger.warn(context, `Failure Point EV-Update: Target tenant not found or insufficient clearance: ${currentSlug}`);
            return res.status(404).json({ success: false, message: 'Event not found or insufficient clearance.' });
        }

        const existingEvent = existResult.rows[0];
        const eventId = existingEvent.id;
        const oldCustomDomain = existingEvent.custom_domain;
        
        const safeCustomDomain = customDomain && customDomain.trim() !== '' ? customDomain.trim() : null;
        const safeThemeConfig = themeConfig || {};

        logger.info(context, 'Step 3: Scanning ledger for collision with other nodes...');
        const checkCollisionQuery = `
            SELECT slug, name, custom_domain 
            FROM events 
            WHERE (slug = $1 OR name ILIKE $2 OR (custom_domain = $3 AND custom_domain IS NOT NULL)) 
            AND id != $4;
        `;
        const collisionResult = await db.query(checkCollisionQuery, [slug, name, safeCustomDomain, eventId]);
        
        if (collisionResult.rowCount > 0) {
            const collision = collisionResult.rows[0];
            if (collision.slug === slug) {
                return res.status(409).json({ success: false, message: 'The requested URL slug is already in use by another event.' });
            }
            if (collision.name.toLowerCase() === name.toLowerCase()) {
                return res.status(409).json({ success: false, message: 'The requested Event Name is already in use by another event.' });
            }
            if (collision.custom_domain === safeCustomDomain) {
                return res.status(409).json({ success: false, message: 'This Custom Domain is already mapped to another event.' });
            }
        }

        // [Architecture] Edge Proxy Reconciliation
        // If the domain changed, remove the old one from Vercel and add the new one
        if (oldCustomDomain !== safeCustomDomain) {
            try {
                if (oldCustomDomain) {
                    await vercelService.removeCustomDomain(oldCustomDomain);
                }
                if (safeCustomDomain) {
                    await vercelService.addCustomDomain(safeCustomDomain);
                }
            } catch (vercelError) {
                return res.status(400).json({ success: false, message: vercelError.message });
            }
        }

        logger.info(context, 'Step 4: Collision check passed. Committing MSaaS updates...');
        const updateQuery = `
            UPDATE events 
            SET name = $1, slug = $2, description = $3, start_date = $4, end_date = $5, location = $6, is_public = $7, custom_domain = $8, theme_config = $9
            WHERE id = $10
            RETURNING id, name, slug, custom_domain, is_public;
        `;
        
        const publicFlag = isPublic !== undefined ? isPublic : true;
        const safeStartDate = startDate ? startDate : null;
        const safeEndDate = endDate ? endDate : null;

        const values = [name, slug, description, safeStartDate, safeEndDate, location, publicFlag, safeCustomDomain, safeThemeConfig, eventId];

        const result = await db.query(updateQuery, values);
        const updatedEvent = result.rows[0];

        if (images && Array.isArray(images)) {
            logger.info(context, `Step 4.5: Synchronizing image node architecture...`);
            await db.query(`DELETE FROM event_images WHERE event_id = $1`, [eventId]);
            
            if (images.length > 0) {
                const insertPromises = images.map((url, idx) => {
                    return db.query(
                        `INSERT INTO event_images (event_id, image_url, display_order) VALUES ($1, $2, $3)`,
                        [eventId, url, idx]
                    );
                });
                await Promise.all(insertPromises);
            }
            updatedEvent.images = images;
        }

        logger.info(context, `Step 5: Successfully updated tenant: ${updatedEvent.slug}`);

        res.status(200).json({
            success: true,
            message: 'Event successfully updated.',
            data: updatedEvent
        });

    } catch (error) {
        logger.error(context, `Failure Point EV10: CRITICAL FAILURE updating tenant ${currentSlug}.`, error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const deleteEvent = async (req, res) => {
    const context = 'EventController - deleteEvent';
    const { eventSlug } = req.params;
    logger.info(context, `Step 1: Admin initiated purge protocol for tenant: ${eventSlug}`);

    try {
        const tenantFilter = getTenantFilter(req.admin, 'events');
        const checkQuery = `SELECT id, name, custom_domain FROM events WHERE slug = $1 ${tenantFilter};`;
        const checkResult = await db.query(checkQuery, [eventSlug]);

        if (checkResult.rowCount === 0) {
            logger.warn(context, `Failure Point EV12: Cannot delete, event not found or insufficient clearance: ${eventSlug}`);
            return res.status(404).json({ success: false, message: 'Event not found or insufficient clearance.' });
        }

        const targetEvent = checkResult.rows[0];
        const deleteQuery = `DELETE FROM events WHERE id = $1 RETURNING id;`;
        await db.query(deleteQuery, [targetEvent.id]);

        // [Architecture] Purge the custom domain from Vercel to free it up globally
        if (targetEvent.custom_domain) {
            try {
                await vercelService.removeCustomDomain(targetEvent.custom_domain);
            } catch (vercelError) {
                logger.warn(context, `Domain purge warning: ${vercelError.message}. Database deletion will proceed regardless.`);
            }
        }

        logger.info(context, `Step 2: Tenant ${targetEvent.name} and all cascading data successfully obliterated.`);
        res.status(200).json({ 
            success: true, 
            message: 'Tenant environment has been securely purged.' 
        });

    } catch (error) {
        logger.error(context, `Failure Point EV13: CRITICAL FAILURE during deletion of ${eventSlug}.`, error);
        res.status(500).json({ success: false, message: 'Internal server error during deletion cascade.' });
    }
};

module.exports = {
    getPublicEvents,
    getAllAdminEvents,
    getEventBySlug,
    getEventByDomain,
    getEventSchedule,       
    updateEventSchedule,    
    getEventTelemetry,    // NEW: Vector 2 
    dissolveEventMesh,    // NEW: Vector 2 (The Kill Switch)
    createEvent,
    updateEvent,
    deleteEvent
};