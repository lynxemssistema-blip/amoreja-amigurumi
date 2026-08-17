import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// ── Origens permitidas ──
const ALLOWED_ORIGINS = [
  'https://amorejaamigurumi.lynxems.com.br',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Responde ao preflight OPTIONS do navegador antes de qualquer outra coisa
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
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
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: profile } = await adminClient
      .from('new_amoreja_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem sincronizar o feed." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Token do Instagram, lido só no servidor ──
    const { data: settingsData } = await adminClient
      .from('new_amoreja_settings')
      .select('value')
      .eq('key', 'instagram_access_token')
      .maybeSingle();
    const token = settingsData?.value;

    if (!token || token.startsWith('MTIzNDU2') || token === 'COLOQUE_SEU_TOKEN_AQUI') {
      return new Response(JSON.stringify({ error: "Nenhum Access Token do Instagram válido configurado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
    const response = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&access_token=${token}`);

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ error: errorData.error?.message || "Falha na resposta da API do Instagram." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const resJson = await response.json();
    const mediaList = resJson.data || [];

    if (mediaList.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "A API retornou sucesso, mas nenhuma publicação foi encontrada." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const itemsToCache = mediaList.slice(0, 6).map((media: { permalink: string; caption?: string; media_type: string; thumbnail_url?: string; media_url?: string }) => ({
      post_url: media.permalink,
      caption: media.caption || 'Publicação de Amoreja Amigurumi',
      image_url: media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url
    }));

    const { error: deleteError } = await adminClient.from('new_amoreja_instagram_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) throw deleteError;

    const { error: insertError } = await adminClient.from('new_amoreja_instagram_posts').insert(itemsToCache);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, count: itemsToCache.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro em instagram-sync:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
