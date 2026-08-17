require('dotenv').config();
const { Client } = require('pg');

async function listTables() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    let res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `);
    
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
listTables();
