require('dotenv').config();
const { Client } = require('pg');

async function setup() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    
    await pgClient.query(`
      ALTER TABLE public.new_amoreja_products 
      ADD COLUMN IF NOT EXISTS maratona_id UUID REFERENCES public.new_amoreja_maratonas(id) ON DELETE SET NULL;
    `);
    console.log('Coluna maratona_id adicionada com sucesso!');
  } catch (err) {
    console.log('Erro ao adicionar coluna:', err.message);
  } finally {
    await pgClient.end();
  }
}

setup();
