require('dotenv').config();
const { Client } = require('pg');

async function listUsers() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    let res = await client.query(`
      SELECT email FROM public.new_amoreja_profiles;
    `);
    
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
listUsers();
