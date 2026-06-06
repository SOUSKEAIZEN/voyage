const Redis = require('ioredis');

console.log('[App Cache] Step 1: Initializing Central Valkey/Redis module for data operations...');

let redisClient = null;

if (process.env.VALKEY_URI) {
    const redisOptions = {
        tls: { rejectUnauthorized: false }, // Aiven strict TLS requirement
        family: 0, // Prevent IPv6 resolution timeouts
        lazyConnect: true, // [Architecture] Strict manual boot control
        maxRetriesPerRequest: 3 // Fail fast if cache goes down, don't hang the event loop
    };

    redisClient = new Redis(process.env.VALKEY_URI, redisOptions);

    // --- TELEMETRY INJECTION ---
    redisClient.on('connect', () => {
        console.log('[App Cache] Step 2: TCP connection established with Aiven Global Cache.');
    });

    redisClient.on('ready', () => {
        console.log('[App Cache] Step 3: Cache is ready to accept commands (GET/SET/HSET).');
    });

    redisClient.on('error', (err) => {
        console.error(`[App Cache] Failure Point F: Cache operational error: ${err.message}`);
    });

    redisClient.on('close', () => {
        console.warn('[App Cache] Warning: Connection to cache dropped.');
    });
} else {
    console.warn('[App Cache] WARNING: VALKEY_URI not detected. Central App Cache disabled.');
}

// --- IGNITION FUNCTION ---
const connectCache = async () => {
    if (!redisClient) {
        console.warn('[App Cache] Step 4: No client to connect. Bypassing boot sequence.');
        return;
    }
    try {
        console.log('[App Cache] Step 4: Manually triggering cache boot sequence...');
        await redisClient.connect();
    } catch (error) {
        console.error(`[App Cache] CRITICAL Failure Point G: Initial cache boot failed: ${error.message}`);
        // ARCHITECT NOTE: We do not process.exit(1) here. 
        // A true MSaaS must gracefully degrade if the cache drops, falling back to PostgreSQL or local memory.
    }
};

module.exports = { redisClient, connectCache };