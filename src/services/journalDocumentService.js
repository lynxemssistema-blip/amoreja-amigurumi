import { supabase, isSupabaseConfigured } from '../supabaseClient';

const PDF_OFFICIAL_URL = '/docs/JdA-GPColaboradores-Atualizado.pdf';
const CURRENT_TERMS_VERSION = '1.0 (Ed. 001/26)';

/**
 * Registra o download do documento oficial do Guia de Colaboradores e inicia o download
 */
export async function downloadJournalGuide(user, profile) {
  if (!user) {
    throw new Error("Usuário não autenticado para baixar o documento.");
  }

  const userName = profile?.full_name || user.user_metadata?.full_name || user.email || 'Colunista';
  const userEmail = user.email || profile?.email || '';

  // 1. Grava no banco de dados o log de auditoria do download
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('new_amoreja_journal_document_downloads').insert([{
        user_id: user.id,
        user_name: userName,
        user_email: userEmail,
        document_name: 'Guia de Participação para Colaboradores (Ed. 001/26)',
        file_path: PDF_OFFICIAL_URL,
        user_agent: navigator.userAgent || ''
      }]);
    } catch (err) {
      console.warn("Aviso ao salvar log de download:", err.message);
    }
  } else {
    // Modo Demo: Salva log no localStorage
    try {
      const existingLogs = JSON.parse(localStorage.getItem('amoreja_journal_downloads_log') || '[]');
      existingLogs.unshift({
        id: `download_${Date.now()}`,
        user_id: user.id,
        user_name: userName,
        user_email: userEmail,
        document_name: 'Guia de Participação para Colaboradores (Ed. 001/26)',
        downloaded_at: new Date().toISOString()
      });
      localStorage.setItem('amoreja_journal_downloads_log', JSON.stringify(existingLogs));
    } catch (_) {}
  }

  // 2. Dispara o download real do arquivo PDF
  const link = document.createElement('a');
  link.href = PDF_OFFICIAL_URL;
  link.download = 'Jornal-do-Amigurumi-Guia-de-Participacao-Ed001-26.pdf';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { success: true, message: 'Download iniciado com sucesso!' };
}

/**
 * Registra o aceite formal do Termo de Adesão & Diretrizes Editoriais
 */
export async function acceptJournalTerms(user, profile, termsVersion = CURRENT_TERMS_VERSION) {
  if (!user) {
    throw new Error("Usuário precisa estar autenticado.");
  }

  const userName = profile?.full_name || user.user_metadata?.full_name || user.email || 'Colunista';
  const userEmail = user.email || profile?.email || '';
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      // 1. Insere log na tabela de auditoria
      const { error: logErr } = await supabase.from('new_amoreja_journal_terms_acceptances').insert([{
        user_id: user.id,
        user_name: userName,
        user_email: userEmail,
        terms_version: termsVersion,
        accepted_at: now,
        user_agent: navigator.userAgent || ''
      }]);
      if (logErr) console.warn("Erro ao registrar log de aceite:", logErr.message);

      // 2. Atualiza o perfil do usuário
      const { error: profErr } = await supabase.from('new_amoreja_profiles').update({
        has_accepted_journal_terms: true,
        accepted_journal_terms_at: now,
        journal_terms_version: termsVersion
      }).eq('id', user.id);

      if (profErr) {
        // Fallback em settings se coluna estiver restrita
        await supabase.from('new_amoreja_settings').upsert({
          key: `terms_accept_${user.id}`,
          value: JSON.stringify({ has_accepted_journal_terms: true, accepted_at: now, terms_version: termsVersion })
        }, { onConflict: 'key' });
      }

    } catch (err) {
      console.error("Erro ao registrar aceite no Supabase:", err);
      throw err;
    }
  } else {
    // Modo Demo
    const demoAcceptances = JSON.parse(localStorage.getItem('amoreja_journal_terms_acceptances') || '[]');
    demoAcceptances.unshift({
      id: `accept_${Date.now()}`,
      user_id: user.id,
      user_name: userName,
      user_email: userEmail,
      terms_version: termsVersion,
      accepted_at: now
    });
    localStorage.setItem('amoreja_journal_terms_acceptances', JSON.stringify(demoAcceptances));
    localStorage.setItem(`terms_accepted_${user.id}`, 'true');
  }

  return { success: true, accepted_at: now };
}

/**
 * Verifica se o usuário atual já aceitou os termos do jornal
 */
export async function checkHasAcceptedTerms(user, profile) {
  if (!user) return false;

  // Checagem rápida no profile
  if (profile?.has_accepted_journal_terms) return true;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('new_amoreja_journal_terms_acceptances')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!error && data && data.length > 0) {
        return true;
      }

      // Fallback em settings
      const { data: settingData } = await supabase
        .from('new_amoreja_settings')
        .select('value')
        .eq('key', `terms_accept_${user.id}`)
        .maybeSingle();

      if (settingData && settingData.value) {
        return true;
      }
    } catch (_) {}
  } else {
    if (localStorage.getItem(`terms_accepted_${user.id}`) === 'true') {
      return true;
    }
  }

  return false;
}

/**
 * Busca histórico de downloads de documentos para a auditoria do Admin
 */
export async function getDocumentDownloadsLog() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('new_amoreja_journal_document_downloads')
        .select('*')
        .order('downloaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Erro ao buscar logs de downloads:", err);
      return [];
    }
  }

  return JSON.parse(localStorage.getItem('amoreja_journal_downloads_log') || '[]');
}

/**
 * Busca histórico de aceites de termos para a auditoria do Admin
 */
export async function getTermsAcceptancesLog() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('new_amoreja_journal_terms_acceptances')
        .select('*')
        .order('accepted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Erro ao buscar logs de aceites:", err);
      return [];
    }
  }

  return JSON.parse(localStorage.getItem('amoreja_journal_terms_acceptances') || '[]');
}

/**
 * Busca os templates visuais cadastrados
 */
export async function getJournalTemplates() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('new_amoreja_journal_templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) return data;
    } catch (err) {
      console.warn("Erro ao buscar templates, usando fallback:", err.message);
    }
  }

  // Fallback padrão se tabela estiver vazia ou offline
  return [
    {
      id: 'tpl-classic',
      name: 'Editorial Clássico (Página 5)',
      slug: 'classic',
      description: 'Estilo jornal nobre fiel ao Guia oficial: cabeçalho clássico, selo circular, subtítulo caligráfico e texto justificado em colunas.',
      title_font: 'Playfair Display, serif',
      script_font: 'Alex Brush, cursive',
      body_font: 'Georgia, serif',
      bg_color: '#faf7f2',
      text_color: '#2c2c2c',
      accent_color: '#4a2c11',
      border_style: 'classic-double',
      is_active: true,
      is_default: true
    },
    {
      id: 'tpl-modern',
      name: 'Moderno & Espaçado',
      slug: 'modern',
      description: 'Visual contemporâneo, tipografia sem serifa suave, espaçamento arejado e cartões com sombras suaves.',
      title_font: 'Inter, sans-serif',
      script_font: 'Style Script, cursive',
      body_font: 'Inter, sans-serif',
      bg_color: '#ffffff',
      text_color: '#1e293b',
      accent_color: '#0284c7',
      border_style: 'modern-subtle',
      is_active: true,
      is_default: false
    },
    {
      id: 'tpl-image-heavy',
      name: 'Fotográfico & Capa Ampla',
      slug: 'image-heavy',
      description: 'Foco em fotos de alta resolução do artesanato, banner de destaque amplo e tipografia elegante.',
      title_font: 'Cormorant Garamond, serif',
      script_font: 'Great Vibes, cursive',
      body_font: 'Lora, serif',
      bg_color: '#fdfaf6',
      text_color: '#292524',
      accent_color: '#78350f',
      border_style: 'photo-card',
      is_active: true,
      is_default: false
    }
  ];
}

/**
 * Salva ou atualiza um template visual
 */
export async function saveJournalTemplate(templateData) {
  if (isSupabaseConfigured()) {
    try {
      const payload = {
        name: templateData.name,
        slug: templateData.slug,
        description: templateData.description || '',
        title_font: templateData.title_font,
        script_font: templateData.script_font,
        body_font: templateData.body_font,
        bg_color: templateData.bg_color,
        text_color: templateData.text_color,
        accent_color: templateData.accent_color,
        border_style: templateData.border_style,
        is_active: templateData.is_active !== undefined ? templateData.is_active : true,
        is_default: templateData.is_default || false,
        updated_at: new Date().toISOString()
      };

      if (templateData.id && !templateData.id.startsWith('tpl-')) {
        const { data, error } = await supabase
          .from('new_amoreja_journal_templates')
          .update(payload)
          .eq('id', templateData.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('new_amoreja_journal_templates')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    } catch (err) {
      console.error("Erro ao salvar template:", err);
      throw err;
    }
  }

  return templateData;
}
