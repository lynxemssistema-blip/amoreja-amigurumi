require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EVO_API_KEY = "8A737100D665-451D-8E66-6CCF4380C98E";
const EVO_INSTANCE = "Marcia";
const EVO_URL = "https://evo.lynxems.com.br";

async function runSync() {
  console.log("Iniciando Sincronizacao de Todos os Contatos e Histórico...");

  // 1. Check or Create Bucket
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === 'whatsapp_media')) {
    await supabase.storage.createBucket('whatsapp_media', { public: true });
    console.log("Bucket 'whatsapp_media' criado.");
  }

  // 2. Fetch All Contacts from Evolution
  console.log("Buscando contatos na Evolution API...");
  let contactsFromEvo = [];
  try {
    const res = await fetch(`${EVO_URL}/chat/findContacts/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    contactsFromEvo = Array.isArray(data) ? data : (data.records || []);
    console.log(`Encontrados ${contactsFromEvo.length} contatos.`);
  } catch(e) {
    console.log("Erro ao buscar contatos:", e.message);
    return;
  }

  // 3. Upsert Contacts to Supabase (Batching to avoid massive inserts at once)
  console.log("Salvando contatos no banco de dados...");
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);

  const contactJidToId = {};
  
  for (let i = 0; i < contactsFromEvo.length; i += 100) {
    const batch = contactsFromEvo.slice(i, i + 100).map(c => ({
      jid: c.remoteJid,
      name: c.pushName || c.name || c.remoteJid.split('@')[0],
      type: c.isGroup || c.remoteJid.includes('@g.us') ? 'group' : 'contact'
    }));
    
    // Upsert on jid
    const { data: upserted, error } = await supabase
      .from('new_amoreja_wa_contacts')
      .upsert(batch, { onConflict: 'jid' })
      .select('id, jid');
      
    if (error) {
      console.log("Erro no Upsert:", error.message);
    } else if (upserted) {
       for(const u of upserted) {
         contactJidToId[u.jid] = u.id;
       }
    }
  }

  // 4. Fetch Active Chats (to filter only those with interaction)
  console.log("Buscando chats ativos (últimas interações)...");
  let activeChats = [];
  try {
    const resChats = await fetch(`${EVO_URL}/chat/findChats/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const dataChats = await resChats.json();
    activeChats = Array.isArray(dataChats) ? dataChats : (dataChats.records || []);
    console.log(`Encontrados ${activeChats.length} chats ativos.`);
  } catch(e) {
    console.log("Erro ao buscar chats:", e.message);
  }

  // 5. Fetch Messages for Active Chats in the last 30 days
  // We only process chats that have a recent conversation timestamp
  const recentChats = activeChats.filter(chat => {
      const ts = chat.conversationTimestamp?.low || chat.conversationTimestamp || 0;
      return ts >= thirtyDaysAgoTimestamp;
  });
  
  console.log(`${recentChats.length} chats tiveram interação nos últimos 30 dias.`);

  let processedCount = 0;
  for (const chat of recentChats) {
    processedCount++;
    const jid = chat.remoteJid;
    const contactId = contactJidToId[jid];
    
    if (!contactId) continue;
    
    console.log(`[${processedCount}/${recentChats.length}] Puxando histórico para: ${jid}`);
    try {
      const response = await fetch(`${EVO_URL}/chat/findMessages/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: { key: { remoteJid: jid } }, limit: 100 })
      });
      
      const data = await response.json();
      const messages = Array.isArray(data) ? data : (data.messages?.records || data.records || []);
      
      for (const msg of messages) {
        if (!msg.messageTimestamp) continue;
        const msgTs = msg.messageTimestamp.low || msg.messageTimestamp;
        if (msgTs < thirtyDaysAgoTimestamp) continue;
        
        const messageId = msg.key?.id;
        if (!messageId) continue;
        
        // Skip existing
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
               await supabase.storage.from('whatsapp_media').upload(filename, buffer, { contentType: base64Data.mimetype, upsert: true });
               const { data: publicUrlData } = supabase.storage.from('whatsapp_media').getPublicUrl(filename);
               mediaUrl = publicUrlData.publicUrl;
             }
          } catch(e) {
             // Silently fail media download if error
          }
        } else {
           continue; 
        }

        const createdAt = new Date(msgTs * 1000).toISOString();
        await supabase.from('new_amoreja_wa_messages').insert([{
          message_id: messageId,
          contact_id: contactId,
          sender_name: senderName,
          sender_jid: senderJid,
          message_type: messageType,
          content: textContent,
          media_url: mediaUrl,
          from_me: fromMe,
          created_at: createdAt
        }]);
      }
    } catch(err) {
      console.log(`Erro na API Evolution para ${jid}:`, err.message);
    }
  }

  console.log("Sincronizacao de Contatos e Histórico finalizada!");
}

runSync();
