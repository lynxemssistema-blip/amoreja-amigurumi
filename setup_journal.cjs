require('dotenv').config();
const { Client } = require('pg');

const sql = `
-- 1. Adicionar tags compostas ao perfil
ALTER TABLE public.New_Amoreja_profiles ADD COLUMN IF NOT EXISTS user_tags TEXT[] DEFAULT '{}';

-- 2. Criar tabela de Matérias do Jornal
CREATE TABLE IF NOT EXISTS public.New_Amoreja_journal_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    layout_model TEXT DEFAULT 'classic',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    author_id UUID NOT NULL REFERENCES public.New_Amoreja_profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    social_links JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.New_Amoreja_journal_articles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Artigos
-- Qualquer um pode ler matérias aprovadas e dentro da validade
CREATE POLICY "Qualquer um pode ler materias ativas"
    ON public.New_Amoreja_journal_articles FOR SELECT 
    USING (status = 'approved');

-- Autores podem ler as próprias matérias (mesmo pendentes)
CREATE POLICY "Autores podem ler proprias materias"
    ON public.New_Amoreja_journal_articles FOR SELECT
    USING (author_id = auth.uid());

-- Autores podem inserir matérias
CREATE POLICY "Autores podem inserir materias"
    ON public.New_Amoreja_journal_articles FOR INSERT
    WITH CHECK (author_id = auth.uid());

-- Admin tem acesso total
CREATE POLICY "Admin acesso total materias"
    ON public.New_Amoreja_journal_articles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.New_Amoreja_profiles
            WHERE New_Amoreja_profiles.id = auth.uid() AND New_Amoreja_profiles.is_admin = true
        )
    );

-- 3. Criar tabela de Eventos do Jornal
CREATE TABLE IF NOT EXISTS public.New_Amoreja_journal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    author_id UUID NOT NULL REFERENCES public.New_Amoreja_profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    social_links JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.New_Amoreja_journal_events ENABLE ROW LEVEL SECURITY;

-- RLS Eventos
CREATE POLICY "Qualquer um pode ler eventos aprovados"
    ON public.New_Amoreja_journal_events FOR SELECT 
    USING (status = 'approved');

CREATE POLICY "Autores podem ler proprios eventos"
    ON public.New_Amoreja_journal_events FOR SELECT
    USING (author_id = auth.uid());

CREATE POLICY "Autores podem inserir eventos"
    ON public.New_Amoreja_journal_events FOR INSERT
    WITH CHECK (author_id = auth.uid());

CREATE POLICY "Admin acesso total eventos"
    ON public.New_Amoreja_journal_events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.New_Amoreja_profiles
            WHERE New_Amoreja_profiles.id = auth.uid() AND New_Amoreja_profiles.is_admin = true
        )
    );
`;

async function run() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
      console.log('SUPABASE_DB_URL not defined. Skipping DB setup.');
      return;
  }
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Executing journal schema...');
    await client.query(sql);
    console.log('Journal schema executed successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
