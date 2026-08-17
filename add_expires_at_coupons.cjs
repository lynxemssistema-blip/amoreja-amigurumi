const { Client } = require('pg');

async function addExpirationToCoupons() {
  const connectionString = 'postgresql://postgres:10207597Rdv*@db.slgpkokjcaiprqxpoefr.supabase.co:5432/postgres';
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log("Conectado ao Supabase via pg!");

    // Adicionando coluna expires_at
    try {
      await pgClient.query(`ALTER TABLE new_amoreja_coupons ADD COLUMN expires_at TIMESTAMPTZ NULL;`);
      console.log("Coluna 'expires_at' adicionada com sucesso!");
    } catch (e) {
      if (e.code === '42701') console.log("A coluna 'expires_at' já existe.");
      else throw e;
    }

  } catch (error) {
    console.error("Erro geral:", error);
  } finally {
    await pgClient.end();
  }
}

addExpirationToCoupons();
