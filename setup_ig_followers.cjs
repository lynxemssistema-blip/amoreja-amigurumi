require('dotenv').config();
const { Client } = require('pg');

async function setupFollowers() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Criando tabela de seguidores do Instagram...');

    // 1. Tabela de seguidores
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.new_amoreja_ig_followers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT,
        profile_pic_url TEXT,
        is_following_back BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.new_amoreja_ig_followers ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated on followers" ON public.new_amoreja_ig_followers FOR ALL TO authenticated USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow read for anon on followers" ON public.new_amoreja_ig_followers FOR SELECT TO anon USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      GRANT ALL ON public.new_amoreja_ig_followers TO authenticated, anon;
    `);

    // Limpar anteriores
    await pgClient.query('DELETE FROM public.new_amoreja_ig_followers');

    console.log('✅ Tabela criada. Inserindo seguidores mock...');

    // 2. Inserir dados mock
    await pgClient.query(`
      INSERT INTO public.new_amoreja_ig_followers (username, full_name, profile_pic_url, is_following_back)
      VALUES 
        ('artes_michele', 'Michele Souza', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', false),
        ('fios_e_amor', 'Aline Ferreira', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', true),
        ('ponto_a_ponto', 'Clara Lima', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', false),
        ('amigurumi_brasil', 'Rodrigo Costa', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', true),
        ('croche_terapia', 'Carla Dias', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80', false),
        ('atelie_da_nanda', 'Fernanda Rocha', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', true),
        ('ninjagurumi', 'NinjaGurumi • Adri Kutani Fukumoto', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', false),
        ('tati_tonetti', 'Tati Tonetti | Amigurumi Designer', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', true)
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Seguidores do Instagram mockados criados com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pgClient.end();
  }
}

setupFollowers();
