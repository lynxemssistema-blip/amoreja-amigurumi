require('dotenv').config();
const { Client } = require('pg');

const sql = `
ALTER TABLE public.new_amoreja_profiles 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client', 
  ADD COLUMN IF NOT EXISTS partner_status TEXT DEFAULT 'pending', 
  ADD COLUMN IF NOT EXISTS partner_bio TEXT, 
  ADD COLUMN IF NOT EXISTS partner_pix_key TEXT, 
  ADD COLUMN IF NOT EXISTS partner_bank_name TEXT, 
  ADD COLUMN IF NOT EXISTS partner_mp_access_token TEXT, 
  ADD COLUMN IF NOT EXISTS partner_mp_public_key TEXT, 
  ADD COLUMN IF NOT EXISTS partner_default_commission_pct NUMERIC(5,2) DEFAULT 70.00;
`;

async function run() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Executing alter table...');
    await client.query(sql);
    console.log('Columns added successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
