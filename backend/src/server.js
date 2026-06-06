require('dotenv').config();
console.log("Currently connected DB:", process.env.DATABASE_URL);
const express = require('express');
const http = require('http'); // [Architecture] Required to mount WebSockets alongside Express
const { Server } = require('socket.io'); // [Architecture] The Abyss Transport Layer
const Redis = require('ioredis'); // [Architecture] Valkey Connection Protocol
const { createAdapter } = require('@socket.io/redis-adapter'); // [Architecture] Horizontal Scaling Adapter
const { connectCache } = require('./config/cache');
const { connectDB } = require('./config/db');
const cors = require('cors');
const { registerAbyssHandlers } = require('./controllers/abyssController');
const socketAuthMiddleware = require('./middleware/socketAuth');
// Inject the perimeter defense into the transport layer

const { startMeshDissolver } = require('./services/meshDissolver');
const logger = require('./utils/logger'); // Assuming this is your custom winston/pino logger

console.log('[ServerBoot] Step 1: Initiating Master Control Plane boot sequence...');

const app = express();
// [Architecture] Wrap Express in a native HTTP server
const httpServer = http.createServer(app); 
const PORT = process.env.PORT || 3000;

// --- SECURITY MIDDLEWARE (REST API) ---
console.log('[Security] Step 2: Configuring Dynamic CORS Origin Gateway...');

const staticAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL 
].filter(Boolean);

const corsDelegate = (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check strict whitelist
    if (staticAllowedOrigins.includes(origin)) return callback(null, true);
    
    // ARCHITECT NOTE: Upgraded Vercel Preview Regex.
    // This now successfully catches both branch previews (voyage-to-the-end-git...) 
    // and hash previews (voyage-to-the-ihv381qi2...) by validating the HTTPS protocol and the vercel.app root.
    const isVercelPreview = /^https:\/\/.*\.vercel\.app$/.test(origin);
    
    if (isVercelPreview) {
        console.log(`[Security] Step 2.1: Authorized dynamic Vercel preview branch: ${origin}`);
        return callback(null, true);
    }
    
    console.error(`[Security] Failure Point A: Blocked unauthorized CORS request: ${origin}`);
    callback(new Error('Origin completely unauthorized by CORS Bouncer.'));
};

const corsOptions = {
    origin: corsDelegate,
    // ARCHITECT NOTE: Added 'PUT' to authorize the atomic wipe-and-replace Itinerary Engine payloads
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // [Architecture] Added 'Authorization' to allowed headers for JWT bearer token transmission
    allowedHeaders: ['Content-Type', 'x-admin-key', 'Authorization'], 
    credentials: true 
};

app.use(cors(corsOptions));
console.log(`[Security] Step 3: REST CORS gateway engaged.`);

app.use(express.json());
console.log('[ServerBoot] Step 4: JSON body parser active.');

// --- THE ABYSS: WEBSOCKET & VALKEY INITIALIZATION ---
console.log('[Abyss Transport] Step 5: Initializing Ephemeral Mesh engine...');

const io = new Server(httpServer, {
    cors: {
        origin: corsDelegate, // [Architecture] Mirroring REST CORS for socket handshakes
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Valkey/Redis Adapter Integration
if (process.env.VALKEY_URI) {
    console.log('[Valkey Cache] Step 6: Attempting TLS connection to Aiven Global Cache...');
    
    const redisOptions = { 
        tls: { rejectUnauthorized: false }, 
        family: 0, 
        lazyConnect: true // [Architecture] Prevents auto-connect collision, forcing manual boot control
    };

    // Create pub/sub clients for the adapter
    const pubClient = new Redis(process.env.VALKEY_URI, redisOptions);
    const subClient = new Redis(process.env.VALKEY_URI, redisOptions);

    pubClient.on('error', (err) => console.error('[Valkey Cache] Failure Point C: PubClient Error', err.message));
    subClient.on('error', (err) => console.error('[Valkey Cache] Failure Point D: SubClient Error', err.message));

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[Valkey Cache] Step 7: Adapter successfully injected. Horizontal scaling unlocked.');
    }).catch(err => {
        console.error('[Valkey Cache] Failure Point E: Cache uplink failed. Operating in local memory mode.', err.message);
    });
} else {
    console.warn('[Valkey Cache] WARNING: VALKEY_URI not detected. The Abyss will operate in local memory mode. Horizontal scaling disabled.');
}

// Basic Abyss Connection Telemetry
io.use(socketAuthMiddleware);
io.on('connection', (socket) => {
    console.log(`[Abyss Transport] Step 8: Authenticated client handshake accepted. Socket ID: ${socket.id}`);
    
    // [Architecture] Routing Configuration
    if (socket.guest && socket.guest.guest_id) {
        // 1. Join Private Direct Mesh (for 1-on-1 echos)
        socket.join(`guest:${socket.guest.guest_id}`);
        
        // 2. Join Global Event Mesh (for the public feed)
        if (socket.guest.event_id) {
            socket.join(`event:${socket.guest.event_id}`);
            console.log(`[Abyss Transport] Client dropped into Event Node: event:${socket.guest.event_id}`);
        }
    }

    // Mount the core engine
    registerAbyssHandlers(io, socket);
    
    socket.on('disconnect', (reason) => {
        console.log(`[Abyss Transport] Step 9: Client severed connection. Socket ID: ${socket.id} | Reason: ${reason}`);
    });
});

app.set('io', io);

// --- ROUTER MOUNTING ---
try {
    const authRoutes = require('./routes/authRoutes');
    app.use('/api/auth', authRoutes);
    console.log('[Router] Step 10: Master Security routing mounted at /api/auth');

    const guestRoutes = require('./routes/guestRoutes');
    app.use('/api/guests', guestRoutes);
    console.log('[Router] Step 11: Guest Node routing mounted at /api/guests');

    const eventRoutes = require('./routes/eventRoutes');
    app.use('/api/events', eventRoutes);
    console.log('[Router] Step 12: Master Event routing mounted at /api/events');

    // [Architecture] Phase 5: Mounting the Tenant Provisioning API
    const tenantRoutes = require('./routes/tenantRoutes');
    app.use('/api/tenants', tenantRoutes);
    console.log('[Router] Step 12.5: Tenant Organization routing mounted at /api/tenants');
} catch (error) {
    console.error('[Router] Failure Point B: Failed to mount routing modules.', error);
    process.exit(1);
}

// --- TELEMETRY & HEALTH ---
app.get('/health', (req, res) => {
    console.log('[ServerHealth] Uptime check pinged from external source.');
    res.status(200).json({ status: 'OK', message: 'MICE Node API is operational.' });
});

// --- IGNITION SEQUENCE ---
const startServer = async () => {
    try {
        console.log('[Database] Step 13: Attempting connection to PostgreSQL Global Ledger...');
        await connectCache();
        await connectDB();
        console.log('[Database] Step 14: Ledger uplink established successfully.');

        startMeshDissolver();
        
        httpServer.listen(PORT, () => {
            console.log(`[ServerBoot] Step 15: Ignition complete. Nexus Control Plane listening on port ${PORT}`);
        });
        
    } catch (error) {
        console.error('[Database] CRITICAL Failure Point 0: Database connection rejected. Aborting boot sequence.', error);
        process.exit(1);
    }
};

startServer();