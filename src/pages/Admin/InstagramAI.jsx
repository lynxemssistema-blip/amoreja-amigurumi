import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Image as ImageIcon, RefreshCw, CheckCircle, Download, ExternalLink, Hash, ChevronLeft, ChevronRight, Square, Smartphone, Copy, AlertCircle, BookOpen, Save, Star, Calendar, Trash2, StickyNote } from 'lucide-react';
import InstagramIcon from '../../components/InstagramIcon';
import { supabase } from '../../supabaseClient';
import './InstagramAI.css';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const PEXELS_API_KEY = "DaU2uNTUTQflrD98ENHwX84luJS5MMiAg5DjC2u6ScDosm0ln0f76PON";

async function getPexelsImages(keyword, count = 4, orientation = 'square') {
  try {
    const query = encodeURIComponent(keyword || 'amigurumi crochet handmade');
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=${count}&orientation=${orientation}`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    const data = await response.json();
    const photos = data.photos || [];
    if (photos.length === 0) {
      const fallback = await fetch(
        `https://api.pexels.com/v1/search?query=crochet+handmade+colorful&per_page=${count}`,
        { headers: { Authorization: PEXELS_API_KEY } }
      );
      const fb = await fallback.json();
      return (fb.photos || []).map(p => ({ url: p.src.large2x || p.src.large, thumb: p.src.medium }));
    }
    return photos.map(p => ({ url: p.src.large2x || p.src.large, thumb: p.src.medium }));
  } catch (err) {
    console.error('Erro Pexels fotos:', err);
    return [];
  }
}

async function getPexelsVideos(keyword, count = 4, orientation = 'portrait') {
  try {
    const query = encodeURIComponent(keyword || 'crochet handmade');
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${query}&per_page=${count}&orientation=${orientation}`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    const data = await response.json();
    const videos = data.videos || [];
    if (videos.length === 0) {
      const fallback = await fetch(
        `https://api.pexels.com/videos/search?query=handmade+craft&per_page=${count}&orientation=${orientation}`,
        { headers: { Authorization: PEXELS_API_KEY } }
      );
      const fb = await fallback.json();
      return mapVideos(fb.videos || []);
    }
    return mapVideos(videos);
  } catch (err) {
    console.error('Erro Pexels vídeos:', err);
    return [];
  }
}

function mapVideos(videos) {
  return videos.map(v => {
    // Prefere HD vertical, depois qualquer HD, depois o maior
    const file = v.video_files.find(f => f.quality === 'hd' && f.height > f.width)
      || v.video_files.find(f => f.quality === 'hd')
      || v.video_files[0];
    return { url: file?.link || '', thumb: v.image, duration: v.duration };
  }).filter(v => v.url);
}

// ── Geração de Imagem Customizada via Gemini 2.0 Flash (Marca Amoreja) ──
// Gera uma imagem única no estilo da marca para cada slide do carrossel.
// Retorna a imagem como Data URL (base64) ou null se falhar.
async function generateImageWithGemini(imagePrompt) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: imagePrompt }]
        }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT']
        }
      })
    });

    if (!response.ok) {
      console.warn('Gemini image gen HTTP error:', response.status);
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (imagePart?.inlineData) {
      const { mimeType, data: b64 } = imagePart.inlineData;
      return { url: `data:${mimeType};base64,${b64}`, thumb: `data:${mimeType};base64,${b64}`, aiGenerated: true };
    }

    return null;
  } catch (err) {
    console.warn('Gemini image generation falhou, usando Pexels como fallback:', err);
    return null;
  }
}
// Recorta e redimensiona imagem para o formato do Instagram via Canvas
async function cropImageToFormat(file, format) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratios = { square: 1, portrait: 4/5, reels: 9/16 };
      const targetRatio = ratios[format] || 1;
      const targets = { square: [1080,1080], portrait: [1080,1350], reels: [1080,1920] };
      const [outW, outH] = targets[format] || [1080,1080];

      let srcX = 0, srcY = 0;
      let srcW = img.width, srcH = img.height;
      const imgRatio = srcW / srcH;

      if (imgRatio > targetRatio) {
        // Imagem mais larga que o alvo: corta as laterais
        srcW = srcH * targetRatio;
        srcX = (img.width - srcW) / 2;
      } else {
        // Imagem mais alta que o alvo: corta em cima e embaixo
        srcH = srcW / targetRatio;
        srcY = (img.height - srcH) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      const url = canvas.toDataURL('image/jpeg', 0.92);
      const thumb = canvas.toDataURL('image/jpeg', 0.5);
      URL.revokeObjectURL(img.src);
      resolve({ url, thumb });
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function InstagramAI({ activeAccount }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [allPosts, setAllPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [postFormat, setPostFormat] = useState('square');
  const [mediaType, setMediaType] = useState('photo');
  const [mediaSource, setMediaSource] = useState('pexels'); // 'pexels' | 'upload'
  const [uploadedFiles, setUploadedFiles] = useState([]);   // File[]
  const [uploadPreviews, setUploadPreviews] = useState([]); // {url, thumb}[]
  const [dragOver, setDragOver] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Estilização do Overlay de Texto
  const [textPosition, setTextPosition] = useState('bottom'); // 'top' | 'center' | 'bottom'
  const [textBackground, setTextBackground] = useState('dark'); // 'none' | 'dark' | 'light'
  const [textFontSize, setTextFontSize] = useState('medium'); // 'small' | 'medium' | 'large'
  const [textColor, setTextColor] = useState('#ffffff');

  // Controle de progresso da orquestração de Agentes (Queen & Bees)
  const [activeAgentStep, setActiveAgentStep] = useState(0);

  // ── Agente Max — Chat de Copywriting ──
  const [showTextAgent, setShowTextAgent] = useState(false);
  const [textAgentMessages, setTextAgentMessages] = useState([
    { role: 'agent', text: '✍️ Olá! Sou o **Max**, seu especialista em copywriting para Instagram!\n\nPosso melhorar a legenda, os textos dos slides, adicionar emojis, mudar o tom, deixar mais curto ou mais longo...\n\nÉ só me dizer o que você precisa! 🧶💕' }
  ]);
  const [textAgentInput, setTextAgentInput] = useState('');
  const [textAgentLoading, setTextAgentLoading] = useState(false);
  const textAgentEndRef = useRef(null);

  // ── Agente Pixel — Chat de Edição/Geração de Imagem ──
  const [showPixelAgent, setShowPixelAgent] = useState(false);
  const [pixelMessages, setPixelMessages] = useState([
    { role: 'agent', text: '🎨 Oi! Sou o **Pixel**, seu designer IA!\n\nPosso gerar uma nova imagem ou modificar a atual. Ex:\n• "Muda o fundo para lilás"\n• "Gera um ursinho azul em cenário de inverno"\n• "Deixa mais fofo e kawaii"\n\nDiga o que quiser! 🧶✨' }
  ]);
  const [pixelInput, setPixelInput] = useState('');
  const [pixelLoading, setPixelLoading] = useState(false);
  const pixelEndRef = useRef(null);

  const syncInstagramFeed = async (token) => {
    setSyncing(true);
    try {
      const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
      const response = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&access_token=${token}`);
      if (!response.ok) return;
      const resJson = await response.json();
      const mediaList = resJson.data || [];
      if (mediaList.length === 0) return;

      const itemsToCache = mediaList.slice(0, 6).map(media => ({
        post_url: media.permalink,
        caption: media.caption || '',
        image_url: media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url
      }));

      await supabase.from('new_amoreja_instagram_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('new_amoreja_instagram_posts').insert(itemsToCache);

      // Busca TODOS os posts após sync
      const { data: posts } = await supabase
        .from('new_amoreja_instagram_posts')
        .select('id, image_url, caption, post_url');
      if (posts?.length) {
        setAllPosts(posts);
        setSelectedPost(posts[0]);
      }
    } catch (err) {
      console.error('Erro ao sincronizar Instagram:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    async function fetchPosts() {
      try {
        // 1. Busca TODOS os posts do cache
        const { data, error } = await supabase
          .from('new_amoreja_instagram_posts')
          .select('id, image_url, caption, post_url');

        if (data && data.length > 0 && !error) {
          setAllPosts(data);
          setSelectedPost(data[0]);
          return;
        }

        // 2. Tabela vazia — sincroniza automaticamente
        const { data: tokenData } = await supabase
          .from('new_amoreja_settings')
          .select('value')
          .eq('key', 'instagram_access_token')
          .single();

        if (tokenData?.value) {
          await syncInstagramFeed(tokenData.value);
        }
      } catch (err) {
        console.warn('Instagram: sem posts e sem token configurado.');
      }
    }
    fetchPosts();
  }, []);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 2000);
  };

  const handleImageUpload = async (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (valid.length === 0) return;
    const cropped = await Promise.all(valid.map(f => cropImageToFormat(f, postFormat)));
    setUploadedFiles(valid);
    setUploadPreviews(cropped);
  };

  const handleDropZone = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleImageUpload(e.dataTransfer.files);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setGeneratedContent(null);
    setCarouselIndex(0);
    setActiveAgentStep(0); // 🔍 Luna (Scout): começa pesquisa

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      // Contexto do post selecionado como referência de tom da conta
      const contextPost = selectedPost ? `\nEstilo de referência da conta (post anterior): "${selectedPost.caption?.substring(0, 200)}"` : '';

      // ── ETAPA 1: Luna + Max — Pesquisa e Copywriting ──
      // Gemini gera o texto completo E os prompts detalhados das imagens de cada slide.
      // A regra principal dos imagePrompts: NUNCA incluir texto nas imagens (apenas visuais limpos).
      const systemPrompt = `Você é o Orquestrador Chefe de Marketing da loja "Amoreja" de amigurumis artesanais.${contextPost}

MISSÃO: Com base na ideia "${prompt}", crie um carrossel completo de Instagram de ALTO ENGAJAMENTO para o nicho de amigurumi e crochê.

PERFIL DO PÚBLICO: Mulheres 18-45 anos, apaixonadas por artesanato, amigurumi, crochê e brinquedos fofos. Querem aprender, se inspirar e comprar peças exclusivas.

ESTRATÉGIA DO CARROSSEL:
- Slide 1 (GANCHO/CAPA): Título irresistível que para o scroll. Pergunta, dado curioso ou afirmação impactante sobre o amigurumi.
- Slide 2 (VALOR 1): Primeira dica prática, materiais necessários, ou característica especial da peça. Máximo 4 linhas.
- Slide 3 (VALOR 2): Dica técnica de crochet (pontos, anel mágico), diferencial da peça, ou passo importante da receita. Máximo 4 linhas.
- Slide 4 (CTA FOFO): Chamada para ação clara e fofa. Ex: "Salve esse post 🔖", "Comente 🧸", "Receita completa no link da bio 💕".

REGRAS PARA imagePrompts (CRÍTICO):
- Descreva APENAS o visual da imagem. NUNCA coloque texto, palavras ou letras no prompt.
- Sempre especifique: "no text, no words, no letters, no watermark"
- Estilo Amoreja: fundo pastel suave (rosa bebê, lilás, creme, menta), iluminação natural difusa, kawaii/cute, super clean.
- Slide 1: apresentação do amigurumi completo, lindo e fotogênico.
- Slide 2: close nos detalhes ou materiais usados.
- Slide 3: processo criativo ou close do ponto/detalhe técnico.
- Slide 4: amigurumi finalizado em cenário bonito com props fofos.

Retorne EXATAMENTE um JSON válido (sem markdown, sem explicação):
{
  "caption": "legenda fofa para Instagram com emojis, parágrafos curtos, histórico do processo, até 2000 caracteres",
  "hashtags": ["#amigurumi", "#croche", "#amoreja", "#amigurumibrasil", "#feitoamao", "#receitaamigurumi", "#artesanato", "#decoracaoinfantil"],
  "imageKeyword": "keyword de fallback em inglês para Pexels (ex: amigurumi crochet handmade kawaii)",
  "carouselSlides": [
    "Texto curto e impactante da capa (máx 8 palavras)",
    "Texto fofo do slide 2 (máx 4 linhas)",
    "Texto fofo do slide 3 (máx 4 linhas)",
    "Texto fofo do CTA final (máx 2 linhas)"
  ],
  "imagePrompts": [
    "Prompt de imagem IA em inglês para o SLIDE 1: apresentação do amigurumi completo, pastel background, cute kawaii style, product photography, soft natural light, no text, no words, no letters, no watermark",
    "Prompt de imagem IA em inglês para o SLIDE 2: close-up detalhes do amigurumi ou materiais, pastel background, macro photography, no text, no words, no watermark",
    "Prompt de imagem IA em inglês para o SLIDE 3: processo de criação ou ponto de crochet, cozy craft atmosphere, pastel background, no text, no words, no watermark",
    "Prompt de imagem IA em inglês para o SLIDE 4: amigurumi finalizado em cenário fofo com props, gift presentation, pastel pink background, professional product photography, no text, no words, no watermark"
  ]
}`;

      // Avança para Max (Writer) — Gemini está escrevendo
      await new Promise(r => setTimeout(r, 700));
      setActiveAgentStep(1); // ✍️ Max (Writer)

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Erro da API Gemini:', data);
        throw new Error(`Erro do Gemini: ${data.error?.message || 'Falha na requisição'}`);
      }

      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Se tiver Markdown na resposta JSON, limpa
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (err) {
        console.error("Falha ao fazer parse do JSON:", rawText);
        throw new Error('Resposta inválida da IA — tente novamente.');
      }

      // ── ETAPA 2: Pixel (Designer) — Geração de Imagens com IA ──
      setActiveAgentStep(2); // 🎨 Pixel (Designer)

      let media = [];
      let usedAIImages = false;

      if (mediaSource === 'upload' && uploadPreviews.length > 0) {
        // Imagens do usuário: não gera, usa direto
        media = uploadPreviews;
        setActiveAgentStep(3);

      } else if (mediaSource === 'reference') {
        if (!selectedPost?.image_url) throw new Error('Selecione um post do Instagram como referência primeiro.');
        media = [{ url: selectedPost.image_url, thumb: selectedPost.image_url }];
        setActiveAgentStep(3);

      } else if (mediaType === 'video') {
        const vidOrientation = postFormat === 'square' ? 'landscape' : 'portrait';
        media = await getPexelsVideos(parsed.imageKeyword, 4, vidOrientation);
        setActiveAgentStep(3);

      } else {
        // ── Modo Principal: Geração de Imagem com Gemini AI ──
        const imagePrompts = parsed.imagePrompts || [];
        const aiImages = [];

        if (imagePrompts.length > 0) {
          // Gera até 4 imagens customizadas no estilo Amoreja
          for (let i = 0; i < Math.min(imagePrompts.length, 4); i++) {
            const generated = await generateImageWithGemini(imagePrompts[i]);
            if (generated) aiImages.push(generated);
          }
        }

        if (aiImages.length >= 2) {
          // ✅ Sucesso: usa imagens geradas pela IA
          media = aiImages;
          usedAIImages = true;
        } else {
          // 🔄 Fallback para Pexels se Gemini não gerou imagens suficientes
          const orientation = postFormat === 'portrait' ? 'portrait' : 'square';
          const pexelsFill = await getPexelsImages(parsed.imageKeyword, 4, orientation);
          media = [...aiImages, ...pexelsFill].slice(0, 4);
        }

        // ── ETAPA 3: Sage (Critic) — Avalia e finaliza ──
        setActiveAgentStep(3); // 🧠 Sage (Critic)
        await new Promise(r => setTimeout(r, 600)); // Breve pausa de validação
      }

      if (media.length === 0) throw new Error('Nenhuma mídia disponível. Verifique as configurações e tente novamente.');

      setGeneratedContent({
        caption: parsed.caption,
        hashtags: parsed.hashtags || [],
        media,
        mediaType: mediaSource === 'upload' ? 'photo' : mediaType,
        slides: parsed.carouselSlides || [],
        imageKeyword: parsed.imageKeyword,
        isAIGenerated: usedAIImages // Indica se as imagens foram geradas por IA
      });

    } catch (error) {
      console.error('Erro na geração:', error);
      showToast('Erro ao gerar conteúdo: ' + error.message, 'error');
    } finally {
      setGenerating(false);
    }
  };


  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [activeTab, setActiveTab] = useState('generator');
  const [library, setLibrary] = useState([]);
  const [libFilter, setLibFilter] = useState('all');
  const [savingId, setSavingId] = useState(null);
  const [publishStatus, setPublishStatus] = useState(null);
  const [showSlideIgPicker, setShowSlideIgPicker] = useState(false);

  const handleReplaceMediaWithFile = async (index, file) => {
    if (!file) return;
    const cropped = await cropImageToFormat(file, postFormat);
    const updatedMedia = [...generatedContent.media];
    updatedMedia[index] = cropped;
    setGeneratedContent({ ...generatedContent, media: updatedMedia });
  };

  const handleReplaceMediaWithUrl = (index, url) => {
    const updatedMedia = [...generatedContent.media];
    updatedMedia[index] = { url, thumb: url };
    setGeneratedContent({ ...generatedContent, media: updatedMedia });
    setShowSlideIgPicker(false);
  };

  const fetchLibrary = async () => {
    const { data } = await supabase
      .from('new_amoreja_ai_suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setLibrary(data);
  };

  const [inspirationSources, setInspirationSources] = useState([]);
  const [inspirations, setInspirations] = useState([]);
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [fetchingInspirations, setFetchingInspirations] = useState(false);

  const fetchInspirationSources = async () => {
    const { data } = await supabase.from('new_amoreja_inspiration_sources').select('*').order('created_at', { ascending: false });
    if (data) setInspirationSources(data);
  };

  const fetchInspirations = async () => {
    const { data } = await supabase.from('new_amoreja_inspirations').select('*').order('created_at', { ascending: false });
    if (data) setInspirations(data);
  };

  useEffect(() => {
    if (activeTab === 'library') fetchLibrary();
    if (activeTab === 'inspirations') {
      fetchInspirationSources();
      fetchInspirations();
    }
  }, [activeTab]);

  const handleAddSource = async (e) => {
    e.preventDefault();
    if (!newSourceTitle || !newSourceUrl) return;
    let url = newSourceUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    await supabase.from('new_amoreja_inspiration_sources').insert({ title: newSourceTitle, url });
    setNewSourceTitle('');
    setNewSourceUrl('');
    fetchInspirationSources();
  };

  const handleDeleteSource = async (id) => {
    await supabase.from('new_amoreja_inspiration_sources').delete().eq('id', id);
    fetchInspirationSources();
  };

  const handleFetchInspirations = async () => {
    if (inspirationSources.length === 0) {
      showToast('Cadastre pelo menos um link/endereço de inspiração primeiro!', 'error');
      return;
    }
    setFetchingInspirations(true);

    try {
      // Para cada fonte, pega o HTML via proxy CORS público e extrai o texto principal
      for (const source of inspirationSources) {
        try {
          // Chama o proxy seguro do Supabase para buscar o HTML livre de CORS
          const res = await fetch(
            'https://slgpkokjcaiprqxpoefr.supabase.co/functions/v1/cors-proxy',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: source.url })
            }
          );
          const json = await res.json();
          const html = json.contents || '';

          // Limpeza básica de HTML no cliente para não enviar tags pesadas
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          // Remove scripts, styles e tags pesadas
          doc.querySelectorAll('script, style, head, nav, footer, iframe, noscript').forEach(el => el.remove());
          
          const title = doc.querySelector('title')?.innerText || source.title;
          const bodyText = doc.body?.innerText?.replace(/\s+/g, ' ').substring(0, 4500) || '';

          if (bodyText.trim().length < 50) continue;

          // Envia para o Gemini sugerir posts baseados nesse conteúdo
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
          const prompt = `Analise este texto extraído de um site de inspiração/crochê:
"${bodyText}"

Gere uma sugestão de postagem no estilo de crochê/amigurumi para o Instagram baseado no que encontrou nesse site.
Retorne EXATAMENTE um JSON neste formato:
{
  "title": "Ideia: Título curto do Amigurumi/Post",
  "description": "Explicação resumida do que é a inspiração e por que faz sucesso (tendência, cores, etc)",
  "suggestion_idea": "Ideia ou descrição detalhada do amigurumi para colar no prompt do gerador de post"
}`;

          const geminiResp = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });

          const geminiData = await geminiResp.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          
          // Extrai todas as URLs de imagens válidas da página (até as primeiras 12)
          const scrapedImages = Array.from(doc.querySelectorAll('img'))
            .map(img => img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '')
            .filter(src => {
              // Limpeza para remover logos de redes sociais, avatares minúsculos ou ícones de tracking
              if (!src || !/^https?:\/\//i.test(src)) return false;
              if (src.includes('avatar') || src.includes('logo') || src.includes('icon') || src.includes('pixel') || src.includes('sprite')) return false;
              // Remove extensões não-imagem comuns ou imagens muito pequenas e base64
              if (src.endsWith('.svg') || src.endsWith('.gif') || src.startsWith('data:')) return false;
              return true;
            })
            // Pega caminhos absolutos corretos
            .map(src => {
              try {
                return new URL(src, source.url).href;
              } catch (_) {
                return src;
              }
            });

          // Remove duplicadas
          let uniqueImages = [...new Set(scrapedImages)].slice(0, 10);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Se o site não retornou imagens (ex: pinterest com login wall), busca imagens no Pexels
            if (uniqueImages.length === 0) {
              const cleanKeyword = parsed.title?.replace(/ideia:|ideias:|amigurumi/gi, '').trim() || 'crochet amigurumi';
              const pexelsFallback = await getPexelsImages(cleanKeyword, 4, 'square');
              if (pexelsFallback && pexelsFallback.length > 0) {
                uniqueImages = pexelsFallback.map(p => p.url);
              }
            }

            await supabase.from('new_amoreja_inspirations').insert({
              title: parsed.title,
              description: parsed.description,
              suggestion_idea: parsed.suggestion_idea,
              source_url: source.url,
              image_url: uniqueImages[0] || null,
              scraped_images: uniqueImages
            });
          }
        } catch (err) {
          console.error(`Erro ao ler fonte ${source.title}:`, err);
        }
      }
      fetchInspirations();
      showToast('Inspirações buscadas com sucesso!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao buscar inspirações', 'error');
    } finally {
      setFetchingInspirations(false);
    }
  };

  const handleClearInspirations = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todas as ideias de inspiração salvas?')) return;
    try {
      const { error } = await supabase.from('new_amoreja_inspirations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      fetchInspirations();
      showToast('Histórico de inspirações limpo com sucesso!');
    } catch (err) {
      showToast('Erro ao limpar inspirações: ' + err.message, 'error');
    }
  };

  const handleDeleteInspiration = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover esta ideia de inspiração?')) return;
    try {
      const { error } = await supabase.from('new_amoreja_inspirations').delete().eq('id', id);
      if (error) throw error;
      fetchInspirations();
      showToast('Ideia de inspiração removida com sucesso!');
    } catch (err) {
      showToast('Erro ao remover inspiração: ' + err.message, 'error');
    }
  };

  const [selectedInspirationImages, setSelectedInspirationImages] = useState({}); // { [inspId]: string[] }

  const handleToggleInspirationImage = (inspId, url) => {
    const active = selectedInspirationImages[inspId] || [];
    const updated = active.includes(url)
      ? active.filter(u => u !== url)
      : [...active, url];
    setSelectedInspirationImages({ ...selectedInspirationImages, [inspId]: updated });
  };

  const handleSaveScrapedToLibrary = async (insp) => {
    const selected = selectedInspirationImages[insp.id] || [];
    if (selected.length === 0) {
      showToast('Selecione pelo menos uma imagem da inspiração para salvar!', 'error');
      return;
    }

    try {
      // Cria a legenda inicial baseada na sugestão de ideia
      const promptText = `Crie uma legenda amigável de Instagram para um post de amigurumi com base na ideia: "${insp.suggestion_idea}". Retorne apenas a legenda fofa com emojis e hashtags no final.`;
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      const data = await response.json();
      const captionText = data.candidates?.[0]?.content?.parts?.[0]?.text || `Novo Amigurumi inspirado em ${insp.title}!`;

      const mediaPayload = selected.map(url => ({ url, thumb: url }));

      // Insere na biblioteca de rascunhos
      const { error } = await supabase.from('new_amoreja_ai_suggestions').insert({
        caption: captionText,
        hashtags: ['#amigurumi', '#croche', '#artesanato', '#amoreja'],
        slides: [insp.title],
        media_type: 'photo',
        media: mediaPayload,
        post_format: 'square',
        status: 'draft',
        reference_post_caption: `Inspirado no link: ${insp.source_url}`
      });

      if (error) throw error;
      
      // Limpa a seleção
      setSelectedInspirationImages({ ...selectedInspirationImages, [insp.id]: [] });
      showToast('Sugestão salva com sucesso na Biblioteca como Rascunho! 💾');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar na biblioteca: ' + err.message, 'error');
    }
  };

  const handleUseInspiration = (idea, images = []) => {
    setPrompt(idea);
    setActiveTab('generator');
    if (images.length > 0) {
      // Converte as URLs das imagens de inspiração para o formato de uploadPreviews
      const previews = images.map(url => ({ url, thumb: url }));
      setUploadPreviews(previews);
      setMediaSource('upload');
    }
  };

  const handleSaveSuggestion = async () => {
    if (!generatedContent) return;
    setSavingId('saving');
    const { error } = await supabase.from('new_amoreja_ai_suggestions').insert({
      caption: generatedContent.caption,
      hashtags: generatedContent.hashtags,
      slides: generatedContent.slides,
      image_keyword: generatedContent.imageKeyword,
      media_type: generatedContent.mediaType,
      media: generatedContent.media, // salva o array de mídias (url + thumb)
      post_format: postFormat,
      status: 'draft',
      reference_post_caption: selectedPost?.caption || null,
      reference_post_url: selectedPost?.post_url || null
    });
    setSavingId(error ? 'error' : 'saved');
    setTimeout(() => setSavingId(null), 2500);
  };

  const handleMarkPosted = async (id, posted) => {
    await supabase.from('new_amoreja_ai_suggestions').update({
      status: posted ? 'posted' : 'draft',
      posted_at: posted ? new Date().toISOString() : null
    }).eq('id', id);
    fetchLibrary();
  };

  const handleSaveNotes = async (id, notes, rating) => {
    await supabase.from('new_amoreja_ai_suggestions').update({ notes, performance_rating: rating }).eq('id', id);
    fetchLibrary();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta sugestão da biblioteca?')) return;
    await supabase.from('new_amoreja_ai_suggestions').delete().eq('id', id);
    fetchLibrary();
  };

  // Função para renderizar o texto sobreposto na imagem de fundo usando Canvas em lote,
  // salvando o resultado final de alta qualidade no Supabase Storage de forma definitiva.
  const renderSlidesToImages = async () => {
    if (!generatedContent || generatedContent.mediaType === 'video') {
      return generatedContent.media;
    }

    setPublishStatus('rendering'); // Atualiza status da publicação
    const renderedMedia = [];

    // Mapeamento de dimensões baseado no formato
    const dimensions = {
      square: [1080, 1080],
      portrait: [1080, 1350]
    };
    const [width, height] = dimensions[postFormat] || [1080, 1080];

    for (let i = 0; i < generatedContent.media.length; i++) {
      const item = generatedContent.media[i];
      const slideText = generatedContent.slides[i] || '';

      // Se o slide não tem texto ou a imagem já é do Supabase, não precisa renderizar de novo
      if (!slideText.trim()) {
        renderedMedia.push(item);
        continue;
      }

      try {
        const imageUrl = item.url;
        
        // Carrega a imagem de fundo
        const img = await new Promise((resolve, reject) => {
          const tempImg = new Image();
          tempImg.crossOrigin = 'anonymous'; // Evita problemas de CORS no Canvas
          tempImg.onload = () => resolve(tempImg);
          tempImg.onerror = (err) => reject(err);
          tempImg.src = imageUrl;
        });

        // Cria o canvas de renderização
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 1. Desenha a imagem de fundo (cobre o canvas mantendo proporção)
        let srcX = 0, srcY = 0;
        let srcW = img.width, srcH = img.height;
        const imgRatio = srcW / srcH;
        const targetRatio = width / height;

        if (imgRatio > targetRatio) {
          srcW = srcH * targetRatio;
          srcX = (img.width - srcW) / 2;
        } else {
          srcH = srcW / targetRatio;
          srcY = (img.height - srcH) / 2;
        }
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, width, height);

        // 2. Configura a fonte e estilos de texto
        const sizeMap = { small: 32, medium: 42, large: 54 };
        const size = sizeMap[textFontSize] || 42;
        ctx.font = `bold ${size}px "Inter", "Outfit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Divide o texto em linhas de no máximo 35 caracteres
        const words = slideText.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > width * 0.82 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        // 3. Desenha a caixa de fundo e o texto
        const lineHeight = size * 1.35;
        const totalTextHeight = lines.length * lineHeight;
        
        // Posição vertical do bloco de texto
        let boxY = height - (totalTextHeight / 2) - 100; // bottom
        if (textPosition === 'top') boxY = (totalTextHeight / 2) + 100;
        else if (textPosition === 'center') boxY = height / 2;

        const boxWidth = width * 0.88;
        const boxHeight = totalTextHeight + 40;
        const boxX = (width - boxWidth) / 2;

        // Desenha o fundo do texto se configurado
        if (textBackground === 'dark') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
          ctx.beginPath();
          ctx.roundRect(boxX, boxY - (boxHeight / 2), boxWidth, boxHeight, 16);
          ctx.fill();
        } else if (textBackground === 'light') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.beginPath();
          ctx.roundRect(boxX, boxY - (boxHeight / 2), boxWidth, boxHeight, 16);
          ctx.fill();
        }

        // Desenha cada linha de texto
        ctx.fillStyle = textColor;
        if (textBackground === 'light' && textColor === '#ffffff') {
          ctx.fillStyle = '#1e293b'; // Fallback de cor para contraste
        }

        lines.forEach((line, index) => {
          const y = boxY - (totalTextHeight / 2) + (index * lineHeight) + (lineHeight / 2);
          ctx.fillText(line, width / 2, y);
        });

        // 4. Converte em Blob
        const blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
        });

        // 5. Upload no Supabase Storage
        const fileName = `rendered_slide_${Date.now()}_${i}.jpg`;
        const { data, error } = await supabase.storage
          .from('instagram_media')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) throw error;

        // Obtém a URL permanente pública
        const { data: { publicUrl } } = supabase.storage
          .from('instagram_media')
          .getPublicUrl(fileName);

        renderedMedia.push({ url: publicUrl, thumb: publicUrl });

      } catch (err) {
        console.warn(`Falha ao renderizar Canvas do slide ${i + 1}, usando imagem pura:`, err);
        renderedMedia.push(item); // Fallback silencioso
      }
    }

    return renderedMedia;
  };

  const handlePublishToInstagram = async () => {
    if (!generatedContent) return;
    setPublishStatus('publishing');

    try {
      let token = activeAccount?.access_token;
      let igUserId = activeAccount?.instagram_user_id;

      if (!token) {
        // Fallback: Busca o token legado nas configurações
        const { data: tokenData } = await supabase
          .from('new_amoreja_settings')
          .select('value')
          .eq('key', 'instagram_access_token')
          .single();
        token = tokenData?.value;
      }

      if (!token) throw new Error('Token do Instagram não configurado ou conta ativa inválida.');

      if (!igUserId) {
        // Busca o ID do usuário IG
        const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`);
        const meData = await meRes.json();
        if (meData.error) throw new Error(`Erro de autenticação: ${meData.error.message}`);
        igUserId = meData.id;
      }

      // 1. Renderiza os textos nos slides do carrossel em imagens JPG definitivas no Canvas
      // e faz o upload automático para o Supabase Storage antes do envio para o Instagram.
      const renderedMedia = await renderSlidesToImages();
      
      // Restaura o status correto após renderizar
      setPublishStatus('publishing');

      const caption = `${generatedContent.caption}\n\n${generatedContent.hashtags.join(' ')}`;
      const media = renderedMedia;
      const isVideo = generatedContent.mediaType === 'video';
      let creationId;

      if (isVideo) {
        // ── VÍDEO / REELS ──
        const videoUrl = media[0]?.url;
        if (!videoUrl) throw new Error('URL do vídeo não encontrada.');
        const containerRes = await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'REELS',
              video_url: videoUrl,
              caption,
              access_token: token
            })
          }
        );
        const container = await containerRes.json();
        if (container.error) throw new Error(container.error.message);
        creationId = container.id;

        // Aguarda o vídeo ser processado (poll até FINISHED)
        setPublishStatus('processing');
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const statusRes = await fetch(
            `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${token}`
          );
          const statusData = await statusRes.json();
          if (statusData.status_code === 'FINISHED') break;
          if (statusData.status_code === 'ERROR') throw new Error('Erro ao processar vídeo no Instagram.');
        }

      } else if (media.length > 1) {
        // ── CARROSSEL (múltiplas fotos) ──
        const childIds = [];
        for (const item of media) {
          const childRes = await fetch(
            `https://graph.facebook.com/v21.0/${igUserId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_url: item.url,
                is_carousel_item: true,
                access_token: token
              })
            }
          );
          const child = await childRes.json();
          if (child.error) throw new Error(child.error.message);
          childIds.push(child.id);
        }
        const carouselRes = await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'CAROUSEL',
              children: childIds, // Enviado como JSON Array de strings, formato oficial da Meta Graph API
              caption,
              access_token: token
            })
          }
        );
        const carousel = await carouselRes.json();
        if (carousel.error) throw new Error(carousel.error.message);
        creationId = carousel.id;

      } else {
        // ── FOTO SIMPLES ──
        const containerRes = await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: media[0]?.url,
              caption,
              access_token: token
            })
          }
        );
        const container = await containerRes.json();
        if (container.error) throw new Error(container.error.message);
        creationId = container.id;
      }

      // 3. Publica o container
      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: creationId, access_token: token })
        }
      );
      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);

      // 4. Salva na biblioteca como 'posted'
      await supabase.from('new_amoreja_ai_suggestions').insert({
        caption: generatedContent.caption,
        hashtags: generatedContent.hashtags,
        slides: generatedContent.slides,
        image_keyword: generatedContent.imageKeyword,
        media_type: generatedContent.mediaType,
        media: generatedContent.media, // salva as mídias associadas
        post_format: postFormat,
        status: 'posted',
        posted_at: new Date().toISOString(),
        reference_post_caption: selectedPost?.caption || null,
        reference_post_url: selectedPost?.post_url || null
      });

      setPublishStatus('success');
      setTimeout(() => setPublishStatus(null), 4000);

    } catch (err) {
      console.error('Erro ao publicar:', err);
      setPublishStatus({ error: err.message });
      setTimeout(() => setPublishStatus(null), 6000);
    }
  };

  const handleTextAgentSend = async () => {
    if (!textAgentInput.trim() || textAgentLoading || !generatedContent) return;

    const userMsg = textAgentInput.trim();
    setTextAgentInput('');
    setTextAgentMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setTextAgentLoading(true);

    try {
      const promptText = `Você é o Max, um especialista em copywriting para Instagram focado no nicho de amigurumi.
O usuário pediu a seguinte alteração: "${userMsg}"

Aqui está o conteúdo atual:
Legenda: ${generatedContent.caption}
Slides: ${JSON.stringify(generatedContent.slides)}

Reescreva o conteúdo aplicando o que o usuário pediu. Mantenha o tom de voz carinhoso, fofo e acolhedor (Amoreja).
Retorne APENAS um JSON válido no formato:
{
  "mensagem_resposta": "Mensagem curta e fofa dizendo o que você fez, ex: 'Prontinho! Deixei a legenda mais curta e adicionei mais corações! 💕'",
  "caption": "A nova legenda completa, com hashtags, espaçamentos, etc",
  "slides": ["Texto slide 1", "Texto slide 2", "Texto slide 3"] (mesma quantidade de slides atual)
}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) throw new Error('Falha na API do Gemini');
      
      const data = await response.json();
      let resultText = data.candidates[0].content.parts[0].text;
      
      // Limpeza caso o Gemini retorne blocos markdown no JSON
      resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const resultObj = JSON.parse(resultText);

      // Atualiza o conteúdo gerado
      setGeneratedContent({
        ...generatedContent,
        caption: resultObj.caption || generatedContent.caption,
        slides: resultObj.slides || generatedContent.slides
      });

      // Adiciona mensagem de sucesso do agente
      setTextAgentMessages(prev => [...prev, { role: 'agent', text: resultObj.mensagem_resposta, updated: true }]);

    } catch (err) {
      console.error('Erro no Max Agent:', err);
      setTextAgentMessages(prev => [...prev, { role: 'agent', text: 'Oops! Tive um probleminha para entender isso agora. Tenta de novo? 🧶' }]);
    } finally {
      setTextAgentLoading(false);
      setTimeout(() => textAgentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handlePixelAgentSend = async () => {
    if (!pixelInput.trim() || pixelLoading || !generatedContent) return;

    const userMsg = pixelInput.trim();
    setPixelInput('');
    setPixelMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setPixelLoading(true);

    try {
      // Verifica se a imagem atual é gerada por IA (data URL) ou URL remota
      const currentMedia = generatedContent.media[carouselIndex];
      const currentImageUrl = currentMedia?.url || '';
      const isAIImage = currentImageUrl.startsWith('data:');

      // Monta o prompt de geração de imagem
      let imagePrompt;
      if (isAIImage) {
        imagePrompt = `${userMsg}. Estilo Amoreja: fundo pastel suave, kawaii/cute, iluminação natural difusa, amigurumi artesanal de crochê, super clean. No text, no words, no letters, no watermark.`;
      } else {
        imagePrompt = `Crie uma imagem para o Instagram de uma loja de amigurumis: ${userMsg}. Estilo Amoreja: fundo pastel suave (rosa bebê, lilás, creme, menta), kawaii/cute, iluminação natural difusa, amigurumi artesanal de crochê, super clean. No text, no words, no letters, no watermark.`;
      }

      setPixelMessages(prev => [...prev, { role: 'agent', text: '⏳ Gerando sua imagem... isso pode levar alguns segundos!', loading: true }]);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Erro ao gerar imagem');
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

      // Remove a mensagem de loading
      setPixelMessages(prev => prev.filter(m => !m.loading));

      if (imagePart?.inlineData) {
        const { mimeType, data: b64 } = imagePart.inlineData;
        const newUrl = `data:${mimeType};base64,${b64}`;

        // Substitui a imagem do slide atual
        const updatedMedia = [...generatedContent.media];
        updatedMedia[carouselIndex] = { url: newUrl, thumb: newUrl, aiGenerated: true };
        setGeneratedContent({ ...generatedContent, media: updatedMedia });

        setPixelMessages(prev => [...prev, { role: 'agent', text: '✅ Prontinho! A imagem do slide foi atualizada! Gostou? Me fale mais se quiser ajustar! 🎨💕', image: newUrl }]);
      } else {
        setPixelMessages(prev => [...prev, { role: 'agent', text: '😅 O Gemini não retornou uma imagem dessa vez. Tente reformular seu pedido, por exemplo: "gere um amigurumi fofo em fundo rosa".' }]);
      }

    } catch (err) {
      console.error('Erro no Pixel Agent:', err);
      setPixelMessages(prev => prev.filter(m => !m.loading));
      setPixelMessages(prev => [...prev, { role: 'agent', text: `Ops! Ocorreu um erro: ${err.message}. Tente novamente! 🧶` }]);
    } finally {
      setPixelLoading(false);
      setTimeout(() => pixelEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleCopyCaption = () => {
    if (!generatedContent) return;
    const fullText = `${generatedContent.caption}\n\n${generatedContent.hashtags.join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const filteredLibrary = library.filter(s => libFilter === 'all' || s.status === libFilter);
  const aspectClass = postFormat === 'portrait' ? 'aspect-portrait' : 'aspect-square';

  return (
    <div className="instagram-ai-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="admin-header">
        <h2><Sparkles className="icon-sparkle" size={28} /> Gerador de Conteúdo AI</h2>
        <p>Crie publicações profissionais para o Instagram com o Google Gemini.</p>
      </div>

      {/* ── Tabs ── */}
      <div className="ai-tabs">
        <button className={`ai-tab ${activeTab === 'generator' ? 'active' : ''}`} onClick={() => setActiveTab('generator')}>
          <Sparkles size={16} /> Gerador
        </button>
        <button className={`ai-tab ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}>
          <BookOpen size={16} /> Biblioteca {library.length > 0 && <span className="tab-badge">{library.length}</span>}
        </button>
        <button className={`ai-tab ${activeTab === 'inspirations' ? 'active' : ''}`} onClick={() => setActiveTab('inspirations')}>
          <Bot size={16} /> Inspirações {inspirationSources.length > 0 && <span className="tab-badge" style={{ background: '#6366f1' }}>{inspirationSources.length}</span>}
        </button>
      </div>

      {/* ── Gerador ── */}
      {activeTab === 'generator' && (
      <div className="ai-content-grid">
        {/* === COLUNA ESQUERDA === */}
        <div className="ai-controls-section">

          <div className="ai-card">
            <div className="card-header">
              <InstagramIcon size={18} className="ig-pink" />
              <h3>Posts do Instagram</h3>
              {allPosts.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#999' }}>
                  {allPosts.length} postagens
                </span>
              )}
            </div>

            {syncing ? (
              <div className="no-post-msg" style={{ color: '#6366f1' }}>
                <RefreshCw size={20} className="spin" />
                <div><strong>Importando...</strong><span>Buscando do Instagram.</span></div>
              </div>
            ) : allPosts.length > 0 ? (
              <div className="ig-posts-grid">
                {allPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`ig-post-thumb ${selectedPost?.id === post.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPost(post)}
                    title={post.caption?.substring(0, 80)}
                  >
                    {post.image_url ? (
                      <img src={post.image_url} alt="post" />
                    ) : (
                      <div className="ig-post-no-img"><ImageIcon size={20} /></div>
                    )}
                    {selectedPost?.id === post.id && (
                      <div className="ig-post-selected-badge"><CheckCircle size={14} /></div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-post-msg">
                <AlertCircle size={20} />
                <div>
                  <strong>Token do Instagram não configurado</strong>
                  <span>Vá em <b>Instagram &gt; Configurações</b> para ativar a importação automática.</span>
                </div>
              </div>
            )}

            {/* Caption do post selecionado */}
            {selectedPost && (
              <div className="selected-post-info">
                <div className="selected-post-header">
                  <CheckCircle size={13} color="#22c55e" />
                  <strong>Post selecionado como referência</strong>
                  {selectedPost.post_url && (
                    <a href={selectedPost.post_url} target="_blank" rel="noreferrer" className="last-post-link" style={{ marginLeft: 'auto' }}>
                      <ExternalLink size={12} /> Ver
                    </a>
                  )}
                </div>
                <p className="selected-post-caption">{selectedPost.caption?.substring(0, 150)}{selectedPost.caption?.length > 150 ? '...' : ''}</p>
              </div>
            )}
          </div>

          {/* Card: Análise */}
          <div className="ai-card">
            <div className="card-header"><Bot size={20} /><h3>Análise de Perfil (Gemini)</h3></div>
            <p className="card-desc">A IA vai usar seu histórico de posts como referência de tom e estilo.</p>

            {!analyzed ? (
              <button className={`btn-analyze ${analyzing ? 'loading' : ''}`} onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <><RefreshCw className="spin" size={18} /> Analisando...</> : <><Bot size={18} /> Iniciar Análise</>}
              </button>
            ) : (
              <div className="analysis-success">
                <CheckCircle size={20} className="text-success" />
                <div>
                  <strong>Perfil Analisado!</strong>
                  <span>Tom: Amigável e fofo · Cores: Tons pastéis e rosa</span>
                </div>
              </div>
            )}
          </div>

          {/* Card: Gerar */}
          <div className={`ai-card ${!analyzed ? 'disabled-card' : ''}`}>
            <div className="card-header"><ImageIcon size={20} /><h3>Gerar Publicação</h3></div>

            {/* Seletor de fonte da mídia */}
            <div className="format-selector" style={{ flexWrap: 'wrap', gap: '6px' }}>
              <span>Fonte:</span>
              <button className={`format-btn ${mediaSource === 'pexels' ? 'active' : ''}`}
                onClick={() => { setMediaSource('pexels'); setUploadedFiles([]); setUploadPreviews([]); }}>
                🔍 Pexels
              </button>
              <button className={`format-btn ${mediaSource === 'upload' ? 'active' : ''}`}
                onClick={() => { setMediaSource('upload'); setUploadedFiles([]); setUploadPreviews([]); }}>
                📤 Minha imagem
              </button>
              <button className={`format-btn ${mediaSource === 'reference' ? 'active' : ''}`}
                onClick={() => { setMediaSource('reference'); setUploadedFiles([]); setUploadPreviews([]); }}
                disabled={!selectedPost}
                title={!selectedPost ? "Selecione um post do Instagram acima primeiro" : ""}
              >
                📸 Do post anterior
              </button>
            </div>

            {/* Zona de upload */}
            {mediaSource === 'upload' && (
              <div
                className={`upload-dropzone ${dragOver ? 'drag-over' : ''} ${uploadPreviews.length > 0 ? 'has-images' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDropZone}
                onClick={() => document.getElementById('ig-upload-input').click()}
              >
                <input
                  id="ig-upload-input"
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => handleImageUpload(e.target.files)}
                />
                {uploadPreviews.length > 0 ? (
                  <div className="upload-preview-grid">
                    {uploadPreviews.map((p, i) => (
                      <div key={i} className="upload-preview-thumb">
                        <img src={p.thumb} alt={`img ${i+1}`} />
                        <button
                          className="upload-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nf = uploadedFiles.filter((_,j) => j !== i);
                            const np = uploadPreviews.filter((_,j) => j !== i);
                            setUploadedFiles(nf); setUploadPreviews(np);
                          }}
                        >✕</button>
                      </div>
                    ))}
                    <div className="upload-add-more">
                      <ImageIcon size={20} />
                      <span>+ Adicionar</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImageIcon size={32} color="#9B51E0" />
                    <p>Arraste suas fotos aqui ou <strong>clique para selecionar</strong></p>
                    <span>Serão recortadas automaticamente para {postFormat === 'portrait' ? '4:5' : postFormat === 'reels' ? '9:16' : '1:1'} (Instagram)</span>
                  </>
                )}
              </div>
            )}
            {/* Seletor de tipo de mídia (apenas para Pexels) */}
            {mediaSource === 'pexels' && (
              <div className="format-selector" style={{ flexWrap: 'wrap', gap: '6px' }}>
                <span>Mídia:</span>
                <button className={`format-btn ${mediaType === 'photo' ? 'active' : ''}`} onClick={() => { setMediaType('photo'); setPostFormat('square'); }}>
                  🖼️ Fotos
                </button>
                <button className={`format-btn ${mediaType === 'video' ? 'active' : ''}`} onClick={() => { setMediaType('video'); setPostFormat('reels'); }}>
                  🎬 Vídeos
                </button>
              </div>
            )}

            {/* Seletor de formato */}
            <div className="format-selector">
              <span>Formato:</span>
              {mediaType === 'photo' ? (
                <>
                  <button className={`format-btn ${postFormat === 'square' ? 'active' : ''}`} onClick={() => setPostFormat('square')}>
                    <Square size={14} /> Quadrado (1:1)
                  </button>
                  <button className={`format-btn ${postFormat === 'portrait' ? 'active' : ''}`} onClick={() => setPostFormat('portrait')}>
                    <Smartphone size={14} /> Retrato (4:5)
                  </button>
                </>
              ) : (
                <>
                  <button className={`format-btn ${postFormat === 'reels' ? 'active' : ''}`} onClick={() => setPostFormat('reels')}>
                    <Smartphone size={14} /> Reels (9:16)
                  </button>
                  <button className={`format-btn ${postFormat === 'square' ? 'active' : ''}`} onClick={() => setPostFormat('square')}>
                    <Square size={14} /> Feed (1:1)
                  </button>
                </>
              )}
            </div>

            <form onSubmit={handleGenerate} className="prompt-form">
              <textarea
                placeholder="Ex: novo amigurumi de ursinho rosa com lacinho, ideal para presente..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!analyzed || generating}
                rows={4}
              />
              <button type="submit" className={`btn-generate ${generating ? 'loading' : ''}`} disabled={!analyzed || generating || !prompt.trim()}>
                {generating ? <><RefreshCw className="spin" size={18} /> Gerando...</> : <><Sparkles size={18} /> Gerar Post com IA</>}
              </button>
            </form>
          </div>
        </div>

        {/* === COLUNA DIREITA: Preview === */}
        <div className="ai-preview-section">
          <div className="ai-card preview-card">
            <div className="card-header">
              <InstagramIcon size={18} className="ig-pink" />
              <h3>Pré-visualização Instagram</h3>
              {generatedContent && (
                <div className="slide-counter">
                  {generatedContent.media.map((_, i) => (
                    <span key={i} className={`slide-dot ${i === carouselIndex ? 'active' : ''}`} onClick={() => setCarouselIndex(i)} />
                  ))}
                </div>
              )}
            </div>

            {!generatedContent && !generating && (
              <div className="empty-preview">
                <InstagramIcon size={48} />
                <p>Seu novo post aparecerá aqui.</p>
                <span>Preencha os campos ao lado e clique em "Gerar Post com IA"</span>
              </div>
            )}

            {generating && (
              <div className="generating-preview-agents" style={{ padding: '30px', background: '#faf9f8', borderRadius: '16px', border: '1.5px dashed #ebd8cf', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="ai-loader" style={{ width: '28px', height: '28px' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: '#9B51E0' }}>Orquestrador Queen de IA</h4>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Coordenando equipes de agentes especialistas (Bees)...</span>
                  </div>
                </div>

                {/* Linha de Progresso Simulada */}
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ 
                    width: `${(activeAgentStep + 1) * 25}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #9B51E0, #e1306c)', 
                    borderRadius: '10px', 
                    transition: 'width 0.8s ease' 
                  }} />
                </div>

                {/* Lista de Logs dos Agentes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: activeAgentStep >= 0 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                    <span style={{ fontSize: '1.1rem' }}>{activeAgentStep > 0 ? '✅' : activeAgentStep === 0 ? '🔍' : '⏳'}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: activeAgentStep === 0 ? '700' : '500', color: activeAgentStep === 0 ? '#334155' : '#64748b' }}>
                      <strong>Luna (Scout)</strong>: Buscando referências e ganchos virais na Web...
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: activeAgentStep >= 1 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                    <span style={{ fontSize: '1.1rem' }}>{activeAgentStep > 1 ? '✅' : activeAgentStep === 1 ? '✍️' : '⏳'}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: activeAgentStep === 1 ? '700' : '500', color: activeAgentStep === 1 ? '#334155' : '#64748b' }}>
                      <strong>Max (Writer)</strong>: Escrevendo a copy e legendas dos slides do carrossel...
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: activeAgentStep >= 2 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                    <span style={{ fontSize: '1.1rem' }}>{activeAgentStep > 2 ? '✅' : activeAgentStep === 2 ? '🎨' : '⏳'}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: activeAgentStep === 2 ? '700' : '500', color: activeAgentStep === 2 ? '#334155' : '#64748b' }}>
                      <strong>Pixel (Designer)</strong>: Localizando mídias e definindo a paleta de cores...
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: activeAgentStep >= 3 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                    <span style={{ fontSize: '1.1rem' }}>{activeAgentStep === 3 ? '🧠' : '⏳'}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: activeAgentStep === 3 ? '700' : '500', color: activeAgentStep === 3 ? '#334155' : '#64748b' }}>
                      <strong>Sage (Critic)</strong>: Auditando contrastes, fontes e pontuação de qualidade...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {generatedContent && !generating && (
              <div className="generated-post-result">
                {/* Frame no formato Instagram */}
                <div className={`ig-image-frame ${postFormat === 'portrait' ? 'aspect-portrait' : postFormat === 'reels' ? 'aspect-reels' : 'aspect-square'}`}>
                  {generatedContent.mediaType === 'video' ? (
                    <video
                      key={generatedContent.media[carouselIndex]?.url}
                      src={generatedContent.media[carouselIndex]?.url}
                      className="ig-image"
                      controls
                      autoPlay
                      muted
                      loop
                      poster={generatedContent.media[carouselIndex]?.thumb}
                    />
                  ) : (
                    <img
                      src={generatedContent.media[carouselIndex]?.url}
                      alt={`Slide ${carouselIndex + 1}`}
                      className="ig-image"
                    />
                  )}
                  {/* Texto sobreposto (apenas em fotos) — Editável com estilo dinâmico! */}
                  {generatedContent.mediaType === 'photo' && (
                    <div 
                      className="slide-text-overlay"
                      style={{
                        position: 'absolute',
                        left: '0',
                        right: '0',
                        display: 'flex',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        zIndex: 10,
                        ...(textPosition === 'top' ? { top: '24px', bottom: 'auto' } : {}),
                        ...(textPosition === 'center' ? { top: '50%', transform: 'translateY(-50%)', bottom: 'auto' } : {}),
                        ...(textPosition === 'bottom' ? { bottom: '24px', top: 'auto' } : {})
                      }}
                    >
                      <textarea
                        className="slide-overlay-input"
                        value={generatedContent.slides[carouselIndex] || ''}
                        rows={3}
                        onChange={(e) => {
                          const updatedSlides = [...generatedContent.slides];
                          updatedSlides[carouselIndex] = e.target.value;
                          setGeneratedContent({ ...generatedContent, slides: updatedSlides });
                        }}
                        onKeyDown={(e) => {
                          // Enter normal insere quebra de linha; Shift+Enter também
                          if (e.key === 'Enter') {
                            e.stopPropagation(); // Impede envio de formulários pai
                          }
                        }}
                        style={{
                          color: textColor,
                          pointerEvents: 'auto',
                          border: 'none',
                          outline: 'none',
                          textAlign: 'center',
                          width: '85%',
                          fontWeight: '800',
                          fontFamily: '"Outfit", "Inter", sans-serif',
                          background: 'none',
                          resize: 'none',
                          overflow: 'hidden',
                          lineHeight: '1.35',
                          textShadow: textBackground === 'none' ? '0 2px 5px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.6)' : 'none',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          ...(textFontSize === 'small' ? { fontSize: '15px' } : {}),
                          ...(textFontSize === 'medium' ? { fontSize: '22px' } : {}),
                          ...(textFontSize === 'large' ? { fontSize: '28px' } : {}),
                          ...(textBackground === 'dark' ? { background: 'rgba(26, 21, 19, 0.76)', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } : {}),
                          ...(textBackground === 'light' ? { background: 'rgba(255, 250, 247, 0.94)', padding: '12px 18px', borderRadius: '14px', color: textColor === '#ffffff' ? '#3d3431' : textColor, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #ebd4a8' } : {})
                        }}
                        placeholder={"Edite o texto deste slide...\n(Enter = quebra de linha)"}
                      />
                    </div>

                  )}
                  <div className="badge-ai" style={{ display: 'none' }}></div>
                  {generatedContent.media.length > 1 && (
                    <>
                      <button className="carousel-nav prev" onClick={() => setCarouselIndex(i => Math.max(0, i - 1))} disabled={carouselIndex === 0}>
                        <ChevronLeft size={20} />
                      </button>
                      <button className="carousel-nav next" onClick={() => setCarouselIndex(i => Math.min(generatedContent.media.length - 1, i + 1))} disabled={carouselIndex === generatedContent.media.length - 1}>
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                  <div className="carousel-indicator">{carouselIndex + 1} / {generatedContent.media.length}</div>
                </div>

                {/* ── Substituição de imagem do slide ── */}
                <div className="replace-slide-controls" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }}>
                  <span>Substituir este slide:</span>
                  <button className="replace-btn" onClick={() => document.getElementById(`replace-file-input-${carouselIndex}`).click()}>
                    💻 Do PC
                  </button>
                  <button className="replace-btn" onClick={() => setShowSlideIgPicker(!showSlideIgPicker)} disabled={allPosts.length === 0}>
                    📸 Do IG anterior
                  </button>
                  <button
                    className="replace-btn"
                    style={{ background: showPixelAgent ? 'linear-gradient(135deg, #9B51E0, #e1306c)' : '', color: showPixelAgent ? 'white' : '', fontWeight: '700' }}
                    onClick={() => setShowPixelAgent(!showPixelAgent)}
                    title="Conversar com o Pixel para gerar/editar a imagem com IA"
                  >
                    🎨 IA Chat
                  </button>
                  <input
                    id={`replace-file-input-${carouselIndex}`}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleReplaceMediaWithFile(carouselIndex, e.target.files[0])}
                  />
                </div>

                {/* ── Agente Pixel — Chat de Imagem ── */}
                {showPixelAgent && (
                  <div className="text-agent-panel" style={{ marginBottom: '16px' }}>
                    <div className="text-agent-header">
                      <span style={{ fontSize: '1rem' }}>🎨</span>
                      <div>
                        <strong>Pixel</strong> — Designer IA de Imagens
                        <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>Slide {carouselIndex + 1} selecionado</div>
                      </div>
                      <button className="text-agent-close" onClick={() => setShowPixelAgent(false)}>✕</button>
                    </div>
                    <div className="text-agent-messages">
                      {pixelMessages.map((msg, i) => (
                        <div key={i} className={`agent-message ${msg.role}`}>
                          {msg.role === 'agent' && <span className="agent-avatar">🎨</span>}
                          <div className="message-bubble">
                            {msg.text.split('\n').map((line, j) => (
                              <span key={j}>{line}<br /></span>
                            ))}
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="Imagem gerada"
                                style={{ marginTop: '8px', width: '100%', borderRadius: '8px', maxHeight: '120px', objectFit: 'cover' }}
                              />
                            )}
                          </div>
                          {msg.role === 'user' && <span className="agent-avatar user-avatar">👤</span>}
                        </div>
                      ))}
                      {pixelLoading && (
                        <div className="agent-message agent">
                          <span className="agent-avatar">🎨</span>
                          <div className="message-bubble loading-bubble">
                            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                          </div>
                        </div>
                      )}
                      <div ref={pixelEndRef} />
                    </div>
                    <div className="text-agent-input-row">
                      <input
                        type="text"
                        className="text-agent-input"
                        placeholder="Ex: muda o fundo para rosa, gere um coelho fofo..."
                        value={pixelInput}
                        onChange={e => setPixelInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePixelAgentSend()}
                        disabled={pixelLoading}
                      />
                      <button
                        className="text-agent-send"
                        onClick={handlePixelAgentSend}
                        disabled={pixelLoading || !pixelInput.trim()}
                      >
                        {pixelLoading ? '⏳' : '🎨'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Estilo do Texto do Slide (Canva Editor Integrado) ── */}
                {generatedContent.mediaType === 'photo' && (
                  <div className="text-overlay-design-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#faf9f8', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ebd8cf', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} color="#e1306c" />
                      <strong style={{ fontSize: '0.82rem', color: '#3d3431', fontWeight: '700' }}>Estilo do Texto do Slide</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {/* Posição */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#9c928e', fontWeight: '600' }}>Alinhamento:</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" className={`replace-btn ${textPosition === 'top' ? 'active-design' : ''}`} style={textPosition === 'top' ? { background: '#9B51E0', color: 'white' } : {}} onClick={() => setTextPosition('top')}>Topo</button>
                          <button type="button" className={`replace-btn ${textPosition === 'center' ? 'active-design' : ''}`} style={textPosition === 'center' ? { background: '#9B51E0', color: 'white' } : {}} onClick={() => setTextPosition('center')}>Centro</button>
                          <button type="button" className={`replace-btn ${textPosition === 'bottom' ? 'active-design' : ''}`} style={textPosition === 'bottom' ? { background: '#9B51E0', color: 'white' } : {}} onClick={() => setTextPosition('bottom')}>Base</button>
                        </div>
                      </div>

                      {/* Fundo de Caixa */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#9c928e', fontWeight: '600' }}>Fundo da Caixa:</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" className={`replace-btn ${textBackground === 'none' ? 'active-design' : ''}`} style={textBackground === 'none' ? { background: '#9B51E0', color: 'white' } : {}} onClick={() => setTextBackground('none')}>Nenhum</button>
                          <button type="button" className={`replace-btn ${textBackground === 'dark' ? 'active-design' : ''}`} style={textBackground === 'dark' ? { background: '#9B51E0', color: 'white' } : {}} onClick={() => setTextBackground('dark')}>Preto</button>
                          <button type="button" className={`replace-btn ${textBackground === 'light' ? 'active-design' : ''}`} style={textBackground === 'light' ? { background: '#9B51E0', color: 'white' } : {}} onClick={() => setTextBackground('light')}>Branco</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                      {/* Tamanho */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#9c928e', fontWeight: '600' }}>Tamanho:</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" className={`replace-btn ${textFontSize === 'small' ? 'active-design' : ''}`} style={textFontSize === 'small' ? { background: '#9B51E0', color: 'white' } : {}} onClick={() => setTextFontSize('small')}>Pq</button>
                          <button type="button" className={`replace-btn ${textFontSize === 'medium' ? 'active-design' : ''}`} style={textFontSize === 'medium' ? { background: '#9B51E0', color: 'white' } : {}} onClick={() => setTextFontSize('medium')}>Md</button>
                          <button type="button" className={`replace-btn ${textFontSize === 'large' ? 'active-design' : ''}`} style={textFontSize === 'large' ? { background: '#9B51E0', color: 'white' } : {}} onClick={() => setTextFontSize('large')}>Gd</button>
                        </div>
                      </div>

                      {/* Cor do Texto */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#9c928e', fontWeight: '600' }}>Cor do Texto:</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '28px' }}>
                          <button type="button" onClick={() => setTextColor('#ffffff')} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', border: textColor === '#ffffff' ? '2.5px solid #9B51E0' : '1px solid #cbd5e1', cursor: 'pointer', outline: 'none' }} title="Branco" />
                          <button type="button" onClick={() => setTextColor('#e1306c')} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e1306c', border: textColor === '#e1306c' ? '2.5px solid #9B51E0' : '1px solid #cbd5e1', cursor: 'pointer', outline: 'none' }} title="Rosa Amoreja" />
                          <button type="button" onClick={() => setTextColor('#9B51E0')} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#9B51E0', border: textColor === '#9B51E0' ? '2.5px solid #ffffff' : '1px solid #cbd5e1', cursor: 'pointer', outline: 'none' }} title="Roxo" />
                          <button type="button" onClick={() => setTextColor('#3d3431')} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#3d3431', border: textColor === '#3d3431' ? '2.5px solid #9B51E0' : '1px solid #cbd5e1', cursor: 'pointer', outline: 'none' }} title="Preto Cacau" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mini grade para escolher imagem do IG anterior */}
                {showSlideIgPicker && allPosts.length > 0 && (
                  <div className="slide-ig-picker-container">
                    <div className="picker-header">
                      <span>Clique na imagem para substituir no slide {carouselIndex + 1}:</span>
                      <button className="close-picker-btn" onClick={() => setShowSlideIgPicker(false)}>✕</button>
                    </div>
                    <div className="picker-grid">
                      {allPosts.map((post) => (
                        post.image_url && (
                          <div
                            key={post.id}
                            className="picker-thumb"
                            onClick={() => handleReplaceMediaWithUrl(carouselIndex, post.image_url)}
                          >
                            <img src={post.image_url} alt="post anterior" />
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Miniaturas */}
                <div className="thumbnails-row">
                  {generatedContent.media.map((item, i) => (
                    <div key={i} className={`thumb ${i === carouselIndex ? 'active' : ''}`} onClick={() => setCarouselIndex(i)}>
                      <img src={item.thumb || item.url} alt={`slide ${i + 1}`} />
                      {generatedContent.mediaType === 'video' && (
                        <span style={{ fontSize: '0.7rem' }}>▶ {item.duration}s</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Legenda */}
                <div className="result-caption">
                  <div className="caption-header">
                    <label>📝 Legenda</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="btn-text-agent-toggle"
                        onClick={() => {
                          setShowTextAgent(v => !v);
                          setTimeout(() => textAgentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }}
                        title="Abrir Agente Max — especialista em copywriting"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          background: showTextAgent ? 'linear-gradient(135deg, #9B51E0, #e1306c)' : 'linear-gradient(135deg, #f3e8ff, #fce4ec)',
                          color: showTextAgent ? '#fff' : '#9B51E0',
                          border: 'none', borderRadius: '20px', padding: '5px 12px',
                          fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Bot size={13} /> {showTextAgent ? 'Fechar Max' : '✨ Max IA'}
                      </button>
                      <button className="btn-copy" onClick={handleCopyCaption}>
                        {copiedCaption ? <><CheckCircle size={14} /> Copiado!</> : <><Copy size={14} /> Copiar tudo</>}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="caption-textarea-edit"
                    value={generatedContent.caption}
                    onChange={(e) => setGeneratedContent({ ...generatedContent, caption: e.target.value })}
                    placeholder="Edite a legenda gerada pela IA aqui..."
                  />
                </div>

                {/* ── Agente Max — Chat de Copywriting ── */}
                {showTextAgent && (
                  <div className="text-agent-panel" style={{
                    background: 'linear-gradient(135deg, #faf7ff 0%, #fff5f8 100%)',
                    border: '1.5px solid #e8d8f5',
                    borderRadius: '16px',
                    padding: '0',
                    overflow: 'hidden',
                    boxShadow: '0 4px 24px rgba(155,81,224,0.10)'
                  }}>
                    {/* Header do agente */}
                    <div style={{
                      background: 'linear-gradient(135deg, #9B51E0, #e1306c)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px'
                      }}>✍️</div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: '800', fontSize: '14px' }}>Max — Agente de Copywriting</div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>Especialista em textos para Instagram • Nicho Amigurumi</div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        {/* Sugestões rápidas */}
                      </div>
                    </div>

                    {/* Sugestões rápidas */}
                    <div style={{ padding: '10px 14px 0', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        '🩷 Mais fofo',
                        '✂️ Mais curto',
                        '📖 Mais detalhado',
                        '💥 Mais impactante',
                        '😄 Mais emojis',
                        '🎯 Tom profissional',
                        '📌 Melhorar CTA',
                        '🔖 Reescrever slides',
                      ].map(sugg => (
                        <button
                          key={sugg}
                          onClick={() => {
                            setTextAgentInput(sugg.replace(/^[^ ]+ /, ''));
                          }}
                          style={{
                            background: '#f3e8ff', color: '#7c3aed', border: '1px solid #e0d0f5',
                            borderRadius: '20px', padding: '3px 10px', fontSize: '11px',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >{sugg}</button>
                      ))}
                    </div>

                    {/* Mensagens */}
                    <div style={{
                      maxHeight: '260px', overflowY: 'auto',
                      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      {textAgentMessages.map((msg, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          gap: '8px', alignItems: 'flex-end'
                        }}>
                          {msg.role === 'agent' && (
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, #9B51E0, #e1306c)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '13px', flexShrink: 0
                            }}>✍️</div>
                          )}
                          <div style={{
                            maxWidth: '80%',
                            background: msg.role === 'user'
                              ? 'linear-gradient(135deg, #9B51E0, #e1306c)'
                              : '#fff',
                            color: msg.role === 'user' ? '#fff' : '#3d3431',
                            border: msg.role === 'agent' ? '1px solid #e8d8f5' : 'none',
                            borderRadius: msg.role === 'user'
                              ? '18px 18px 4px 18px'
                              : '18px 18px 18px 4px',
                            padding: '10px 14px',
                            fontSize: '13px',
                            lineHeight: '1.5',
                            whiteSpace: 'pre-wrap',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                          }}>
                            {msg.text.replace(/\*\*(.*?)\*\*/g, '$1')}
                            {msg.updated && (
                              <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.7, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '4px' }}>
                                ✅ Legenda e slides atualizados!
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {textAgentLoading && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #9B51E0, #e1306c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px'
                          }}>✍️</div>
                          <div style={{
                            background: '#fff', border: '1px solid #e8d8f5',
                            borderRadius: '18px 18px 18px 4px', padding: '10px 16px',
                            display: 'flex', gap: '4px', alignItems: 'center'
                          }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#9B51E0', animation: 'pulse 1s infinite' }} />
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#c061e0', animation: 'pulse 1s infinite 0.2s' }} />
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#e1306c', animation: 'pulse 1s infinite 0.4s' }} />
                          </div>
                        </div>
                      )}
                      <div ref={textAgentEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                      padding: '10px 14px 14px',
                      borderTop: '1px solid #f0e8f8',
                      display: 'flex', gap: '8px'
                    }}>
                      <input
                        type="text"
                        value={textAgentInput}
                        onChange={e => setTextAgentInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && !textAgentLoading) {
                            e.preventDefault();
                            handleTextAgentSend();
                          }
                        }}
                        placeholder="Ex: deixa mais curto, adiciona mais emojis, muda o CTA..."
                        disabled={textAgentLoading}
                        style={{
                          flex: 1, border: '1.5px solid #e0d0f5', borderRadius: '22px',
                          padding: '9px 16px', fontSize: '13px', outline: 'none',
                          background: '#fff', color: '#3d3431',
                          fontFamily: '"Outfit", sans-serif'
                        }}
                      />
                      <button
                        onClick={handleTextAgentSend}
                        disabled={textAgentLoading || !textAgentInput.trim()}
                        style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: textAgentLoading || !textAgentInput.trim()
                            ? '#e0d0f5'
                            : 'linear-gradient(135deg, #9B51E0, #e1306c)',
                          border: 'none', cursor: textAgentLoading ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', flexShrink: 0, transition: 'all 0.2s'
                        }}
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Hashtags (Editáveis) */}
                <div className="result-hashtags-edit">
                  <Hash size={16} />
                  <input
                    type="text"
                    className="hashtags-input-edit"
                    value={generatedContent.hashtags.join(' ')}
                    onChange={(e) => {
                      const tags = e.target.value.split(/\s+/).filter(t => t.startsWith('#') || t.trim() !== '');
                      const formatted = tags.map(t => t.startsWith('#') ? t : `#${t}`);
                      setGeneratedContent({ ...generatedContent, hashtags: formatted });
                    }}
                    placeholder="Adicione suas #hashtags separadas por espaço..."
                  />
                </div>

                {/* Ações */}
                <div className="result-actions">
                  {/* Barra de status de publicação */}
                  {publishStatus === 'success' && (
                    <div className="publish-status success">
                      <CheckCircle size={16} /> Publicado com sucesso no Instagram!
                    </div>
                  )}
                  {publishStatus?.error && (
                    <div className="publish-status error">
                      <AlertCircle size={16} /> {publishStatus.error}
                    </div>
                  )}

                  {/* Botão Publicar */}
                  <button
                    className="btn-publish-ig"
                    onClick={handlePublishToInstagram}
                    disabled={!!publishStatus}
                  >
                    {publishStatus === 'publishing' ? (
                      <><RefreshCw size={16} className="spin" /> Criando container...</>
                    ) : publishStatus === 'processing' ? (
                      <><RefreshCw size={16} className="spin" /> Processando vídeo...</>
                    ) : (
                      <><InstagramIcon size={16} /> Publicar no Instagram</>  
                    )}
                  </button>

                  {/* Botão Salvar na Biblioteca */}
                  <button
                    className="btn-save-lib"
                    onClick={handleSaveSuggestion}
                    disabled={savingId === 'saving'}
                  >
                    {savingId === 'saving' ? (
                      <><RefreshCw size={14} className="spin" /> Salvando...</>
                    ) : savingId === 'saved' ? (
                      <><CheckCircle size={14} /> Salvo na Biblioteca!</>
                    ) : (
                      <><Save size={14} /> Salvar na Biblioteca</>
                    )}
                  </button>

                  <button className="btn btn-outline w-full" onClick={() => { setGeneratedContent(null); setPrompt(''); }}>
                    <RefreshCw size={16} /> Gerar Nova Versão
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Biblioteca ── */}
      {activeTab === 'library' && (
        <div className="library-section">
          <div className="library-filters">
            <button className={`lib-filter-btn ${libFilter === 'all' ? 'active' : ''}`} onClick={() => setLibFilter('all')}>
              Todos ({library.length})
            </button>
            <button className={`lib-filter-btn ${libFilter === 'draft' ? 'active' : ''}`} onClick={() => setLibFilter('draft')}>
              Rascunhos ({library.filter(s => s.status === 'draft').length})
            </button>
            <button className={`lib-filter-btn ${libFilter === 'posted' ? 'active' : ''}`} onClick={() => setLibFilter('posted')}>
              Postados ({library.filter(s => s.status === 'posted').length})
            </button>
          </div>

          {filteredLibrary.length === 0 ? (
            <div className="library-empty">
              <BookOpen size={40} />
              <p>Nenhuma sugestão {libFilter !== 'all' ? `com status "${libFilter}"` : 'salva ainda'}.</p>
              <span>Gere um post e clique em "Salvar na Biblioteca".</span>
            </div>
          ) : (
            <div className="library-grid">
              {filteredLibrary.map(item => (
                <LibraryCard
                  key={item.id}
                  item={item}
                  onMarkPosted={handleMarkPosted}
                  onSaveNotes={handleSaveNotes}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Inspirações ── */}
      {activeTab === 'inspirations' && (
        <div className="inspirations-tab-container">
          <div className="inspirations-sidebar-grid">
            {/* Coluna 1: Cadastro de Fontes */}
            <div className="ai-card">
              <div className="card-header"><ExternalLink size={18} /><h3>Cadastrar Links de Pesquisa</h3></div>
              <p className="card-desc">Adicione links de blogs, Pinterest, ou sites de amigurumi que você acompanha para buscar ideias de posts.</p>
              
              <form onSubmit={handleAddSource} className="prompt-form">
                <input
                  type="text"
                  placeholder="Nome do Site (Ex: Blog Urso de Crochê)"
                  value={newSourceTitle}
                  onChange={e => setNewSourceTitle(e.target.value)}
                  className="inspirations-input"
                  required
                />
                <input
                  type="text"
                  placeholder="Endereço / URL (Ex: croche.com/ideias)"
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  className="inspirations-input"
                  required
                />
                <button type="submit" className="btn-generate">
                  Cadastrar Endereço
                </button>
              </form>

              {/* Lista de links cadastrados */}
              <div className="sources-list">
                <h4>Endereços Cadastrados ({inspirationSources.length})</h4>
                {inspirationSources.length === 0 ? (
                  <p className="no-sources-msg">Nenhum endereço cadastrado ainda.</p>
                ) : (
                  <div className="sources-scroll">
                    {inspirationSources.map(source => (
                      <div key={source.id} className="source-item">
                        <div className="source-info">
                          <strong>{source.title}</strong>
                          <a href={source.url} target="_blank" rel="noreferrer">{source.url.substring(0, 35)}...</a>
                        </div>
                        <button className="lib-delete-btn" onClick={() => handleDeleteSource(source.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Inspirações Encontradas */}
            <div className="ai-card" style={{ flex: 1 }}>
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#9B51E0" />
                  <h3>Ideias Extraídas para Posts</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {inspirations.length > 0 && (
                    <button
                      className="lib-btn lib-btn-draft"
                      style={{ padding: '8px 14px', border: '1px solid #fca5a5', color: '#ef4444', background: '#fef2f2' }}
                      onClick={handleClearInspirations}
                    >
                      <Trash2 size={14} /> Limpar Tudo
                    </button>
                  )}
                  <button
                    className="btn-publish-ig"
                    style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
                    onClick={handleFetchInspirations}
                    disabled={fetchingInspirations}
                  >
                    {fetchingInspirations ? (
                      <><RefreshCw size={14} className="spin" /> Lendo links...</>
                    ) : (
                      <><RefreshCw size={14} /> Buscar Novas Inspirações</>
                    )}
                  </button>
                </div>
              </div>

              {fetchingInspirations && (
                <div className="generating-preview" style={{ minHeight: '160px' }}>
                  <div className="ai-loader" />
                  <p>O Gemini está lendo os sites cadastrados e criando ideias de publicações...</p>
                </div>
              )}

              {!fetchingInspirations && inspirations.length === 0 ? (
                <div className="library-empty">
                  <Bot size={40} />
                  <p>Nenhuma ideia de inspiração extraída ainda.</p>
                  <span>Cadastre os links à esquerda e clique em "Buscar Novas Inspirações".</span>
                </div>
              ) : (
                !fetchingInspirations && (
                  <div className="inspirations-ideas-list">
                    {inspirations.map(insp => (
                      <InspirationCard
                        key={insp.id}
                        insp={insp}
                        selectedImages={selectedInspirationImages[insp.id] || []}
                        onToggleImage={handleToggleInspirationImage}
                        onSaveToLibrary={handleSaveScrapedToLibrary}
                        onUse={handleUseInspiration}
                        onDelete={handleDeleteInspiration}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente de card de Inspiração ──
function InspirationCard({ insp, selectedImages, onToggleImage, onSaveToLibrary, onUse, onDelete }) {
  const [slideIdx, setSlideIdx] = React.useState(0);
  const images = insp.scraped_images || [];
  const activeImage = images[slideIdx] || '';
  const isSelected = activeImage ? selectedImages.includes(activeImage) : false;

  const prevSlide = () => setSlideIdx(i => Math.max(0, i - 1));
  const nextSlide = () => setSlideIdx(i => Math.min(images.length - 1, i + 1));

  return (
    <div className="inspiration-idea-card">
      {/* Lado Esquerdo: Carrossel de Imagem Grande */}
      {images.length > 0 && (
        <div className="idea-card-media-side">
          <div className="inspiration-carousel-frame">
            <img src={activeImage} alt="Inspiration source" />
            
            {/* Overlay de Seleção Checkbox */}
            <div
              className={`carousel-selection-overlay ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleImage(insp.id, activeImage)}
              title={isSelected ? "Desmarcar imagem" : "Marcar para enviar à Biblioteca"}
            >
              <span className="check-indicator">{isSelected ? '✓ Selecionada' : '+ Selecionar'}</span>
            </div>

            {/* Setas de navegação */}
            {images.length > 1 && (
              <>
                <button className="carousel-nav prev" onClick={prevSlide} disabled={slideIdx === 0}>
                  <ChevronLeft size={16} />
                </button>
                <button className="carousel-nav next" onClick={nextSlide} disabled={slideIdx === images.length - 1}>
                  <ChevronRight size={16} />
                </button>
              </>
            )}
            
            <div className="carousel-indicator">{slideIdx + 1} / {images.length}</div>
          </div>

          {/* Mini grade abaixo para referência rápida */}
          <div className="scraped-images-scroll tiny-thumbs">
            {images.map((imgUrl, idx) => (
              <div
                key={idx}
                className={`scraped-image-thumb tiny ${idx === slideIdx ? 'active' : ''} ${selectedImages.includes(imgUrl) ? 'selected' : ''}`}
                onClick={() => setSlideIdx(idx)}
              >
                <img src={imgUrl} alt="scraped thumb" />
                {selectedImages.includes(imgUrl) && <span className="tiny-check">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lado Direito: Conteúdo e Ações */}
      <div className="idea-card-content-side">
        <div className="idea-card-header">
          <h4>{insp.title}</h4>
          <span className="idea-date">{new Date(insp.created_at).toLocaleDateString('pt-BR')}</span>
          <button className="lib-delete-btn" onClick={() => onDelete(insp.id)} title="Remover esta ideia" style={{ marginLeft: '12px' }}>
            <Trash2 size={14} />
          </button>
        </div>
        <p className="idea-desc">{insp.description}</p>
        
        <div className="idea-suggestion-box">
          <strong>💡 Sugestão para o Gerador:</strong>
          <p>{insp.suggestion_idea}</p>
        </div>
        
        <div className="idea-card-actions">
          <button
            className="lib-btn lib-btn-save"
            onClick={() => {
              // Passa a imagem ativa + todas as imagens selecionadas (sem duplicatas)
              const imagesToSend = selectedImages.length > 0
                ? [...new Set([...selectedImages])]
                : activeImage
                  ? [activeImage]
                  : [];
              onUse(insp.suggestion_idea, imagesToSend);
            }}
          >
            <Sparkles size={13} /> Usar no Gerador {selectedImages.length > 0 ? `(${selectedImages.length} imgs)` : activeImage ? '(1 img)' : ''}
          </button>
          
          {selectedImages.length > 0 && (
            <button className="lib-btn lib-btn-post" onClick={() => onSaveToLibrary(insp)}>
              <Save size={13} /> Salvar {selectedImages.length} img na Biblioteca
            </button>
          )}

          {insp.source_url && (
            <a href={insp.source_url} target="_blank" rel="noreferrer" className="last-post-link" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
              <ExternalLink size={12} /> Ver original
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente de card da biblioteca ──
function LibraryCard({ item, onMarkPosted, onSaveNotes, onDelete }) {
  const [notes, setNotes] = React.useState(item.notes || '');
  const [rating, setRating] = React.useState(item.performance_rating || 0);
  const [showNotes, setShowNotes] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSaveNotes(item.id, notes, rating);
    setSaving(false);
  };

  const statusColors = {
    draft: { bg: '#fef9c3', color: '#854d0e', label: 'Rascunho' },
    posted: { bg: '#dcfce7', color: '#166534', label: 'Postado' }
  };
  const st = statusColors[item.status] || statusColors.draft;

  return (
    <div className="library-card">
      <div className="library-card-header">
        <span className="lib-status-badge" style={{ background: st.bg, color: st.color }}>
          {item.status === 'posted' ? <CheckCircle size={12} /> : <Save size={12} />}
          {st.label}
        </span>
        <span className="lib-date">{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
        <button className="lib-delete-btn" onClick={() => onDelete(item.id)} title="Remover">
          <Trash2 size={14} />
        </button>
      </div>

      <p className="lib-caption">{item.caption?.substring(0, 200)}{item.caption?.length > 200 ? '...' : ''}</p>

      {/* Renderização da mídia associada à sugestão */}
      {item.media && item.media.length > 0 && (
        <div className="lib-card-media-preview">
          {item.mediaType === 'video' ? (
            <div className="lib-card-video-wrapper">
              <video src={item.media[0].url} poster={item.media[0].thumb} muted />
              <span className="video-badge-icon">▶</span>
            </div>
          ) : (
            <img src={item.media[0].url || item.media[0].thumb} alt="Preview" />
          )}
          {item.media.length > 1 && (
            <span className="lib-media-count-badge">+{item.media.length - 1} slides</span>
          )}
        </div>
      )}

      {item.hashtags?.length > 0 && (
        <p className="lib-hashtags">{item.hashtags.slice(0, 5).join(' ')}...</p>
      )}

      {item.posted_at && (
        <p className="lib-posted-at">
          <Calendar size={12} /> Postado em {new Date(item.posted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      )}

      <div className="lib-actions">
        {item.status !== 'posted' ? (
          <button className="lib-btn lib-btn-post" onClick={() => onMarkPosted(item.id, true)}>
            <CheckCircle size={14} /> Marcar como Postado
          </button>
        ) : (
          <button className="lib-btn lib-btn-draft" onClick={() => onMarkPosted(item.id, false)}>
            <RefreshCw size={14} /> Mover para Rascunho
          </button>
        )}
        <button className="lib-btn lib-btn-notes" onClick={() => setShowNotes(!showNotes)}>
          <StickyNote size={14} /> {showNotes ? 'Fechar' : 'Anotações'}
        </button>
      </div>

      {showNotes && (
        <div className="lib-notes-panel">
          <div className="lib-rating">
            <span>Performance:</span>
            {[1,2,3,4,5].map(n => (
              <button key={n} className={`star-btn ${rating >= n ? 'active' : ''}`} onClick={() => setRating(n)}>
                <Star size={16} fill={rating >= n ? '#f59e0b' : 'none'} color={rating >= n ? '#f59e0b' : '#d1d5db'} />
              </button>
            ))}
          </div>
          <textarea
            className="lib-notes-input"
            placeholder="Anotações sobre este post: o que funcionou, engajamento, aprendizados..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
          <button className="lib-btn lib-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? <><RefreshCw size={13} className="spin" /> Salvando...</> : <><Save size={13} /> Salvar anotações</>}
          </button>
        </div>
      )}
    </div>
  );
}
