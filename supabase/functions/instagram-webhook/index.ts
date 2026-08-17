import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

serve(async (req) => {
  const VERIFY_TOKEN = Deno.env.get('IG_WEBHOOK_VERIFY_TOKEN') || "";

  const url = new URL(req.url);

  // 1. Validação de Webhook (Meta GET Challenge)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // 2. Recebimento de Mensagens e Eventos (POST)
  try {
    const payload = await req.json();
    console.log("Evento Recebido do Instagram:", JSON.stringify(payload));

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || "";
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter o Token de Acesso do Instagram configurado
    const { data: settingsData } = await supabase
      .from('new_amoreja_settings')
      .select('value')
      .eq('key', 'instagram_access_token')
      .maybeSingle();
    const token = settingsData ? settingsData.value : null;

    if (payload.object === "instagram" && payload.entry) {
      for (const entry of payload.entry) {
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            const senderId = messagingEvent.sender.id;
            
            // Ignora se a mensagem foi enviada pela própria conta/página
            const recipientId = messagingEvent.recipient.id;
            if (senderId === recipientId) continue;

            if (messagingEvent.message) {
              const message = messagingEvent.message;
              const attachment = message.attachments?.[0];

              // Determina tipo de conteúdo e URL de mídia a partir do payload do webhook (só disponível em tempo real)
              let messageType = "text";
              let mediaUrl = null;
              let text = message.text || "";

              if (attachment?.payload?.url && attachment.type === "image") {
                messageType = "image";
                mediaUrl = attachment.payload.url;
                text = text || "[Imagem]";
              } else if (attachment?.payload?.url && attachment.type === "audio") {
                messageType = "audio";
                mediaUrl = attachment.payload.url;
                text = text || "[Áudio]";
              } else if (attachment?.type === "video") {
                text = text || "[Vídeo]";
              } else if (attachment?.type === "share") {
                text = text || "[Compartilhamento]";
              } else if (!text) {
                text = "[Mídia Recebida]";
              }

              // ── 1. Verificar se contato já existe no banco ──
              let { data: contact } = await supabase
                .from('new_amoreja_ig_contacts')
                .select('*')
                .eq('instagram_id', senderId)
                .maybeSingle();

              if (!contact) {
                // Obter dados do perfil do Instagram via API Graph do Meta
                let username = `user_${senderId.slice(-4)}`;
                let fullName = `Instagram User`;
                let avatarUrl = `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80`; // fallback

                if (token) {
                  try {
                    const profRes = await fetch(`https://graph.instagram.com/${senderId}?fields=username,name,profile_pic&access_token=${token}`);
                    if (profRes.ok) {
                      const profData = await profRes.json();
                      username = profData.username || username;
                      fullName = profData.name || fullName;
                      avatarUrl = profData.profile_pic || avatarUrl;
                    }
                  } catch (e) {
                    console.error("Erro ao buscar perfil no Meta:", e);
                  }
                }

                // Criar o contato na fila de Solicitações (approved = false por padrão)
                const { data: newContact, error: insErr } = await supabase
                  .from('new_amoreja_ig_contacts')
                  .insert([{
                    instagram_id: senderId,
                    username: username,
                    full_name: fullName,
                    profile_pic_url: avatarUrl,
                    approved: false,
                    unread: true,
                    last_msg_preview: text,
                    last_msg_time: new Date().toISOString()
                  }])
                  .select()
                  .single();
                if (insErr) throw insErr;
                contact = newContact;
              } else {
                // Atualizar último preview e marcar como não lido
                await supabase
                  .from('new_amoreja_ig_contacts')
                  .update({
                    last_msg_preview: text,
                    last_msg_time: new Date().toISOString(),
                    unread: true
                  })
                  .eq('id', contact.id);
              }

              // ── 2. Inserir Mensagem recebida ──
              await supabase
                .from('new_amoreja_ig_messages')
                .insert([{
                  contact_id: contact.id,
                  sender_username: contact.username,
                  content: text,
                  is_from_me: false,
                  message_type: messageType,
                  media_url: mediaUrl
                }]);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro no processamento do webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
