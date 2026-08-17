import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || "";
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || "";
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || "";
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    // ── Autenticação: confirma quem está chamando e se é admin ──
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401 });
    }

    const { data: profile } = await adminClient
      .from('new_amoreja_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem enviar mensagens." }), { status: 403 });
    }

    // ── Validação da requisição ──
    const { contact_id, text } = await req.json();
    if (!contact_id || !text) {
      return new Response(JSON.stringify({ error: "contact_id e text são obrigatórios." }), { status: 400 });
    }

    const { data: contact } = await adminClient
      .from('new_amoreja_ig_contacts')
      .select('*')
      .eq('id', contact_id)
      .maybeSingle();

    if (!contact) {
      return new Response(JSON.stringify({ error: "Contato não encontrado." }), { status: 404 });
    }
    if (!contact.approved) {
      return new Response(JSON.stringify({ error: "Aceite a solicitação de conversa antes de responder." }), { status: 400 });
    }

    // ── Token do Instagram, lido só no servidor ──
    const { data: settingsData } = await adminClient
      .from('new_amoreja_settings')
      .select('value')
      .eq('key', 'instagram_access_token')
      .maybeSingle();
    const token = settingsData?.value;

    let metaDeliveryFailed = false;
    if (token && !token.startsWith('MTIzNDU2') && contact.instagram_id) {
      try {
        const response = await fetch(`https://graph.instagram.com/me/messages?access_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: contact.instagram_id },
            message: { text }
          })
        });
        if (!response.ok) {
          console.warn('Erro retornado pela API do Instagram:', await response.text());
          metaDeliveryFailed = true;
        }
      } catch (e) {
        console.error('Falha de rede ao conectar com a API do Instagram:', e);
        metaDeliveryFailed = true;
      }
    }

    const { data: inserted, error: insErr } = await adminClient
      .from('new_amoreja_ig_messages')
      .insert([{
        contact_id,
        sender_username: 'Você',
        content: text,
        is_from_me: true
      }])
      .select()
      .single();
    if (insErr) throw insErr;

    await adminClient
      .from('new_amoreja_ig_contacts')
      .update({
        last_msg_preview: `Você: ${text}`,
        last_msg_time: new Date().toISOString()
      })
      .eq('id', contact_id);

    return new Response(JSON.stringify({ success: true, message: inserted, metaDeliveryFailed }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro em instagram-send:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
