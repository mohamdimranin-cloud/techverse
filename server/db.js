const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Neon
})

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id TEXT UNIQUE NOT NULL,
      team_name TEXT NOT NULL,
      domain TEXT NOT NULL,
      college TEXT NOT NULL,
      team_size INT NOT NULL,
      project_title TEXT NOT NULL,
      project_desc TEXT NOT NULL,
      txn_id TEXT,
      status TEXT DEFAULT 'pending',
      checked_in BOOLEAN DEFAULT FALSE,
      checked_in_at TIMESTAMPTZ,
      checkin_count INT DEFAULT 0,
      ppt_name TEXT,
      ppt_size BIGINT,
      registered_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add checkin_count to existing tables if missing
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS checkin_count INT DEFAULT 0;

    CREATE TABLE IF NOT EXISTS members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT,
      is_leader BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS sponsors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      image_data TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log('✅ Database tables ready')
}

module.exports = { pool, initDB }
