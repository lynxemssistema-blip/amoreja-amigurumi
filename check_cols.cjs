const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:10207597Rdv*@db.slgpkokjcaiprqxpoefr.supabase.co:5432/postgres', ssl: { rejectUnauthorized: false } });
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'new_amoreja_profiles'"))
.then(res => { console.log(res.rows); client.end(); });
