import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  Printer,
  FileSpreadsheet,
  Sparkles,
  Bot,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Search,
  RefreshCw,
  Layers,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Clock,
  Menu
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { callGeminiChat, callGeminiPrompt } from '../../services/geminiService';
import { fetchArchivedMessagesForReport } from '../../services/marciaArchiveService';

const LOCAL_HISTORY_KEY = 'amoreja_wa_reports_agent_history_v1';
const REPORT_AGENT_CHANNEL = 'whatsapp_reports_agent';

const STARTER_CHIPS = [
  '📸 Extraia todos os @ do Instagram válidos em uma lista organizada',
  '📊 Faça um relatório executivo detalhado das conversas',
  '💰 Liste orçamentos, pedidos, valores e comprovantes PIX',
  '📦 Extraia telefones, e-mails, endereços/CEPs e rastreios',
  '🎯 Liste dúvidas pendentes e sugira respostas para fechar vendas'
];

// Instagram SVG Icon
const InstagramIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const formatDuration = (sec) => {
  if (!sec) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  const num = typeof bytes === 'object' ? (bytes.low || 0) : Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

const safeJsonParse = async (res, fallback = null) => {
  try {
    if (!res || !res.ok) return fallback;
    const txt = await res.text();
    return txt && txt.trim() ? JSON.parse(txt) : fallback;
  } catch {
    return fallback;
  }
};

const makeSessionId = () => `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const createEmptySession = (scopeLabel) => ({
  sessionId: makeSessionId(),
  title: 'Nova conversa',
  scopeLabel,
  updatedAt: new Date().toISOString(),
  messages: []
});

const loadLocalSessions = () => {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalSessions = (sessions) => {
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(sessions.slice(0, 40)));
  } catch {
    // ignore storage quota errors
  }
};

const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Renderizador JSX seguro para **negrito**, links https:// e listas em respostas do agente
const renderInlineFragments = (line, keyPrefix) => {
  const tokenRegex = /(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let idx = 0;
  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b-${idx++}`}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(
        <a
          key={`${keyPrefix}-a-${idx++}`}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#008069', textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          {token}
        </a>
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  return parts;
};

const FormattedAgentText = ({ text }) => {
  const lines = String(text || '').split('\n');
  return (
    <div className="wab-agent-formatted">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={`sp-${i}`} style={{ height: '6px' }} />;
        if (trimmed.startsWith('### ')) {
          return <h5 key={`h5-${i}`} className="wab-agent-h">{renderInlineFragments(trimmed.slice(4), `h5-${i}`)}</h5>;
        }
        if (trimmed.startsWith('## ')) {
          return <h4 key={`h4-${i}`} className="wab-agent-h">{renderInlineFragments(trimmed.slice(3), `h4-${i}`)}</h4>;
        }
        if (trimmed.startsWith('# ')) {
          return <h3 key={`h3-${i}`} className="wab-agent-h">{renderInlineFragments(trimmed.slice(2), `h3-${i}`)}</h3>;
        }
        if (/^[-*•]\s+/.test(trimmed)) {
          return (
            <div key={`li-${i}`} className="wab-agent-li">
              <span className="wab-agent-bullet">•</span>
              <span>{renderInlineFragments(trimmed.replace(/^[-*•]\s+/, ''), `li-${i}`)}</span>
            </div>
          );
        }
        return <p key={`p-${i}`} className="wab-agent-p">{renderInlineFragments(line, `p-${i}`)}</p>;
      })}
    </div>
  );
};

export default function WhatsAppReportsModal({
  isOpen,
  onClose,
  allChats = [],
  activeChat = null,
  activeMessages = [],
  selectedChatJids = [],
  apiUrl = '',
  apiKey = '',
  instanceName = '',
  onOpenMediaLightbox
}) {
  const [activeTab, setActiveTab] = useState('agent'); // 'agent' | 'summary' | 'instagram' | 'media' | 'leads'
  const [mediaFilter, setMediaFilter] = useState('all'); // 'all' | 'image' | 'video' | 'audio' | 'document'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedType, setCopiedType] = useState(null);

  // Carregamento completo via arquivo Supabase (com fallback Evolution API para multi-conversa)
  const [multiChatMessages, setMultiChatMessages] = useState([]);
  const [loadingMultiChats, setLoadingMultiChats] = useState(false);
  const [archivedReportMessages, setArchivedReportMessages] = useState([]);
  const [loadingArchivedReport, setLoadingArchivedReport] = useState(false);
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');
  const [debouncedArchiveSearch, setDebouncedArchiveSearch] = useState('');

  // Análise rápida na aba Resumo
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState(null);

  // Bate-Papo Conversacional com o Agente IA (histórico persistente)
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [agentMode, setAgentMode] = useState('economy'); // 'economy' | 'deep'
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [authUserId, setAuthUserId] = useState(null);

  const agentFeedRef = useRef(null);
  const agentInputRef = useRef(null);

  const targetScope = selectedChatJids.length > 0
    ? `${selectedChatJids.length} conversas selecionadas`
    : activeChat
      ? `Conversa: ${activeChat.name}`
      : `Todas as conversas carregadas (${allChats.length})`;

  const scopeKey = selectedChatJids.length > 0
    ? `selected:${selectedChatJids.slice(0, 5).join(',')}`
    : activeChat?.remoteJid || 'all';

  useEffect(() => {
    const t = setTimeout(() => setDebouncedArchiveSearch(archiveSearchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [archiveSearchTerm]);

  // Carregar histórico completo do arquivo Supabase (ou fallback Evolution API se banco vazio)
  useEffect(() => {
    if (!isOpen) {
      setMultiChatMessages([]);
      setArchivedReportMessages([]);
      return;
    }

    let alive = true;
    (async () => {
      setLoadingArchivedReport(true);
      setLoadingMultiChats(selectedChatJids.length > 0);
      try {
        const dbMsgs = await fetchArchivedMessagesForReport({
          selectedChatJids,
          activeChat,
          allChats,
          searchKeyword: debouncedArchiveSearch,
          limit: selectedChatJids.length > 0 ? 2500 : 1500
        });

        if (!alive) return;

        if (dbMsgs.length > 0) {
          setArchivedReportMessages(dbMsgs);
          if (selectedChatJids.length > 0) setMultiChatMessages(dbMsgs);
          return;
        }

        setArchivedReportMessages([]);

        if (selectedChatJids.length > 0 && apiUrl && apiKey && instanceName) {
          const targetJids = selectedChatJids.slice(0, 10);
          const chatMap = new Map(allChats.map((c) => [c.remoteJid, c.name || c.remoteJid]));
          const aggregated = [];

          for (let i = 0; i < targetJids.length; i += 4) {
            const chunk = targetJids.slice(i, i + 4);
            const results = await Promise.all(
              chunk.map(async (remoteJid) => {
                try {
                  const res = await fetch(`${apiUrl}/chat/findMessages/${instanceName}`, {
                    method: 'POST',
                    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ where: { key: { remoteJid } }, limit: 60 })
                  });
                  const raw = await safeJsonParse(res, []);
                  const msgs = Array.isArray(raw) ? raw : (raw?.messages?.records || raw?.records || []);
                  const chatName = chatMap.get(remoteJid) || remoteJid;
                  const parsed = [];
                  for (const m of msgs) {
                    const ts = m.messageTimestamp?.low || m.messageTimestamp;
                    if (!ts) continue;
                    const txt = m.message?.conversation || m.message?.extendedTextMessage?.text;
                    const hasMedia = m.message?.imageMessage || m.message?.audioMessage || m.message?.videoMessage || m.message?.documentMessage || m.message?.stickerMessage;
                    if (!txt && !hasMedia) continue;
                    parsed.push({
                      id: m.key?.id || `${remoteJid}-${ts}`,
                      content: txt || '',
                      from_me: Boolean(m.key?.fromMe),
                      sender_name: m.pushName || (m.key?.fromMe ? 'Márcia' : chatName),
                      sender_jid: m.key?.participant || m.key?.remoteJid || remoteJid,
                      created_at: new Date(Number(ts) * 1000).toISOString(),
                      raw_message: hasMedia ? m : null,
                      message_type: m.message?.imageMessage ? 'image' : m.message?.videoMessage ? 'video' : m.message?.audioMessage ? 'audio' : m.message?.documentMessage ? 'document' : 'text',
                      chatName,
                      remoteJid
                    });
                  }
                  return parsed;
                } catch {
                  return [];
                }
              })
            );
            results.forEach((arr) => aggregated.push(...arr));
          }

          aggregated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          if (alive) setMultiChatMessages(aggregated);
        }
      } finally {
        if (alive) {
          setLoadingArchivedReport(false);
          setLoadingMultiChats(false);
        }
      }
    })();

    return () => { alive = false; };
  }, [isOpen, selectedChatJids, activeChat, allChats, apiUrl, apiKey, instanceName, debouncedArchiveSearch]);

  // Hidratar histórico persistente do Bate-Papo (localStorage + Supabase) ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;

    const localSessions = loadLocalSessions();
    if (localSessions.length > 0) {
      setSessions(localSessions);
      setCurrentSessionId((prev) => prev || localSessions[0].sessionId);
    } else {
      const fresh = createEmptySession(targetScope);
      setSessions([fresh]);
      setCurrentSessionId(fresh.sessionId);
    }

    if (!isSupabaseConfigured()) return;

    (async () => {
      setLoadingHistory(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (alive && userRes?.user?.id) {
          setAuthUserId(userRes.user.id);
        }

        const { data, error } = await supabase
          .from('new_amoreja_wa_agent_chats')
          .select('id, sender, message, context_data, created_at')
          .eq('context_data->>channel', REPORT_AGENT_CHANNEL)
          .order('created_at', { ascending: true })
          .limit(400);

        if (error || !alive) return;

        const sessionMap = new Map();

        // Primeiro carrega sessões locais para preservar eventuais mensagens offline/não enviadas
        for (const s of localSessions) {
          if (!s?.sessionId) continue;
          sessionMap.set(s.sessionId, {
            sessionId: s.sessionId,
            title: s.title || 'Conversa salva',
            scopeLabel: s.scopeLabel || '',
            updatedAt: s.updatedAt || new Date().toISOString(),
            messages: Array.isArray(s.messages) ? [...s.messages] : []
          });
        }

        // Mescla registros do Supabase agrupando por session_id
        for (const row of data || []) {
          const ctx = row.context_data || {};
          const sid = ctx.session_id || 'legacy_reports_session';
          const role = row.sender === 'agent' || row.sender === 'model' || row.sender === 'ai' ? 'model' : 'user';
          const msgObj = {
            id: row.id,
            role,
            text: row.message,
            createdAt: row.created_at,
            modelUsed: ctx.model_used || null
          };

          if (!sessionMap.has(sid)) {
            sessionMap.set(sid, {
              sessionId: sid,
              title: ctx.session_title || (role === 'user' ? String(row.message).slice(0, 48) : 'Relatório WhatsApp'),
              scopeLabel: ctx.scope_label || '',
              updatedAt: row.created_at,
              messages: []
            });
          }

          const sess = sessionMap.get(sid);
          if (ctx.session_title && sess.title === 'Nova conversa') {
            sess.title = ctx.session_title;
          }
          if (ctx.scope_label && !sess.scopeLabel) {
            sess.scopeLabel = ctx.scope_label;
          }

          const alreadyExists = sess.messages.some(
            (m) => m.id === msgObj.id || (m.role === msgObj.role && m.text === msgObj.text)
          );
          if (!alreadyExists) {
            sess.messages.push(msgObj);
          }
          if (new Date(row.created_at) > new Date(sess.updatedAt || 0)) {
            sess.updatedAt = row.created_at;
          }
        }

        const merged = Array.from(sessionMap.values())
          .map((s) => ({
            ...s,
            messages: s.messages.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
          }))
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

        if (merged.length > 0) {
          setSessions(merged);
          saveLocalSessions(merged);
          setCurrentSessionId((prev) =>
            prev && merged.some((s) => s.sessionId === prev) ? prev : merged[0].sessionId
          );
        }
      } finally {
        if (alive) setLoadingHistory(false);
      }
    })();

    return () => { alive = false; };
  }, [isOpen]);

  // Sessão ativa no bate-papo
  const currentSession = useMemo(() => {
    if (!sessions.length) return null;
    return sessions.find((s) => s.sessionId === currentSessionId) || sessions[0];
  }, [sessions, currentSessionId]);

  // Rolar apenas o feed interno do agente para o final
  useEffect(() => {
    if (!isOpen || activeTab !== 'agent') return;
    const feed = agentFeedRef.current;
    if (feed) {
      feed.scrollTop = feed.scrollHeight;
    }
  }, [isOpen, activeTab, currentSession?.messages?.length, sendingChat]);

  // Mensagens em análise (multi-conversa, conversa ativa completa ou histórico global do arquivo)
  const analyzedMessages = useMemo(() => {
    if (!isOpen) return [];
    if (selectedChatJids.length > 0) {
      return archivedReportMessages.length > 0 ? archivedReportMessages : multiChatMessages;
    }
    if (activeChat?.remoteJid) {
      if (debouncedArchiveSearch) return archivedReportMessages;
      if (archivedReportMessages.length > activeMessages.length) {
        return archivedReportMessages;
      }
      return activeMessages.map((m) => ({
        ...m,
        chatName: activeChat?.name || 'Conversa',
        remoteJid: activeChat?.remoteJid || ''
      }));
    }
    return archivedReportMessages;
  }, [isOpen, activeChat, activeMessages, selectedChatJids, multiChatMessages, archivedReportMessages, debouncedArchiveSearch]);

  // 1. EXTRAÇÃO DE INSTAGRAM E REDES SOCIAIS
  const extractedInstagram = useMemo(() => {
    const list = [];
    const seenHandles = new Set();
    const atRegex = /@([a-zA-Z0-9._]{2,30})/g;
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._]{2,30})/gi;

    analyzedMessages.forEach((msg) => {
      const text = `${msg.content || ''} ${msg.raw_message?.message?.imageMessage?.caption || ''} ${msg.raw_message?.message?.videoMessage?.caption || ''}`;
      if (!text) return;

      let match;
      while ((match = urlRegex.exec(text)) !== null) {
        const rawHandle = match[1].replace(/[.,;:!?]+$/, '');
        if (rawHandle && !rawHandle.includes('/') && !seenHandles.has(rawHandle.toLowerCase())) {
          seenHandles.add(rawHandle.toLowerCase());
          list.push({
            id: `ig-url-${rawHandle}-${msg.id}`,
            handle: `@${rawHandle}`,
            url: `https://www.instagram.com/${rawHandle}`,
            sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
            date: msg.created_at,
            context: text.substring(Math.max(0, match.index - 30), Math.min(text.length, match.index + 50)),
            source: 'link'
          });
        }
      }

      while ((match = atRegex.exec(text)) !== null) {
        const rawHandle = match[1].replace(/[.,;:!?]+$/, '');
        const lower = rawHandle.toLowerCase();
        if (
          lower &&
          !seenHandles.has(lower) &&
          !['gmail', 'hotmail', 'outlook', 'yahoo', 'icloud', 's', 'g', 'c'].includes(lower)
        ) {
          seenHandles.add(lower);
          list.push({
            id: `ig-at-${rawHandle}-${msg.id}`,
            handle: `@${rawHandle}`,
            url: `https://www.instagram.com/${rawHandle}`,
            sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
            date: msg.created_at,
            context: text.substring(Math.max(0, match.index - 30), Math.min(text.length, match.index + 50)),
            source: 'menção'
          });
        }
      }
    });

    return list;
  }, [analyzedMessages]);

  // 2. EXTRAÇÃO DE LEADS E DADOS COMERCIAIS
  const extractedLeads = useMemo(() => {
    const phones = [];
    const emails = [];
    const trackings = [];
    const addresses = [];
    const financial = [];

    const seenPhones = new Set();
    const seenEmails = new Set();
    const seenTrackings = new Set();

    const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}/g;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const trackingRegex = /\b[A-Z]{2}\d{9}[A-Z]{2}\b/g;
    const cepRegex = /\b\d{5}[-\s]?\d{3}\b/g;
    const addressKeywords = /\b(rua|av\.?|avenida|alameda|travessa|bairro|apto|apartamento|bloco|nº|numero)\b/i;
    const financialRegex = /(?:R\$\s*[\d.,]+|\bpix\b|\bcomprovante\b|\btransfer[êe]ncia\b|\bpago\b)/i;

    analyzedMessages.forEach((msg) => {
      const text = `${msg.content || ''} ${msg.raw_message?.message?.imageMessage?.caption || ''} ${msg.raw_message?.message?.videoMessage?.caption || ''}`;
      if (!text) return;

      let match;
      while ((match = phoneRegex.exec(text)) !== null) {
        const clean = match[0].replace(/\D/g, '');
        if (clean.length >= 10 && clean.length <= 13 && !seenPhones.has(clean)) {
          seenPhones.add(clean);
          phones.push({
            value: match[0],
            clean,
            sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
            date: msg.created_at
          });
        }
      }

      while ((match = emailRegex.exec(text)) !== null) {
        const em = match[0].toLowerCase();
        if (!seenEmails.has(em)) {
          seenEmails.add(em);
          emails.push({
            value: match[0],
            sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
            date: msg.created_at
          });
        }
      }

      while ((match = trackingRegex.exec(text)) !== null) {
        const code = match[0];
        if (!seenTrackings.has(code)) {
          seenTrackings.add(code);
          trackings.push({
            code,
            url: `https://rastreamento.correios.com.br/app/index.php?codigo=${code}`,
            sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
            date: msg.created_at
          });
        }
      }

      if (cepRegex.test(text) || addressKeywords.test(text)) {
        addresses.push({
          text: text.trim(),
          sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
          date: msg.created_at
        });
      }

      if (financialRegex.test(text)) {
        financial.push({
          text: text.trim(),
          sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
          date: msg.created_at
        });
      }
    });

    return { phones, emails, trackings, addresses, financial };
  }, [analyzedMessages]);

  // 3. BIBLIOTECA DE MÍDIA COMPLETA
  const mediaLibrary = useMemo(() => {
    const items = [];

    analyzedMessages.forEach((msg) => {
      const raw = msg.raw_message?.message;
      if (!raw) return;

      if (raw.imageMessage) {
        const im = raw.imageMessage;
        items.push({
          id: msg.id,
          type: 'image',
          thumb: im.jpegThumbnail ? `data:image/jpeg;base64,${im.jpegThumbnail}` : null,
          url: msg.preview_url || (im.jpegThumbnail ? `data:image/jpeg;base64,${im.jpegThumbnail}` : null),
          caption: im.caption || '',
          mimetype: im.mimetype || 'image/jpeg',
          size: im.fileLength,
          sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
          date: msg.created_at,
          rawMessage: msg.raw_message
        });
      }

      if (raw.videoMessage) {
        const vm = raw.videoMessage;
        items.push({
          id: msg.id,
          type: 'video',
          thumb: vm.jpegThumbnail ? `data:image/jpeg;base64,${vm.jpegThumbnail}` : null,
          url: msg.preview_url || (vm.jpegThumbnail ? `data:image/jpeg;base64,${vm.jpegThumbnail}` : null),
          caption: vm.caption || '',
          duration: vm.seconds || 0,
          mimetype: vm.mimetype || 'video/mp4',
          size: vm.fileLength,
          sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
          date: msg.created_at,
          rawMessage: msg.raw_message
        });
      }

      if (raw.audioMessage) {
        const am = raw.audioMessage;
        items.push({
          id: msg.id,
          type: 'audio',
          duration: am.seconds || 0,
          ptt: am.ptt || false,
          mimetype: am.mimetype || 'audio/ogg',
          sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
          date: msg.created_at,
          rawMessage: msg.raw_message
        });
      }

      if (raw.documentMessage) {
        const dm = raw.documentMessage;
        items.push({
          id: msg.id,
          type: 'document',
          fileName: dm.fileName || 'documento.pdf',
          size: dm.fileLength,
          mimetype: dm.mimetype || 'application/octet-stream',
          sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
          date: msg.created_at,
          rawMessage: msg.raw_message
        });
      }
    });

    return items;
  }, [analyzedMessages]);

  const filteredMedia = useMemo(() => {
    return mediaLibrary.filter((item) => {
      const matchType = mediaFilter === 'all' || item.type === mediaFilter;
      const matchSearch =
        !searchTerm ||
        (item.caption && item.caption.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.fileName && item.fileName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sender && item.sender.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [mediaLibrary, mediaFilter, searchTerm]);

  const mediaCounts = useMemo(() => {
    return {
      all: mediaLibrary.length,
      image: mediaLibrary.filter((m) => m.type === 'image').length,
      video: mediaLibrary.filter((m) => m.type === 'video').length,
      audio: mediaLibrary.filter((m) => m.type === 'audio').length,
      document: mediaLibrary.filter((m) => m.type === 'document').length,
      totalSecondsAudio: mediaLibrary
        .filter((m) => m.type === 'audio')
        .reduce((acc, curr) => acc + (curr.duration || 0), 0)
    };
  }, [mediaLibrary]);

  // Contexto rico de sistema para o Agente de Relatórios
  const buildAgentSystemInstruction = () => {
    const sampleMsgs = analyzedMessages
      .slice(-180)
      .map((m) => {
        const dt = m.created_at
          ? new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : '';
        const who = m.sender_name || (m.from_me ? 'Márcia' : m.chatName || 'Cliente');
        const chatTag = (selectedChatJids.length > 0 || !activeChat) && m.chatName ? ` (${m.chatName})` : '';
        const mediaTag = m.message_type && m.message_type !== 'text' ? `[Mídia:${m.message_type}] ` : '';
        return `[${dt}] ${who}${chatTag}: ${mediaTag}${m.content || ''}`.trim();
      })
      .join('\n');

    const igSummary = extractedInstagram.map((ig) => `${ig.handle} (${ig.url})`).join(', ') || 'Nenhum';
    const phonesSummary = extractedLeads.phones.map((p) => p.value).join(', ') || 'Nenhum';
    const emailsSummary = extractedLeads.emails.map((e) => e.value).join(', ') || 'Nenhum';
    const trackSummary = extractedLeads.trackings.map((t) => t.code).join(', ') || 'Nenhum';

    return `Você é o Agente de Inteligência & Relatórios do WhatsApp do Ateliê Amoreja Amigurumi (gerenciado por Márcia Reggiani).
Você conversa em estilo bate-papo diretamente com o usuário para entender exatamente o que ele precisa extrair, organizar, resumir ou produzir em forma de relatório a partir das conversas selecionadas.

ESCOPO ATUAL CARREGADO:
- Escopo: ${targetScope}
- Mensagens carregadas para análise: ${analyzedMessages.length}
- Mídias encontradas: ${mediaCounts.image} fotos, ${mediaCounts.video} vídeos, ${mediaCounts.audio} áudios, ${mediaCounts.document} documentos
- Instagrams já detectados automaticamente: ${igSummary}
- Telefones detectados: ${phonesSummary}
- E-mails detectados: ${emailsSummary}
- Rastreios Correios detectados: ${trackSummary}

HISTÓRICO DAS MENSAGENS REAIS DO WHATSAPP (use estritamente estes dados):
---
${sampleMsgs || 'Nenhuma mensagem de WhatsApp aberta no momento. Se precisar analisar conversas específicas, peça ao usuário para abrir uma conversa ou marcar várias na lista lateral.'}
---

REGRAS DE CONDUTA:
1. Siga com precisão o que o usuário pedir (listas, tabelas Markdown, extração de @handles, orçamentos, endereços, relatórios executivos, rascunhos de resposta, etc.).
2. Se algo pedido pelo usuário não estiver claro ou houver vários caminhos possíveis, entregue a melhor resposta inicial e sugira de forma breve como refinar na próxima mensagem.
3. Nunca invente nomes, valores, links ou mensagens que não estejam nos dados acima.
4. Responda sempre em português claro, organizado e objetivo.`;
  };

  if (!isOpen) return null;

  const persistTurnToSupabase = async ({ sessionId, sessionTitle, role, text, modelUsed, mode }) => {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('new_amoreja_wa_agent_chats').insert([
        {
          user_id: authUserId || null,
          sender: role === 'model' ? 'agent' : 'user',
          message: text,
          context_data: {
            channel: REPORT_AGENT_CHANNEL,
            session_id: sessionId,
            session_title: sessionTitle,
            scope_key: scopeKey,
            scope_label: targetScope,
            model_used: modelUsed || null,
            mode
          }
        }
      ]);
    } catch {
      // Fallback já garantido no localStorage
    }
  };

  const handleNewSession = () => {
    const existingEmpty = sessions.find((s) => !s.messages || s.messages.length === 0);
    if (existingEmpty) {
      setCurrentSessionId(existingEmpty.sessionId);
      setTimeout(() => agentInputRef.current?.focus({ preventScroll: true }), 50);
      return;
    }
    const fresh = createEmptySession(targetScope);
    const updated = [fresh, ...sessions];
    setSessions(updated);
    saveLocalSessions(updated);
    setCurrentSessionId(fresh.sessionId);
    setTimeout(() => agentInputRef.current?.focus({ preventScroll: true }), 50);
  };

  const handleDeleteSession = async (sid) => {
    if (!window.confirm('Excluir este histórico de conversa com o agente?')) return;
    const remaining = sessions.filter((s) => s.sessionId !== sid);
    let nextSessions = remaining;
    let nextId = currentSessionId;
    if (remaining.length === 0) {
      const fresh = createEmptySession(targetScope);
      nextSessions = [fresh];
      nextId = fresh.sessionId;
    } else if (currentSessionId === sid) {
      nextId = remaining[0].sessionId;
    }
    setSessions(nextSessions);
    saveLocalSessions(nextSessions);
    setCurrentSessionId(nextId);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('new_amoreja_wa_agent_chats')
          .delete()
          .eq('context_data->>channel', REPORT_AGENT_CHANNEL)
          .eq('context_data->>session_id', sid);
      } catch {
        // ignore
      }
    }
  };

  const handleSendAgentMessage = async (customText = null) => {
    const promptText = (typeof customText === 'string' ? customText : chatInput).trim();
    if (!promptText || sendingChat) return;

    const targetSession = currentSession || createEmptySession(targetScope);
    const sid = targetSession.sessionId;
    const isFirstTurn = !targetSession.messages || targetSession.messages.length === 0;
    const nextTitle = isFirstTurn
      ? promptText.slice(0, 44) + (promptText.length > 44 ? '…' : '')
      : targetSession.title;

    const userMsg = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: promptText,
      createdAt: new Date().toISOString()
    };

    const previousHistory = targetSession.messages || [];

    setSessions((prev) => {
      const hasSess = prev.some((s) => s.sessionId === sid);
      const base = hasSess ? prev : [targetSession, ...prev];
      const next = base.map((s) =>
        s.sessionId === sid
          ? {
              ...s,
              title: nextTitle,
              scopeLabel: targetScope,
              updatedAt: userMsg.createdAt,
              messages: [...(s.messages || []), userMsg]
            }
          : s
      );
      saveLocalSessions(next);
      return next;
    });

    if (typeof customText !== 'string') setChatInput('');
    setSendingChat(true);

    persistTurnToSupabase({
      sessionId: sid,
      sessionTitle: nextTitle,
      role: 'user',
      text: promptText,
      mode: agentMode
    });

    try {
      const { text, modelUsed } = await callGeminiChat({
        systemInstruction: buildAgentSystemInstruction(),
        history: previousHistory,
        userMessage: promptText,
        mode: agentMode
      });

      const modelMsg = {
        id: `m_${Date.now()}`,
        role: 'model',
        text,
        createdAt: new Date().toISOString(),
        modelUsed
      };

      setSessions((prev) => {
        const next = prev.map((s) =>
          s.sessionId === sid
            ? {
                ...s,
                updatedAt: modelMsg.createdAt,
                messages: [...(s.messages || []), modelMsg]
              }
            : s
        );
        saveLocalSessions(next);
        return next;
      });

      persistTurnToSupabase({
        sessionId: sid,
        sessionTitle: nextTitle,
        role: 'model',
        text,
        modelUsed,
        mode: agentMode
      });
    } catch (e) {
      const errMsg = {
        id: `err_${Date.now()}`,
        role: 'model',
        text: `❌ Não foi possível concluir a resposta agora: ${e.message}`,
        createdAt: new Date().toISOString(),
        modelUsed: null
      };
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.sessionId === sid
            ? { ...s, messages: [...(s.messages || []), errMsg] }
            : s
        );
        saveLocalSessions(next);
        return next;
      });
    } finally {
      setSendingChat(false);
      setTimeout(() => agentInputRef.current?.focus({ preventScroll: true }), 40);
    }
  };

  const handleCopyAgentMsg = (msg) => {
    navigator.clipboard.writeText(msg.text || '');
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleDownloadAgentMsg = (msg) => {
    const content = `# Relatório Central de Inteligência Amoreja\nEscopo: ${targetScope}\nData: ${new Date(msg.createdAt || Date.now()).toLocaleString('pt-BR')}\n\n${msg.text || ''}\n`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_amoreja_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintAgentMsg = (msg) => {
    const win = window.open('', '_blank', 'width=840,height=720');
    if (!win) {
      window.print();
      return;
    }
    const safeBody = escapeHtml(msg.text || '').replace(/\n/g, '<br/>');
    const safeScope = escapeHtml(targetScope);
    const safeDate = escapeHtml(new Date(msg.createdAt || Date.now()).toLocaleString('pt-BR'));
    win.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Amoreja</title>` +
      `<style>body{font-family:Segoe UI,Arial,sans-serif;padding:32px;color:#111b21;line-height:1.6}` +
      `h1{color:#008069;font-size:20px;margin:0 0 6px} .meta{font-size:12px;color:#667781;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:20px}` +
      `</style></head><body><h1>Relatório WhatsApp • Amoreja Amigurumi</h1>` +
      `<div class="meta">${safeScope} • ${safeDate}</div><div>${safeBody}</div></body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  };

  // Diagnóstico rápido na aba Resumo
  const handleGenerateAiReport = async () => {
    setAiAnalyzing(true);
    try {
      const sampleTexts = analyzedMessages
        .slice(-100)
        .map((m) => `[${m.sender_name || (m.from_me ? 'Márcia' : 'Cliente')}]: ${m.content || (m.message_type ? `[Mídia: ${m.message_type}]` : '')}`)
        .join('\n');

      const prompt = `Você é um Analista de Negócios e Especialista em Atendimento WhatsApp do Ateliê Amoreja (artesanato em amigurumi gerenciado por Márcia Reggiani).
Analise o extrato recente (${targetScope}) e forneça um relatório executivo estruturado com:
1. Resumo Executivo da Conversa / Atendimento
2. Principais Assuntos e Intenções do Cliente (Dúvidas sobre receitas, encomendas, preços, frete, elogios)
3. Sentimento Geral do Cliente
4. Oportunidades Comerciais e Próximos Passos recomendados para a Márcia.

Mensagens analisadas:
${sampleTexts || 'Nenhuma mensagem recente encontrada.'}`;

      const { text, modelUsed } = await callGeminiPrompt({ prompt, mode: 'economy' });
      setAiReport(`${text}\n\n— Gerado por ${modelUsed}`);
    } catch (e) {
      setAiReport(`❌ Erro ao gerar análise com IA: ${e.message}`);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleCopyAllInstagram = () => {
    const text = extractedInstagram.map((ig) => ig.handle).join(', ');
    navigator.clipboard.writeText(text);
    setCopiedType('instagram');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Conversa', 'Remetente', 'Tipo', 'Conteúdo / Legenda', 'Mídia'];
    const rows = analyzedMessages.map((m) => [
      `"${new Date(m.created_at).toLocaleString('pt-BR')}"`,
      `"${(m.chatName || activeChat?.name || '').replace(/"/g, '""')}"`,
      `"${(m.sender_name || (m.from_me ? 'Márcia' : 'Cliente')).replace(/"/g, '""')}"`,
      `"${m.message_type || 'texto'}"`,
      `"${(m.content || '').replace(/"/g, '""')}"`,
      `"${m.preview_url ? 'Sim' : 'Não'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_whatsapp_${activeChat?.name || 'amoreja'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeMsgs = currentSession?.messages || [];

  return (
    <div className="wab-report-modal-overlay" onClick={onClose}>
      <div className="wab-report-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="wab-report-header">
          <div className="wab-report-title-row">
            <div className="wab-report-badge-icon">
              <Sparkles size={20} color="#008069" />
            </div>
            <div>
              <h2 className="wab-report-title">Central de Inteligência & Relatórios WhatsApp</h2>
              <p className="wab-report-subtitle">
                Converse com o Agente IA, extraia Instagrams, leads e biblioteca de mídias • <strong>{targetScope}</strong>
                {loadingMultiChats || loadingArchivedReport ? ' (carregando histórico completo...)' : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="wab-report-action-btn"
              onClick={handleExportCSV}
              title="Exportar dados para Excel (CSV)"
            >
              <FileSpreadsheet size={16} />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              className="wab-report-action-btn"
              onClick={handlePrint}
              title="Imprimir ou Salvar como PDF"
            >
              <Printer size={16} />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              className="wab-report-close-btn"
              onClick={onClose}
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="wab-report-tabs">
          <button
            type="button"
            className={`wab-report-tab ${activeTab === 'agent' ? 'active' : ''}`}
            onClick={() => setActiveTab('agent')}
          >
            <MessageSquare size={16} />
            <span>Bate-Papo com Agente IA</span>
          </button>

          <button
            type="button"
            className={`wab-report-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <TrendingUp size={16} />
            <span>Resumo Executivo & Métricas</span>
          </button>

          <button
            type="button"
            className={`wab-report-tab ${activeTab === 'instagram' ? 'active' : ''}`}
            onClick={() => setActiveTab('instagram')}
          >
            <InstagramIcon size={16} color={activeTab === 'instagram' ? '#008069' : '#54656f'} />
            <span>Instagram Extraído ({extractedInstagram.length})</span>
          </button>

          <button
            type="button"
            className={`wab-report-tab ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <ImageIcon size={16} />
            <span>Biblioteca de Mídia ({mediaCounts.all})</span>
          </button>

          <button
            type="button"
            className={`wab-report-tab ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            <Phone size={16} />
            <span>Leads & Dados Comerciais ({extractedLeads.phones.length + extractedLeads.emails.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className={`wab-report-body ${activeTab === 'agent' ? 'agent-mode' : ''}`}>
          {/* ════════ TAB 0: BATE-PAPO CONVERSACIONAL COM AGENTE IA ════════ */}
          {activeTab === 'agent' && (
            <div className="wab-agent-workspace">
              {/* Sidebar de Histórico Persistente */}
              {showHistoryDrawer && (
                <aside className="wab-agent-history-sidebar">
                  <div className="wab-agent-history-top">
                    <button
                      type="button"
                      className="wab-agent-new-btn"
                      onClick={handleNewSession}
                    >
                      <Plus size={16} />
                      <span>Nova Conversa</span>
                    </button>
                  </div>

                  <div className="wab-agent-history-label">
                    <Clock size={12} />
                    <span>Histórico Salvo ({sessions.length})</span>
                    {loadingHistory && <RefreshCw size={12} className="fa-spin" />}
                  </div>

                  <div className="wab-agent-history-list">
                    {sessions.map((s) => {
                      const isCurrent = s.sessionId === currentSession?.sessionId;
                      return (
                        <div
                          key={s.sessionId}
                          className={`wab-agent-session-item ${isCurrent ? 'active' : ''}`}
                          onClick={() => setCurrentSessionId(s.sessionId)}
                        >
                          <div className="wab-agent-session-info">
                            <span className="wab-agent-session-title" title={s.title}>
                              {s.title || 'Nova conversa'}
                            </span>
                            <span className="wab-agent-session-meta">
                              {(s.messages?.length || 0)} msgs • {new Date(s.updatedAt || Date.now()).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="wab-agent-session-del"
                            title="Excluir conversa"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(s.sessionId);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </aside>
              )}

              {/* Área Principal de Bate-Papo */}
              <div className="wab-agent-chat-main">
                <div className="wab-agent-chat-topbar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <button
                      type="button"
                      className="wab-report-close-btn"
                      style={{ width: 30, height: 30 }}
                      onClick={() => setShowHistoryDrawer((v) => !v)}
                      title={showHistoryDrawer ? 'Ocultar histórico' : 'Mostrar histórico'}
                    >
                      <Menu size={16} />
                    </button>
                    <Bot size={18} color="#008069" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111b21', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Agente Central de Inteligência
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#667781' }}>
                        {analyzedMessages.length} msgs em contexto • histórico salvo automaticamente
                      </div>
                    </div>
                  </div>

                  {/* Filtro rápido no arquivo completo + Seletor de Modo/Custo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div className="wab-archive-search-box" title="Filtrar mensagens em todo o arquivo salvo antes de enviar ao agente">
                      <Search size={13} color="#667781" />
                      <input
                        type="text"
                        value={archiveSearchTerm}
                        onChange={(e) => setArchiveSearchTerm(e.target.value)}
                        placeholder="Filtrar no histórico..."
                        className="wab-archive-search-input"
                      />
                      {archiveSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setArchiveSearchTerm('')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667781', padding: 0, display: 'flex' }}
                          title="Limpar filtro"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="wab-mode-toggle" title="Escolha o equilíbrio entre custo mínimo e profundidade">
                      <button
                        type="button"
                        className={`wab-mode-btn ${agentMode === 'economy' ? 'active' : ''}`}
                        onClick={() => setAgentMode('economy')}
                      >
                        ⚡ Econômico
                      </button>
                      <button
                        type="button"
                        className={`wab-mode-btn ${agentMode === 'deep' ? 'active' : ''}`}
                        onClick={() => setAgentMode('deep')}
                      >
                        🧠 Profundo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feed de Mensagens em Bate-Papo */}
                <div className="wab-agent-feed" ref={agentFeedRef}>
                  {activeMsgs.length === 0 ? (
                    <div className="wab-agent-welcome">
                      <div className="wab-agent-welcome-icon">
                        <Bot size={28} color="#008069" />
                      </div>
                      <h3>Converse livremente com o Agente de Relatórios</h3>
                      <p>
                        Explique com suas palavras o que você quer extrair ou montar a partir de{' '}
                        <strong>{targetScope}</strong>. Você pode pedir ajustes em sequência como em um bate-papo normal — todo o histórico fica salvo aqui.
                      </p>

                      <div className="wab-agent-chips">
                        {STARTER_CHIPS.map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="wab-agent-chip"
                            onClick={() => handleSendAgentMessage(chip)}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    activeMsgs.map((msg) => (
                      <div
                        key={msg.id}
                        className={`wab-agent-msg-row ${msg.role === 'user' ? 'user' : 'model'}`}
                      >
                        <div className={`wab-agent-bubble ${msg.role === 'user' ? 'user' : 'model'}`}>
                          {msg.role === 'model' ? (
                            <FormattedAgentText text={msg.text} />
                          ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                          )}

                          <div className="wab-agent-bubble-footer">
                            <span className="wab-agent-time">
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </span>
                            {msg.role === 'model' && msg.modelUsed && (
                              <span className="wab-agent-model-badge">{msg.modelUsed}</span>
                            )}
                          </div>

                          {msg.role === 'model' && (
                            <div className="wab-agent-msg-actions">
                              <button
                                type="button"
                                className="wab-agent-mini-btn"
                                onClick={() => handleCopyAgentMsg(msg)}
                              >
                                {copiedMsgId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                                <span>{copiedMsgId === msg.id ? 'Copiado' : 'Copiar'}</span>
                              </button>
                              <button
                                type="button"
                                className="wab-agent-mini-btn"
                                onClick={() => handleDownloadAgentMsg(msg)}
                              >
                                <Download size={12} />
                                <span>Baixar .md</span>
                              </button>
                              <button
                                type="button"
                                className="wab-agent-mini-btn"
                                onClick={() => handlePrintAgentMsg(msg)}
                              >
                                <Printer size={12} />
                                <span>PDF</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {sendingChat && (
                    <div className="wab-agent-msg-row model">
                      <div className="wab-agent-bubble model" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#54656f' }}>
                        <RefreshCw size={14} className="fa-spin" color="#008069" />
                        <span>Analisando mensagens e preparando resposta...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input de Bate-Papo */}
                <form
                  className="wab-agent-inputbar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAgentMessage();
                  }}
                >
                  <textarea
                    ref={agentInputRef}
                    rows={1}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAgentMessage();
                      }
                    }}
                    placeholder="Explique o que deseja que o agente extraia, organize ou gere (Enter envia, Shift+Enter quebra linha)..."
                    className="wab-agent-textarea"
                  />
                  <button
                    type="submit"
                    className="wab-agent-send-btn"
                    disabled={!chatInput.trim() || sendingChat}
                    title="Enviar instrução"
                  >
                    <Send size={17} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ════════ TAB 1: RESUMO EXECUTIVO & MÉTRICAS ════════ */}
          {activeTab === 'summary' && (
            <div className="wab-tab-pane">
              <div className="wab-metrics-grid">
                <div className="wab-metric-card">
                  <div className="wab-metric-icon" style={{ background: '#e7fce3', color: '#008069' }}>
                    <Layers size={22} />
                  </div>
                  <div>
                    <div className="wab-metric-val">{analyzedMessages.length}</div>
                    <div className="wab-metric-label">Mensagens Analisadas</div>
                  </div>
                </div>

                <div className="wab-metric-card">
                  <div className="wab-metric-icon" style={{ background: '#fdf2f8', color: '#db2777' }}>
                    <InstagramIcon size={22} color="#db2777" />
                  </div>
                  <div>
                    <div className="wab-metric-val">{extractedInstagram.length}</div>
                    <div className="wab-metric-label">Instagrams Válidos</div>
                  </div>
                </div>

                <div className="wab-metric-card">
                  <div className="wab-metric-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <ImageIcon size={22} />
                  </div>
                  <div>
                    <div className="wab-metric-val">{mediaCounts.image + mediaCounts.video}</div>
                    <div className="wab-metric-label">Fotos & Vídeos</div>
                  </div>
                </div>

                <div className="wab-metric-card">
                  <div className="wab-metric-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                    <Music size={22} />
                  </div>
                  <div>
                    <div className="wab-metric-val">{mediaCounts.audio} ({formatDuration(mediaCounts.totalSecondsAudio)})</div>
                    <div className="wab-metric-label">Mensagens de Voz</div>
                  </div>
                </div>
              </div>

              <div className="wab-ai-diagnostic-card">
                <div className="wab-ai-diagnostic-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={20} color="#008069" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111b21' }}>
                      Diagnóstico Rápido com IA Gemini
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="wab-report-action-btn"
                      onClick={() => setActiveTab('agent')}
                    >
                      <MessageSquare size={15} />
                      <span>Abrir no Bate-Papo</span>
                    </button>

                    <button
                      type="button"
                      className="wab-ai-generate-btn"
                      onClick={handleGenerateAiReport}
                      disabled={aiAnalyzing}
                    >
                      {aiAnalyzing ? <RefreshCw size={15} className="fa-spin" /> : <Sparkles size={15} />}
                      <span>{aiAnalyzing ? 'Analisando mensagens...' : (aiReport ? 'Atualizar Diagnóstico' : 'Gerar Resumo Rápido')}</span>
                    </button>
                  </div>
                </div>

                {aiReport ? (
                  <div className="wab-ai-report-content">
                    {aiReport}
                  </div>
                ) : (
                  <div className="wab-ai-report-empty">
                    <Sparkles size={32} color="#86efac" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                      Clique em <strong>Gerar Resumo Rápido</strong> ou use a aba <strong>Bate-Papo com Agente IA</strong> para explicar exatamente o relatório que deseja criar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ TAB 2: EXTRAÇÃO DE INSTAGRAM ════════ */}
          {activeTab === 'instagram' && (
            <div className="wab-tab-pane">
              <div className="wab-pane-toolbar">
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111b21' }}>
                    Perfis de Instagram Identificados ({extractedInstagram.length})
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#667781' }}>
                    Todos os links e menções @ de perfis válidos encontrados nas conversas
                  </p>
                </div>

                {extractedInstagram.length > 0 && (
                  <button
                    type="button"
                    className="wab-copy-all-btn"
                    onClick={handleCopyAllInstagram}
                  >
                    {copiedType === 'instagram' ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedType === 'instagram' ? 'Copiados com Sucesso!' : 'Copiar Todos os @Handles'}</span>
                  </button>
                )}
              </div>

              {extractedInstagram.length === 0 ? (
                <div className="wab-empty-list">
                  <InstagramIcon size={40} color="#94a3b8" />
                  <p>Nenhum perfil de Instagram detectado nestas conversas.</p>
                </div>
              ) : (
                <div className="wab-instagram-grid">
                  {extractedInstagram.map((ig) => (
                    <div key={ig.id} className="wab-instagram-card">
                      <div className="wab-ig-avatar">
                        <InstagramIcon size={20} color="#ffffff" />
                      </div>

                      <div className="wab-ig-info">
                        <a
                          href={ig.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wab-ig-handle"
                          title="Abrir perfil no Instagram"
                        >
                          <span>{ig.handle}</span>
                          <ExternalLink size={13} />
                        </a>
                        <div className="wab-ig-meta">
                          Enviado por <strong>{ig.sender}</strong> • {new Date(ig.date).toLocaleDateString('pt-BR')}
                        </div>
                        {ig.context && (
                          <div className="wab-ig-context" title={ig.context}>
                            "{ig.context}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════ TAB 3: BIBLIOTECA DE MÍDIA ════════ */}
          {activeTab === 'media' && (
            <div className="wab-tab-pane">
              <div className="wab-media-toolbar">
                <div className="wab-media-filter-pills">
                  <button
                    type="button"
                    className={`wab-media-pill ${mediaFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setMediaFilter('all')}
                  >
                    Todas ({mediaCounts.all})
                  </button>
                  <button
                    type="button"
                    className={`wab-media-pill ${mediaFilter === 'image' ? 'active' : ''}`}
                    onClick={() => setMediaFilter('image')}
                  >
                    📷 Fotos ({mediaCounts.image})
                  </button>
                  <button
                    type="button"
                    className={`wab-media-pill ${mediaFilter === 'video' ? 'active' : ''}`}
                    onClick={() => setMediaFilter('video')}
                  >
                    🎥 Vídeos ({mediaCounts.video})
                  </button>
                  <button
                    type="button"
                    className={`wab-media-pill ${mediaFilter === 'audio' ? 'active' : ''}`}
                    onClick={() => setMediaFilter('audio')}
                  >
                    🎵 Mensagens de Voz ({mediaCounts.audio})
                  </button>
                  <button
                    type="button"
                    className={`wab-media-pill ${mediaFilter === 'document' ? 'active' : ''}`}
                    onClick={() => setMediaFilter('document')}
                  >
                    📄 Documentos ({mediaCounts.document})
                  </button>
                </div>

                <div className="wab-media-search-wrap">
                  <Search size={15} color="#667781" />
                  <input
                    type="text"
                    placeholder="Buscar na legenda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="wab-media-search-input"
                  />
                </div>
              </div>

              {filteredMedia.length === 0 ? (
                <div className="wab-empty-list">
                  <ImageIcon size={40} color="#94a3b8" />
                  <p>Nenhuma mídia encontrada com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="wab-media-gallery-grid">
                  {filteredMedia.map((item) => (
                    <div key={item.id} className="wab-media-gallery-card">
                      {item.type === 'image' && (
                        <div
                          className="wab-media-card-thumb-wrap"
                          onClick={() => onOpenMediaLightbox && onOpenMediaLightbox(item)}
                        >
                          <img src={item.thumb || item.url} alt="Foto" className="wab-media-card-img" />
                          <div className="wab-media-card-overlay">
                            <span className="wab-media-type-badge">📷 Foto</span>
                          </div>
                        </div>
                      )}

                      {item.type === 'video' && (
                        <div
                          className="wab-media-card-thumb-wrap"
                          onClick={() => onOpenMediaLightbox && onOpenMediaLightbox(item)}
                        >
                          {item.thumb ? (
                            <img src={item.thumb} alt="Vídeo" className="wab-media-card-img" />
                          ) : (
                            <div style={{ background: '#0f172a', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Film size={32} color="#94a3b8" />
                            </div>
                          )}
                          <div className="wab-media-card-overlay">
                            <span className="wab-media-type-badge">🎥 {formatDuration(item.duration)}</span>
                          </div>
                        </div>
                      )}

                      {item.type === 'audio' && (
                        <div className="wab-media-audio-card">
                          <div className="wab-media-audio-icon">
                            <Music size={22} color="#008069" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111b21' }}>
                              {item.ptt ? 'Mensagem de Voz' : 'Arquivo de Áudio'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#667781' }}>
                              Duração: {formatDuration(item.duration)}
                            </div>
                          </div>
                        </div>
                      )}

                      {item.type === 'document' && (
                        <div className="wab-media-audio-card">
                          <div className="wab-media-audio-icon" style={{ background: '#f1f5f9', color: '#475569' }}>
                            <FileText size={22} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111b21', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.fileName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#667781' }}>
                              {formatBytes(item.size)}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="wab-media-card-footer">
                        <span className="wab-media-card-sender">{item.sender}</span>
                        <span className="wab-media-card-date">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {item.caption && (
                        <div className="wab-media-card-caption" title={item.caption}>
                          {item.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════ TAB 4: LEADS & DADOS COMERCIAIS ════════ */}
          {activeTab === 'leads' && (
            <div className="wab-tab-pane">
              <div className="wab-leads-sections">
                <div className="wab-lead-box">
                  <div className="wab-lead-box-header">
                    <Phone size={18} color="#008069" />
                    <h4>Telefones & WhatsApps Mencionados ({extractedLeads.phones.length})</h4>
                  </div>
                  {extractedLeads.phones.length === 0 ? (
                    <p className="wab-lead-empty">Nenhum telefone mencionado no corpo das mensagens.</p>
                  ) : (
                    <div className="wab-lead-items-list">
                      {extractedLeads.phones.map((p, i) => (
                        <div key={i} className="wab-lead-item-row">
                          <span className="wab-lead-text" style={{ fontWeight: 700 }}>{p.value}</span>
                          <span className="wab-lead-sender">{p.sender}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="wab-lead-box">
                  <div className="wab-lead-box-header">
                    <Mail size={18} color="#2563eb" />
                    <h4>E-mails dos Clientes ({extractedLeads.emails.length})</h4>
                  </div>
                  {extractedLeads.emails.length === 0 ? (
                    <p className="wab-lead-empty">Nenhum e-mail mencionado nas mensagens.</p>
                  ) : (
                    <div className="wab-lead-items-list">
                      {extractedLeads.emails.map((em, i) => (
                        <div key={i} className="wab-lead-item-row">
                          <span className="wab-lead-text">{em.value}</span>
                          <span className="wab-lead-sender">{em.sender}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="wab-lead-box">
                  <div className="wab-lead-box-header">
                    <MapPin size={18} color="#ea580c" />
                    <h4>Rastreios de Encomendas dos Correios ({extractedLeads.trackings.length})</h4>
                  </div>
                  {extractedLeads.trackings.length === 0 ? (
                    <p className="wab-lead-empty">Nenhum código de rastreio encontrado.</p>
                  ) : (
                    <div className="wab-lead-items-list">
                      {extractedLeads.trackings.map((t, i) => (
                        <div key={i} className="wab-lead-item-row">
                          <a
                            href={t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wab-lead-tracking-link"
                          >
                            <span>{t.code}</span>
                            <ExternalLink size={12} />
                          </a>
                          <span className="wab-lead-sender">{t.sender}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="wab-lead-box">
                  <div className="wab-lead-box-header">
                    <MapPin size={18} color="#7c3aed" />
                    <h4>Endereços de Entrega & CEPs Identificados ({extractedLeads.addresses.length})</h4>
                  </div>
                  {extractedLeads.addresses.length === 0 ? (
                    <p className="wab-lead-empty">Nenhum endereço ou CEP identificado.</p>
                  ) : (
                    <div className="wab-lead-items-list">
                      {extractedLeads.addresses.map((addr, i) => (
                        <div key={i} className="wab-lead-item-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span className="wab-lead-text" style={{ fontSize: '13px' }}>"{addr.text}"</span>
                          <span className="wab-lead-sender" style={{ marginTop: '2px' }}>{addr.sender}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="wab-lead-box">
                  <div className="wab-lead-box-header">
                    <Sparkles size={18} color="#059669" />
                    <h4>Comprovantes, PIX e Valores Mencionados ({extractedLeads.financial.length})</h4>
                  </div>
                  {extractedLeads.financial.length === 0 ? (
                    <p className="wab-lead-empty">Nenhum comprovante ou menção financeira encontrada.</p>
                  ) : (
                    <div className="wab-lead-items-list">
                      {extractedLeads.financial.map((f, i) => (
                        <div key={i} className="wab-lead-item-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span className="wab-lead-text" style={{ fontSize: '13px', color: '#047857' }}>"{f.text}"</span>
                          <span className="wab-lead-sender" style={{ marginTop: '2px' }}>{f.sender}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
