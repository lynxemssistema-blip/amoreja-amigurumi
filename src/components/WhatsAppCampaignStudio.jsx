import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  Bot, 
  Image as ImageIcon, 
  Send, 
  Users, 
  RefreshCw, 
  Copy, 
  Check, 
  Wand2, 
  FileText, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  CheckSquare, 
  Square, 
  Search, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Pause, 
  Play, 
  Timer,
  Sliders,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Download,
  Eye,
  Bookmark,
  Plus,
  Trash2,
  Smartphone,
  X,
  Tag
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import './WhatsAppCampaignStudio.css';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const EVO_API_KEY = import.meta.env.VITE_EVO_API_KEY;
const EVO_INSTANCE = import.meta.env.VITE_EVO_INSTANCE;
const EVO_URL = import.meta.env.VITE_EVO_URL;

// Modelos Gemini
const COPY_MODEL = 'gemini-3.8-flash';
const NANOBANA_MODEL = 'gemini-2.5-flash-image'; // Nano Banana oficial

const DEFAULT_GROUPS = [
  { id: 'novidades', label: '🧶 Novas Receitas' },
  { id: 'cupons', label: '🎟️ Cupons de Desconto' },
  { id: 'convite_loja', label: '🏬 Conhecer o Site' },
  { id: 'jornal', label: '🗞️ Jornal do Amigurumi' },
  { id: 'promocao', label: '🎁 Presente / Oferta' },
  { id: 'reativacao', label: '💌 Reatar Contato' }
];

const INITIAL_SAVED_TEMPLATES = [
  {
    id: 'tpl-1',
    groupId: 'novidades',
    name: 'Lançamento de Receitas em PDF',
    text: `Olá {nome}! Tudo bem? 🧶✨\n\nPassando para te convidar a conhecer as novas receitas digitais da Amoreja Amigurumi!\n\nTemos passo a passos detalhados em PDF para você criar peças lindas com muito amor.\n\n👉 Acesse agora: https://amoreja.com.br\n\nQualquer dúvida estou à disposição por aqui!`
  },
  {
    id: 'tpl-cupom-1',
    groupId: 'cupons',
    name: '🎟️ Boas-Vindas com Cupom (10% OFF)',
    text: `Olá {nome}! Tudo bem? 🧶✨\n\nTenho um presente especial para você hoje no Ateliê Amoreja!\n\nUse o cupom exclusivo BEMVINDO10 no nosso site e ganhe 10% de desconto na sua próxima receita digital.\n\n👉 Aproveite em: https://amoreja.com.br\n\nQualquer dúvida estou à disposição por aqui! 💕`
  },
  {
    id: 'tpl-cupom-2',
    groupId: 'cupons',
    name: '⚡ Oferta Especial Amoreja (12% OFF)',
    text: `Oi {nome}! ⚡💕\n\nPassando para te presentear com um cupom especial de 12% de desconto no Ateliê Amoreja!\n\n🎟️ Cupom: AAMOREJA\n🛒 Onde usar: https://amoreja.com.br\n\nBasta adicionar suas receitas favoritas no carrinho e digitar o cupom antes de finalizar. Corre para garantir! 🥰`
  },
  {
    id: 'tpl-2',
    groupId: 'convite_loja',
    name: 'Boas-vindas ao Ateliê Online',
    text: `Oi {nome}! Como estão seus crochês? 💕\n\nVenha conhecer o novo site da Amoreja Amigurumi, cheio de receitas fofas, novidades e materiais para quem ama amigurumi.\n\n👉 Confira em: https://amoreja.com.br\n\nEspero você lá! 🧸✨`
  },
  {
    id: 'tpl-3',
    groupId: 'jornal',
    name: 'Edição Gratuita do Jornal',
    text: `Oi {nome}! Já viu a nova matéria do Jornal da Amoreja? 📰💕\n\nPreparamos um guia especial com tendências de fios, olhos de segurança e técnicas exclusivas.\n\n📖 Leia gratuitamente aqui: https://amoreja.com.br/jornal\n\nMe conta o que achou depois! 🥰`
  },
  {
    id: 'tpl-4',
    groupId: 'promocao',
    name: 'Cupom de 10% Especial',
    text: `Olá {nome}, tudo bem? 🎁✨\n\nComo você ama crochê e peças fofas, separamos um mimo especial para você na Amoreja!\n\nUse o cupom AMOR10 para 10% de desconto em qualquer receita digital hoje.\n\n👉 Escolha sua receita favorita: https://amoreja.com.br\n\nCom carinho, Ateliê Amoreja 💖`
  },
  {
    id: 'tpl-5',
    groupId: 'reativacao',
    name: 'Reatar Contato com Carinho',
    text: `Oi {nome}! Quanto tempo! Tudo bem por aí? 🌸\n\nLembrei de você hoje enquanto organizava os novos projetos do ateliê. Tem tantas novidades fofas que acho que você vai amar!\n\n👉 Dá uma olhadinha: https://amoreja.com.br\n\nSe precisar de ajuda com alguma receita, estou por aqui! Abraço carinhoso 💕`
  }
];

export default function WhatsAppCampaignStudio({ onBackToChat, initialContacts = [] }) {
  const [subTab, setSubTab] = useState('studio'); // 'studio' | 'invites'
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // ── CUPONS DE DESCONTO SINCRONIZADOS COM A PÁGINA / BANCO ──
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState('BEMVINDO10');
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // ── GRUPOS DE CONVITES & MODELOS SALVOS ──
  const [groups, setGroups] = useState(() => {
    try {
      const raw = localStorage.getItem('amoreja_wa_custom_groups');
      return raw ? JSON.parse(raw) : DEFAULT_GROUPS;
    } catch {
      return DEFAULT_GROUPS;
    }
  });

  const [savedTemplates, setSavedTemplates] = useState(() => {
    try {
      const raw = localStorage.getItem('amoreja_wa_custom_templates');
      return raw ? JSON.parse(raw) : INITIAL_SAVED_TEMPLATES;
    } catch {
      return INITIAL_SAVED_TEMPLATES;
    }
  });

  // ── ESTADO DA SIMULAÇÃO NO CELULAR (MOCKUP MODAL) ──
  const [showPhoneMockup, setShowPhoneMockup] = useState(false);
  const [mockupRecipientJid, setMockupRecipientJid] = useState('');

  // ── FILTRO APENAS SELECIONADOS ──
  const [filterOnlySelected, setFilterOnlySelected] = useState(false);

  // ── ESTADO DO AGENTE DE MARKETING ──
  const [marketingTopic, setMarketingTopic] = useState('');
  const [marketingGoal, setMarketingGoal] = useState('novidades');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [suggestedCopies, setSuggestedCopies] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(
    `Olá {nome}! Tudo bem? 🧶✨\n\nPassando para te convidar a conhecer as novas receitas digitais da Amoreja Amigurumi!\n\nTemos passo a passos detalhados em PDF para você criar peças lindas com muito amor.\n\n👉 Acesse agora: https://amoreja.com.br\n\nQualquer dúvida estou à disposição por aqui!`
  );

  // ── ESTADO DA AGENTE NANOBANA (IMAGENS) ──
  const [nanobanaPrompt, setNanobanaPrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null); // base64 'data:image/png;base64,...'
  const [attachImageToInvite, setAttachImageToInvite] = useState(true);

  // ── ESTADO DA AGENDA E DISPARO DE CONVITES ──
  const [contacts, setContacts] = useState(initialContacts);
  const [loadingContacts, setLoadingContacts] = useState(initialContacts.length === 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyNamed, setOnlyNamed] = useState(false);
  const [selectedJids, setSelectedJids] = useState(new Set());
  
  const [standardDelaySeconds, setStandardDelaySeconds] = useState(5);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [sendStatusMap, setSendStatusMap] = useState({});
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [nextTargetName, setNextTargetName] = useState('');

  const isCancelledRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Carregar contatos se ainda não vieram via props
  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await fetch(`${EVO_URL}/chat/findContacts/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: {
          'apikey': EVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        const validContacts = data
          .filter(c => !c.isGroup && (c.remoteJid?.includes('@s.whatsapp.net') || c.id?.includes('@s.whatsapp.net')))
          .map(c => {
            const jid = c.remoteJid || c.id;
            const rawPhone = jid.split('@')[0];
            const formattedPhone = rawPhone.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3');
            return {
              id: c.id || jid,
              jid: jid,
              phone: rawPhone,
              formattedPhone: formattedPhone,
              name: c.pushName ? c.pushName.trim() : null,
              profilePicUrl: c.profilePicUrl || null
            };
          });

        validContacts.sort((a, b) => {
          if (a.name && !b.name) return -1;
          if (!a.name && b.name) return 1;
          return (a.name || a.phone).localeCompare(b.name || b.phone);
        });

        setContacts(validContacts);
      }
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Carregar grupos do Supabase (com fallback)
  const fetchGroups = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('new_amoreja_wa_groups')
          .select('*')
          .order('created_at', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          setGroups(data);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar grupos do Supabase:', e);
    }
  };

  // Carregar templates do Supabase (com fallback)
  const fetchTemplates = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('new_amoreja_wa_templates')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(t => ({
            id: t.id,
            groupId: t.group_id,
            name: t.name,
            text: t.text,
            isCustom: t.is_custom
          }));
          setSavedTemplates(mapped);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar templates do Supabase:', e);
    }
  };

  // Carregar cupons ativos diretamente da página / tabela de cupons
  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('new_amoreja_coupons')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          setActiveCoupons(data);
          if (data.length > 0) {
            setSelectedCouponCode(data[0].code);
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar cupons do Supabase:', e);
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    if (contacts.length === 0) {
      fetchContacts();
    }
    fetchGroups();
    fetchTemplates();
    fetchCoupons();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. AGENTE DE MARKETING (GEMINI 3.8 FLASH)
  // ─────────────────────────────────────────────────────────────────────────────
  const generateMarketingCopies = async () => {
    if (!GEMINI_API_KEY) {
      alert('Chave do Gemini não configurada.');
      return;
    }

    setIsGeneratingCopy(true);
    try {
      // Resumo dos cupons ativos no banco de dados para a IA consultar
      const couponsSummary = activeCoupons.map(c => {
        const val = c.discount_type === 'percent' ? `${parseFloat(c.discount_value)}% de desconto` : `R$ ${parseFloat(c.discount_value)} OFF`;
        return `Cupom: ${c.code} (${val}${c.expires_at ? `, válido até ${new Date(c.expires_at).toLocaleDateString()}` : ''})`;
      }).join('; ');

      const goalDescriptions = {
        novidades: 'Apresentar novas receitas digitais de amigurumi que acabaram de chegar na loja.',
        cupons: `Divulgar um cupom de desconto real e ativo na loja Amoreja. Cupons cadastrados na página de cupons: [${couponsSummary || 'BEMVINDO10 (10% de desconto)'}]. Destaque o cupom ${selectedCouponCode || 'BEMVINDO10'}, indique a economia e chame para aplicar no carrinho em https://amoreja.com.br com muito carinho.`,
        convite_loja: 'Convidar calorosamente o contato para conhecer o site https://amoreja.com.br.',
        jornal: 'Convidar a ler a edição gratuita do Jornal do Amigurumi em https://amoreja.com.br/jornal.',
        promocao: 'Divulgar uma oferta especial / cupom de desconto com sensação de carinho e oportunidade.',
        reativacao: 'Reatar contato com carinho com quem não compra há algum tempo, mostrando novidades fofas.'
      };

      const systemInstruction = `Você é um Copywriter Especialista em Marketing de Alta Conversão para a marca "Amoreja Amigurumi".
Seu público: Mulheres, artesãs, crocheteiras, apaixonadas por peças fofas feitas à mão.
Tom de voz: Muito acolhedor, carinhoso, apaixonado por crochê, com emojis delicados (🧶✨💕🧸), sem ser invasivo ou apelativo.

Regra OBRIGATÓRIA:
- Use a tag "{nome}" para personalizar o início da mensagem (ex: "Olá {nome}! Tudo bem?").
- Mantenha a mensagem clara e fácil de ler no celular (parágrafos curtos, link clicável no final).
- Inclua links oficiais: site https://amoreja.com.br ou jornal https://amoreja.com.br/jornal dependendo do objetivo.
- Se a campanha for de CUPOM ou DESCONTO, dê bastante destaque ao código do cupom (ex: 🎟️ Cupom: ${selectedCouponCode || 'BEMVINDO10'}).

Gere exatamente 3 opções de mensagens com abordagens diferentes:
1) Opção 1: Curta e Direta ao Ponto (fácil de ler rápido).
2) Opção 2: Calorosa e Afetiva (destaca o amor pelos pontos e criação).
3) Opção 3: Inspiradora / Chamada com Presente ou Novidade.

Retorne em formato JSON puro:
{
  "options": [
    { "title": "Curta & Direta", "text": "..." },
    { "title": "Calorosa & Afetiva", "text": "..." },
    { "title": "Inspiradora & Novidade", "text": "..." }
  ]
}`;

      const userPrompt = `Objetivo da campanha: ${goalDescriptions[marketingGoal] || marketingGoal}
${marketingTopic ? `Tema / Peça específica informada pelo lojista: "${marketingTopic}"` : ''}
${marketingGoal === 'cupons' ? `Cupons ativos consultados na página de cupons: ${couponsSummary || selectedCouponCode}` : ''}
Gere as 3 variações de convite para WhatsApp agora.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${COPY_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }
          ]
        })
      });

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Limpeza de blocos markdown ```json
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.options && Array.isArray(parsed.options)) {
        setSuggestedCopies(parsed.options);
      }
    } catch (err) {
      console.error('Erro ao gerar copies com Gemini:', err);
      alert('Não foi possível gerar as mensagens no momento. Tente novamente.');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. AGENTE NANOBANA (GEMINI NANO BANANA - GERAÇÃO E MELHORIA DE IMAGENS)
  // ─────────────────────────────────────────────────────────────────────────────
  const generateNanobanaImage = async () => {
    if (!GEMINI_API_KEY) {
      alert('Chave do Gemini não configurada.');
      return;
    }

    if (!nanobanaPrompt.trim()) {
      alert('Por favor, descreva a imagem que deseja que a Nanobana crie.');
      return;
    }

    setIsGeneratingImage(true);
    try {
      // Prompt com estilo estético premium Amoreja
      const enhancedPrompt = `Cute baby crochet amigurumi, ${nanobanaPrompt.trim()}, pastel colors, warm cozy lighting, professional product photography on soft clean pastel pink background, handmade craft detail, high resolution, 8k, beautiful aesthetic, no text, no watermark`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${NANOBANA_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: enhancedPrompt }] }
          ]
        })
      });

      const data = await res.json();
      const partWithImage = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

      if (partWithImage && partWithImage.inlineData?.data) {
        const mime = partWithImage.inlineData.mimeType || 'image/png';
        const base64Img = `data:${mime};base64,${partWithImage.inlineData.data}`;
        setGeneratedImage(base64Img);
        setAttachImageToInvite(true);
      } else {
        alert('A Nanobana não conseguiu gerar a imagem com essa descrição. Tente uma descrição diferente.');
      }
    } catch (err) {
      console.error('Erro na Nanobana:', err);
      alert('Erro ao conectar com a Agente Nanobana.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Sugestões rápidas de prompts para a Nanobana
  const quickNanobanaIdeas = [
    'Girafinha com óculos amarelos e laço rosa',
    'Rena de natal com chifres marrons e cachecol vermelho',
    'Ursinho dorminhoco com touca listrada e manta',
    'Polvo de crochê para bebês com tentáculos espirais em menta',
    'Cesta artesanal com novelos de lã coloridos e agulhas'
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. REGRAS DE ENVIO DE CONVITES & ANTI-BLOQUEIO (2 A 7 MINUTOS SE > 5)
  // ─────────────────────────────────────────────────────────────────────────────
  const isAntiBanActive = selectedJids.size > 5;

  const getRandomDelaySeconds = () => {
    // 2 a 7 minutos = 120s a 420s
    const minSec = 120;
    const maxSec = 420;
    return Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
  };

  const formatCountdown = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const selectedContactsList = useMemo(() => {
    return contacts.filter(c => selectedJids.has(c.jid));
  }, [contacts, selectedJids]);

  const handleRemoveSelected = (jid, e) => {
    if (e) e.stopPropagation();
    if (isSending) return;
    setSelectedJids(prev => {
      const next = new Set(prev);
      next.delete(jid);
      return next;
    });
  };

  const filteredContacts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return contacts.filter(c => {
      if (filterOnlySelected && !selectedJids.has(c.jid)) return false;
      if (onlyNamed && !c.name) return false;
      if (!term) return true;
      const matchName = c.name && c.name.toLowerCase().includes(term);
      const matchPhone = c.phone.includes(term) || c.formattedPhone.includes(term);
      return matchName || matchPhone;
    });
  }, [contacts, searchTerm, onlyNamed, filterOnlySelected, selectedJids]);

  const handleToggleSelect = (jid) => {
    if (isSending) return;
    setSelectedJids(prev => {
      const next = new Set(prev);
      if (next.has(jid)) next.delete(jid);
      else next.add(jid);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (isSending) return;
    setSelectedJids(prev => {
      const next = new Set(prev);
      filteredContacts.forEach(c => next.add(c.jid));
      return next;
    });
  };

  const handleDeselectAllVisible = () => {
    if (isSending) return;
    setSelectedJids(prev => {
      const next = new Set(prev);
      filteredContacts.forEach(c => next.delete(c.jid));
      return next;
    });
  };

  // ── GERENCIAMENTO DE GRUPOS E MODELOS SALVOS (persistidos no Supabase) ──
  const cacheLocal = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn(e); }
  };

  const handleAddNewGroup = async () => {
    const name = window.prompt('Digite o nome do novo grupo / objetivo (Ex: 🎄 Natal Amigurumi, 🐣 Páscoa, 🎓 Cursos):');
    if (!name || !name.trim()) return;
    const clean = name.trim();
    const newId = `group_${Date.now()}`;
    const newGroup = { id: newId, label: clean, is_custom: true };
    const updated = [...groups, newGroup];
    setGroups(updated);
    setMarketingGoal(newId);
    cacheLocal('amoreja_wa_custom_groups', updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('new_amoreja_wa_groups').insert([newGroup]);
      if (error) {
        console.error('Erro ao salvar grupo no Supabase:', error);
        alert(`⚠️ O grupo foi criado só neste navegador. Não foi possível salvar no banco: ${error.message}`);
      }
    }
  };

  const handleSaveAsTemplate = async (targetGroupId = marketingGoal) => {
    const activeGroupName = groups.find(g => g.id === targetGroupId)?.label || 'Grupo';
    const name = window.prompt(`Digite o título para este modelo no grupo "${activeGroupName}":`, `Modelo ${savedTemplates.filter(t => t.groupId === targetGroupId).length + 1}`);
    if (!name || !name.trim()) return;

    const newTemplate = {
      id: `tpl_${Date.now()}`,
      groupId: targetGroupId,
      name: name.trim(),
      text: selectedMessage,
      isCustom: true
    };
    const updated = [newTemplate, ...savedTemplates];
    setSavedTemplates(updated);
    cacheLocal('amoreja_wa_custom_templates', updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('new_amoreja_wa_templates').insert([{
        id: newTemplate.id,
        group_id: newTemplate.groupId,
        name: newTemplate.name,
        text: newTemplate.text,
        is_custom: true
      }]);
      if (error) {
        console.error('Erro ao salvar modelo no Supabase:', error);
        alert(`⚠️ Modelo salvo só neste navegador. Falha ao salvar no banco: ${error.message}`);
        return;
      }
    }
    alert(`✅ Modelo "${name.trim()}" salvo no grupo "${activeGroupName}"!`);
  };

  const handleDeleteTemplate = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este modelo salvo?')) return;
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    cacheLocal('amoreja_wa_custom_templates', updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('new_amoreja_wa_templates').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir modelo no Supabase:', error);
        alert(`⚠️ Não foi possível excluir do banco: ${error.message}`);
      }
    }
  };

  const getFirstName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.split(' ').filter(Boolean);
    return parts[0] || '';
  };

  const formatMessageForContact = (contact) => {
    const firstName = getFirstName(contact?.name);
    if (firstName) {
      return selectedMessage.replace(/\{nome\}/gi, firstName);
    }
    return selectedMessage.replace(/\{nome\}[\s,!.]*/gi, '').trim();
  };

  // Abre a simulação realista no celular para aprovação antes de disparar
  const handleOpenPhoneMockup = () => {
    if (selectedJids.size === 0) {
      alert('Por favor, selecione ao menos um contato para simular o recebimento no celular.');
      return;
    }
    const firstSelected = selectedContactsList[0];
    if (firstSelected && !mockupRecipientJid) {
      setMockupRecipientJid(firstSelected.jid);
    }
    setShowPhoneMockup(true);
  };

  const startBatchSending = async () => {
    setShowPhoneMockup(false);
    const listToSend = contacts.filter(c => selectedJids.has(c.jid));
    if (listToSend.length === 0) {
      alert('Por favor, selecione ao menos um contato.');
      return;
    }

    if (!selectedMessage.trim()) {
      alert('A mensagem de convite está vazia.');
      return;
    }

    const useVariableDelay = listToSend.length > 5;
    const delayDescription = useVariableDelay 
      ? 'variável de 2 a 7 minutos entre cada envio (Proteção Anti-Bloqueio ativada para mais de 5 contatos)' 
      : `${standardDelaySeconds} segundos`;

    const imageWarning = (attachImageToInvite && generatedImage) ? '\n📸 Imagem da Nanobana será enviada em anexo!' : '';

    const confirmMsg = `Deseja iniciar o envio do convite para ${listToSend.length} contato(s)?\n\nTempo entre envios: ${delayDescription}.${imageWarning}`;
    if (!window.confirm(confirmMsg)) return;

    setIsSending(true);
    setIsPaused(false);
    isCancelledRef.current = false;
    isPausedRef.current = false;
    setCountdownRemaining(0);
    setNextTargetName('');

    setSendProgress({
      current: 0,
      total: listToSend.length,
      success: 0,
      failed: 0
    });

    const initialStatus = {};
    listToSend.forEach(c => { initialStatus[c.jid] = 'pending'; });
    setSendStatusMap(prev => ({ ...prev, ...initialStatus }));

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < listToSend.length; i++) {
      if (isCancelledRef.current) break;

      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise(r => setTimeout(r, 600));
      }
      if (isCancelledRef.current) break;

      const contact = listToSend[i];
      setSendStatusMap(prev => ({ ...prev, [contact.jid]: 'sending' }));

      const text = formatMessageForContact(contact);
      const cleanPhone = contact.phone.replace(/\D/g, '');

      try {
        let endpoint = `${EVO_URL}/message/sendText/${EVO_INSTANCE}`;
        let payload = {
          number: cleanPhone,
          text: text,
          options: {
            delay: 1200,
            presence: 'composing'
          }
        };

        // Se tiver imagem gerada e marcada para anexo, envia como sendMedia
        if (attachImageToInvite && generatedImage) {
          endpoint = `${EVO_URL}/message/sendMedia/${EVO_INSTANCE}`;
          let mediaData = generatedImage;
          const isUrl = typeof mediaData === 'string' && (mediaData.startsWith('http://') || mediaData.startsWith('https://'));
          
          if (!isUrl) {
            if (mediaData.includes('base64,')) {
              mediaData = mediaData.split('base64,')[1];
            }
            // CRÍTICO: remove espaços e quebras de linha que causam erro 400 no Evolution API
            mediaData = mediaData.replace(/\s+/g, '');
          }

          payload = {
            number: cleanPhone,
            mediatype: 'image',
            mimetype: 'image/png',
            media: mediaData,
            caption: text,
            fileName: 'amoreja-convite.png'
          };
        }

        let res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'apikey': EVO_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        // Se sendMedia falhar (ex: status 400/500), tenta fallback imediato para envio de texto puro
        if (!res.ok && attachImageToInvite && generatedImage) {
          const errDetail = await res.text().catch(() => '');
          console.warn(`sendMedia falhou para ${contact.phone} (${res.status}: ${errDetail}). Tentando fallback automático por texto puro...`);
          
          const fallbackRes = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
            method: 'POST',
            headers: {
              'apikey': EVO_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              number: cleanPhone,
              text: text,
              options: { delay: 1200, presence: 'composing' }
            })
          });
          if (fallbackRes.ok) {
            res = fallbackRes;
          }
        }

        if (res.ok) {
          successCount++;
          setSendStatusMap(prev => ({ ...prev, [contact.jid]: 'success' }));
        } else {
          failedCount++;
          setSendStatusMap(prev => ({ ...prev, [contact.jid]: 'failed' }));
        }
      } catch (err) {
        console.error(`Erro ao enviar para ${contact.phone}:`, err);
        failedCount++;
        setSendStatusMap(prev => ({ ...prev, [contact.jid]: 'failed' }));
      }

      setSendProgress({
        current: i + 1,
        total: listToSend.length,
        success: successCount,
        failed: failedCount
      });

      // Aguarda o intervalo antes do próximo contato (exceto no último)
      if (i < listToSend.length - 1 && !isCancelledRef.current) {
        const nextContact = listToSend[i + 1];
        setNextTargetName(nextContact.name || nextContact.formattedPhone);

        const secondsToWait = useVariableDelay ? getRandomDelaySeconds() : standardDelaySeconds;

        for (let rem = secondsToWait; rem > 0; rem--) {
          if (isCancelledRef.current) break;
          while (isPausedRef.current && !isCancelledRef.current) {
            await new Promise(r => setTimeout(r, 600));
          }
          if (isCancelledRef.current) break;
          setCountdownRemaining(rem);
          await new Promise(r => setTimeout(r, 1000));
        }
        setCountdownRemaining(0);
      }
    }

    setIsSending(false);
    setIsPaused(false);
    setCountdownRemaining(0);
    setNextTargetName('');
  };

  const handleCancelSending = () => {
    if (window.confirm('Tem certeza que deseja cancelar o envio dos convites restantes?')) {
      isCancelledRef.current = true;
      setIsSending(false);
      setIsPaused(false);
      setCountdownRemaining(0);
    }
  };

  return (
    <div className="wa-campaign-wrapper">
      {/* ── BARRA SUPERIOR RESPONSIVA (ABAS E AÇÕES) ── */}
      <div className="wa-campaign-nav-header">
        <div className="nav-title-group">
          <h2>
            <Sparkles size={20} className="text-pink" />
            Central de Campanhas & IA
          </h2>
          <span className="subtitle">
            Crie mensagens com Copywriting IA, gere artes com a Nanobana e dispare convites seguros para seus contatos.
          </span>
        </div>

        <div className="nav-tabs-group">
          <button
            type="button"
            className={`tab-btn ${subTab === 'studio' ? 'active' : ''}`}
            onClick={() => setSubTab('studio')}
          >
            <Bot size={16} />
            <span>1. Criar Mensagem & Imagem IA</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${subTab === 'invites' ? 'active' : ''}`}
            onClick={() => setSubTab('invites')}
          >
            <Users size={16} />
            <span>2. Selecionar Contatos & Disparar</span>
            {selectedJids.size > 0 && <span className="tab-badge">{selectedJids.size}</span>}
          </button>
          {onBackToChat && (
            <button type="button" onClick={onBackToChat} className="btn-back-chat">
              Voltar ao Chat
            </button>
          )}
        </div>
      </div>

      {/* ── ABA 1: ESTÚDIO DE MENSAGENS COM IA (MARKETING + NANOBANA) ── */}
      {subTab === 'studio' && (
        <div className="studio-container-scroll">
          <div className="studio-grid">
            
            {/* CARD DO AGENTE DE MARKETING */}
            <div className="studio-card marketing-agent-card">
              <div className="card-top-badge">
                <div className="agent-avatar-tag">
                  <div className="agent-dot green" />
                  <strong>Agente de Marketing (Gemini 3.8 Flash)</strong>
                </div>
                <span className="agent-role-badge">Copywriting de Alta Conversão</span>
              </div>

              <div className="card-body-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label mb-0">Qual o objetivo do seu convite?</label>
                  <button 
                    type="button" 
                    onClick={handleAddNewGroup} 
                    className="btn-create-new-group"
                    title="Criar novo grupo/categoria de mensagens"
                  >
                    <Plus size={13} /> Novo Grupo
                  </button>
                </div>

                <div className="goals-pill-grid">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      className={`goal-btn ${marketingGoal === g.id ? 'active' : ''}`}
                      onClick={() => setMarketingGoal(g.id)}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* BANNER DE INTEGRAÇÃO COM PÁGINA DE CUPONS */}
                {marketingGoal === 'cupons' && (
                  <div className="live-coupons-banner mt-3">
                    <div className="live-coupons-header">
                      <div className="live-coupons-title">
                        <Tag size={16} color="#d97706" />
                        <strong>Cupons Ativos no Site ({activeCoupons.length}):</strong>
                      </div>
                      <a 
                        href="/admin/cupons" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-manage-coupons-link"
                        title="Abrir página de gerenciamento de cupons"
                      >
                        <ExternalLink size={13} /> Gerenciar Cupons no Site
                      </a>
                    </div>

                    {loadingCoupons ? (
                      <p className="loading-coupons-text">Consultando cupons na página de cupons...</p>
                    ) : activeCoupons.length > 0 ? (
                      <div className="live-coupons-list">
                        {activeCoupons.map(c => {
                          const discountLabel = c.discount_type === 'percent' 
                            ? `${parseFloat(c.discount_value)}% OFF` 
                            : `R$ ${parseFloat(c.discount_value)} OFF`;
                          const isSelected = selectedCouponCode === c.code;

                          return (
                            <div 
                              key={c.id} 
                              className={`coupon-badge-card ${isSelected ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedCouponCode(c.code);
                                if (!selectedMessage.includes(c.code)) {
                                  setSelectedMessage(prev => `${prev}\n\n🎟️ Cupom de Desconto: ${c.code} (${discountLabel})`);
                                }
                              }}
                              title="Clique para selecionar este cupom e adicioná-lo à mensagem"
                            >
                              <div className="coupon-code-row">
                                <Tag size={13} />
                                <strong>{c.code}</strong>
                                <span className="coupon-discount-tag">{discountLabel}</span>
                              </div>
                              {c.expires_at && (
                                <span className="coupon-expiry-text">
                                  Válido até {new Date(c.expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="no-coupons-alert">
                        <span>Nenhum cupom ativo no momento.</span>
                        <a href="/admin/cupons" target="_blank" rel="noopener noreferrer">Criar Cupom na Página de Cupons →</a>
                      </div>
                    )}
                  </div>
                )}

                {/* MODELOS SALVOS NESTE GRUPO */}
                {(() => {
                  const groupTemplates = savedTemplates.filter(t => t.groupId === marketingGoal);
                  const activeGroupName = groups.find(g => g.id === marketingGoal)?.label || 'Grupo';
                  return (
                    <div className="group-saved-templates-box mt-3">
                      <div className="group-templates-header">
                        <span className="templates-label">
                          <Bookmark size={13} className="text-pink" /> 
                          Modelos Salvos em <strong>{activeGroupName}</strong> ({groupTemplates.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSaveAsTemplate(marketingGoal)}
                          className="btn-save-as-template"
                          title="Salvar a mensagem atual como modelo neste grupo"
                        >
                          <Bookmark size={13} /> Salvar como Modelo
                        </button>
                      </div>

                      {groupTemplates.length > 0 ? (
                        <div className="group-templates-pills">
                          {groupTemplates.map(tpl => (
                            <div 
                              key={tpl.id} 
                              className={`template-pill-item ${selectedMessage === tpl.text ? 'selected' : ''}`}
                              onClick={() => setSelectedMessage(tpl.text)}
                            >
                              <span className="template-pill-name">{tpl.name}</span>
                              <div className="template-pill-actions">
                                {tpl.isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                                    className="btn-delete-template"
                                    title="Excluir este modelo"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-templates-hint">
                          Nenhum modelo customizado neste grupo. Digite sua mensagem abaixo e clique em "Salvar como Modelo".
                        </p>
                      )}
                    </div>
                  );
                })()}

                <label className="input-label mt-3">Tema ou detalhe opcional (Ex: girafinha Gigi, páscoa, cupom):</label>
                <div className="generate-input-row">
                  <input
                    type="text"
                    value={marketingTopic}
                    onChange={e => setMarketingTopic(e.target.value)}
                    placeholder="Ex: nova girafinha Gigi, desconto de 15%..."
                    className="form-input"
                  />
                  <button
                    type="button"
                    onClick={generateMarketingCopies}
                    disabled={isGeneratingCopy}
                    className="btn-gemini-action"
                  >
                    <Wand2 size={16} className={isGeneratingCopy ? 'spin' : ''} />
                    <span>{isGeneratingCopy ? 'Gerando...' : 'Gerar 3 Sugestões'}</span>
                  </button>
                </div>

                {/* Opções de Copy Geradas */}
                {suggestedCopies.length > 0 && (
                  <div className="suggested-copies-area mt-3">
                    <span className="copies-heading">✨ Escolha uma das sugestões para o seu convite:</span>
                    <div className="copies-list">
                      {suggestedCopies.map((c, i) => (
                        <div key={i} className="copy-card-item">
                          <div className="copy-card-header">
                            <span className="copy-title">{c.title}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedMessage(c.text)}
                              className="btn-use-copy"
                            >
                              <Check size={14} /> Usar esta Mensagem
                            </button>
                          </div>
                          <p className="copy-preview-text">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Editor da Mensagem Atual */}
                <div className="current-message-box mt-3">
                  <div className="box-header-row">
                    <label className="input-label mb-0">Mensagem que será enviada:</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="tag-var font-mono">{`{nome}`} substitui pelo primeiro nome</span>
                      <button
                        type="button"
                        onClick={() => handleSaveAsTemplate(marketingGoal)}
                        className="btn-save-template-inline"
                        title="Salvar como modelo de mensagem"
                      >
                        <Bookmark size={13} /> Salvar Modelo
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenPhoneMockup}
                        className="btn-preview-phone-inline"
                        title="Simular visualização no celular"
                      >
                        <Smartphone size={13} /> Ver no Celular
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={selectedMessage}
                    onChange={e => setSelectedMessage(e.target.value)}
                    className="form-textarea mt-1"
                    placeholder="Escreva ou edite o convite aqui..."
                  />
                </div>
              </div>
            </div>

            {/* CARD DA AGENTE NANOBANA (GERAÇÃO E MELHORIA DE IMAGENS) */}
            <div className="studio-card nanobana-agent-card">
              <div className="card-top-badge">
                <div className="agent-avatar-tag">
                  <div className="agent-dot yellow" />
                  <strong>Agente Nanobana (Gemini Nano Banana)</strong>
                </div>
                <span className="agent-role-badge nanobana-badge">Design & Imagens IA</span>
              </div>

              <div className="card-body-content">
                <p className="nanobana-desc">
                  A <strong>Nanobana</strong> cria fotos encantadoras de amigurumis e crochê para acompanhar seu convite no WhatsApp.
                </p>

                <label className="input-label">O que você gostaria que a Nanobana crie?</label>
                <div className="nanobana-input-area">
                  <textarea
                    rows={3}
                    value={nanobanaPrompt}
                    onChange={e => setNanobanaPrompt(e.target.value)}
                    placeholder="Ex: Ursinho fofinho de crochê com laço rosa e olhos brilhantes em cima de uma mesa de madeira..."
                    className="form-textarea"
                  />
                  <button
                    type="button"
                    onClick={generateNanobanaImage}
                    disabled={isGeneratingImage || !nanobanaPrompt.trim()}
                    className="btn-nanobana-generate mt-2"
                  >
                    <Sparkles size={16} className={isGeneratingImage ? 'spin' : ''} />
                    <span>{isGeneratingImage ? 'Nanobana está criando a imagem...' : 'Gerar Imagem com Nanobana'}</span>
                  </button>
                </div>

                {/* Ideias Rápidas */}
                <div className="quick-ideas-box mt-2">
                  <span className="label-tiny">Sugestões rápidas de peças:</span>
                  <div className="ideas-chips">
                    {quickNanobanaIdeas.map((idea, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNanobanaPrompt(idea)}
                        className="idea-chip"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visualizador da Imagem Gerada */}
                {generatedImage && (
                  <div className="nanobana-preview-result mt-3">
                    <div className="preview-top-bar">
                      <span className="badge-created">
                        <CheckCircle2 size={13} /> Imagem Criada com Sucesso!
                      </span>
                      <label className="toggle-attach">
                        <input
                          type="checkbox"
                          checked={attachImageToInvite}
                          onChange={e => setAttachImageToInvite(e.target.checked)}
                        />
                        <span>Anexar ao Convite</span>
                      </label>
                    </div>
                    <div className="image-display-frame">
                      <img src={generatedImage} alt="Arte gerada pela Nanobana" className="generated-amigurumi-img" />
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Avançar para Seleção de Contatos */}
              <div className="card-footer-action">
                <button
                  type="button"
                  onClick={() => setSubTab('invites')}
                  className="btn-next-step"
                >
                  <span>Avançar para Selecionar Contatos</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── ABA 2: LISTA DE CONTATOS & DISPARO SEGURO (2 A 7 MIN) ── */}
      {subTab === 'invites' && (
        <div className="invites-panel-layout">
          
          {/* LADO ESQUERDO: RESUMO DA MENSAGEM & CONTROLES */}
          <div className="invites-sidebar-summary">
            <div className={`summary-card ${isSummaryExpanded ? 'expanded' : 'collapsed-mobile'}`}>
              <div className="summary-header">
                <h3><FileText size={17} /> Mensagem Pronta</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    onClick={handleOpenPhoneMockup} 
                    className="btn-preview-phone-card"
                    title="Ver a mensagem exatamente como o cliente receberá no celular"
                  >
                    <Smartphone size={13} /> Ver no Celular
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)} 
                    className="btn-toggle-summary-mobile"
                  >
                    {isSummaryExpanded ? 'Ocultar' : 'Detalhes'}
                  </button>
                  <button type="button" onClick={() => setSubTab('studio')} className="btn-link-edit">
                    Editar no Estúdio
                  </button>
                </div>
              </div>
              <div className="summary-message-preview">
                {selectedMessage}
              </div>

              {/* Seletor Rápido de Modelos Salvos */}
              <div className="summary-templates-selector mt-2">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="label-tiny">Usar modelo salvo por grupo:</span>
                  <button 
                    type="button" 
                    onClick={() => handleSaveAsTemplate(marketingGoal)} 
                    className="btn-save-as-template-tiny"
                    title="Salvar esta mensagem como novo modelo"
                  >
                    <Bookmark size={11} /> Salvar Atual
                  </button>
                </div>
                <select
                  value=""
                  onChange={e => {
                    const tpl = savedTemplates.find(t => t.id === e.target.value);
                    if (tpl) setSelectedMessage(tpl.text);
                  }}
                  className="form-select-sm"
                >
                  <option value="" disabled>Carregar modelo pronto...</option>
                  {groups.map(g => {
                    const gTpls = savedTemplates.filter(t => t.groupId === g.id);
                    if (gTpls.length === 0) return null;
                    return (
                      <optgroup key={g.id} label={g.label}>
                        {gTpls.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {attachImageToInvite && generatedImage && (
                <div className="attached-image-preview-badge">
                  <ImageIcon size={15} />
                  <span>1 Imagem da Nanobana Anexada</span>
                </div>
              )}

              {/* Alerta de Proteção Anti-Bloqueio (> 5 Contatos) */}
              {isAntiBanActive ? (
                <div className="anti-ban-warning-card mt-3">
                  <div className="warning-title-row">
                    <ShieldAlert size={18} className="text-amber-500" />
                    <strong>Proteção Anti-Bloqueio Ativa</strong>
                  </div>
                  <p>
                    Como você selecionou <strong>{selectedJids.size} contatos</strong> (mais de 5), o envio terá um <strong>tempo variável aleatório de 2 a 7 minutos</strong> entre cada mensagem para proteger seu número do WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="delay-small-card mt-3">
                  <div className="delay-title-row">
                    <Clock size={16} />
                    <span>Intervalo (≤ 5 contatos):</span>
                    <strong>{standardDelaySeconds}s</strong>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={standardDelaySeconds}
                    onChange={e => setStandardDelaySeconds(Number(e.target.value))}
                    disabled={isSending}
                    className="slider-range"
                  />
                  <small className="hint-text"><ShieldCheck size={12} /> Para poucos envios, delay curto é seguro.</small>
                </div>
              )}

              {/* Card de Progresso e Controles durante o Disparo */}
              {isSending && (
                <div className="active-dispatch-box mt-3">
                  <div className="dispatch-header">
                    <span>Enviando: <strong>{sendProgress.current} de {sendProgress.total}</strong></span>
                    <span className="dispatch-counts">
                      <span className="text-success">✅ {sendProgress.success}</span> | <span className="text-danger">❌ {sendProgress.failed}</span>
                    </span>
                  </div>
                  <div className="dispatch-track">
                    <div 
                      className="dispatch-fill" 
                      style={{ width: `${(sendProgress.current / Math.max(sendProgress.total, 1)) * 100}%` }}
                    />
                  </div>

                  {countdownRemaining > 0 && (
                    <div className="countdown-timer-badge">
                      <Timer size={16} className="spin" />
                      <span>
                        Próximo envio em <strong>{formatCountdown(countdownRemaining)} min</strong> para <em>{nextTargetName}</em>...
                      </span>
                    </div>
                  )}

                  <div className="dispatch-action-buttons mt-2">
                    <button type="button" onClick={() => setIsPaused(!isPaused)} className="btn-dispatch-pause">
                      {isPaused ? <><Play size={14} /> Retomar</> : <><Pause size={14} /> Pausar</>}
                    </button>
                    <button type="button" onClick={handleCancelSending} className="btn-dispatch-cancel">
                      <XCircle size={14} /> Cancelar Restantes
                    </button>
                  </div>
                </div>
              )}

              {/* Botão de Disparo com Visualização Prévia */}
              {!isSending && (
                <button
                  type="button"
                  onClick={handleOpenPhoneMockup}
                  disabled={selectedJids.size === 0 || !selectedMessage.trim()}
                  className="btn-launch-invites mt-3"
                >
                  <Eye size={18} />
                  <span>
                    {selectedJids.size === 0 
                      ? 'Selecione os Contatos ao Lado' 
                      : `Visualizar e Disparar (${selectedJids.size} Selecionados)`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* LADO DIREITO: SELEÇÃO DA AGENDA DE CONTATOS */}
          <div className="invites-contacts-table-area">
            <div className="contacts-table-header">
              <div className="header-meta-group">
                <h3>Contatos da sua Conta WhatsApp ({filteredContacts.length})</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setFilterOnlySelected(!filterOnlySelected)}
                    className={`btn-filter-selected ${filterOnlySelected ? 'active' : ''}`}
                    title="Exibir apenas contatos selecionados para envio"
                  >
                    ⭐ {filterOnlySelected ? 'Exibindo Apenas Selecionados' : `Ver Apenas Selecionados (${selectedJids.size})`}
                  </button>
                  <span className="counter-tag">
                    <strong>{selectedJids.size}</strong> selecionados
                  </span>
                </div>
              </div>

              <div className="table-search-row">
                <div className="table-search-input">
                  <Search size={15} color="#64748b" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar por nome ou DDD/telefone..."
                  />
                </div>
                <label className="checkbox-named-filter">
                  <input
                    type="checkbox"
                    checked={onlyNamed}
                    onChange={e => setOnlyNamed(e.target.checked)}
                  />
                  <span>Com nome</span>
                </label>
              </div>

              <div className="table-bulk-actions">
                <button type="button" onClick={handleSelectAllVisible} disabled={isSending} className="btn-bulk">
                  <CheckSquare size={14} /> Marcar Visíveis ({filteredContacts.length})
                </button>
                <button type="button" onClick={handleDeselectAllVisible} disabled={isSending} className="btn-bulk">
                  <Square size={14} /> Desmarcar Visíveis
                </button>
                {selectedJids.size > 0 && (
                  <button type="button" onClick={() => setSelectedJids(new Set())} disabled={isSending} className="btn-bulk-clear">
                    Limpar Seleção
                  </button>
                )}
              </div>

              {/* LISTA DE CONTATOS SELECIONADOS COM BOTÃO DE REMOVER FÁCIL */}
              {selectedContactsList.length > 0 && (
                <div className="selected-contacts-chips-tray">
                  <div className="chips-tray-header">
                    <span className="chips-tray-title">
                      <CheckCircle2 size={13} className="text-pink" /> 
                      Contatos Marcados ({selectedContactsList.length}): <small>(clique no ✕ para remover)</small>
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedJids(new Set())}
                      disabled={isSending}
                      className="btn-clear-chips-link"
                    >
                      Remover todos
                    </button>
                  </div>
                  <div className="selected-chips-scrollable">
                    {selectedContactsList.map(c => {
                      const initial = (c.name || c.phone).charAt(0).toUpperCase();
                      return (
                        <div key={c.jid} className="selected-contact-chip">
                          <div className="chip-avatar-circle">
                            {c.profilePicUrl ? (
                              <img src={c.profilePicUrl} alt={c.name || c.phone} onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = initial; }} />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>
                          <span className="chip-contact-name" title={c.name || c.formattedPhone}>
                            {c.name || c.formattedPhone}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveSelected(c.jid, e)}
                            disabled={isSending}
                            className="chip-remove-button"
                            title={`Remover ${c.name || c.formattedPhone} da lista`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Linhas da Lista */}
            <div className="contacts-list-scroll">
              {loadingContacts ? (
                <div className="loading-state-box">
                  <RefreshCw size={26} className="spin text-pink" />
                  <p>Carregando contatos conectados...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="loading-state-box">
                  <Users size={32} color="#94a3b8" />
                  <p>Nenhum contato encontrado com este filtro.</p>
                </div>
              ) : (
                filteredContacts.map(c => {
                  const isSelected = selectedJids.has(c.jid);
                  const status = sendStatusMap[c.jid];
                  const initial = (c.name || c.phone).charAt(0).toUpperCase();

                  return (
                    <div
                      key={c.id}
                      className={`contact-row-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleSelect(c.jid)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        disabled={isSending}
                        className="row-checkbox"
                      />

                      <div className="row-avatar">
                        {c.profilePicUrl ? (
                          <img 
                            src={c.profilePicUrl} 
                            alt={c.name || c.phone} 
                            onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = initial; }}
                          />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>

                      <div className="row-info">
                        <strong className="name-text">{c.name || 'Contato sem nome'}</strong>
                        <span className="phone-text font-mono">{c.formattedPhone}</span>
                      </div>

                      <div className="row-status">
                        {status === 'pending' && <span className="badge-status pending">Pendente</span>}
                        {status === 'sending' && <span className="badge-status sending"><RefreshCw size={11} className="spin" /> Enviando</span>}
                        {status === 'success' && <span className="badge-status success"><CheckCircle2 size={12} /> Enviado</span>}
                        {status === 'failed' && <span className="badge-status failed"><XCircle size={12} /> Falhou</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Barra Flutuante de Disparo no Mobile (Fixa na parte inferior para celulares e iPhones) */}
            <div className="mobile-floating-dispatch-bar">
              <div className="mobile-dispatch-info">
                <div className="mobile-count-pill">
                  <strong>{selectedJids.size}</strong> sel.
                </div>
                {isAntiBanActive ? (
                  <span className="mobile-antiban-badge" title="2 a 7 minutos entre envios">
                    🛡️ 2-7 min (Anti-ban)
                  </span>
                ) : (
                  <span className="mobile-antiban-badge normal" title="Delay seguro">
                    ⚡ {standardDelaySeconds}s delay
                  </span>
                )}
              </div>

              {!isSending ? (
                <button
                  type="button"
                  onClick={handleOpenPhoneMockup}
                  disabled={selectedJids.size === 0 || !selectedMessage.trim()}
                  className="btn-mobile-send"
                >
                  <Smartphone size={15} />
                  <span>{selectedJids.size === 0 ? 'Selecione' : `Visualizar & Enviar (${selectedJids.size})`}</span>
                </button>
              ) : (
                <div className="mobile-sending-actions">
                  {countdownRemaining > 0 && (
                    <span className="mobile-timer-tag">
                      <Timer size={13} className="spin" /> {formatCountdown(countdownRemaining)}
                    </span>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setIsPaused(!isPaused)} 
                    className="btn-mobile-pause"
                    title={isPaused ? "Retomar" : "Pausar"}
                  >
                    {isPaused ? <Play size={15} /> : <Pause size={15} />}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCancelSending} 
                    className="btn-mobile-cancel"
                    title="Cancelar Envio"
                  >
                    <XCircle size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── MODAL DE SIMULAÇÃO REALISTA NO CELULAR (WHATSAPP SMARTPHONE MOCKUP) ── */}
      {showPhoneMockup && (
        <div className="phone-mockup-backdrop" onClick={() => setShowPhoneMockup(false)}>
          <div className="phone-mockup-modal-content" onClick={e => e.stopPropagation()}>
            <div className="phone-mockup-header-bar">
              <div className="modal-header-titles">
                <h4><Smartphone size={20} color="#25D366" /> Como o Cliente Vai Receber no WhatsApp</h4>
                <p>Veja a mensagem montada exatamente como ela aparecerá na tela do celular do destinatário.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPhoneMockup(false)}
                className="btn-close-mockup-modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* SELETOR DE CONTATO PARA TESTAR NOMES */}
            <div className="mockup-recipient-selector-bar">
              <label>Simular mensagem para o contato:</label>
              <select
                value={mockupRecipientJid || (selectedContactsList[0]?.jid || '')}
                onChange={e => setMockupRecipientJid(e.target.value)}
                className="mockup-contact-select"
              >
                {selectedContactsList.length > 0 ? (
                  selectedContactsList.map(c => (
                    <option key={c.jid} value={c.jid}>
                      {c.name ? `${c.name} (${c.formattedPhone})` : c.formattedPhone}
                    </option>
                  ))
                ) : (
                  <option value="">Exemplo: Maria das Dores (+55 31 9999-9999)</option>
                )}
              </select>
            </div>

            {/* DISPOSITIVO CELULAR SIMULADO */}
            <div className="smartphone-device-frame">
              <div className="smartphone-speaker-notch">
                <div className="notch-camera" />
                <div className="notch-speaker" />
              </div>

              {/* TELA DO SMARTPHONE */}
              <div className="smartphone-screen-canvas">
                {(() => {
                  const targetContact = contacts.find(c => c.jid === mockupRecipientJid) || selectedContactsList[0] || { name: 'Edinho', formattedPhone: '+55 (31) 9557-4906' };
                  const formattedText = formatMessageForContact(targetContact);
                  const initial = (targetContact.name || targetContact.phone || 'C').charAt(0).toUpperCase();

                  return (
                    <>
                      {/* TOPO DO WHATSAPP */}
                      <div className="wa-mockup-top-header">
                        <div className="wa-mockup-back-arrow">‹</div>
                        <div className="wa-mockup-avatar">
                          {targetContact.profilePicUrl ? (
                            <img src={targetContact.profilePicUrl} alt={targetContact.name} />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                        <div className="wa-mockup-user-info">
                          <strong className="wa-mockup-user-name">{targetContact.name || targetContact.formattedPhone}</strong>
                          <span className="wa-mockup-status">online agora</span>
                        </div>
                        <div className="wa-mockup-header-icons">
                          <span>📹</span>
                          <span>📞</span>
                          <span>⋮</span>
                        </div>
                      </div>

                      {/* CORPO DO CHAT COM WALLPAPER */}
                      <div className="wa-mockup-chat-body">
                        <div className="wa-date-pill">HOJE</div>

                        {/* BALÃO DE MENSAGEM */}
                        <div className="wa-mockup-message-bubble">
                          {attachImageToInvite && generatedImage && (
                            <div className="wa-bubble-image-wrapper">
                              <img src={generatedImage} alt="Anexo do Convite" className="wa-bubble-image" />
                            </div>
                          )}
                          <div className="wa-bubble-text-content">
                            {formattedText.split('\n').map((paragraph, pIdx) => {
                              if (!paragraph.trim()) return <div key={pIdx} className="wa-empty-line" />;
                              return <p key={pIdx} className="wa-text-paragraph">{paragraph}</p>;
                            })}
                          </div>
                          <div className="wa-bubble-meta-info">
                            <span className="wa-bubble-time">
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="wa-bubble-ticks">✓✓</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* BARRA DE APROVAÇÃO E AÇÕES */}
            <div className="phone-mockup-actions-footer">
              <button
                type="button"
                onClick={() => setShowPhoneMockup(false)}
                className="btn-mockup-adjust"
              >
                ✏️ Ajustar Mensagem
              </button>
              <button
                type="button"
                onClick={() => handleSaveAsTemplate(marketingGoal)}
                className="btn-mockup-save-model"
              >
                <Bookmark size={15} /> Salvar como Modelo
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPhoneMockup(false);
                  startBatchSending();
                }}
                disabled={selectedJids.size === 0 || isSending}
                className="btn-mockup-approve-send"
              >
                <Check size={18} />
                <span>Aprovar e Iniciar Disparo ({selectedJids.size} Contatos)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
