require('dotenv').config();
const { Client } = require('pg');

async function createInstagramTables() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Criando tabelas do Instagram Direct...');

    // 1. Contatos do Instagram
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.new_amoreja_ig_contacts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT,
        profile_pic_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.new_amoreja_ig_contacts ENABLE ROW LEVEL SECURITY;
    `);

    // 2. Mensagens do Instagram Direct
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.new_amoreja_ig_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        contact_id UUID REFERENCES public.new_amoreja_ig_contacts(id) ON DELETE CASCADE,
        sender_username TEXT NOT NULL,
        content TEXT NOT NULL,
        is_from_me BOOLEAN DEFAULT FALSE,
        media_url TEXT,
        message_type TEXT DEFAULT 'text', -- 'text', 'image', 'audio'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.new_amoreja_ig_messages ENABLE ROW LEVEL SECURITY;
    `);

    // 3. Conversas com Agente IA do Instagram (DMs)
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.new_amoreja_ig_agent_chats (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        contact_id UUID REFERENCES public.new_amoreja_ig_contacts(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        sender TEXT NOT NULL, -- 'admin' ou 'ai'
        context_data JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.new_amoreja_ig_agent_chats ENABLE ROW LEVEL SECURITY;
    `);

    // RLS Policies
    await pgClient.query(`
      DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated on contacts" ON public.new_amoreja_ig_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow read for anon on contacts" ON public.new_amoreja_ig_contacts FOR SELECT TO anon USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated on messages" ON public.new_amoreja_ig_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow read for anon on messages" ON public.new_amoreja_ig_messages FOR SELECT TO anon USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated on agent" ON public.new_amoreja_ig_agent_chats FOR ALL TO authenticated USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow read for anon on agent" ON public.new_amoreja_ig_agent_chats FOR SELECT TO anon USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      GRANT ALL ON public.new_amoreja_ig_contacts TO authenticated, anon;
      GRANT ALL ON public.new_amoreja_ig_messages TO authenticated, anon;
      GRANT ALL ON public.new_amoreja_ig_agent_chats TO authenticated, anon;
    `);

    console.log('✅ Tabelas criadas. Populando dados mock do Instagram...');

    // Popular contatos
    const contactsRes = await pgClient.query(`
      INSERT INTO public.new_amoreja_ig_contacts (username, full_name, profile_pic_url)
      VALUES 
        ('juliana_artes', 'Juliana Mendes', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
        ('croche_da_lu', 'Luana Souza', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80'),
        ('amigurumi_love', 'Beatriz Silva', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80')
      ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, profile_pic_url = EXCLUDED.profile_pic_url
      RETURNING id, username;
    `);

    const contactMap = {};
    contactsRes.rows.forEach(r => {
      contactMap[r.username] = r.id;
    });

    // Limpar mensagens mock antigas
    await pgClient.query('DELETE FROM public.new_amoreja_ig_messages');

    // Popular mensagens para juliana_artes
    await pgClient.query(`
      INSERT INTO public.new_amoreja_ig_messages (contact_id, sender_username, content, is_from_me, created_at)
      VALUES 
        ('${contactMap['juliana_artes']}', 'juliana_artes', 'Oi! Adorei a girafinha Gigi Love que vi no feed.', false, NOW() - INTERVAL '3 hours'),
        ('${contactMap['juliana_artes']}', 'Você', 'Olá Juliana! Que bom que gostou. Ela é um sucesso mesmo!', true, NOW() - INTERVAL '2 hours 50 minutes'),
        ('${contactMap['juliana_artes']}', 'juliana_artes', 'Qual agulha de crochê você recomenda para tecer ela? Quero comprar os materiais hoje.', false, NOW() - INTERVAL '2 hours 45 minutes'),
        ('${contactMap['juliana_artes']}', 'Você', 'Recomendamos agulha de 2.0mm a 2.5mm, dependendo do seu ponto. Se for mais soltinho, a 2.0mm é ideal.', true, NOW() - INTERVAL '2 hours 30 minutes'),
        ('${contactMap['juliana_artes']}', 'juliana_artes', 'Entendi! Vou usar fio Amigurumi tradicional da Círculo. A agulha 2.25mm daria certo?', false, NOW() - INTERVAL '10 minutes')
    `);

    // Popular mensagens para croche_da_lu
    await pgClient.query(`
      INSERT INTO public.new_amoreja_ig_messages (contact_id, sender_username, content, is_from_me, created_at)
      VALUES 
        ('${contactMap['croche_da_lu']}', 'croche_da_lu', 'Boa tarde! Comprei a receita da Rena de Natal Rodolph ontem.', false, NOW() - INTERVAL '5 hours'),
        ('${contactMap['croche_da_lu']}', 'croche_da_lu', 'Onde posso tirar dúvidas sobre a montagem das pernas?', false, NOW() - INTERVAL '4 hours 58 minutes'),
        ('${contactMap['croche_da_lu']}', 'Você', 'Olá Luana! Pode mandar suas dúvidas por aqui ou no nosso suporte exclusivo no WhatsApp.', true, NOW() - INTERVAL '4 hours 30 minutes'),
        ('${contactMap['croche_da_lu']}', 'croche_da_lu', 'Ah, perfeito. Vou mandar foto da peça aqui pra ver se estou fazendo certo.', false, NOW() - INTERVAL '4 hours 15 minutes')
    `);

    // Popular mensagens para amigurumi_love
    await pgClient.query(`
      INSERT INTO public.new_amoreja_ig_messages (contact_id, sender_username, content, is_from_me, created_at)
      VALUES 
        ('${contactMap['amigurumi_love']}', 'amigurumi_love', 'Oi amoreja, vocês vendem o combo do Festival das Estações?', false, NOW() - INTERVAL '1 day'),
        ('${contactMap['amigurumi_love']}', 'Você', 'Oi Beatriz! Sim, o link de compra com desconto exclusivo está na nossa bio!', true, NOW() - INTERVAL '23 hours'),
        ('${contactMap['amigurumi_love']}', 'amigurumi_love', 'Ah sim, vi o link. Mas tem desconto extra se eu pagar por Pix?', false, NOW() - INTERVAL '20 hours')
    `);

    console.log('✅ Mensagens e contatos mock populados com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pgClient.end();
  }
}

createInstagramTables();
