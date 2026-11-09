
import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getDatabase() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not configured.');
    }

    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_SSL === 'true'
                ? { rejectUnauthorized: false }
                : undefined,
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000
        });
    }

    return pool;
}

export async function initializeDatabase() {
    const db = getDatabase();

    await db.query(`
        CREATE TABLE IF NOT EXISTS command_role_permissions (
            guild_id VARCHAR(20) NOT NULL,
            command_name VARCHAR(100) NOT NULL,
            role_id VARCHAR(20) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (guild_id, command_name, role_id)
        );
    `);

    console.log('[JURUMI] Permission database initialized.');
}
