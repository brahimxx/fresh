const mysql = require('mysql2/promise');

async function updateDb() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "3306"),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "root",
        database: process.env.DB_NAME || "fresh",
    });

    try {
        console.log('Checking for country column in users table...');
        const [columns] = await pool.query('SHOW COLUMNS FROM users LIKE "country"');

        if (columns.length === 0) {
            console.log('Adding country column to users table...');
            await pool.query('ALTER TABLE users ADD COLUMN country VARCHAR(100) DEFAULT NULL AFTER last_name');
            console.log('Successfully added country column.');
        } else {
            console.log('Country column already exists.');
        }
    } catch (error) {
        console.error('Error updating database:', error);
    } finally {
        await pool.end();
    }
}

updateDb();
