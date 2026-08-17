require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected!');

    const schemaPath = require('path').join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await client.query(sql);
    console.log('Schema executed successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('ENOTFOUND') || err.message.includes('timeout')) {
       console.log('FALLBACK_NEEDED');
    }
  } finally {
    await client.end();
  }
}

run();
