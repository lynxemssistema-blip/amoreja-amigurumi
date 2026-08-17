require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
// Native fetch will be used

// Credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EVO_API_KEY = "8A737100D665-451D-8E66-6CCF4380C98E";
const EVO_INSTANCE = "Marcia";
const EVO_URL = "https://evo.lynxems.com.br";

async function runSync() {
  console.log("Iniciando Sincronizacao de 30 dias...");
  
  // 1. Check or Create Bucket
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === 'whatsapp_media')) {
    await supabase.storage.createBucket('whatsapp_media', { public: true });
    console.log("Bucket 'whatsapp_media' criado.");
  }

  // 2. Fetch Monitored Contacts
  const { data: contacts, error: contactsErr } = await supabase.from('new_amoreja_wa_contacts').select('*');
  if (contactsErr || !contacts || contacts.length === 0) {
    console.log("Nenhum contato cadastrado para monitorar.");
    return;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);

  for (const contact of contacts) {
    console.log(`Buscando conversas para: ${contact.name} (${contact.jid})`);
    
    // 3. Fetch Messages from Evolution
    // Many WhatsApp APIs have different bodies for fetch messages. In Baileys (Evolution), it's usually POST /chat/findMessages or we use the JID.
    // Evolution API v1.5+: POST /chat/findMessages/:instance
    try {
      const response = await fetch(`${EVO_URL}/chat/findMessages/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: { key: { remoteJid: contact.jid } }, limit: 200 }) // Limits to 200 to avoid memory crash
      });
      
      const data = await response.json();
      const messages = data.messages?.records || data.records || data || [];
      
      if (!Array.isArray(messages)) {
        console.log(`Resposta invalida para ${contact.name}:`, messages);
        continue;
      }
      
      console.log(`Encontradas ${messages.length} mensagens.`);
      
      for (const msg of messages) {
        if (!msg.messageTimestamp) continue;
        
        // Skip if older than 30 days
        const msgTs = msg.messageTimestamp.low || msg.messageTimestamp;
        if (msgTs < thirtyDaysAgoTimestamp) continue;
        
        const messageId = msg.key?.id;
        if (!messageId) continue;
        
        // Check if already in DB
        const { data: existing } = await supabase.from('new_amoreja_wa_messages').select('id').eq('message_id', messageId).single();
        if (existing) continue;

        const senderName = msg.pushName || (msg.key.fromMe ? 'Admin' : 'Cliente');
        const fromMe = msg.key.fromMe || false;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        let messageType = 'text';
        let textContent = '';
        let mediaUrl = null;

        if (msg.message?.conversation) {
          textContent = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
          textContent = msg.message.extendedTextMessage.text;
        } else if (msg.message?.imageMessage || msg.message?.audioMessage || msg.message?.videoMessage) {
          messageType = msg.message.imageMessage ? 'image' : (msg.message.audioMessage ? 'audio' : 'video');
          textContent = `[${messageType} Recebido]`;
          
          // Optionally download media if the base64 endpoint is available
          try {
             const base64Res = await fetch(`${EVO_URL}/chat/getBase64FromMediaMessage/${EVO_INSTANCE}`, {
               method: 'POST',
               headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
               body: JSON.stringify({ message: msg })
             });
             const base64Data = await base64Res.json();
             if (base64Data?.base64) {
               const buffer = Buffer.from(base64Data.base64, 'base64');
               const ext = messageType === 'image' ? 'jpg' : (messageType === 'audio' ? 'ogg' : 'mp4');
               const filename = `${messageId}.${ext}`;
               await supabase.storage.from('whatsapp_media').upload(filename, buffer, { contentType: base64Data.mimetype });
               const { data: publicUrlData } = supabase.storage.from('whatsapp_media').getPublicUrl(filename);
               mediaUrl = publicUrlData.publicUrl;
             }
          } catch(e) {
            console.log(`Erro ao baixar midia do msg ${messageId}`);
          }
        } else {
           continue; // Ignore system messages etc
        }

        const createdAt = new Date(msgTs * 1000).toISOString();

        await supabase.from('new_amoreja_wa_messages').insert([{
          message_id: messageId,
          contact_id: contact.id,
          sender_name: senderName,
          sender_jid: senderJid,
          message_type: messageType,
          content: textContent,
          media_url: mediaUrl,
          from_me: fromMe,
          created_at: createdAt
        }]);
      }
      
      console.log(`Processamento concluído para ${contact.name}.`);
    } catch(err) {
      console.log(`Erro na API Evolution para ${contact.name}:`, err.message);
    }
  }

  console.log("Sincronizacao finalizada!");
}

runSync();
