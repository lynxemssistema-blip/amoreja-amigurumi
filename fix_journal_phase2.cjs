require('dotenv').config();
const { Client } = require('pg');

const sql = `
-- 1. Adicionar novas colunas na tabela de matérias
ALTER TABLE public.New_Amoreja_journal_articles 
  ADD COLUMN IF NOT EXISTS admin_feedback TEXT,
  ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dislikes_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notified_start BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_end BOOLEAN DEFAULT false;

-- 2. Adicionar feedback em eventos
ALTER TABLE public.New_Amoreja_journal_events
  ADD COLUMN IF NOT EXISTS admin_feedback TEXT;

-- 3. Criar tabela de comentários
CREATE TABLE IF NOT EXISTS public.New_Amoreja_journal_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.New_Amoreja_journal_articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.New_Amoreja_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Habilitar RLS e criar políticas para comentários
ALTER TABLE public.New_Amoreja_journal_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'new_amoreja_journal_comments' AND policyname = 'Qualquer um pode ler comentarios'
    ) THEN
        CREATE POLICY "Qualquer um pode ler comentarios" ON public.New_Amoreja_journal_comments FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'new_amoreja_journal_comments' AND policyname = 'Usuarios logados podem inserir comentarios'
    ) THEN
        CREATE POLICY "Usuarios logados podem inserir comentarios" ON public.New_Amoreja_journal_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'new_amoreja_journal_comments' AND policyname = 'Admin pode deletar comentarios'
    ) THEN
        CREATE POLICY "Admin pode deletar comentarios" ON public.New_Amoreja_journal_comments FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.New_Amoreja_profiles WHERE id = auth.uid() AND is_admin = true)
        );
    END IF;
END $$;
`;

async function run() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando ao Supabase para atualizar o schema do Jornal...');
    await client.connect();
    await client.query(sql);
    console.log('Tabelas e colunas criadas com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await client.end();
  }
}

run();
