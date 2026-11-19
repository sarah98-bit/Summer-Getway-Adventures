import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

if (!process.env.SQL_HOST || !process.env.SQL_DB_NAME) {
  throw new Error('SQL_HOST and SQL_DB_NAME must be configured in environment variables.');
}

export const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
  max: 10,
  connectionTimeoutMillis: 15000,
});

export const db = drizzle(pool, { schema });
export * from './schema.ts';
