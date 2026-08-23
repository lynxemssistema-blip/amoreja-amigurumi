const { Client } = require('pg');
require('dotenv').config();

async function addMercadoPagoProductFields() {
  const connectionString = process.env.SUPABASE_DB_URL || 'postgresql://postgres:10207597Rdv*@db.slgpkokjcaiprqxpoefr.supabase.co:5432/postgres';
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log("Conectado ao Supabase via pg!");

    // Adicionando coluna payment_type (default: 'automatic')
    try {
      await pgClient.query(`ALTER TABLE new_amoreja_products ADD COLUMN payment_type TEXT DEFAULT 'automatic';`);
      console.log("Coluna 'payment_type' adicionada com sucesso!");
    } catch (e) {
      if (e.code === '42701') console.log("A coluna 'payment_type' já existe.");
      else console.error("Erro ao adicionar 'payment_type':", e.message);
    }

    // Adicionando coluna mp_payment_link (TEXT)
    try {
      await pgClient.query(`ALTER TABLE new_amoreja_products ADD COLUMN mp_payment_link TEXT;`);
      console.log("Coluna 'mp_payment_link' adicionada com sucesso!");
    } catch (e) {
      if (e.code === '42701') console.log("A coluna 'mp_payment_link' já existe.");
      else console.error("Erro ao adicionar 'mp_payment_link':", e.message);
    }

  } catch (error) {
    console.error("Erro geral:", error);
  } finally {
    await pgClient.end();
  }
}

addMercadoPagoProductFields();
