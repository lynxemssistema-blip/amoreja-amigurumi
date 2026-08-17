require('dotenv').config();
const { Client } = require('pg');

async function addInstagramIdColumn() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Adicionando coluna instagram_id à tabela de contatos...');

    // Adiciona coluna instagram_id se não existir
    await pgClient.query(`
      ALTER TABLE public.new_amoreja_ig_contacts ADD COLUMN IF NOT EXISTS instagram_id TEXT;
    `);

    // Atualiza contatos mock com ids mockados numericos
    await pgClient.query(`
      UPDATE public.new_amoreja_ig_contacts SET instagram_id = '11111111' WHERE username = 'ninjagurumi';
      UPDATE public.new_amoreja_ig_contacts SET instagram_id = '22222222' WHERE username = 'tati_tonetti';
      UPDATE public.new_amoreja_ig_contacts SET instagram_id = '33333333' WHERE username = 'nice_leana';
      UPDATE public.new_amoreja_ig_contacts SET instagram_id = '44444444' WHERE username = 'loja_amigu';
      UPDATE public.new_amoreja_ig_contacts SET instagram_id = '55555555' WHERE username = 'duamo_armarinho';
      UPDATE public.new_amoreja_ig_contacts SET instagram_id = '66666666' WHERE username = 'blanca_garcia';
      UPDATE public.new_amoreja_ig_contacts SET instagram_id = '77777777' WHERE username = 'artes_manuais_clara';
    `);

    console.log('✅ Coluna instagram_id adicionada e preenchida!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pgClient.end();
  }
}

addInstagramIdColumn();
