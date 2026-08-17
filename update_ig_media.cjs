require('dotenv').config();
const { Client } = require('pg');

async function updateInstagramMedia() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Atualizando DMs do Instagram com arquivos de mídia (áudio e imagem)...');

    // 1. Obter os ids dos contatos nice_leana e blanca_garcia
    const res = await pgClient.query(`
      SELECT id, username FROM public.new_amoreja_ig_contacts 
      WHERE username IN ('nice_leana', 'blanca_garcia');
    `);

    const contactMap = {};
    res.rows.forEach(r => {
      contactMap[r.username] = r.id;
    });

    if (contactMap['nice_leana']) {
      // Deletar mensagens antigas de nice_leana e recriar com áudio real
      await pgClient.query(`
        DELETE FROM public.new_amoreja_ig_messages WHERE contact_id = '${contactMap['nice_leana']}';
        
        INSERT INTO public.new_amoreja_ig_messages (contact_id, sender_username, content, is_from_me, message_type, media_url, created_at)
        VALUES 
          ('${contactMap['nice_leana']}', 'nice_leana', 'Enviei o áudio explicando os detalhes.', false, 'text', NULL, NOW() - INTERVAL '4 hours 5 minutes'),
          ('${contactMap['nice_leana']}', 'nice_leana', 'Áudio de voz', false, 'audio', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', NOW() - INTERVAL '4 hours');
      `);
    }

    if (contactMap['blanca_garcia']) {
      // Deletar mensagens antigas de blanca_garcia e recriar com imagem real
      await pgClient.query(`
        DELETE FROM public.new_amoreja_ig_messages WHERE contact_id = '${contactMap['blanca_garcia']}';
        
        INSERT INTO public.new_amoreja_ig_messages (contact_id, sender_username, content, is_from_me, message_type, media_url, created_at)
        VALUES 
          ('${contactMap['blanca_garcia']}', 'blanca_garcia', 'Olha como ficou linda a girafinha que terminei hoje!', false, 'text', NULL, NOW() - INTERVAL '6 hours 5 minutes'),
          ('${contactMap['blanca_garcia']}', 'blanca_garcia', 'Foto da Girafinha', false, 'image', 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80', NOW() - INTERVAL '6 hours');
      `);
    }

    console.log('✅ Mensagens atualizadas com áudio e imagem!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pgClient.end();
  }
}

updateInstagramMedia();
