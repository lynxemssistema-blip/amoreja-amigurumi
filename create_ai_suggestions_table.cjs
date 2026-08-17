const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://slgpkokjcaiprqxpoefr.supabase.co',
  'sb_secret_9ixNWiCJiuksvVuRwpJH3A_FYfyrqIr'
);

async function run() {
  // Tenta inserir um registro teste para ver se a tabela existe
  const { error: testErr } = await sb.from('new_amoreja_ai_suggestions').select('id').limit(1);
  
  if (!testErr) {
    console.log('Tabela já existe!');
    return;
  }

  // Cria via REST Management API
  const statements = [
    `CREATE TABLE IF NOT EXISTS new_amoreja_ai_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      caption TEXT,
      hashtags TEXT[],
      slides TEXT[],
      image_keyword TEXT,
      media_type TEXT DEFAULT 'photo',
      post_format TEXT DEFAULT 'square',
      status TEXT DEFAULT 'draft',
      posted_at TIMESTAMPTZ,
      notes TEXT,
      performance_rating INTEGER,
      reference_post_caption TEXT,
      reference_post_url TEXT
    )`,
    `ALTER TABLE new_amoreja_ai_suggestions ENABLE ROW LEVEL SECURITY`,
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'new_amoreja_ai_suggestions' AND policyname = 'admins_all'
      ) THEN
        CREATE POLICY admins_all ON new_amoreja_ai_suggestions FOR ALL USING (true);
      END IF;
    END $$`
  ];

  for (const sql of statements) {
    const res = await fetch(
      'https://slgpkokjcaiprqxpoefr.supabase.co/rest/v1/rpc/exec',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'sb_secret_9ixNWiCJiuksvVuRwpJH3A_FYfyrqIr',
          'Authorization': 'Bearer sb_secret_9ixNWiCJiuksvVuRwpJH3A_FYfyrqIr'
        },
        body: JSON.stringify({ sql })
      }
    );
    const text = await res.text();
    console.log('Status:', res.status, text.substring(0, 200));
  }

  // Verifica novamente
  const { error: checkErr } = await sb.from('new_amoreja_ai_suggestions').select('id').limit(1);
  if (!checkErr) console.log('✅ Tabela criada com sucesso!');
  else console.log('❌ Ainda com erro:', checkErr.message);
}

run().catch(console.error);
