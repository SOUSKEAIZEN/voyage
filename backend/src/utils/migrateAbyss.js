require('dotenv').config({ path: '../../.env' }); // Adjust relative path if executed from root
const { pool } = require('../config/db');

const runAbyssMigration = async () => {
    const context = '[Abyss Schema Migration]';
    console.log(`${context} Step 1: Requesting secure uplink to PostgreSQL Ledger via established pool...`);

    const client = await pool.connect();
    console.log(`${context} Step 2: Uplink secured. Initiating schema mutations...`);

    try {
        await client.query('BEGIN'); // [Architecture] Start SQL Transaction for atomic deployment

        // Mutation 1: Update the Events Node to track dissolve state
        console.log(`${context} Step 3: Injecting 'mesh_dissolved' state tracker into 'events' table...`);
        await client.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS mesh_dissolved BOOLEAN DEFAULT FALSE;
        `);

        // Mutation 2: Create the finalized_echos junction table
        console.log(`${context} Step 4: Constructing 'finalized_echos' relational graph...`);
        await client.query(`
            CREATE TABLE IF NOT EXISTS finalized_echos (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                initiator_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
                receiver_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                
                -- [Architecture] Enforce strict data integrity: No duplicate connections
                UNIQUE(event_id, initiator_id, receiver_id)
            );
        `);

        // Mutation 3: Build index for high-speed email worker querying
        console.log(`${context} Step 5: Building binary tree index on 'event_id'...`);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_finalized_echos_event_id ON finalized_echos(event_id);
        `);

        await client.query('COMMIT'); // Commit the transaction
        console.log(`${context} Step 6: SUCCESS. Abyss data architecture has been permanently deployed to the Global Ledger.`);

    } catch (error) {
        await client.query('ROLLBACK'); // Abort on failure to prevent partial schema corruption
        console.error(`${context} CRITICAL FAILURE (Failure Point DB-Abyss-Migrate): Schema mutation rejected. Transaction rolled back.`, error.message);
    } finally {
        client.release();
        // Since this is a standalone script, we forcefully end the pool to return to terminal
        await pool.end(); 
        console.log(`${context} Step 7: Database pool securely closed. Exiting process.`);
    }
};

// Execute the deployment
runAbyssMigration();