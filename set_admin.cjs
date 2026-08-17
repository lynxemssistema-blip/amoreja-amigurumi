require('dotenv').config();
const { Client } = require('pg');

async function setAdmin() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    // Check if the user exists
    let res = await client.query(`
      SELECT * FROM public.new_amoreja_profiles WHERE email = $1;
    `, ['amorejaamigurumi@gmail.com']);
    
    if (res.rowCount === 0) {
        console.log('USER_NOT_FOUND');
    } else {
        res = await client.query(`
          UPDATE public.new_amoreja_profiles
          SET is_admin = true
          WHERE email = $1
          RETURNING *;
        `, ['amorejaamigurumi@gmail.com']);
        console.log('ADMIN_SET_SUCCESS', res.rows[0]);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
setAdmin();
