import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase-supabaseamoreja.1cnep6.easypanel.host';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Gateway transparente Amoreja:
// 1. Requisições de banco (/rest/v1) -> direcionadas transparentemente via proxy Vite (/supabase-rest/) garantindo 200 OK e zero erros no console
// 2. Requisições de autenticação (/auth/v1) e storage (/storage/v1) -> estritamente para https://supabase-supabaseamoreja.1cnep6.easypanel.host
const customFetch = (url, options) => {
  let targetUrl = url;
  if (typeof url === 'string') {
    if (url.includes('/rest/v1/')) {
      targetUrl = url.replace(/https?:\/\/[^\/]+\/rest\/v1\//, '/supabase-rest/');
    } else if (url.includes('/auth/v1/')) {
      targetUrl = url.replace(/https?:\/\/[^\/]+\/auth\/v1\//, '/supabase-auth/');
    }
  }
  return fetch(targetUrl, options);
};

// Criação do cliente Supabase unificado
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: customFetch },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Helper para verificar se o Supabase está configurado corretamente
export const isSupabaseConfigured = () => {
  return (
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://sua-url-do-supabase.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'sua-chave-anonima-do-supabase'
  );
};
