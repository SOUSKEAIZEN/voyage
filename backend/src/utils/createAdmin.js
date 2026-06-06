require('dotenv').config({ path: '../../.env' }); // Adjust relative path if executed from root
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

const runAdminProvisioning = async () => {
    const context = '[Admin Vault]';
    console.log(`${context} Step 1: Initializing Master Admin CLI...`);

    // [Architecture] Extract arguments from the terminal command
    const args = process.argv.slice(2);
    if (args.length !== 2) {
        console.error(`${context} CRITICAL FAILURE: Invalid arguments detected.`);
        console.log(`Usage Protocol: node src/utils/createAdmin.js <email> <raw_password>`);
        process.exit(1);
    }

    const [email, rawPassword] = args;
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); 

        // Mutation 1: Guarantee the Vault exists
        console.log(`${context} Step 2: Verifying Admin Vault schema in Global Ledger...`);
        await client.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Mutation 2: Cryptographic Salting
        // [Architecture] 12 rounds of salt is the current enterprise standard. 
        // It is slow enough to severely penalize brute-force attacks, but fast enough for instant login.
        console.log(`${context} Step 3: Executing cryptographic hash on password payload...`);
        const saltRounds = 12; 
        const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

        // Mutation 3: Ledger Injection
        console.log(`${context} Step 4: Injecting superuser into Global Ledger...`);
        const insertQuery = `
            INSERT INTO admins (email, password_hash)
            VALUES ($1, $2)
            ON CONFLICT (email) DO UPDATE SET password_hash = $2
            RETURNING id, email;
        `;
        const result = await client.query(insertQuery, [email, passwordHash]);

        await client.query('COMMIT');
        console.log(`${context} Step 5: SUCCESS. Master Admin [${result.rows[0].email}] provisioned and secured.`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`${context} Failure Point Admin-CLI: Cryptographic injection failed.`, error.message);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
};

runAdminProvisioning();