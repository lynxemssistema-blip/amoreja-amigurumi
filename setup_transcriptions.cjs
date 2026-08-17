require('dotenv').config();
const { Client } = require('pg');

async function createTranscriptionsTable() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Criando tabela de transcrições...');

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.new_amoreja_wa_transcriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        message_id TEXT UNIQUE NOT NULL,
        transcription TEXT NOT NULL,
        model_used TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE public.new_amoreja_wa_transcriptions ENABLE ROW LEVEL SECURITY;

      -- Políticas de acesso
      DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated" ON public.new_amoreja_wa_transcriptions
          FOR ALL TO authenticated USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow all for anon" ON public.new_amoreja_wa_transcriptions
          FOR ALL TO anon USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      -- Grants
      GRANT ALL ON public.new_amoreja_wa_transcriptions TO authenticated;
      GRANT ALL ON public.new_amoreja_wa_transcriptions TO anon;
    `);

    console.log('✅ Tabela new_amoreja_wa_transcriptions criada com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pgClient.end();
  }
}

createTranscriptionsTable();
