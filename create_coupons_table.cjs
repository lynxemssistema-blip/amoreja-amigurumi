const { Client } = require('pg');

async function createCouponsTable() {
  const connectionString = 'postgresql://postgres:10207597Rdv*@db.slgpkokjcaiprqxpoefr.supabase.co:5432/postgres';
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log("Conectado ao banco para criar a tabela de cupons!");

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS new_amoreja_coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) UNIQUE NOT NULL,
        discount_type VARCHAR(50) NOT NULL DEFAULT 'percent',
        discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // Inserir um cupom de teste para garantir que funciona
    try {
      await pgClient.query(`
        INSERT INTO new_amoreja_coupons (code, discount_type, discount_value, is_active)
        VALUES ('BEMVINDO10', 'percent', 10, true)
        ON CONFLICT (code) DO NOTHING;
      `);
      console.log("Cupom BEMVINDO10 inserido com sucesso!");
    } catch(err) {
      console.log("Aviso ao inserir cupom:", err.message);
    }

    console.log("Tabela new_amoreja_coupons verificada/criada com sucesso!");

  } catch (error) {
    console.error("Erro geral:", error);
  } finally {
    await pgClient.end();
  }
}

createCouponsTable();
