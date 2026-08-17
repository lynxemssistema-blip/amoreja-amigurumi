const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:10207597Rdv*@db.slgpkokjcaiprqxpoefr.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Conectado ao PostgreSQL!');

  const sql = `
    CREATE TABLE IF NOT EXISTS public.new_amoreja_inspiration_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      title TEXT NOT NULL,
      url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.new_amoreja_inspirations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      title TEXT NOT NULL,
      description TEXT,
      suggestion_idea TEXT,
      source_url TEXT,
      image_url TEXT,
      scraped_images TEXT[]
    );

    ALTER TABLE public.new_amoreja_inspiration_sources ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.new_amoreja_inspirations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS admins_sources_all ON public.new_amoreja_inspiration_sources;
    CREATE POLICY admins_sources_all ON public.new_amoreja_inspiration_sources FOR ALL USING (true);

    DROP POLICY IF EXISTS admins_inspirations_all ON public.new_amoreja_inspirations;
    CREATE POLICY admins_inspirations_all ON public.new_amoreja_inspirations FOR ALL USING (true);

    GRANT ALL ON TABLE public.new_amoreja_inspiration_sources TO postgres, authenticated, anon, service_role;
    GRANT ALL ON TABLE public.new_amoreja_inspirations TO postgres, authenticated, anon, service_role;

    NOTIFY pgrst, 'reload schema';
  `;

  try {
    const res = await client.query(sql);
    console.log('Tabelas de inspiração criadas com sucesso!');
  } catch (err) {
    console.error('Erro ao executar query:', err.message);
  }

  // Verifica se as tabelas existem agora
  const check = await client.query("select table_name from information_schema.tables where table_schema = 'public' and table_name like '%inspiration%';");
  console.log('Tabelas encontradas no banco:', check.rows);

  await client.end();
}

run().catch(console.error);
