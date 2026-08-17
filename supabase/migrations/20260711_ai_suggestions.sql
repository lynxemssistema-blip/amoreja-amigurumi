-- Tabela de sugestões de conteúdo geradas pela IA
create table if not exists new_amoreja_ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  -- Conteúdo gerado
  caption text,
  hashtags text[],
  slides text[],
  image_keyword text,
  media_type text default 'photo',   -- 'photo' | 'video'
  post_format text default 'square', -- 'square' | 'portrait' | 'reels'

  -- Status de publicação
  status text default 'draft',       -- 'draft' | 'posted' | 'discarded'
  posted_at timestamptz,

  -- Estudo / anotações
  notes text,
  performance_rating integer check (performance_rating between 1 and 5),
  
  -- Referência do post do Instagram que foi usado como contexto
  reference_post_caption text,
  reference_post_url text
);

-- Habilitar RLS
alter table new_amoreja_ai_suggestions enable row level security;

-- Apenas admins podem ler e escrever
create policy "admins_all" on new_amoreja_ai_suggestions
  for all using (
    exists (
      select 1 from new_amoreja_profiles
      where id = auth.uid() and is_admin = true
    )
  );
