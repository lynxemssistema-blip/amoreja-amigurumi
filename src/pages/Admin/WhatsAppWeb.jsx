import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  Search, 
  MoreVertical, 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  RefreshCw, 
  Mic, 
  Image as ImageIcon, 
  X as XIcon, 
  QrCode, 
  Smartphone, 
  Wifi, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import WhatsAppConnectionModal from '../../components/WhatsAppConnectionModal';
import WhatsAppCampaignStudio from '../../components/WhatsAppCampaignStudio';
import './WhatsAppWeb.css';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
// Safe json helper
const safeJson = async (res, fallback = null) => {
  try {
    if (!res || !res.ok) return fallback;
    const txt = await res.text();
    return txt ? JSON.parse(txt) : fallback;
  } catch {
    return fallback;
  }
};

const EVO_API_KEY = import.meta.env.VITE_EVO_API_KEY;
const EVO_INSTANCE = import.meta.env.VITE_EVO_INSTANCE;
const EVO_URL = import.meta.env.VITE_EVO_URL;

// ─── Modelos com fallback automático (melhores e mais econômicos) ────────────
const AI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
const TRANSCRIPTION_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

// ─── Cores para avatares ─────────────────────────────────────────────────────
const AVATAR_COLORS = ['#d32f2f','#c2185b','#7b1fa2','#512da8','#1976d2','#0288d1','#0097a7','#00796b','#388e3c','#f57c00','#5d4037','#546e7a'];
const getColor = (key = '') => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = key.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const formatJid = (jid = '') => {
  const n = jid.split('@')[0].split(':')[0];
  return n.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3') || n;
};

// ─── MediaBubble ─────────────────────────────────────────────────────────────
const MediaBubble = ({ msgRaw, messageId }) => {
  const [mediaData, setMediaData] = useState(null);
  const [rawBase64, setRawBase64] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcription, setTranscription] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [usedModel, setUsedModel] = useState(null);

  // Carregar mídia + verificar se já tem transcrição salva
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1. Carregar mídia
        const res = await fetch(`${EVO_URL}/chat/getBase64FromMediaMessage/${EVO_INSTANCE}`, {
          method: 'POST',
          headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msgRaw })
        });
        if (res.ok) {
          const d = await res.json();
          if (alive && d.base64) {
            setMediaData(`data:${d.mimetype};base64,${d.base64}`);
            setRawBase64(d.base64);
            setMimeType(d.mimetype);
          }
        }

        // 2. Verificar transcrição salva no Supabase
        if (messageId && isSupabaseConfigured()) {
          const { data } = await supabase
            .from('new_amoreja_wa_transcriptions')
            .select('transcription, model_used')
            .eq('message_id', messageId)
            .maybeSingle();
          if (alive && data?.transcription) {
            setTranscription(data.transcription);
            setUsedModel(data.model_used || 'salvo');
          }
        }
      } catch (e) { console.error('Erro mídia:', e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [msgRaw, messageId]);

  const handleTranscribe = async () => {
    if (!rawBase64 || !mimeType) return;
    setTranscribing(true);
    try {
      const mime = mimeType.split(';')[0];
      const bin = atob(rawBase64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });

      const key = import.meta.env.VITE_GEMINI_API_KEY;
      const upRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Command': 'start, upload, finalize',
          'X-Goog-Upload-Header-Content-Length': blob.size,
          'X-Goog-Upload-Header-Content-Type': mime,
          'Content-Type': 'application/json'
        },
        body: blob
      });
      if (!upRes.ok) throw new Error(`Upload falhou (${upRes.status})`);
      const fileUri = (await upRes.json()).file?.uri;
      if (!fileUri) throw new Error('URI não retornado.');

      let text = null;
      let modelUsed = null;
      for (const m of TRANSCRIPTION_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const r = await model.generateContent([
            'Transcreva exatamente o que é falado neste áudio em português.',
            { fileData: { mimeType: mime, fileUri } }
          ]);
          text = r.response.text();
          modelUsed = m;
          break;
        } catch (e) {
          if (e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED')) continue;
          throw e;
        }
      }
      if (!text) throw new Error('Todos os modelos em limite.');

      setTranscription(text);
      setUsedModel(modelUsed);

      // Salvar no Supabase para não precisar transcrever de novo
      if (messageId && isSupabaseConfigured()) {
        supabase.from('new_amoreja_wa_transcriptions').upsert({
          message_id: messageId,
          transcription: text,
          model_used: modelUsed,
          created_at: new Date().toISOString()
        }, { onConflict: 'message_id' }).then();
      }
    } catch (e) {
      setTranscription(`❌ ${e.message || 'Erro ao transcrever'}`);
    } finally {
      setTranscribing(false);
    }
  };

  if (loading) return <div className="wa-media-loading"><RefreshCw size={14} className="fa-spin" /> Carregando...</div>;
  if (!mediaData) return <div className="wa-media-error">Erro ao carregar mídia</div>;

  if (msgRaw.message?.audioMessage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <audio controls src={mediaData} style={{ width: '240px', height: '36px' }} />
        {!transcription ? (
          <button onClick={handleTranscribe} disabled={transcribing}
            style={{ fontSize: '0.78rem', padding: '3px 8px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid #10a37f', color: '#10a37f', borderRadius: '4px', cursor: 'pointer' }}>
            {transcribing ? <RefreshCw size={11} className="fa-spin" /> : <Bot size={11} />}
            {transcribing ? 'Transcrevendo...' : 'Transcrever (IA)'}
          </button>
        ) : (
          <div style={{ background: '#f0f2f5', padding: '7px', borderRadius: '4px', fontSize: '0.83rem', borderLeft: '3px solid #10a37f' }}>
            <span style={{ fontWeight: 600, color: '#10a37f', display: 'block', marginBottom: '3px' }}>
              ✨ Transcrição{usedModel ? ` (${usedModel})` : ''}:
            </span>
            {transcription}
          </div>
        )}
      </div>
    );
  }

  return <img src={mediaData} alt="Mídia" style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '7px', display: 'block' }} />;
};

const failedAvatars = new Set();

const isExpiredWhatsAppUrl = (url) => {
  if (!url || typeof url !== 'string') return true;
  try {
    const parsed = new URL(url);
    const oe = parsed.searchParams.get('oe');
    if (oe && /^[0-9a-fA-F]+$/.test(oe)) {
      if (parseInt(oe, 16) * 1000 < Date.now()) return true;
    }
  } catch {
    return false;
  }
  return false;
};

// ─── Avatar ──────────────────────────────────────────────────────────────────
const Avatar = ({ name, picUrl, jidKey, size = 32 }) => {
  const [imgFailed, setImgFailed] = useState(() =>
    picUrl ? (failedAvatars.has(picUrl) || isExpiredWhatsAppUrl(picUrl)) : false
  );

  useEffect(() => {
    setImgFailed(picUrl ? (failedAvatars.has(picUrl) || isExpiredWhatsAppUrl(picUrl)) : false);
  }, [picUrl]);

  const initial = (name || '?').charAt(0).toUpperCase();
  const bg = getColor(jidKey || name || '');
  const canShowImg = Boolean(picUrl) && !imgFailed && !failedAvatars.has(picUrl) && !isExpiredWhatsAppUrl(picUrl);

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: canShowImg ? 'transparent' : bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
      fontSize: size * 0.42, color: '#fff', fontWeight: 600
    }}>
      {canShowImg
        ? <img
            src={picUrl}
            alt={name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => {
              failedAvatars.add(picUrl);
              setImgFailed(true);
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        : initial}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function WhatsAppWeb() {
  const [contacts, setContacts] = useState([]);
  const [chatsData, setChatsData] = useState({}); // jid → { pushName, profilePicUrl, lastMessage, timestamp }
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'studio'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [waMessages, setWaMessages] = useState([]);
  const [aiMessages, setAiMessages] = useState([]);
  const [isAiMode, setIsAiMode] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [attachFile, setAttachFile] = useState(null);
  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const [connInfo, setConnInfo] = useState({ state: 'connecting', number: '31999522412', profileName: null });

  const messagesEndRef = useRef(null);
  const selectedItemRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const checkConnectionStatus = async () => {
    try {
      const res = await fetch(`${EVO_URL}/instance/connectionState/${EVO_INSTANCE}`, {
        headers: { 'apikey': EVO_API_KEY }
      });
      const data = await safeJson(res, {});
      const state = data?.instance?.state || 'close';

      const fetchRes = await fetch(`${EVO_URL}/instance/fetchInstances`, {
        headers: { 'apikey': EVO_API_KEY }
      });
      const instances = await safeJson(fetchRes, []);
      const inst = Array.isArray(instances) ? instances.find(i => i.name === EVO_INSTANCE) : null;

      setConnInfo({
        state,
        number: inst?.number || '31999522412',
        profileName: inst?.profileName || null
      });
    } catch (e) {
      console.warn('Erro ao consultar status da instância WhatsApp:', e.message);
    }
  };

  useEffect(() => {
    loadContactsAndChats();
    checkConnectionStatus();
  }, []);

  useEffect(() => {
    if (selectedContactId) {
      loadHistory(selectedContactId);
      setIsAiMode(false);
      setInputMessage('');
      setAttachFile(null);
      setTimeout(() => selectedItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [selectedContactId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [waMessages, aiMessages, loading]);

  // ── Carregar contatos e chats ──────────────────────────────────────────────
  const loadContactsAndChats = async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      // findChats retorna: pushName, profilePicUrl, lastMessage, updatedAt
      const res = await fetch(`${EVO_URL}/chat/findChats/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const evoChats = {};
      if (res.ok) {
        const raw = await safeJson(res, []);
        const list = Array.isArray(raw) ? raw : (raw?.records || []);
        list.forEach(chat => {
          const lm = chat.lastMessage?.message;
          evoChats[chat.remoteJid] = {
            pushName: chat.pushName || null,
            profilePicUrl: chat.profilePicUrl || null,
            lastMessage: lm?.conversation || lm?.extendedTextMessage?.text
              || (lm?.imageMessage ? '📷 Imagem' : lm?.audioMessage ? '🎵 Áudio' : lm?.videoMessage ? '🎥 Vídeo' : 'Mensagem'),
            timestamp: chat.updatedAt
          };
        });
        setChatsData(evoChats);
      }

      const { data, error } = await supabase.from('new_amoreja_wa_contacts').select('*');
      if (error) throw error;
      const sorted = (data || []).sort((a, b) => {
        const ta = evoChats[a.jid]?.timestamp, tb = evoChats[b.jid]?.timestamp;
        if (ta && tb) return new Date(tb) - new Date(ta);
        if (ta) return -1; if (tb) return 1;
        return a.name.localeCompare(b.name);
      });
      setContacts(sorted);
    } catch (e) {
      console.error('Erro ao carregar contatos:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Carregar histórico ─────────────────────────────────────────────────────
  const loadHistory = async (contactId) => {
    setLoading(true);
    setWaMessages([]);
    setAiMessages([]);
    try {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;

      const res = await fetch(`${EVO_URL}/chat/findMessages/${EVO_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: { key: { remoteJid: contact.jid } }, limit: 100 })
      });

      if (res.ok) {
        const raw = await safeJson(res, []);
        const msgs = Array.isArray(raw) ? raw : (raw?.messages?.records || raw?.records || []);
        const formatted = [];
        for (const m of msgs) {
          const ts = m.messageTimestamp?.low || m.messageTimestamp;
          if (!ts) continue;
          const txt = m.message?.conversation || m.message?.extendedTextMessage?.text;
          const hasMedia = m.message?.imageMessage || m.message?.audioMessage || m.message?.videoMessage;
          if (!txt && !hasMedia) continue;
          formatted.push({
            id: m.key.id,
            content: txt || '',
            from_me: m.key.fromMe,
            sender_name: m.pushName || null,
            sender_jid: m.key.participant || m.key.remoteJid,
            sender_jid_alt: m.key.participantAlt || null,
            created_at: new Date(ts * 1000).toISOString(),
            raw_message: hasMedia ? m : null,
            message_type: m.message?.imageMessage ? 'image' : m.message?.audioMessage ? 'audio' : 'text'
          });
        }
        setWaMessages(formatted);
      }

      if (isSupabaseConfigured()) {
        const { data: aiData } = await supabase
          .from('new_amoreja_wa_agent_chats')
          .select('*')
          .contains('context_data', { contact_id: contactId })
          .order('created_at', { ascending: true });
        setAiMessages((aiData || []).map(m => ({ message: m.message, sender: m.sender, id: m.id })));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Envio WhatsApp ─────────────────────────────────────────────────────────
  const handleSendWa = async (text, contact) => {
    const media = attachFile;
    setAttachFile(null);
    setWaMessages(prev => [...prev, {
      id: Date.now().toString(),
      content: text || '',
      preview_url: media?.type === 'image' ? media.previewUrl : null,
      from_me: true,
      message_type: media ? media.type : 'text',
      created_at: new Date().toISOString(),
      sender_name: 'Você'
    }]);
    setLoading(true);
    try {
      const number = contact.jid;
      if (media) {
        const endpoint = media.type === 'audio'
          ? `${EVO_URL}/message/sendWhatsAppAudio/${EVO_INSTANCE}`
          : `${EVO_URL}/message/sendMedia/${EVO_INSTANCE}`;
        const body = media.type === 'audio'
          ? { number, audio: media.base64, encoding: true }
          : { number, mediatype: 'image', media: media.base64, caption: text || '' };
        const r = await fetch(endpoint, { method: 'POST', headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } else {
        const r = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, { method: 'POST', headers: { 'apikey': EVO_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ number, text }) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      }
    } catch (e) {
      alert('Erro ao enviar: ' + e.message);
    } finally { setLoading(false); }
  };

  // ── Envio IA (fallback automático de modelo) ───────────────────────────────
  const handleSendAi = async (userMessage, contact) => {
    if (!contact) return;

    // Adicionar mensagem do usuário na UI
    const userMsgId = Date.now().toString();
    setAiMessages(prev => [...prev, { message: userMessage, sender: 'admin', id: userMsgId }]);
    setLoading(true);

    // Salvar no Supabase (fire-and-forget)
    try {
      if (isSupabaseConfigured()) {
        await supabase.from('new_amoreja_wa_agent_chats').insert([{
          message: userMessage, sender: 'admin', context_data: { contact_id: contact.id }
        }]);
      }
    } catch (e) { console.warn('Erro ao salvar msg admin:', e); }

    try {
      // Montar contexto das mensagens WA
      const ctx = waMessages.slice(-50).map(m =>
        `[${new Date(m.created_at).toLocaleString()}] ${m.sender_name || (m.from_me ? 'Você' : contact.name)}: ${m.content || m.message_type}`
      ).join('\n');

      if (!ctx.trim()) {
        setAiMessages(prev => [...prev, { message: '⚠️ Sem mensagens para analisar. Carregue uma conversa primeiro.', sender: 'ai', id: 'err_' + Date.now() }]);
        setLoading(false);
        return;
      }

      const sys = `Você é o Agente IA da Amoreja. Responda perguntas do Admin sobre a conversa com "${contact.name}":\n---\n${ctx}\n---`;

      // Filtrar histórico: remover mensagens de sistema, erros e mensagens vazias
      const history = aiMessages
        .filter(m => {
          if (!m.message || !m.message.trim()) return false;
          if (m.id?.startsWith('_sys_')) return false;
          if (m.id === 'err' || m.id?.startsWith('err_')) return false;
          if (m.message.startsWith('❌') || m.message.startsWith('⚠️') || m.message.startsWith('⏳') || m.message.startsWith('🤖')) return false;
          if (m.id === userMsgId) return false; // não incluir a mensagem que acabamos de adicionar
          return true;
        })
        .map(m => ({ role: m.sender === 'admin' ? 'user' : 'model', parts: [{ text: m.message }] }));

      // Garantir que o histórico tem pares válidos (user/model alternados)
      // Se o último item é 'user', remover (porque vamos enviar uma nova mensagem)
      while (history.length > 0 && history[history.length - 1].role === 'user') {
        history.pop();
      }

      const isRateLimit = (msg) => {
        if (!msg) return false;
        const lower = msg.toLowerCase();
        return lower.includes('429') || lower.includes('503') || lower.includes('resource_exhausted')
          || lower.includes('quota') || lower.includes('rate limit') || lower.includes('too many');
      };

      let success = false;
      for (const modelName of AI_MODELS) {
        try {
          console.log(`[IA] Tentando ${modelName}...`);
          setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
            { message: `🤖 Usando ${modelName}...`, sender: 'ai', id: '_sys_info' }]);

          const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: sys });
          const chat = model.startChat({ history });
          const result = await chat.sendMessage(userMessage);
          const reply = result.response.text();

          console.log(`[IA] ${modelName} respondeu com ${reply.length} chars`);
          setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
            { message: reply, sender: 'ai', id: (Date.now() + 1).toString() }]);

          // Salvar resposta
          try {
            if (isSupabaseConfigured()) {
              await supabase.from('new_amoreja_wa_agent_chats').insert([{
                message: reply, sender: 'ai', context_data: { contact_id: contact.id }
              }]);
            }
          } catch (e) { console.warn('Erro ao salvar resposta IA:', e); }

          success = true;
          break;
        } catch (err) {
          console.warn(`[IA] ${modelName} falhou:`, err.message?.substring(0, 200));
          if (isRateLimit(err.message)) {
            setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
              { message: `⏳ ${modelName} em limite. Tentando próximo...`, sender: 'ai', id: '_sys_retry' }]);
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          // Erro não é rate limit - mostra e para
          setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
            { message: `❌ ${modelName}: ${err.message?.split('\n')[0] || 'Erro desconhecido'}`, sender: 'ai', id: 'err_' + Date.now() }]);
          setLoading(false);
          return;
        }
      }

      if (!success) {
        setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
          { message: '⚠️ Todos os modelos em limite. Aguarde ~30s e tente novamente.', sender: 'ai', id: 'err_' + Date.now() }]);
      }
    } catch (err) {
      console.error('[IA] Erro inesperado:', err);
      setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
        { message: `❌ Erro inesperado: ${err.message?.split('\n')[0] || String(err)}`, sender: 'ai', id: 'err_' + Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fileToBase64 = file => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleAttachFile = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAttachFile({ type, base64, mimeType: file.type, previewUrl: URL.createObjectURL(file), name: file.name });
    e.target.value = '';
  };

  const handleSubmit = e => {
    e.preventDefault();
    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return;
    if (isAiMode) {
      if (!inputMessage.trim()) return;
      const msg = inputMessage.trim(); setInputMessage('');
      handleSendAi(msg, contact);
    } else {
      if (!inputMessage.trim() && !attachFile) return;
      const msg = inputMessage.trim(); setInputMessage('');
      handleSendWa(msg, contact);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.jid.includes(searchQuery)
  );
  const activeContact = contacts.find(c => c.id === selectedContactId);
  const activeChatMeta = activeContact ? chatsData[activeContact.jid] : null;

  // ═════════════════════════════════════════════════════════════════════════
  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="wa-app-outer-shell">
      {/* ── BARRA SUPERIOR UNIFICADA ── */}
      <header className="wa-unified-topbar">
        <div className="wa-topbar-brand">
          <span className="wa-brand-emoji">💬</span>
          <div className="wa-brand-text">
            <strong>WhatsApp Amoreja</strong>
            <small>Atendimento & Marketing</small>
          </div>
        </div>

        {/* Abas Principais em Destaque */}
        <div className="wa-topbar-nav">
          <button 
            type="button" 
            className={`wa-nav-tab ${activeView === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveView('chat')}
          >
            <MessageSquare size={16} />
            <span>1. Conversas ao Vivo</span>
          </button>
          <button 
            type="button" 
            className={`wa-nav-tab studio-tab ${activeView === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveView('studio')}
          >
            <Sparkles size={16} color="#db2777" />
            <span>2. Estúdio de Convites & IA</span>
            <span className="wa-tab-pill">Novo</span>
          </button>
          <Link 
            to="/admin/whatsapp-marcia" 
            className="wa-nav-tab" 
            style={{ color: '#059669', background: '#ecfdf5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Ir para o WhatsApp da Márcia (63k conversas)"
          >
            <Smartphone size={15} color="#059669" />
            <span>WhatsApp Márcia</span>
          </Link>
        </div>

        {/* Status de Conexão WhatsApp */}
        <div 
          className="wa-topbar-status" 
          onClick={() => setIsConnModalOpen(true)}
          title="Clique para gerenciar conexão ou ler QR Code"
        >
          <span className={`wa-status-dot ${connInfo.state === 'open' ? 'online' : 'offline'}`} />
          <div className="wa-status-info">
            <span className="wa-status-label">{connInfo.state === 'open' ? 'WhatsApp Online' : 'Desconectado'}</span>
            <span className="wa-status-phone">
              {connInfo.number ? `+55 (${connInfo.number.slice(0,2)}) ${connInfo.number.slice(2,7)}-${connInfo.number.slice(7)}` : 'Desconectado'}
            </span>
          </div>
          <button type="button" className="wa-status-btn">
            <QrCode size={13} />
            <span>{connInfo.state === 'open' ? 'Aparelho' : 'QR Code'}</span>
          </button>
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main className="wa-main-stage">
        {activeView === 'studio' ? (
          <div className="wa-studio-container">
            <WhatsAppCampaignStudio 
              onBackToChat={() => setActiveView('chat')}
              initialContacts={contacts}
            />
          </div>
        ) : (
          <div className={`wa-web-layout ${selectedContactId ? 'chat-open-on-mobile' : 'list-open-on-mobile'}`}>
            {/* ── SIDEBAR ── */}
            <div className="wa-sidebar">
              <div className="wa-sidebar-header">
                <div className="wa-avatar" style={{ background: '#e0e0e0', color: '#555' }}><User size={20} /></div>
                <div className="wa-header-actions">
                  <button onClick={async () => { setSyncing(true); await loadContactsAndChats(); checkConnectionStatus(); setSyncing(false); }}
                    className="wa-icon-btn" title="Atualizar conversas" disabled={syncing}>
                    <RefreshCw size={19} color="#54656f" className={syncing ? 'fa-spin' : ''} />
                  </button>
                  <button onClick={() => setIsConnModalOpen(true)} className="wa-icon-btn" title="Conexão WhatsApp / QR Code">
                    <QrCode size={19} color={connInfo.state === 'open' ? '#10b981' : '#ea7458'} />
                  </button>
                  <MoreVertical size={19} color="#54656f" />
                </div>
              </div>

              <div className="wa-search-bar">
                <div className="wa-search-input-wrapper">
                  <Search size={15} color="#54656f" />
                  <input type="text" placeholder="Pesquisar contatos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>

        <div className="wa-contact-list">
          {loading && contacts.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>Carregando WhatsApp...</div>
          ) : (
            filteredContacts.map(c => {
              const meta = chatsData[c.jid];
              const pic = meta?.profilePicUrl;
              return (
                <div key={c.id}
                  ref={selectedContactId === c.id ? selectedItemRef : null}
                  className={`wa-contact-item ${selectedContactId === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedContactId(c.id)}>
                  <Avatar name={c.name} picUrl={pic} jidKey={c.jid} size={48} />
                  <div className="wa-contact-info">
                    <div className="wa-contact-name-row">
                      <span className="wa-contact-name">{c.name}</span>
                      {meta?.timestamp && (
                        <span style={{ fontSize: '0.73rem', color: '#667781', flexShrink: 0 }}>
                          {new Date(meta.timestamp).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <span className="wa-contact-lastmsg">{meta?.lastMessage || (c.type === 'group' ? 'Grupo' : 'Contato')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAIN CHAT ── */}
      <div className="wa-main">
        {selectedContactId && activeContact ? (
          <>
            {/* Header */}
            <div className="wa-chat-header">
              <button 
                type="button" 
                className="wa-mobile-back-btn" 
                onClick={() => setSelectedContactId(null)}
                title="Voltar para lista de conversas"
                aria-label="Voltar para lista de conversas"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar name={activeContact.name} picUrl={activeChatMeta?.profilePicUrl} jidKey={activeContact.jid} size={40} />
              <div className="wa-chat-header-info">
                <span className="wa-chat-header-name">{activeContact.name}</span>
                <span className="wa-chat-header-status">
                  {isAiMode ? '✨ Modo IA — pergunte sobre esta conversa' : (activeContact.type === 'group' ? 'Grupo' : 'Contato')}
                </span>
              </div>
              <div className="wa-header-actions">
                <button className={`wa-icon-btn ${isAiMode ? 'ai-active' : ''}`} onClick={() => setIsAiMode(!isAiMode)} title="Analisar com IA">
                  <Bot size={20} color={isAiMode ? '#10a37f' : '#54656f'} />
                </button>
                <Search size={20} color="#54656f" />
                <MoreVertical size={20} color="#54656f" />
              </div>
            </div>

            {/* Messages */}
            <div className={`wa-chat-body ${isAiMode ? 'ai-bg' : ''}`}>
              <div className="wa-chat-background" />

              {isAiMode ? (
                aiMessages.length === 0 ? (
                  <div className="ai-empty-state">
                    <Bot size={48} color="#10a37f" />
                    <h3>Agente IA Pronto</h3>
                    <p>Posso resumir a conversa de {activeContact.name} ou responder perguntas.</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleSendAi('Faça um resumo das conversas de hoje.', activeContact)}
                        style={{ borderColor: '#10a37f', color: '#10a37f', border: '1px solid', padding: '6px 12px', borderRadius: '6px', background: 'none', cursor: 'pointer' }}>
                        Resumo de Hoje
                      </button>
                      <button onClick={() => handleSendAi('Faça um resumo das conversas desta semana.', activeContact)}
                        style={{ borderColor: '#10a37f', color: '#10a37f', border: '1px solid', padding: '6px 12px', borderRadius: '6px', background: 'none', cursor: 'pointer' }}>
                        Resumo da Semana
                      </button>
                    </div>
                  </div>
                ) : (
                  aiMessages.map((msg, idx) => (
                    <div key={`ai_${idx}`} className={`wa-bubble-row ${msg.sender === 'admin' ? 'wa-out' : 'wa-in ai-bubble-in'}`}>
                      <div className="wa-bubble">
                        <div className="wa-bubble-text">{msg.message}</div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                waMessages.map((msg, idx) => {
                  const isGroup = activeContact.type === 'group';

                  // Nome: pushName da mensagem > pushName do chat > nome do contato > número
                  const senderKey = msg.sender_jid_alt || msg.sender_jid || '';
                  const senderChatMeta = chatsData[senderKey] || chatsData[senderKey.replace('@lid', '@s.whatsapp.net')];
                  const displayName = msg.sender_name
                    || senderChatMeta?.pushName
                    || (!isGroup ? activeContact.name : null)
                    || (senderKey ? formatJid(senderKey) : 'Contato');

                  // Foto: do chat do remetente > do chat ativo (se direto)
                  const displayPic = senderChatMeta?.profilePicUrl
                    || (!isGroup ? activeChatMeta?.profilePicUrl : null)
                    || null;

                  const nameColor = getColor(senderKey || displayName);

                  return (
                    <div key={`msg_${idx}`} className={`wa-bubble-row ${msg.from_me ? 'wa-out' : 'wa-in'}`}>
                      {!msg.from_me && (
                        <div style={{ alignSelf: 'flex-end', marginRight: '6px', marginBottom: '4px' }}>
                          <Avatar name={displayName} picUrl={displayPic} jidKey={senderKey} size={30} />
                        </div>
                      )}
                      <div className="wa-bubble">
                        {!msg.from_me && isGroup && (
                          <div className="wa-bubble-sender" style={{ color: nameColor }}>{displayName}</div>
                        )}
                        <div className="wa-bubble-text">
                          {msg.raw_message ? (
                            <MediaBubble msgRaw={msg.raw_message} messageId={msg.id} />
                          ) : msg.preview_url ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <img src={msg.preview_url} alt="Imagem" style={{ maxWidth: '280px', maxHeight: '240px', borderRadius: '7px', objectFit: 'cover' }} />
                              {msg.content && <span>{msg.content}</span>}
                            </div>
                          ) : msg.content}
                        </div>
                        <div className="wa-bubble-meta">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {loading && (
                <div className={`wa-bubble-row ${isAiMode ? 'wa-in' : 'wa-out'}`}>
                  <div className="wa-bubble"><div className="wa-bubble-text">Processando...</div></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className={`wa-chat-footer ${isAiMode ? 'ai-footer' : ''}`}>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => handleAttachFile(e, 'image')} />
              <input type="file" ref={audioInputRef} accept="audio/*" style={{ display: 'none' }} onChange={e => handleAttachFile(e, 'audio')} />

              {!isAiMode && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button className="wa-icon-btn" title="Enviar imagem" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon size={22} color="#54656f" />
                  </button>
                  <button className="wa-icon-btn" title="Enviar áudio" onClick={() => audioInputRef.current?.click()}>
                    <Mic size={22} color="#54656f" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {attachFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '5px 10px', borderRadius: '8px', fontSize: '0.83rem' }}>
                    {attachFile.type === 'image'
                      ? <img src={attachFile.previewUrl} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
                      : <Mic size={18} color="#00a884" />}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachFile.name}</span>
                    <button type="button" onClick={() => setAttachFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                      <XIcon size={15} color="#667781" />
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex' }}>
                  <input type="text" className="wa-chat-input"
                    placeholder={isAiMode ? `✨ Pergunte ao Gemini sobre ${activeContact.name}...` : attachFile ? 'Legenda (opcional)...' : 'Digite uma mensagem...'}
                    value={inputMessage} onChange={e => setInputMessage(e.target.value)} disabled={loading} />
                  <button type="submit" className="wa-icon-btn" disabled={(!inputMessage.trim() && !attachFile) || loading}>
                    <Send size={22} color={(inputMessage.trim() || attachFile) ? (isAiMode ? '#10a37f' : '#00a884') : '#54656f'} />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="wa-empty-state">
            <MessageSquare size={64} color="#d9d9d9" />
            <h2>WhatsApp</h2>
            <p>Selecione um contato ou grupo para ver as mensagens e interagir.</p>
          </div>
        )}
      </div>
    </div>
    )}
  </main>

  <WhatsAppConnectionModal 
    isOpen={isConnModalOpen} 
    onClose={() => setIsConnModalOpen(false)}
    onStatusChange={info => setConnInfo({
      state: info.state,
      number: info.instance?.number || '31999522412',
      profileName: info.instance?.profileName || null
    })}
  />
</div>
);
}
