const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
// [Architecture] Required to verify the active session lock
const { redisClient } = require('../config/cache'); 
require('dotenv').config(); 

// --- ARCHITECTURE: CORE SESSION VALIDATOR ---
// This internal function handles the heavy lifting of decrypting the token 
// and enforcing the "Last-In" concurrent session lock via Valkey.
const validateAdminSession = async (req, context) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn(context, 'Access Denied: Missing or malformed Bearer token.');
        throw { status: 401, message: 'Unauthorized: Cryptographic token required.' };
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        logger.error(context, 'CRITICAL FAILURE: JWT_SECRET is not defined in the Control Plane environment!');
        throw { status: 500, message: 'Internal Server Error: Security configuration missing.' };
    }

    try {
        const decoded = jwt.verify(token, secret);

        // [Architecture] "Last-In" Concurrent Session Validation
        if (redisClient) {
            const sessionKey = `admin_session:${decoded.id}`;
            const activeSessionId = await redisClient.get(sessionKey);

            if (!activeSessionId || activeSessionId !== decoded.session_id) {
                logger.warn(context, `SECURITY TRIGGER: Revoked token detected for ${decoded.email}. Session overridden by a newer login.`);
                throw { status: 401, message: 'Session Expired: You have logged in from another device. Please authenticate again.' };
            }
        }

        return decoded;
    } catch (error) {
        if (error.status) throw error; // Re-throw our custom errors
        logger.warn(context, `Access Denied: Token verification failed - ${error.message}`);
        throw { status: 403, message: 'Forbidden: Invalid or expired token.' };
    }
};

// --- LEVEL 0: THE MASTER CONTROL ---
const requireSuperadmin = async (req, res, next) => {
    const context = 'AuthMiddleware - Superadmin';
    try {
        const decoded = await validateAdminSession(req, context);

        if (decoded.role !== 'superadmin') {
            logger.warn(context, `Access Denied: Valid token, but insufficient privileges for ${decoded.email}.`);
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient clearance. Superadmin required.' });
        }

        logger.info(context, `Signature verified. Access granted to Superadmin: ${decoded.email}`);
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

// --- LEVEL 1: THE ORGANIZER ---
const requireTenantAdmin = async (req, res, next) => {
    const context = 'AuthMiddleware - TenantAdmin';
    try {
        const decoded = await validateAdminSession(req, context);

        // Superadmins can do everything a Tenant Admin can do
        if (decoded.role !== 'tenant_admin' && decoded.role !== 'superadmin') {
            logger.warn(context, `Access Denied: Valid token, but insufficient privileges for ${decoded.email}.`);
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient clearance. Tenant Admin required.' });
        }

        logger.info(context, `Signature verified. Access granted to Admin: ${decoded.email}`);
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

// --- LEVEL 2: THE GROUND NODE ---
const requireEventStaff = async (req, res, next) => {
    const context = 'AuthMiddleware - EventStaff';
    try {
        const decoded = await validateAdminSession(req, context);

        // Cascade clearance: Super -> Tenant -> Staff
        const validRoles = ['staff', 'tenant_admin', 'superadmin'];
        if (!validRoles.includes(decoded.role)) {
            logger.warn(context, `Access Denied: Valid token, but insufficient privileges for ${decoded.email}.`);
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient clearance. Event Staff required.' });
        }

        logger.info(context, `Signature verified. Access granted to Staff: ${decoded.email}`);
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

// ARCHITECTURE: The Guest Bouncer with IDOR Protection
const requireGuestToken = (req, res, next) => {
    const context = 'AuthMiddleware - Guest';
    logger.info(context, `Step 1: Intercepted request to protected guest portal route: ${req.originalUrl}`);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn(context, 'Access Denied: Missing or malformed Bearer token.');
        return res.status(401).json({ 
            success: false, 
            message: 'Unauthorized: Cryptographic token required.' 
        });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    try {
        const decoded = jwt.verify(token, secret);

        if (decoded.role !== 'guest') {
            logger.warn(context, `Access Denied: Invalid role clearance. Expected 'guest', received '${decoded.role}'.`);
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Insufficient clearance.' 
            });
        }

        // [Architecture] Anti-IDOR Shield: Ensure guests can only access their own specific data payloads
        if (req.params.id && req.params.id !== decoded.id) {
            logger.warn(context, `CRITICAL SECURITY EVENT: IDOR Attempt Blocked. Token ID [${decoded.id}] attempted to access Route ID [${req.params.id}].`);
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Cross-account access violently rejected.' 
            });
        }

        logger.info(context, `Step 2: Signature verified. Access granted to Guest ID: ${decoded.id}`);
        req.guest = decoded;
        next();

    } catch (error) {
        logger.warn(context, `Access Denied: Token verification failed - ${error.message}`);
        return res.status(401).json({ 
            success: false, 
            message: 'Unauthorized: Invalid or expired session. Please log in again.' 
        });
    }
};

module.exports = {
    requireSuperadmin,     // Level 0
    requireTenantAdmin,    // Level 1
    requireEventStaff,     // Level 2
    requireGuestToken      // Guest Boundary
};