// [Architecture] Standalone Utility: Database Schema Mapper
// Run this from the root of your backend folder using: node scripts/printSchema.js

require('dotenv').config();
const db = require('../src/config/db'); // Adjust path to your db config if necessary

async function printDatabaseSchema() {
    console.log('\n================================================================');
    console.log('   [Architecture] DATABASE SCHEMA MAPPER Engaged');
    console.log('================================================================\n');

    try {
        // Query PostgreSQL internal information schema for all public tables
        const query = `
            SELECT 
                table_name, 
                column_name, 
                data_type, 
                character_maximum_length,
                is_nullable, 
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        `;

        const result = await db.query(query);
        
        if (result.rows.length === 0) {
            console.log('No tables found in the public schema. Database might be empty.');
            process.exit(0);
        }

        // Group columns by table name
        const schema = {};
        result.rows.forEach(row => {
            if (!schema[row.table_name]) {
                schema[row.table_name] = [];
            }
            schema[row.table_name].push(row);
        });

        // Print the schema beautifully with terminal colors
        for (const [tableName, columns] of Object.entries(schema)) {
            console.log(`\n📦 TABLE: \x1b[36m${tableName.toUpperCase()}\x1b[0m`);
            console.log('-'.repeat(90));
            console.log(
                `\x1b[33m${'COLUMN NAME'.padEnd(25)} | ${'DATA TYPE'.padEnd(25)} | ${'NULLABLE'.padEnd(10)} | DEFAULT\x1b[0m`
            );
            console.log('-'.repeat(90));

            columns.forEach(col => {
                const colName = col.column_name.padEnd(25);
                const dataTypeStr = col.data_type === 'character varying' 
                    ? `varchar(${col.character_maximum_length})` 
                    : col.data_type;
                const dataType = dataTypeStr.padEnd(25);
                const isNullable = col.is_nullable.padEnd(10);
                const def = col.column_default || 'NULL';

                console.log(`${colName} | ${dataType} | ${isNullable} | ${def}`);
            });
            console.log('-'.repeat(90));
        }

        console.log('\n✅ System Architecture Mapping Complete.\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ CRITICAL FAILURE: Could not read database schema.\n', error);
        process.exit(1);
    }
}

printDatabaseSchema();
