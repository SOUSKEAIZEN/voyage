const bcrypt = require('bcrypt');
const db = require('../config/db');
const logger = require('../utils/logger');

// --- LEVEL 0: SUPERADMIN ONLY ---

const createOrganization = async (req, res) => {
    const context = 'TenantController - createOrganization';
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Organization name is required.' });

        const query = `INSERT INTO organizations (name) VALUES ($1) RETURNING id, name, created_at;`;
        const result = await db.query(query, [name]);

        logger.info(context, `Superadmin deployed new Organization: ${name}`);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') { 
            return res.status(409).json({ success: false, message: 'Organization name already exists.' });
        }
        logger.error(context, 'Failure creating organization.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getOrganizations = async (req, res) => {
    const context = 'TenantController - getOrganizations';
    try {
        const query = `SELECT id, name, created_at FROM organizations ORDER BY name ASC;`;
        const result = await db.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        logger.error(context, 'Failure fetching organizations.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const deleteOrganization = async (req, res) => {
    const context = 'TenantController - deleteOrganization';
    const { orgId } = req.params;
    try {
        // [Architecture] Application-Layer Gatekeeper Check
        // Explicitly check for lingering identities and events to override ON DELETE SET NULL database schemas.
        const userCheck = await db.query(`SELECT COUNT(*) FROM admins WHERE organization_id = $1`, [orgId]);
        const eventCheck = await db.query(`SELECT COUNT(*) FROM events WHERE organization_id = $1`, [orgId]);

        const userCount = parseInt(userCheck.rows[0].count, 10);
        const eventCount = parseInt(eventCheck.rows[0].count, 10);

        if (userCount > 0 || eventCount > 0) {
            logger.warn(context, `Purge rejected for Org ID ${orgId}: Contains ${userCount} users and ${eventCount} events.`);
            return res.status(409).json({ 
                success: false, 
                message: `Cannot delete organization. Ensure all assigned staff (${userCount}) and events (${eventCount}) are purged first.` 
            });
        }

        const query = `DELETE FROM organizations WHERE id = $1 RETURNING name;`;
        const result = await db.query(query, [orgId]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Organization not found.' });
        
        logger.info(context, `Superadmin purged Organization: ${result.rows[0].name}`);
        res.status(200).json({ success: true, message: 'Organization securely deleted.' });
    } catch (error) {
        logger.error(context, 'Failure deleting organization.', error);
        res.status(500).json({ success: false, message: 'Internal server error during deletion protocol.' });
    }
};

// --- LEVEL 0 & 1: USER PROVISIONING ---

const provisionUser = async (req, res) => {
    const context = 'TenantController - provisionUser';
    try {
        const { email, password, role, organization_id } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
        }

        if (req.admin.role === 'tenant_admin') {
            if (role !== 'staff') {
                return res.status(403).json({ success: false, message: 'Tenant Admins can only provision Event Staff.' });
            }
            if (organization_id && organization_id !== req.admin.organization_id) {
                return res.status(403).json({ success: false, message: 'Cannot provision users outside your organization.' });
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const targetOrgId = req.admin.role === 'tenant_admin' ? req.admin.organization_id : (organization_id || null);

        const query = `
            INSERT INTO admins (id, email, password_hash, role, organization_id) 
            VALUES (uuid_generate_v4(), $1, $2, $3, $4) 
            RETURNING id, email, role, organization_id;
        `;
        const result = await db.query(query, [email, passwordHash, role, targetOrgId]);

        logger.info(context, `Successfully provisioned ${role} account for ${email}.`);
        res.status(201).json({ success: true, data: result.rows[0] });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: 'An admin account with this email already exists.' });
        }
        logger.error(context, 'Failure provisioning user.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const getNetworkUsers = async (req, res) => {
    const context = 'TenantController - getNetworkUsers';
    try {
        let query;
        let values = [];

        if (req.admin.role === 'superadmin') {
            query = `
                SELECT a.id, a.email, a.role, o.name as organization_name,
                       COALESCE(
                           (SELECT json_agg(json_build_object('id', e.id, 'title', e.name))
                            FROM event_staff_assignments esa
                            JOIN events e ON esa.event_id = e.id
                            WHERE esa.admin_id = a.id), '[]'::json
                       ) as assignments
                FROM admins a 
                LEFT JOIN organizations o ON a.organization_id = o.id 
                ORDER BY a.role, a.email;
            `;
        } else {
            // [Architecture] Added the JOIN here so Organizers get their correct Agency name too!
            query = `
                SELECT a.id, a.email, a.role, o.name as organization_name,
                       COALESCE(
                           (SELECT json_agg(json_build_object('id', e.id, 'title', e.name))
                            FROM event_staff_assignments esa
                            JOIN events e ON esa.event_id = e.id
                            WHERE esa.admin_id = a.id), '[]'::json
                       ) as assignments
                FROM admins a 
                LEFT JOIN organizations o ON a.organization_id = o.id 
                WHERE a.organization_id = $1 AND a.role = 'staff' 
                ORDER BY a.email;
            `;
            values = [req.admin.organization_id];
        }

        const result = await db.query(query, values);
        res.status(200).json({ success: true, data: result.rows });

    } catch (error) {
        logger.error(context, 'Failure fetching network users.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const deleteUser = async (req, res) => {
    const context = 'TenantController - deleteUser';
    const { userId } = req.params;
    try {
        let query, values;
        
        if (req.admin.role === 'superadmin') {
            query = `DELETE FROM admins WHERE id = $1 AND role != 'superadmin' RETURNING email;`;
            values = [userId];
        } else {
            query = `DELETE FROM admins WHERE id = $1 AND organization_id = $2 AND role = 'staff' RETURNING email;`;
            values = [userId, req.admin.organization_id];
        }

        const result = await db.query(query, values);
        
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Identity not found or insufficient clearance.' });
        
        logger.info(context, `Admin purged identity: ${result.rows[0].email}`);
        res.status(200).json({ success: true, message: 'Identity securely purged.' });
    } catch (error) {
        logger.error(context, 'Failure deleting user.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// --- LEVEL 1: GROUND NODE DEPLOYMENT ---

const assignStaffToEvent = async (req, res) => {
    const context = 'TenantController - assignStaffToEvent';
    try {
        const { admin_id, event_id } = req.body;

        if (!admin_id || !event_id) return res.status(400).json({ success: false, message: 'Missing required assignment parameters.' });

        if (req.admin.role !== 'superadmin') {
            const eventCheck = await db.query(`SELECT id FROM events WHERE id = $1 AND organization_id = $2`, [event_id, req.admin.organization_id]);
            if (eventCheck.rowCount === 0) return res.status(403).json({ success: false, message: 'Event not found or unauthorized.' });
            
            const staffCheck = await db.query(`SELECT id FROM admins WHERE id = $1 AND organization_id = $2 AND role = 'staff'`, [admin_id, req.admin.organization_id]);
            if (staffCheck.rowCount === 0) return res.status(403).json({ success: false, message: 'Staff not found or unauthorized.' });
        }

        const query = `
            INSERT INTO event_staff_assignments (admin_id, event_id) 
            VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *;
        `;
        await db.query(query, [admin_id, event_id]);

        logger.info(context, `Assigned staff [${admin_id}] to event [${event_id}].`);
        res.status(200).json({ success: true, message: 'Staff successfully assigned to event.' });

    } catch (error) {
        logger.error(context, 'Failure assigning staff to event.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const removeStaffFromEvent = async (req, res) => {
    const context = 'TenantController - removeStaffFromEvent';
    try {
        const { admin_id, event_id } = req.body;

        if (!admin_id || !event_id) return res.status(400).json({ success: false, message: 'Missing required assignment parameters.' });

        if (req.admin.role !== 'superadmin') {
            const eventCheck = await db.query(`SELECT id FROM events WHERE id = $1 AND organization_id = $2`, [event_id, req.admin.organization_id]);
            if (eventCheck.rowCount === 0) return res.status(403).json({ success: false, message: 'Event not found or unauthorized.' });
        }

        const query = `DELETE FROM event_staff_assignments WHERE admin_id = $1 AND event_id = $2 RETURNING *;`;
        const result = await db.query(query, [admin_id, event_id]);
        
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Active assignment not found.' });

        logger.info(context, `Severed link between staff [${admin_id}] and event [${event_id}].`);
        res.status(200).json({ success: true, message: 'Link successfully severed.' });

    } catch (error) {
        logger.error(context, 'Failure removing staff from event.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = {
    createOrganization,
    getOrganizations,
    deleteOrganization,
    provisionUser,
    getNetworkUsers,
    deleteUser,
    assignStaffToEvent,
    removeStaffFromEvent
};