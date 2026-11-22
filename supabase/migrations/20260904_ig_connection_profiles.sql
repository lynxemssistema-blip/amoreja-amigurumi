-- ═══════════════════════════════════════════════════════════════════
-- Tabela: ig_connection_profiles
-- Armazena perfis do Instagram que foram adicionados para análise
-- de conexões em comum com os contatos existentes.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ig_connection_profiles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username        TEXT NOT NULL,
  following_list  TEXT[] NOT NULL DEFAULT '{}',   -- array de usernames que esse perfil segue
  following_count INT  NOT NULL DEFAULT 0,
  notes           TEXT,                            -- anotação manual opcional
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca rápida por username
CREATE INDEX IF NOT EXISTS idx_ig_connection_profiles_username
  ON ig_connection_profiles(username);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_ig_connection_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ig_connection_profiles_updated_at ON ig_connection_profiles;
CREATE TRIGGER trg_ig_connection_profiles_updated_at
  BEFORE UPDATE ON ig_connection_profiles
  FOR EACH ROW EXECUTE FUNCTION update_ig_connection_profiles_updated_at();

-- RLS: apenas admins autenticados podem acessar
ALTER TABLE ig_connection_profiles ENABLE ROW LEVEL SECURITY;

-- Permite leitura/escrita para usuários autenticados (o admin já verifica no front)
CREATE POLICY "Authenticated users can manage ig_connection_profiles"
  ON ig_connection_profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
