require('dotenv').config();
const { Client } = require('pg');

async function setup() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    
    await pgClient.query(`
      ALTER TABLE public.new_amoreja_maratonas 
      ADD COLUMN IF NOT EXISTS banner_images JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Coluna banner_images adicionada com sucesso!');
  } catch (err) {
    console.log('Erro ao adicionar coluna:', err.message);
  } finally {
    await pgClient.end();
  }
}

setup();
