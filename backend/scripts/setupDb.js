require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');
const logger = require('../src/utils/logger');

const setupDatabase = async () => {
    const context = 'DatabaseMigration';
    try {
        logger.info(context, 'Starting automated database migration...');

        // Step 1: Locate the SQL blueprint file
        const sqlFilePath = path.join(__dirname, '../database/init.sql');
        logger.info(context, `Reading SQL blueprint from: ${sqlFilePath}`);

        // Step 2: Read the SQL commands from the file
        const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');
        logger.info(context, 'Blueprint read successfully. Executing against Aiven PostgreSQL...');

        // Step 3: Execute the SQL commands
        await pool.query(sqlQuery);
        logger.info(context, 'SUCCESS: All tables and constraints have been created in the database!');

    } catch (error) {
        // Log exactly why it failed (e.g., wrong file path, bad SQL syntax)
        logger.error(context, 'CRITICAL FAILURE during database migration.', error);
    } finally {
        // Close the connection pool so the script finishes and exits your terminal cleanly
        logger.info(context, 'Closing database connection. Migration script complete.');
        await pool.end();
    }
};

// Run the migration
setupDatabase();