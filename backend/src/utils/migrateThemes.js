require('dotenv').config({ path: '../../.env' }); // Adjust relative path if executed from root
const { pool } = require('../config/db');

console.log('[White-Label Schema Migration] System initialized: Preparing for Edge-Rendering upgrade.');

const runThemeMigration = async () => {
    const context = '[White-Label Schema Migration]';
    console.log(`${context} Step 1: Requesting secure uplink to PostgreSQL Ledger via established pool...`);

    const client = await pool.connect();
    console.log(`${context} Step 2: Uplink secured. Initiating MSaaS Edge-Rendering mutations...`);

    try {
        await client.query('BEGIN'); // [Architecture] Start SQL Transaction for atomic deployment

        // Mutation 1: Injecting Custom Domain and Theme Config into the Events Node
        console.log(`${context} Step 3: Injecting 'custom_domain' and 'theme_config' payload columns into 'events' table...`);
        await client.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE,
            ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}'::jsonb;
        `);

        // Mutation 2: Building Index for Edge Middleware Routing
        // ARCHITECT NOTE: Edge Middleware will hit this exact column rapidly.
        // A binary tree index here is non-negotiable for ultra-low latency domain resolution.
        console.log(`${context} Step 4: Building binary tree index on 'custom_domain' for hyper-fast routing...`);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_events_custom_domain ON events(custom_domain);
        `);

        await client.query('COMMIT'); 
        console.log(`${context} Step 5: SUCCESS. White-Label data architecture has been permanently deployed to the Global Ledger.`);

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error(`${context} CRITICAL FAILURE (Failure Point DB-Theme-Migrate): Schema mutation rejected. Transaction rolled back.`, error.message);
    } finally {
        client.release();
        await pool.end(); 
        console.log(`${context} Step 6: Database pool securely closed. Exiting process.`);
    }
};

// Execute the deployment
runThemeMigration();