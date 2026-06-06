const crypto = require('crypto');
const bcrypt = require('bcrypt'); // [Architecture] Cryptographic salting
const jwt = require('jsonwebtoken'); // [Architecture] Token minting
const db = require('../config/db');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const { redisClient } = require('../config/cache');

// --- HELPER: TENANT & STAFF SANDBOX ---
// Verifies if the Admin has clearance to view/edit guests for this specific event.
const checkEventClearance = async (admin, eventId, context) => {
    if (admin.role === 'superadmin') return true;

    if (admin.role === 'tenant_admin') {
        const query = `SELECT id FROM events WHERE id = $1 AND organization_id = $2;`;
        const result = await db.query(query, [eventId, admin.organization_id]);
        if (result.rowCount === 0) {
            logger.warn(context, `SECURITY: TenantAdmin [${admin.email}] blocked from Event [${eventId}]`);
            return false;
        }
        return true;
    }

    if (admin.role === 'staff') {
        const query = `SELECT event_id FROM event_staff_assignments WHERE admin_id = $1 AND event_id = $2;`;
        const result = await db.query(query, [admin.id, eventId]);
        if (result.rowCount === 0) {
            logger.warn(context, `SECURITY: EventStaff [${admin.email}] blocked from Event [${eventId}]`);
            return false;
        }
        return true;
    }

    return false;
};

// ARCHITECT NOTE: Upgraded helper to return ID, Name, and Org to support dynamic emails and RBAC.
const getEventBySlug = async (slug, context) => {
    const result = await db.query('SELECT id, name, organization_id FROM events WHERE slug = $1', [slug]);
    if (result.rowCount === 0) {
        logger.warn(context, `Failure Point E1: Event slug not found in database: ${slug}`);
        return null;
    }
    return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        organization_id: result.rows[0].organization_id
    };
};

const getGlobalGuests = async (req, res) => {
    const context = 'GuestController - getGlobalGuests';
    logger.info(context, `Admin [${req.admin?.email}] fetching Guest Directory. Role: ${req.admin?.role}`);

    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        let limit = parseInt(req.query.limit) || 10;
        if (limit > 100) limit = 100;
        
        const offset = (page - 1) * limit;

        let fetchQuery;
        let countQuery;
        let queryParams = [limit, offset];
        let countParams = [];

        // [Architecture] Dynamic RBAC Query Branching
        if (req.admin.role === 'superadmin') {
            // Master Ledger: See everyone, and all their events across all sandboxes.
            fetchQuery = `
                SELECT 
                    g.id, 
                    g.full_name, 
                    g.email, 
                    g.phone,
                    g.created_at,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'title', e.name,
                                'slug', e.slug,
                                'state', er.current_state
                            )
                        ) FILTER (WHERE e.id IS NOT NULL), '[]'
                    ) as registered_events
                FROM guests g
                LEFT JOIN event_registrations er ON g.id = er.guest_id
                LEFT JOIN events e ON er.event_id = e.id
                GROUP BY g.id
                ORDER BY g.created_at DESC
                LIMIT $1 OFFSET $2;
            `;
            countQuery = `SELECT COUNT(*) FROM guests;`;
        } else {
            // Tenant Sandbox: See ONLY guests registered to your events, 
            // and ONLY see your events in their registration payload to prevent intel leaks.
            fetchQuery = `
                SELECT 
                    g.id, 
                    g.full_name, 
                    g.email, 
                    g.phone,
                    g.created_at,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'title', e.name,
                                'slug', e.slug,
                                'state', er.current_state
                            )
                        ), '[]'
                    ) as registered_events
                FROM guests g
                JOIN event_registrations er ON g.id = er.guest_id
                JOIN events e ON er.event_id = e.id AND e.organization_id = $3
                GROUP BY g.id, g.full_name, g.email, g.phone, g.created_at
                ORDER BY g.created_at DESC
                LIMIT $1 OFFSET $2;
            `;
            countQuery = `
                SELECT COUNT(DISTINCT g.id) 
                FROM guests g
                JOIN event_registrations er ON g.id = er.guest_id
                JOIN events e ON er.event_id = e.id AND e.organization_id = $1;
            `;
            queryParams.push(req.admin.organization_id);
            countParams.push(req.admin.organization_id);
        }

        const result = await db.query(fetchQuery, queryParams);
        const countResult = await db.query(countQuery, countParams);
        
        const totalGuests = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalGuests / limit);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: { currentPage: page, limit, totalPages, totalGuests }
        });

    } catch (error) {
        logger.error(context, 'Failure Point G10: CRITICAL FAILURE fetching global guests.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const registerGuest = async (req, res) => {
    const context = 'GuestController - Register';
    const eventSlug = req.params.eventSlug;
    logger.info(context, `Received new registration request for event: ${eventSlug}`);

    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }
        
        const eventId = event.id;
        const eventName = event.name;

        const { fullName, email, phone, idNumber, idDocumentUrl, dietaryRestrictions } = req.body;

        if (!fullName || !email || !idNumber || !idDocumentUrl) {
            logger.warn(context, `Failure Point E2: Validation failed. Missing fields for email: ${email || 'UNKNOWN'}`);
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: fullName, email, idNumber, and idDocumentUrl are mandatory.'
            });
        }

        let guestId;
        const findGuestQuery = `SELECT id FROM guests WHERE email = $1;`;
        const guestResult = await db.query(findGuestQuery, [email]);

        if (guestResult.rowCount > 0) {
            guestId = guestResult.rows[0].id;
            logger.info(context, `Step 1: Found existing global identity for ${email} (ID: ${guestId})`);
        } else {
            const insertGuestQuery = `
                INSERT INTO guests (full_name, email, phone) 
                VALUES ($1, $2, $3) RETURNING id;
            `;
            const newGuestResult = await db.query(insertGuestQuery, [fullName, email, phone]);
            guestId = newGuestResult.rows[0].id;
            logger.info(context, `Step 1: Created new global identity for ${email} (ID: ${guestId})`);
        }

        const checkDuplicateQuery = `SELECT id FROM event_registrations WHERE guest_id = $1 AND event_id = $2;`;
        const duplicateCheck = await db.query(checkDuplicateQuery, [guestId, eventId]);
        
        if (duplicateCheck.rowCount > 0) {
            logger.warn(context, `Failure Point E3: Registration failed. Guest already has a ticket for this event: ${email}`);
            return res.status(409).json({
                success: false,
                message: 'You are already registered for this specific event.'
            });
        }

        // [Architecture] Cryptographic hashing of the access code
        const rawAccessCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        logger.info(context, `Step 2: Generated secure access code for registration. Salting and hashing...`);
        const hashedAccessCode = await bcrypt.hash(rawAccessCode, 10);

        const insertRegQuery = `
            INSERT INTO event_registrations (
                guest_id, event_id, id_number, id_document_url, dietary_restrictions, current_state, access_code
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7
            ) RETURNING guest_id, current_state;
        `;
        const regValues = [guestId, eventId, idNumber, idDocumentUrl, dietaryRestrictions, 1, hashedAccessCode];

        const result = await db.query(insertRegQuery, regValues);
        const newRegistration = result.rows[0];

        logger.stateChange(newRegistration.guest_id, 0, newRegistration.current_state);
        logger.info(context, `Successfully registered guest: ${newRegistration.guest_id} for event ID: ${eventId}`);

        // We dispatch the RAW code to the email, but only the HASH is in the DB
        emailService.sendAccessCode(email, fullName, rawAccessCode, eventName)
            .then(() => {
                logger.info(context, `Background email delivery successful for: ${email}`);
            })
            .catch((emailError) => {
                logger.error(context, `Failure Point E4-B: Background Email Delivery Failed to ${email}.`, emailError);
            });

        res.status(201).json({
            success: true,
            message: 'Guest successfully registered.',
            guestId: newRegistration.guest_id
        });

    } catch (error) {
        logger.error(context, 'Failure Point E4: CRITICAL FAILURE during guest registration.', error);
        res.status(500).json({ success: false, message: 'Internal server error during registration.' });
    }
};

const getAllGuests = async (req, res) => {
    const context = 'GuestController - getAllGuests';
    const eventSlug = req.params.eventSlug;

    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        
        const eventId = event.id;

        // [Architecture] Enforce RBAC Sandbox for Ledger Viewing
        const hasClearance = await checkEventClearance(req.admin, eventId, context);
        if (!hasClearance) return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this Event Node.' });

        const page = Math.max(1, parseInt(req.query.page) || 1);
        let limit = parseInt(req.query.limit) || 10;
        
        if (limit > 100) limit = 100;
        if (limit < 1) limit = 10;

        const offset = (page - 1) * limit;

        let queryValues = [eventId];
        let countQueryValues = [eventId];
        let whereConditions = ['er.event_id = $1'];

        if (req.query.state !== undefined && req.query.state !== '') {
            const stateFilter = parseInt(req.query.state);
            const validStates = [0, 1, 2, -1];
            
            if (!validStates.includes(stateFilter)) {
                logger.warn(context, `Failure Point K: Invalid state filter: ${stateFilter}`);
                return res.status(400).json({ success: false, message: 'Invalid state filter.' });
            }
            
            whereConditions.push(`er.current_state = $${queryValues.length + 1}`);
            queryValues.push(stateFilter);
            countQueryValues.push(stateFilter);
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        queryValues.push(limit);
        const limitParamIndex = queryValues.length;
        
        queryValues.push(offset);
        const offsetParamIndex = queryValues.length;

        const fetchQuery = `
            SELECT g.id, g.full_name, g.email, er.current_state, er.registered_at as created_at 
            FROM guests g
            JOIN event_registrations er ON g.id = er.guest_id
            ${whereClause}
            ORDER BY er.registered_at DESC 
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex};
        `;
        
        const countQuery = `
            SELECT COUNT(*) 
            FROM guests g
            JOIN event_registrations er ON g.id = er.guest_id
            ${whereClause};
        `;

        const result = await db.query(fetchQuery, queryValues);
        const countResult = await db.query(countQuery, countQueryValues);
        
        const totalGuests = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalGuests / limit);

        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: { currentPage: page, limit, totalPages, totalGuests }
        });

    } catch (error) {
        logger.error(context, 'Failure Point P3: CRITICAL FAILURE during guest retrieval.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const updateGuestState = async (req, res) => {
    const context = 'GuestController - updateState';
    const guestId = req.params.id;
    const eventSlug = req.params.eventSlug;
    
    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        
        const eventId = event.id;

        // [Architecture] Enforce RBAC Sandbox for State Mutations
        const hasClearance = await checkEventClearance(req.admin, eventId, context);
        if (!hasClearance) return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to execute commands in this Node.' });

        const { newState, errorLog } = req.body;
        if (![0, 1, 2, -1].includes(newState)) {
            return res.status(400).json({ success: false, message: 'Invalid state value.' });
        }

        const checkQuery = `SELECT current_state FROM event_registrations WHERE guest_id = $1 AND event_id = $2;`;
        const checkResult = await db.query(checkQuery, [guestId, eventId]);

        if (checkResult.rowCount === 0) {
            logger.warn(context, `Failure Point E5: IDOR Attempt or missing ticket. Guest: ${guestId}, Event: ${eventId}`);
            return res.status(404).json({ success: false, message: 'Guest is not registered for this event.' });
        }

        const currentState = checkResult.rows[0].current_state;
        
        const updateQuery = `
            UPDATE event_registrations 
            SET current_state = $1, error_log = $2
            WHERE guest_id = $3 AND event_id = $4
            RETURNING guest_id as id, current_state;
        `;
        const logEntry = newState === -1 ? errorLog : null;
        const updateResult = await db.query(updateQuery, [newState, logEntry, guestId, eventId]);
        const updatedGuest = updateResult.rows[0];

        logger.stateChange(updatedGuest.id, currentState, updatedGuest.current_state);

        // [Architecture] THE ABYSS: Real-Time State Injection
        const io = req.app.get('io');
        if (io) {
            // Fire a targeted pulse directly to the specific guest's private room
            io.to(`guest:${guestId}`).emit('state_upgrade', {
                eventId: eventId,
                eventSlug: eventSlug,
                newState: updatedGuest.current_state
            });
            logger.info(context, `Step 4: Real-time 'state_upgrade' pulse fired to Abyss room [guest:${guestId}].`);
        } else {
            logger.warn(context, `Failure Point Abyss-1: Socket.io engine not found on app instance. Pulse failed.`);
        }

        res.status(200).json({ success: true, data: updatedGuest });

    } catch (error) {
        logger.error(context, `Failure Point E6: CRITICAL FAILURE updating state.`, error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const guestLogin = async (req, res) => {
    const context = 'GuestController - Login';
    const eventSlug = req.params.eventSlug;

    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        
        const eventId = event.id;

        const { email, accessCode } = req.body;
        if (!email || !accessCode) {
            return res.status(400).json({ success: false, message: 'Email and access code are required.' });
        }

        const query = `
            SELECT g.id, g.email, g.full_name, er.current_state, er.id_document_url, er.access_code, g.phone, er.dietary_restrictions 
            FROM guests g
            JOIN event_registrations er ON g.id = er.guest_id
            WHERE g.email = $1 AND er.event_id = $2;
        `;
        const result = await db.query(query, [email, eventId]);

        if (result.rowCount === 0) {
            logger.warn(context, `Failure Point BB: Identity not found for ${email} at event ${eventSlug}`);
            return res.status(401).json({ success: false, message: 'Invalid email or access code.' });
        }

        const guest = result.rows[0];
        const inputCode = accessCode.trim().toUpperCase();
        let isMatch = false;

        if (guest.access_code.startsWith('$2b$') || guest.access_code.startsWith('$2a$')) {
            isMatch = await bcrypt.compare(inputCode, guest.access_code);
        } else {
            isMatch = (inputCode === guest.access_code);
            if (isMatch) {
                logger.info(context, `Legacy plaintext code detected for ${email}. Executing background auto-upgrade to bcrypt...`);
                const newHash = await bcrypt.hash(inputCode, 10);
                await db.query(`UPDATE event_registrations SET access_code = $1 WHERE guest_id = $2 AND event_id = $3`, [newHash, guest.id, eventId]);
            }
        }

        if (!isMatch) {
            logger.warn(context, `Failure Point BB-2: Cryptographic mismatch for ${email} at event ${eventSlug}`);
            return res.status(401).json({ success: false, message: 'Invalid email or access code.' });
        }

        if (!process.env.JWT_SECRET) {
            logger.error(context, 'CRITICAL FAILURE: JWT_SECRET is missing from the environment.');
            return res.status(500).json({ success: false, message: 'Internal server error.' });
        }

        logger.info(context, `Step 3: Identity verified. Minting Guest JWT for Node ${eventId}...`);
        const tokenPayload = {
            id: guest.id,
            email: guest.email,
            eventId: eventId,
            role: 'guest'
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

        const { access_code, ...safeGuestData } = guest;
        res.status(200).json({ 
            success: true, 
            token: token,
            data: safeGuestData 
        });

    } catch (error) {
        logger.error(context, 'Failure Point E7: CRITICAL FAILURE during login.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getGuestStatus = async (req, res) => {
    const context = 'GuestController - Status Sync';
    const guestId = req.params.id;
    const eventSlug = req.params.eventSlug;

    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        
        const eventId = event.id;

        const query = `SELECT current_state FROM event_registrations WHERE guest_id = $1 AND event_id = $2;`;
        const result = await db.query(query, [guestId, eventId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Guest ticket not found.' });
        }

        res.status(200).json({ success: true, currentState: result.rows[0].current_state });

    } catch (error) {
        logger.error(context, `Failure Point FF: CRITICAL FAILURE during status sync.`, error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getGuestById = async (req, res) => {
    const context = 'GuestController - getGuestById';
    const guestId = req.params.id;
    const eventSlug = req.params.eventSlug;

    logger.info(context, `Fetching extended details for guest ID: ${guestId}`);

    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        
        const eventId = event.id;

        // [Architecture] Enforce RBAC Sandbox for PII viewing
        const hasClearance = await checkEventClearance(req.admin, eventId, context);
        if (!hasClearance) return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to view PII in this Node.' });

        const query = `
            SELECT g.id, g.full_name, g.email, g.phone, er.id_number, er.id_document_url, er.dietary_restrictions, er.current_state, er.registered_at as created_at 
            FROM guests g
            JOIN event_registrations er ON g.id = er.guest_id
            WHERE g.id = $1 AND er.event_id = $2;
        `;
        const result = await db.query(query, [guestId, eventId]);

        if (result.rowCount === 0) {
            logger.warn(context, `Failure Point G8: Guest ticket not found for ID: ${guestId}`);
            return res.status(404).json({ success: false, message: 'Guest not found.' });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error(context, `Failure Point G9: CRITICAL FAILURE fetching extended details for guest ${guestId}.`, error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ARCHITECT NOTE: Recovery Mechanism to resend access codes without re-registering
const resendAccessCode = async (req, res) => {
    const context = 'GuestController - ResendCode';
    const eventSlug = req.params.eventSlug;
    const { email } = req.body;

    logger.info(context, `Received resend access code request for ${email} at event: ${eventSlug}`);

    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        if (!email) {
            logger.warn(context, 'Failure Point R2: Missing email in resend request.');
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const query = `
            SELECT g.id as guest_id, g.full_name 
            FROM guests g
            JOIN event_registrations er ON g.id = er.guest_id
            WHERE g.email = $1 AND er.event_id = $2;
        `;
        const result = await db.query(query, [email, event.id]);

        if (result.rowCount === 0) {
            logger.warn(context, `Failure Point R3: Resend failed. No ticket found for ${email} at ${eventSlug}`);
            return res.status(404).json({ success: false, message: 'No registration found for this email.' });
        }

        const { guest_id, full_name: fullName } = result.rows[0];

        const rawNewCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const hashedNewCode = await bcrypt.hash(rawNewCode, 10);

        await db.query(`UPDATE event_registrations SET access_code = $1 WHERE guest_id = $2 AND event_id = $3`, [hashedNewCode, guest_id, event.id]);

        emailService.sendAccessCode(email, fullName, rawNewCode, event.name)
            .then(() => {
                logger.info(context, `Background email delivery successful for resend to: ${email}`);
            })
            .catch((emailError) => {
                logger.error(context, `Failure Point R4-B: Background Email Resend Failed to ${email}.`, emailError);
            });

        res.status(200).json({ success: true, message: 'New access code generated and sent successfully.' });

    } catch (error) {
        logger.error(context, 'Failure Point R5: CRITICAL FAILURE during resend access code.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getEventEchos = async (req, res) => {
    const context = 'GuestController - getEventEchos';
    const eventSlug = req.params.eventSlug;

    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        // Fetch up to 150 recent echos, ordered chronologically
        const query = `
            SELECT ge.id, ge.guest_id, g.full_name as sender_name, ge.content, ge.created_at
            FROM global_echos ge
            JOIN guests g ON ge.guest_id = g.id
            WHERE ge.event_id = $1
            ORDER BY ge.created_at ASC
            LIMIT 150;
        `;
        const result = await db.query(query, [event.id]);

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        logger.error(context, 'Failure Point G-ECHO: CRITICAL FAILURE fetching echos.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getPublicGuestDirectory = async (req, res) => {
    const context = 'GuestController - getPublicGuestDirectory';
    const eventSlug = req.params.eventSlug;

    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        // [Architecture] SECURITY: Only fetch VERIFIED guests (current_state = 2).
        // STRICTLY isolate payload to 'id' and 'full_name' to prevent PII leakage.
        const query = `
            SELECT g.id, g.full_name
            FROM guests g
            JOIN event_registrations er ON g.id = er.guest_id
            WHERE er.event_id = $1 AND er.current_state = 2
            ORDER BY g.full_name ASC;
        `;
        const result = await db.query(query, [event.id]);

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        logger.error(context, 'Failure Point G-DIR: CRITICAL FAILURE fetching public directory.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getGuestEchoState = async (req, res) => {
    const context = 'GuestController - getGuestEchoState';
    const eventSlug = req.params.eventSlug;
    // Extracted securely from the JWT by your middleware
    const guestId = req.guest.id; 

    try {
        const event = await getEventBySlug(eventSlug, context);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

        if (!redisClient) {
            return res.status(200).json({ success: true, data: { inbound: [], outbound: [], connections: [], online: [] } });
        }

        const eventId = event.id;
        const pendingKey = `abyss:node:${eventId}:echos_pending`;
        const acceptedKey = `abyss:node:${eventId}:echos_accepted`;
        const presenceKey = `abyss:node:${eventId}:online`;

        // Retrieve the current ephemeral state from Valkey
        const [pendingData, acceptedData, onlineData] = await Promise.all([
            redisClient.hgetall(pendingKey),
            redisClient.smembers(acceptedKey),
            redisClient.smembers(presenceKey)
        ]);

        const inbound = [];
        const outbound = [];
        const connections = [];
        const online = onlineData || [];

        // Parse pending hashes ("sender_id->target_id")
        for (const field in pendingData) {
            const [sender, target] = field.split('->');
            if (target === guestId) inbound.push(sender);
            if (sender === guestId) outbound.push(target);
        }

        // Parse accepted sets (["id1", "id2"])
        for (const record of acceptedData) {
            try {
                const [id1, id2] = JSON.parse(record);
                if (id1 === guestId) connections.push(id2);
                else if (id2 === guestId) connections.push(id1);
            } catch (e) {
                logger.warn(context, 'Failed to parse an accepted echo record.');
            }
        }

        res.status(200).json({
            success: true,
            data: { inbound, outbound, connections, online }
        });

    } catch (error) {
        logger.error(context, 'Failure Point G-ECHO-STATE: CRITICAL FAILURE fetching ephemeral state.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getDirectMessages = async (req, res) => {
    const context = 'GuestController - getDirectMessages';
    const targetId = req.params.targetId;
    const eventId = req.guest.eventId; // From JWT
    const guestId = req.guest.id;      // From JWT

    try {
        const query = `
            SELECT id, sender_id, receiver_id, content, created_at
            FROM direct_messages
            WHERE event_id = $1 
            AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
            ORDER BY created_at ASC
            LIMIT 200;
        `;
        const result = await db.query(query, [eventId, guestId, targetId]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        logger.error(context, 'CRITICAL FAILURE fetching direct messages.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = {
    getGlobalGuests,
    registerGuest,
    getAllGuests,
    updateGuestState,
    guestLogin,
    getGuestStatus,
    getGuestById,
    resendAccessCode,
    getEventEchos,
    getPublicGuestDirectory,
    getGuestEchoState,
    getDirectMessages
};