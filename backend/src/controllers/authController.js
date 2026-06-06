const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const logger = require('../utils/logger');
// [Architecture] Required for "Last-In" Session Invalidation
const { redisClient } = require('../config/cache');
const { v4: uuidv4 } = require('uuid');

const adminLogin = async (req, res) => {
    const context = 'AuthController - adminLogin';
    logger.info(context, 'Step 1: Inbound login request detected. Initiating Vault verification protocol...');

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            logger.warn(context, 'Failure Point Auth-1: Malformed login payload. Missing credentials.');
            return res.status(400).json({ success: false, message: 'Email and password are strictly required.' });
        }

        // [Architecture] Step 2: Query the Global Ledger for the Admin identity
        // ARCHITECT NOTE: Upgraded to extract role and organization_id for RBAC Token Minting
        const query = `SELECT id, email, password_hash, role, organization_id FROM admins WHERE email = $1;`;
        const result = await db.query(query, [email]);

        if (result.rowCount === 0) {
            // SECURITY NOTE: We do not tell the client "Email not found". 
            // We use a generic error to prevent attackers from enumerating valid admin emails.
            logger.warn(context, `Failure Point Auth-2: Unrecognized identity attempted breach: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const admin = result.rows[0];

        // [Architecture] Step 3: Cryptographic Hash Verification
        logger.info(context, `Step 3: Identity located. Computing cryptographic hash comparison for ${email}...`);
        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            logger.warn(context, `Failure Point Auth-3: Cryptographic signature mismatch for ${email}. Access violently rejected.`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // [Architecture] Step 4: Minting the JSON Web Token with Last-In Invalidation
        if (!process.env.JWT_SECRET) {
            logger.error(context, 'CRITICAL FAILURE: JWT_SECRET is missing from the Control Plane environment.');
            return res.status(500).json({ success: false, message: 'Internal server configuration error.' });
        }

        // 4a. Generate a unique Session ID
        const sessionId = uuidv4();
        
        // 4b. Write the Session ID to Valkey, locking out any previous sessions for this admin ID
        if (redisClient) {
            logger.info(context, `Step 4: Committing single-session lock to Valkey for Admin [${admin.id}]...`);
            const sessionKey = `admin_session:${admin.id}`;
            // Set it to expire in exactly 24 hours to match the JWT lifecycle
            await redisClient.set(sessionKey, sessionId, 'EX', 86400); 
        } else {
            logger.warn(context, 'Valkey cache offline. Bypassing single-session lock restriction.');
        }

        logger.info(context, `Step 5: Hash verified. Minting authorization token for [${admin.role}]...`);
        const tokenPayload = {
            id: admin.id,
            email: admin.email,
            role: admin.role, // Dynamically mapped from the DB
            organization_id: admin.organization_id, // Vital for Tenant Sandboxing
            session_id: sessionId // Injected for middleware validation
        };

        // Token expires in 24 hours to enforce security hygiene
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

        logger.info(context, `Step 6: SUCCESS. Node unlocked for ${email}.`);

        res.status(200).json({
            success: true,
            message: 'Authentication successful.',
            token: token,
            admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        logger.error(context, 'Failure Point Auth-Crit: CRITICAL FAILURE during login sequence.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// --- NEW: EXPLICIT LOGOUT PIPELINE ---
// To clear the Valkey session lock early if the admin explicitly logs out
const adminLogout = async (req, res) => {
    const context = 'AuthController - adminLogout';
    // Requires middleware to have extracted req.admin
    const adminId = req.admin?.id;

    if (!adminId) {
        return res.status(400).json({ success: false, message: 'Invalid logout sequence.' });
    }

    try {
        if (redisClient) {
            const sessionKey = `admin_session:${adminId}`;
            await redisClient.del(sessionKey);
            logger.info(context, `Admin [${adminId}] voluntarily dissolved their session lock.`);
        }
        res.status(200).json({ success: true, message: 'Session securely terminated.' });
    } catch (error) {
        logger.error(context, 'Failure Point Auth-Logout: Failed to clear session lock.', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = {
    adminLogin,
    adminLogout
};