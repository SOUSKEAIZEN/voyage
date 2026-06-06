require('dotenv').config();
const { Pool } = require('pg');

// Initialize connection to your secure database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const runMigration = async () => {
    const context = '[Event Images Migration]';
    console.log(`${context} Step 1: Initializing connection to PostgreSQL ledger...`);

    try {
        // Phase 1: Inject the 1-to-Many relational table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS event_images (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        console.log(`${context} Step 2: Executing schema upgrade (Creating 'event_images' node)...`);
        await pool.query(createTableQuery);
        
        // Phase 2: Build an index. Since we will constantly query "WHERE event_id = X", 
        // an index prevents full-table scans and keeps the API lightning fast.
        const createIndexQuery = `
            CREATE INDEX IF NOT EXISTS idx_event_images_event_id ON event_images(event_id);
        `;
        console.log(`${context} Step 3: Building binary tree index for high-speed retrieval...`);
        await pool.query(createIndexQuery);

        console.log(`${context} Step 4: SUCCESS. The event images architecture has been securely deployed.`);
    } catch (error) {
        console.error(`${context} CRITICAL FAILURE (Failure Point DB-Img-Migrate): Schema migration failed.`, error.message);
    } finally {
        await pool.end();
        console.log(`${context} Step 5: Database connection securely closed.`);
    }
};

// Execute the deployment
runMigration();