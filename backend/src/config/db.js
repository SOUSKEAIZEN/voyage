const { Pool } = require('pg');
const logger = require('../utils/logger');
require('dotenv').config(); 

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: true, 
        ca: `-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUVa+Nhv5TGqyCrlQzyQxRMgKYCMUwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1ZWVhZjk4OWUtZWQ2OS00ZDMzLWJlZDUtZWQyZjZjZDQ5
NzQwIEdFTiAxIFByb2plY3QgQ0EwHhcNMjYwMTE3MTQ1ODM5WhcNMzYwMTE1MTQ1
ODM5WjBAMT4wPAYDVQQDDDVlZWFmOTg5ZS1lZDY5LTRkMzMtYmVkNS1lZDJmNmNk
NDk3NDAgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAKxZedecItfxfC44zSu5IExt/6KhFdZ5lcFE98ZOcQzshvNen6snO9HB
g8VLlpWrSN7WLXiWKt+35seGWfaBg0tP6Qu/Hsj5UxbbDvmLZncULDy97vF3GAEw
tlvCmueaKblnISbLD4wk/lm+AMvp+6Yi+VGHYVT0voQRF2HzBe4RLCGvt/qh0sG1
jSuHmkriKNL7Nnsd+dYcQi8RQMGV0F7ojqhIwyTmgJbzxZbR4Epb9wr2N85Ii2QF
1z5a1QQu7BsFb7WpK/KXGWVOb52WuULiJG0GaHFVmyR0PXQuEKg7gOZX0o9Z2r8P
6BNb75JsMCppy8LrTT0B0uB4rp5NAzYQga5rmB2TReNIYZzBujtrVw3U+WnC8D7K
ehumEcBaznCrpEtuNQ4xu/MHbjRC1Pw7A3k3dYAhgJituKPfuxvJdCp3LvSkJnCJ
aIgoRQwbohB+1km5zppN1waAg5Hi3BDLUl/bVN1P13oJyxXvJ3gF7L83p8vgCoZo
5zXZiSpj4QIDAQABo0IwQDAdBgNVHQ4EFgQUKNSyGQcmXIf+Avbreh0eBdSp50cw
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBAEXiC2lKfG9OrKHElJdlAy7a3bVfBLokx3e1vDqSllzZXdfiejC7ADe6jnXg
lyQDnsIBHUcdP86ZuEq9eW1MeCABQomfVZtfTTfRrZ1i4mnXdR/BartU3IMtvlXw
p08G0g6SlsMBCo4AfgxMzX+hQYAy+SNrU99kwwGZmlz8xlOYhQqeazAZRGwzLXus
cNwtMiNICQ8gKOZLSTn0FwCncCMP3BNUODEd/qo96Ych8Cs1cuWkzK04Jl7epvEO
3amu1lPGosGBRR3ovOeezUTrUM8Z0Wh9kzGE9f0vtH9CfK1IOcYKYTQDNjKEwbqh
WQTGpojk3aka3ZpLwgjsiraUKVvMeHg+TgW5pJegddaDNQcyLwcdK6RR/r9+kbpj
7VVTRoNbtTLdDfF8/tbW15sY23WTXaqClTeCxWQHe2sjidooNkqNTREYaXwbY1hG
V0xmb6NqoCzq+aJzKd/LzuujauqIhZretu+iUZEs2WiePGCocbXs1iF/f7H4LG5K
v2NVgg==
-----END CERTIFICATE-----
`
    }
});

// [Architecture] Automated Database Migrations (Phase 3: RBAC Evolution)
const runMigrations = async () => {
    const context = 'DB-Migration-Tool';
    const client = await pool.connect();
    
    try {
        logger.info(context, 'Step 1: Checking Abyss ledger architecture...');

        await client.query('BEGIN'); // Start transaction for structural integrity

        // --- 1. THE TENANT LEDGER ---
        await client.query(`
            CREATE TABLE IF NOT EXISTS organizations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // --- 2. UPGRADING ADMIN IDENTITIES ---
        // We add roles and link them to organizations. 
        // Existing admins default to 'superadmin' so you don't lock yourself out.
        await client.query(`
            ALTER TABLE admins 
            ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'superadmin',
            ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE SET NULL;
        `);

        // --- 3. LINKING EVENTS TO TENANTS ---
        await client.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS organization_id INT REFERENCES organizations(id) ON DELETE CASCADE;
        `);

        // --- 4. GROUND NODE (STAFF) AUTHORIZATION MAPPING ---
        // Architect Note: admin_id changed to UUID to perfectly map the admins table schema
        await client.query(`
            CREATE TABLE IF NOT EXISTS event_staff_assignments (
                admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
                event_id INT REFERENCES events(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (admin_id, event_id)
            );
        `);

        // --- 5. THE EPHEMERAL MESH (Existing) ---
        await client.query(`
            CREATE TABLE IF NOT EXISTS direct_messages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                event_id INT REFERENCES events(id) ON DELETE CASCADE,
                sender_id UUID REFERENCES guests(id) ON DELETE CASCADE,
                receiver_id UUID REFERENCES guests(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_dm_participants ON direct_messages(event_id, sender_id, receiver_id);
        `);

        await client.query('COMMIT');
        logger.info(context, 'Step 2: RBAC & Abyss ledger architecture verified and ready.');

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(context, 'Failure Point DB-MIGRATE: Schema migration failed.', error);
    } finally {
        client.release();
    }
};
const runSequenceSync = async () => {
    const context = 'DB-Sync-Tool';
    const client = await pool.connect();

    try {
        logger.info(context, 'Step 1: Running INT4 primary key sequence synchronization...');

        // ARCHITECT NOTE: Only syncing the events table, ignoring UUID tables.
        await client.query(`
            SELECT setval(pg_get_serial_sequence('events', 'id'), COALESCE(MAX(id), 1)) FROM events;
        `);

        logger.info(context, 'Step 2: Sequence synchronization SUCCESS. Database is ready for new inserts.');

    } catch (error) {
        logger.error(context, 'Failure Point DB-SYNC: Sequence sync failed.', error);
    } finally {
        client.release();
    }
};

const connectDB = async () => {
    try {
        logger.info('Database', 'Attempting to securely connect to Aiven PostgreSQL...');
        const client = await pool.connect();
        logger.info('Database', 'Successfully connected to PostgreSQL with verified SSL!');
        client.release(); 

        // Execute the automated schema builds
        await runMigrations();
        await runSequenceSync();

    } catch (error) {
        logger.error('Database', 'Failure Point DB-CONN: CRITICAL FAILURE: Could not connect to PostgreSQL.', error);
        process.exit(1); 
    }
};

module.exports = {
    pool,
    connectDB,
    query: (text, params) => pool.query(text, params),
    // ARCHITECT NOTE: Exporting the raw connection lease function for atomic transactions
    connect: () => pool.connect() 
};