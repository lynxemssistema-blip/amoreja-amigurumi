require('dotenv').config();
const { Client } = require('pg');

async function createTables() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Criando tabelas de conteúdo do site...');

    // Tabela de conteúdo editável do site
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.new_amoreja_site_content (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        section_key TEXT UNIQUE NOT NULL,
        title TEXT,
        subtitle TEXT,
        description TEXT,
        image_url TEXT,
        button_text TEXT,
        button_url TEXT,
        button2_text TEXT,
        button2_url TEXT,
        extra_data JSONB DEFAULT '{}',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE public.new_amoreja_site_content ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated" ON public.new_amoreja_site_content
          FOR ALL TO authenticated USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow read for anon" ON public.new_amoreja_site_content
          FOR SELECT TO anon USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      GRANT ALL ON public.new_amoreja_site_content TO authenticated;
      GRANT SELECT ON public.new_amoreja_site_content TO anon;
    `);
    console.log('✅ new_amoreja_site_content criada');

    // Tabela de maratonas
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.new_amoreja_maratonas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        tag TEXT DEFAULT 'Edição Especial',
        description TEXT,
        image_url TEXT,
        cta_text TEXT DEFAULT 'Saber Como Participar',
        cta_url TEXT,
        visible BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE public.new_amoreja_maratonas ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated" ON public.new_amoreja_maratonas
          FOR ALL TO authenticated USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow read for anon" ON public.new_amoreja_maratonas
          FOR SELECT TO anon USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      GRANT ALL ON public.new_amoreja_maratonas TO authenticated;
      GRANT SELECT ON public.new_amoreja_maratonas TO anon;
    `);
    console.log('✅ new_amoreja_maratonas criada');

    // Inserir dados iniciais do hero
    await pgClient.query(`
      INSERT INTO public.new_amoreja_site_content (section_key, subtitle, title, description, image_url, button_text, button_url, button2_text, button2_url)
      VALUES (
        'hero',
        'Mundo dos Amigurumis',
        'Transformando fios em abraços quentinhos!',
        'Crie amigurumis encantadores com receitas detalhadas, passo a passo ilustrado e suporte completo para você tecer amor em cada ponto.',
        'https://images.unsplash.com/photo-1605007493699-af65834f8a00?w=800&auto=format&fit=crop&q=80',
        'Ver Receitas em PDF',
        '/loja',
        'Entrar no Grupo',
        'https://chat.whatsapp.com/DvGLoH4qisk2ir4copcYSm?s=hd&p=i&ilr=0'
      )
      ON CONFLICT (section_key) DO NOTHING;
    `);
    console.log('✅ Hero seed inserido');

    // Inserir maratona existente
    await pgClient.query(`
      INSERT INTO public.new_amoreja_maratonas (title, tag, description, image_url, cta_text, cta_url, visible, sort_order)
      VALUES (
        'Maratona de Amigurumis | Festival das Estações ❄️☀️🌸🍂',
        'Edição Especial',
        'Participe do maior evento cooperativo de amigurumi! Adquira receitas exclusivas criadas por 20 designers brasileiras renomadas. Siga as redes e comece a tecer a coleção inteira.',
        'https://images.unsplash.com/photo-1562040506-a9b32cb51b94?w=600&auto=format&fit=crop&q=80',
        'Saber Como Participar',
        'https://www.instagram.com/mda.festivaldasestacoes',
        true,
        1
      )
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Maratona seed inserida');

    console.log('\n🎉 Tudo pronto!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pgClient.end();
  }
}

createTables();
