const fs = require('fs');
const { Client } = require('pg');

async function migrate() {
  const env = fs.readFileSync('.env', 'utf8');
  const dbUrlMatch = env.match(/DATABASE_URL\s*=\s*([^\r\n]+)/);
  if (!dbUrlMatch) {
    console.log('Sem DATABASE_URL no .env');
    return;
  }

  const client = new Client({
    connectionString: dbUrlMatch[1].trim(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado ao PostgreSQL do Supabase!');

    await client.query(`
      ALTER TABLE public.new_amoreja_profiles 
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client',
      ADD COLUMN IF NOT EXISTS partner_status TEXT DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS partner_bio TEXT,
      ADD COLUMN IF NOT EXISTS partner_pix_key TEXT,
      ADD COLUMN IF NOT EXISTS partner_bank_name TEXT,
      ADD COLUMN IF NOT EXISTS partner_mp_access_token TEXT,
      ADD COLUMN IF NOT EXISTS partner_mp_public_key TEXT,
      ADD COLUMN IF NOT EXISTS partner_default_commission_pct NUMERIC DEFAULT 70;

      ALTER TABLE public.new_amoreja_products 
      ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.new_amoreja_profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved',
      ADD COLUMN IF NOT EXISTS partner_commission_pct NUMERIC DEFAULT 70,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    console.log('SUCESSO: Colunas de parceira criadas com sucesso no PostgreSQL!');
    await client.end();
  } catch (err) {
    console.log('Resultado da migração direta pg:', err.message);
  }
}

migrate();
