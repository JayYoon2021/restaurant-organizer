import { Pool } from 'pg';

declare global {
    var postgresPool: Pool | undefined;
}

const pool = global.postgresPool || new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

if (process.env.NODE_ENV !== 'production') {
    global.postgresPool = pool;
}

export default pool;
