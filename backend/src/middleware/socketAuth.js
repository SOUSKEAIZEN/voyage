const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('[Socket Auth] System initialized: Perimeter defense ready for injection.');

const socketAuthMiddleware = (socket, next) => {
    console.log(`[Socket Auth] Step 1: Intercepting handshake for incoming socket [${socket.id}]...`);

    // [Architecture] Socket.io allows passing auth payloads natively in the handshake object
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
        console.error(`[Socket Auth] Failure Point A: Missing JWT payload. Connection violently rejected for socket [${socket.id}].`);
        // Passing an Error to next() automatically fires a 'connect_error' event to the client
        return next(new Error('Authentication Error: Cryptographic token required to enter the Abyss.'));
    }

    console.log(`[Socket Auth] Step 2: Payload detected. Initiating cryptographic verification...`);

    try {
        // [Architecture] Verify against the MSaaS Master Secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // [Architecture] Schema Normalization Bridge
        // REST API mints { id, eventId }, but the Abyss (server.js) expects { guest_id, event_id }.
        socket.guest = {
            guest_id: decoded.id,        // Mapped from REST JWT
            event_id: decoded.eventId,   // Mapped from REST JWT
            role: decoded.role,
            email: decoded.email
        }; 
        
        console.log(`[Socket Auth] Step 3: Signature verified. Identity [${socket.guest.email}] (Role: ${socket.guest.role}) cleared for Abyss entry.`);
        
        // Proceed to establish the bidirectional connection
        return next();
    } catch (error) {
        console.error(`[Socket Auth] Failure Point B: Cryptographic verification failed for socket [${socket.id}] - ${error.message}`);
        return next(new Error('Authentication Error: Token invalid or expired. Access denied.'));
    }
};

module.exports = socketAuthMiddleware;