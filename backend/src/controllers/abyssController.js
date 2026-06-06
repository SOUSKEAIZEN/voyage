const { redisClient } = require('../config/cache');
// [Architecture] Inject the PostgreSQL ledger to permanently record public echos
const db = require('../config/db'); 

console.log('[Abyss Core] System initialized: Ephemeral Mesh controller ready for mounting.');

// [Architecture] We export a function that binds events to the authenticated socket
const registerAbyssHandlers = (io, socket) => {
    // Extract identity injected by our Perimeter Defense (socketAuth.js)
    const guest = socket.guest; 
    
    // Fallback security check
    if (!guest || !guest.guest_id) {
        console.error(`[Abyss Core] CRITICAL Failure Point 0: Unidentified socket [${socket.id}] bypassed perimeter. Terminating.`);
        return socket.disconnect(true);
    }

    const { guest_id, event_id } = guest;
    const meshRoom = `node:${event_id}:abyss`; // Socket.io room for the specific event
    const presenceKey = `abyss:node:${event_id}:online`; // Valkey Set tracking active users

    // --- EVENT 1: INGRESS (Joining the Mesh) ---
    socket.on('join_abyss', async () => {
        console.log(`[Abyss Core] Step 1: Guest [${guest_id}] initiating descent into Node [${event_id}] Abyss...`);
        
        try {
            // 1. Join the Socket.io room for broadcast targeting
            socket.join(meshRoom);
            
            // 2. Register presence in Valkey (add guest_id to the online Set)
            if (redisClient) {
                await redisClient.sadd(presenceKey, guest_id);
                // Reset expiration to ensure the key dies if the server crashes after the event
                await redisClient.expire(presenceKey, 86400 * 3); // 3-day TTL fallback
            }

            console.log(`[Abyss Core] Step 2: Guest [${guest_id}] successfully materialized. Broadcasting presence...`);
            
            // 3. Broadcast to everyone else in the Node that a new guest has entered
            socket.to(meshRoom).emit('presence_update', {
                action: 'entered',
                guest_id: guest_id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[Abyss Core] Failure Point A: Failed to process ingress for Guest [${guest_id}]:`, error.message);
        }
    });

    // --- [NEW] EVENT 1.5: THE GLOBAL FEED (Public Broadcast) ---
    socket.on('send_global_echo', async (payload, callback) => {
        console.log(`[Abyss Core] Step 2.1: Guest [${guest_id}] emitting a global echo to Node [${event_id}]...`);
        
        try {
            const { content } = payload;
            
            if (!content || content.trim() === '') {
                console.warn(`[Abyss Core] Failure Point G-1: Empty echo rejected.`);
                if (callback) callback({ success: false, message: 'Echo content cannot be empty.' });
                return;
            }

            // 1. Commit the Echo to the Temporary Ledger
            const insertQuery = `
                INSERT INTO global_echos (event_id, guest_id, content)
                VALUES ($1, $2, $3)
                RETURNING id, content, created_at;
            `;
            const insertResult = await db.query(insertQuery, [event_id, guest_id, content.trim()]);
            const newEcho = insertResult.rows[0];

            // 2. Hydrate the Echo with the Sender's identity
            const guestQuery = `SELECT full_name FROM guests WHERE id = $1`;
            const guestResult = await db.query(guestQuery, [guest_id]);
            const senderName = guestResult.rows[0].full_name;

            const broadcastPayload = {
                id: newEcho.id,
                guest_id: guest_id,
                sender_name: senderName,
                content: newEcho.content,
                created_at: newEcho.created_at
            };

            // 3. THE ABYSS: Fire the pulse to everyone in this specific Event Node
            io.to(meshRoom).emit('receive_global_echo', broadcastPayload);
            
            console.log(`[Abyss Core] Step 2.2: Successfully broadcasted Echo ${newEcho.id} to Mesh Room [${meshRoom}].`);

            // 4. Acknowledge success back to the sender's client
            if (callback) callback({ success: true, data: broadcastPayload });

        } catch (error) {
            console.error(`[Abyss Core] Failure Point G-2: CRITICAL FAILURE processing global echo.`, error.message);
            if (callback) callback({ success: false, message: 'Internal engine error.' });
        }
    });

    // --- EVENT 2: EMITTING AN ECHO (Connection Request) ---
    socket.on('send_echo', async (payload) => {
        const { target_guest_id } = payload;
        console.log(`[Abyss Core] Step 3: Guest [${guest_id}] emitting a direct echo towards [${target_guest_id}]...`);

        if (!target_guest_id) {
            return console.error(`[Abyss Core] Failure Point B: Echo emission failed. Missing target_guest_id.`);
        }

        try {
            const pendingKey = `abyss:node:${event_id}:echos_pending`;
            // Create a unique hash key for this specific echo direction
            const echoField = `${guest_id}->${target_guest_id}`;
            const echoData = JSON.stringify({ timestamp: new Date().toISOString(), status: 'pending' });

            // Store the pending echo in Valkey
            if (redisClient) {
                await redisClient.hset(pendingKey, echoField, echoData);
            }

            console.log(`[Abyss Core] Step 4: Echo state secured in cache. Routing payload to target...`);
            
            // Broadcast the echo strictly to the target guest. 
            // [Architecture Note] In a multi-tenant MSaaS, guests should join a private room matching their ID upon connection
            io.to(`guest:${target_guest_id}`).emit('inbound_echo', {
                sender_id: guest_id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[Abyss Core] Failure Point C: Valkey mutation failed during echo emission:`, error.message);
        }
    });

    // --- EVENT 3: ACCEPTING AN ECHO ---
    socket.on('accept_echo', async (payload) => {
        const { sender_guest_id } = payload;
        console.log(`[Abyss Core] Step 5: Guest [${guest_id}] resolving inbound echo from [${sender_guest_id}]...`);

        try {
            const pendingKey = `abyss:node:${event_id}:echos_pending`;
            const acceptedKey = `abyss:node:${event_id}:echos_accepted`;
            const echoField = `${sender_guest_id}->${guest_id}`;

            if (redisClient) {
                // Remove from pending
                await redisClient.hdel(pendingKey, echoField);
                // Add to accepted (bidirectional representation)
                await redisClient.sadd(acceptedKey, JSON.stringify([sender_guest_id, guest_id]));
            }

            console.log(`[Abyss Core] Step 6: Echo accepted. Connection solidified in ephemeral state. Notifying initiator...`);

            // Notify the original sender that their echo was caught
            io.to(`guest:${sender_guest_id}`).emit('echo_resolved', {
                target_id: guest_id,
                status: 'accepted',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[Abyss Core] Failure Point D: Failed to resolve echo state:`, error.message);
        }
    });


    // --- EVENT 3.5: DIRECT MESSAGING (1-on-1 Chat) ---
    socket.on('send_direct_message', async (payload, callback) => {
        const { target_guest_id, content } = payload;
        
        if (!target_guest_id || !content || content.trim() === '') {
            if (callback) callback({ success: false, message: 'Invalid payload.' });
            return;
        }

        try {
            // 1. Commit to the temporary ledger
            const insertQuery = `
                INSERT INTO direct_messages (event_id, sender_id, receiver_id, content)
                VALUES ($1, $2, $3, $4)
                RETURNING id, content, created_at;
            `;
            const result = await db.query(insertQuery, [event_id, guest_id, target_guest_id, content.trim()]);
            const newMsg = result.rows[0];

            const dmPayload = {
                id: newMsg.id,
                sender_id: guest_id,
                receiver_id: target_guest_id,
                content: newMsg.content,
                created_at: newMsg.created_at
            };

            // 2. THE ABYSS: Fire directly to the target guest's private mesh room
            io.to(`guest:${target_guest_id}`).emit('receive_direct_message', dmPayload);
            
            // 3. Mirror it back to the sender (in case they are logged in on phone & laptop)
            io.to(`guest:${guest_id}`).emit('receive_direct_message', dmPayload);

            if (callback) callback({ success: true, data: dmPayload });

        } catch (error) {
            console.error(`[Abyss Core] Failure Point DM: Failed to route direct message:`, error.message);
            if (callback) callback({ success: false, message: 'Engine failure.' });
        }
    });

    // --- EVENT 3.6: TYPING PULSE (Ultra-Ephemeral) ---
    socket.on('typing_pulse', (payload) => {
        const { target_guest_id, is_typing } = payload;
        
        if (target_guest_id) {
            // Instantly bounce the pulse to the target's private room
            socket.to(`guest:${target_guest_id}`).emit('receive_typing_pulse', {
                sender_id: guest_id,
                is_typing: is_typing
            });
        }
    });

    // --- EVENT 4: EGRESS (Disconnecting) ---
    socket.on('disconnect', async (reason) => {
        console.log(`[Abyss Core] Step 7: Socket [${socket.id}] severed. Reason: ${reason}. Initiating ghost protocol for Guest [${guest_id}]...`);

        try {
            if (redisClient) {
                await redisClient.srem(presenceKey, guest_id);
            }

            // Broadcast departure to the specific event Node
            socket.to(meshRoom).emit('presence_update', {
                action: 'departed',
                guest_id: guest_id,
                timestamp: new Date().toISOString()
            });
            console.log(`[Abyss Core] Step 8: Guest [${guest_id}] successfully wiped from active presence pool.`);
        } catch (error) {
            console.error(`[Abyss Core] Failure Point E: Egress cleanup failed for Guest [${guest_id}]:`, error.message);
        }
    });
};

// --- ARCHITECTURE: ADMIN TELEMETRY ---
// Fetches the exact number of active WebSockets in a specific event room, scaling across all Redis nodes.
const getMeshTelemetry = async (io, eventId) => {
    const context = `[Telemetry - Node ${eventId}]`;
    const meshRoom = `node:${eventId}:abyss`;
    
    try {
        // io.in(room).fetchSockets() returns an array of Socket instances currently in the room.
        // Because we use the Redis adapter, this automatically queries all clustered servers if scaled horizontally.
        const sockets = await io.in(meshRoom).fetchSockets();
        const activeConnections = sockets.length;
        
        console.log(`${context} Telemetry sync successful. Active connections: ${activeConnections}`);
        return { success: true, activeConnections };
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE: Engine telemetry extraction failed.`, error.message);
        return { success: false, activeConnections: 0, error: error.message };
    }
};

module.exports = { 
    registerAbyssHandlers,
    getMeshTelemetry 
};