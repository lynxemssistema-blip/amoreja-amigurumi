require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EVO_API_KEY = "8A737100D665-451D-8E66-6CCF4380C98E";
const EVO_INSTANCE = "Marcia";
const EVO_URL = "https://evo.lynxems.com.br";

async function runSync() {
  console.log("Iniciando sincronização dos 100 primeiros contatos da última semana...");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoTimestamp = Math.floor(sevenDaysAgo.getTime() / 1000);

  // 1. Fetch Chats
  let activeChats = [];
  try {
    const res = await fetch(`${EVO_URL}/chat/findChats/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    activeChats = Array.isArray(data) ? data : (data.records || []);
  } catch(e) {
    console.log("Erro ao buscar chats:", e.message);
    return;
  }

  // Sort by updatedAt descending
  activeChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  // Take top 100
  const top100 = activeChats.slice(0, 100);
  console.log(`Processando ${top100.length} chats...`);

  // Map JIDs to Contact IDs from DB
  const { data: contacts } = await supabase.from('new_amoreja_wa_contacts').select('id, jid');
  const jidToId = {};
  if (contacts) {
    contacts.forEach(c => jidToId[c.jid] = c.id);
  }

  let processedCount = 0;
  for (const chat of top100) {
    processedCount++;
    const jid = chat.remoteJid;
    let contactId = jidToId[jid];
    
    // If contact doesn't exist, insert it
    if (!contactId) {
      const { data: newContact } = await supabase.from('new_amoreja_wa_contacts').insert([{
        jid: jid,
        name: chat.pushName || jid.split('@')[0],
        type: chat.isGroup || jid.includes('@g.us') ? 'group' : 'contact'
      }]).select().single();
      if (newContact) {
        contactId = newContact.id;
        jidToId[jid] = contactId;
      }
    }

    if (!contactId) continue;

    console.log(`[${processedCount}/100] Sincronizando mensagens para: ${chat.pushName || jid}`);
    try {
      const response = await fetch(`${EVO_URL}/chat/findMessages/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: { key: { remoteJid: jid } }, limit: 100 })
      });
      
      const data = await response.json();
      const messages = Array.isArray(data) ? data : (data.messages?.records || data.records || []);
      
      const toInsert = [];

      for (const msg of messages) {
        if (!msg.messageTimestamp) continue;
        const msgTs = msg.messageTimestamp.low || msg.messageTimestamp;
        if (msgTs < sevenDaysAgoTimestamp) continue; // Only last 7 days
        
        const messageId = msg.key?.id;
        if (!messageId) continue;

        const senderName = msg.pushName || (msg.key.fromMe ? 'Admin' : 'Cliente');
        const fromMe = msg.key.fromMe || false;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        let messageType = 'text';
        let textContent = '';

        if (msg.message?.conversation) {
          textContent = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
          textContent = msg.message.extendedTextMessage.text;
        } else if (msg.message?.imageMessage || msg.message?.audioMessage || msg.message?.videoMessage) {
          messageType = msg.message.imageMessage ? 'image' : (msg.message.audioMessage ? 'audio' : 'video');
          textContent = `[${messageType} Recebido]`;
          // Skipping media download for speed during this massive sync
        } else {
           continue; 
        }

        const createdAt = new Date(msgTs * 1000).toISOString();
        toInsert.push({
          message_id: messageId,
          contact_id: contactId,
          sender_name: senderName,
          sender_jid: senderJid,
          message_type: messageType,
          content: textContent,
          from_me: fromMe,
          created_at: createdAt
        });
      }

      if (toInsert.length > 0) {
         await supabase.from('new_amoreja_wa_messages').upsert(toInsert, { onConflict: 'message_id' });
         console.log(` -> Inseridas/Atualizadas ${toInsert.length} mensagens.`);
      }
    } catch(err) {
      console.log(` -> Erro:`, err.message);
    }
  }

  console.log("Sincronização concluída!");
}

runSync();
