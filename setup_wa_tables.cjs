require('dotenv').config();
const { Client } = require('pg');

async function createWhatsAppTables() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Criando tabelas do WhatsApp CRM...');

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.new_amoreja_wa_contacts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        jid TEXT NOT NULL UNIQUE, -- Evolution API JID (ex: 5531999522412@s.whatsapp.net ou 120363@g.us)
        name TEXT NOT NULL,
        type TEXT DEFAULT 'contact', -- 'contact' ou 'group'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.new_amoreja_wa_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        message_id TEXT NOT NULL UNIQUE, -- ID original da mensagem na Evolution
        contact_id UUID REFERENCES public.new_amoreja_wa_contacts(id) ON DELETE CASCADE,
        sender_name TEXT,
        sender_jid TEXT,
        message_type TEXT, -- 'text', 'audio', 'image', 'video'
        content TEXT, -- texto da mensagem ou transcricao do audio / desc da imagem
        media_url TEXT, -- link para a midia original
        from_me BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.new_amoreja_wa_agent_chats (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        sender TEXT NOT NULL, -- 'admin' ou 'ai'
        context_data JSONB, -- dados adicionais como JIDs referenciados
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Aplicar RLS
      ALTER TABLE public.new_amoreja_wa_contacts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.new_amoreja_wa_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.new_amoreja_wa_agent_chats ENABLE ROW LEVEL SECURITY;

      -- Politicas: Admins podem tudo
      CREATE POLICY "Admins_contacts_all" ON public.new_amoreja_wa_contacts FOR ALL USING (
        EXISTS (SELECT 1 FROM public.new_amoreja_profiles WHERE new_amoreja_profiles.id = auth.uid() AND is_admin = true)
      );
      
      CREATE POLICY "Admins_messages_all" ON public.new_amoreja_wa_messages FOR ALL USING (
        EXISTS (SELECT 1 FROM public.new_amoreja_profiles WHERE new_amoreja_profiles.id = auth.uid() AND is_admin = true)
      );

      CREATE POLICY "Admins_agent_chats_all" ON public.new_amoreja_wa_agent_chats FOR ALL USING (
        EXISTS (SELECT 1 FROM public.new_amoreja_profiles WHERE new_amoreja_profiles.id = auth.uid() AND is_admin = true)
      );

    `);
    
    console.log('Tabelas criadas com sucesso!');

  } catch (err) {
    console.error('Erro ao criar tabelas:', err.message);
  } finally {
    await pgClient.end();
  }
}

createWhatsAppTables();
