const { Client } = require('pg');

async function addProductFlags() {
  const connectionString = 'postgresql://postgres:10207597Rdv*@db.slgpkokjcaiprqxpoefr.supabase.co:5432/postgres';
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log("Conectado ao Supabase via pg!");

    // Adicionando coluna is_active
    try {
      await pgClient.query(`ALTER TABLE new_amoreja_products ADD COLUMN is_active BOOLEAN DEFAULT true;`);
      console.log("Coluna 'is_active' adicionada com sucesso!");
    } catch (e) {
      if (e.code === '42701') console.log("A coluna 'is_active' já existe.");
      else throw e;
    }

    // Adicionando coluna is_free
    try {
      await pgClient.query(`ALTER TABLE new_amoreja_products ADD COLUMN is_free BOOLEAN DEFAULT false;`);
      console.log("Coluna 'is_free' adicionada com sucesso!");
    } catch (e) {
      if (e.code === '42701') console.log("A coluna 'is_free' já existe.");
      else throw e;
    }

  } catch (error) {
    console.error("Erro geral:", error);
  } finally {
    await pgClient.end();
  }
}

addProductFlags();
