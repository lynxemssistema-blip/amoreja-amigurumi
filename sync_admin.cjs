require('dotenv').config();
const { Client } = require('pg');

async function syncAdmin() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    // Check if user is in auth.users
    let authRes = await client.query(`
      SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = $1;
    `, ['amorejaamigurumi@gmail.com']);
    
    if (authRes.rowCount === 0) {
        console.log('USER_NOT_IN_AUTH_USERS');
        return;
    }

    const user = authRes.rows[0];
    console.log('Found in auth.users:', user.email);

    // Check if they are in new_amoreja_profiles
    let profRes = await client.query(`
      SELECT id FROM public.new_amoreja_profiles WHERE email = $1;
    `, ['amorejaamigurumi@gmail.com']);

    if (profRes.rowCount === 0) {
        console.log('User not in profiles. Inserting...');
        const fullName = user.raw_user_meta_data?.full_name || 'Admin Amoreja';
        
        await client.query(`
          INSERT INTO public.new_amoreja_profiles (id, email, full_name, is_admin)
          VALUES ($1, $2, $3, true);
        `, [user.id, user.email, fullName]);
        
        console.log('ADMIN_CREATED_AND_SYNCED');
    } else {
        console.log('User in profiles. Updating to admin...');
        await client.query(`
          UPDATE public.new_amoreja_profiles
          SET is_admin = true
          WHERE email = $1;
        `, ['amorejaamigurumi@gmail.com']);
        
        console.log('ADMIN_UPDATED');
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
syncAdmin();
