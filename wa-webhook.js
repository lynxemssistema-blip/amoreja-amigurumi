import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

// Estas chaves devem ser configuradas nos Secrets da Edge Function no painel do Supabase
// supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=...

serve(async (req) => {
  try {
    const payload = await req.json();

    // A Evolution API envia eventos de vários tipos. O mais importante é "messages.upsert"
    if (payload.event === "messages.upsert" && payload.data && payload.data.messages) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'));

      for (const msg of payload.data.messages) {
        // Ignora mensagens enviadas pelo proprio bot/admin para nao duplicar
        if (msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;
        const senderName = msg.pushName || 'Desconhecido';
        const messageId = msg.key.id;
        
        // 1. Verifica se o JID esta na tabela de contatos monitorados
        const { data: contact, error: contactError } = await supabase
          .from('new_amoreja_wa_contacts')
          .select('id, name')
          .eq('jid', jid)
          .single();

        if (!contact || contactError) {
          // Não está monitorando esse grupo/contato. Ignora.
          continue;
        }

        // 2. Extrai o conteudo da mensagem (texto)
        let textContent = '';
        let messageType = 'text';
        let mediaUrl = null;

        if (msg.message?.conversation) {
          textContent = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
          textContent = msg.message.extendedTextMessage.text;
        } else if (msg.message?.audioMessage) {
          messageType = 'audio';
          textContent = '[Áudio Recebido - Transcrição pendente]';
          // Para uma aplicacao de producao:
          // 1. Fazer o download do buffer do audio da Evolution API (endpoint base64)
          // 2. Enviar para a API do Gemini Pro 1.5 usando File API
          // 3. Obter o texto gerado. 
        } else if (msg.message?.imageMessage) {
          messageType = 'image';
          textContent = '[Imagem Recebida - Análise pendente]';
          // O mesmo fluxo do audio se aplicaria aqui com o Vision do Gemini.
        }

        // 3. Salva a mensagem no banco
        await supabase.from('new_amoreja_wa_messages').insert([{
          message_id: messageId,
          contact_id: contact.id,
          sender_name: senderName,
          sender_jid: jid,
          message_type: messageType,
          content: textContent,
          media_url: mediaUrl,
          from_me: false
        }]);
      }
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
