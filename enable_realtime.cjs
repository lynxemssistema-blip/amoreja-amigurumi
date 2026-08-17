require('dotenv').config();
const { Client } = require('pg');

async function enableRealtime() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Habilitando Supabase Realtime para as tabelas do Instagram...');

    // Adiciona as tabelas ao publication de realtime
    await pgClient.query(`
      -- Habilita o realtime para os contatos
      ALTER TABLE public.new_amoreja_ig_contacts REPLICA IDENTITY FULL;
      
      -- Habilita o realtime para as mensagens
      ALTER TABLE public.new_amoreja_ig_messages REPLICA IDENTITY FULL;
      
      -- Habilita o realtime para as notificações
      ALTER TABLE public.new_amoreja_ig_notifications REPLICA IDENTITY FULL;

      -- Adiciona na publicação do Supabase
      ALTER PUBLICATION supabase_realtime ADD TABLE public.new_amoreja_ig_contacts;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.new_amoreja_ig_messages;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.new_amoreja_ig_notifications;
    `);

    console.log('✅ Realtime habilitado com sucesso!');
  } catch (err) {
    if (err.message.includes('already exists in publication')) {
      console.log('✅ Realtime já estava configurado para alguma tabela!');
    } else {
      console.error('Erro:', err.message);
    }
  } finally {
    await pgClient.end();
  }
}

enableRealtime();
