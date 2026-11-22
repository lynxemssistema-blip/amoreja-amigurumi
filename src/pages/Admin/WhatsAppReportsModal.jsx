import React, { useState, useMemo } from 'react';
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
  CheckSquare, 
  Square,
  Play,
  Pause,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Instagram SVG Icon
const InstagramIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

// Formatador de segundos para áudio
const formatDuration = (sec) => {
  if (!sec) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

// Formatador de bytes para tamanho legível
const formatBytes = (bytes) => {
  if (!bytes) return '';
  const num = typeof bytes === 'object' ? (bytes.low || 0) : Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

export default function WhatsAppReportsModal({
  isOpen,
  onClose,
  allChats = [],
  activeChat = null,
  activeMessages = [],
  selectedChatJids = [],
  onOpenMediaLightbox
}) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'instagram' | 'media' | 'leads' | 'export'
  const [mediaFilter, setMediaFilter] = useState('all'); // 'all' | 'image' | 'video' | 'audio' | 'document'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedType, setCopiedType] = useState(null);
  
  // Análise com IA Gemini
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  
  // Áudio preview dentro da biblioteca
  const [playingAudioId, setPlayingAudioId] = useState(null);

  // Determinar conversas alvo
  const targetScope = selectedChatJids.length > 0
    ? `selected (${selectedChatJids.length} conversas selecionadas)`
    : activeChat 
      ? `chat (${activeChat.name})`
      : `all (${allChats.length} conversas)`;

  // Compilar mensagens e contatos a serem analisados
  // Se estiver numa conversa aberta, usa activeMessages. Se tiver selecionado várias, ou todas, agrega
  const analyzedMessages = useMemo(() => {
    if (!isOpen) return [];
    if (activeChat && selectedChatJids.length === 0) {
      return activeMessages.map(m => ({
        ...m,
        chatName: activeChat.name,
        remoteJid: activeChat.remoteJid
      }));
    }
    // Caso padrão: activeMessages com metadados
    return activeMessages.map(m => ({
      ...m,
      chatName: activeChat?.name || 'Conversa',
      remoteJid: activeChat?.remoteJid || ''
    }));
  }, [isOpen, activeChat, activeMessages, selectedChatJids]);

  // 1. EXTRAÇÃO DE INSTAGRAM E REDES SOCIAIS
  const extractedInstagram = useMemo(() => {
    const list = [];
    const seenHandles = new Set();

    // Regex de menções @handle
    const atRegex = /@([a-zA-Z0-9._]{2,30})/g;
    // Regex de links do instagram
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._]{2,30})/gi;

    analyzedMessages.forEach(msg => {
      const text = `${msg.content || ''} ${msg.raw_message?.message?.imageMessage?.caption || ''} ${msg.raw_message?.message?.videoMessage?.caption || ''}`;
      if (!text) return;

      // Buscar por links de URL
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

      // Buscar por menções @handle
      while ((match = atRegex.exec(text)) !== null) {
        const rawHandle = match[1].replace(/[.,;:!?]+$/, '');
        // Excluir domínios como @gmail, @hotmail, @s.whatsapp.net, etc.
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
    const trackingRegex = /\b[A-Z]{2}\d{9}[A-Z]{2}\b/g; // Padrão Correios Brasil
    const cepRegex = /\b\d{5}[-\s]?\d{3}\b/g;
    const addressKeywords = /\b(rua|av\.?|avenida|alameda|travessa|bairro|apto|apartamento|bloco|nº|numero)\b/i;
    const financialRegex = /(?:R\$\s*[\d.,]+|\bpix\b|\bcomprovante\b|\btransfer[êe]ncia\b|\bpago\b)/i;

    analyzedMessages.forEach(msg => {
      const text = `${msg.content || ''} ${msg.raw_message?.message?.imageMessage?.caption || ''} ${msg.raw_message?.message?.videoMessage?.caption || ''}`;
      if (!text) return;

      // Telefones
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

      // E-mails
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

      // Códigos de rastreio Correios
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

      // CEPs e endereços
      if (cepRegex.test(text) || addressKeywords.test(text)) {
        addresses.push({
          text: text.trim(),
          sender: msg.sender_name || (msg.from_me ? 'Márcia' : msg.chatName),
          date: msg.created_at
        });
      }

      // Financeiro / PIX
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

    analyzedMessages.forEach(msg => {
      const raw = msg.raw_message?.message;
      if (!raw) return;

      // Imagem
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

      // Vídeo
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

      // Áudio
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

      // Documento
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

  // Filtragem da biblioteca de mídia
  const filteredMedia = useMemo(() => {
    return mediaLibrary.filter(item => {
      const matchType = mediaFilter === 'all' || item.type === mediaFilter;
      const matchSearch = !searchTerm || 
        (item.caption && item.caption.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.fileName && item.fileName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sender && item.sender.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [mediaLibrary, mediaFilter, searchTerm]);

  // Contadores de mídia
  const mediaCounts = useMemo(() => {
    return {
      all: mediaLibrary.length,
      image: mediaLibrary.filter(m => m.type === 'image').length,
      video: mediaLibrary.filter(m => m.type === 'video').length,
      audio: mediaLibrary.filter(m => m.type === 'audio').length,
      document: mediaLibrary.filter(m => m.type === 'document').length,
      totalSecondsAudio: mediaLibrary
        .filter(m => m.type === 'audio')
        .reduce((acc, curr) => acc + (curr.duration || 0), 0)
    };
  }, [mediaLibrary]);

  if (!isOpen) return null;

  // 4. ANÁLISE IA COM GEMINI
  const handleGenerateAiReport = async () => {
    setAiAnalyzing(true);
    try {
      const sampleTexts = analyzedMessages
        .slice(0, 100)
        .map(m => `[${m.sender_name || (m.from_me ? 'Márcia' : 'Cliente')}]: ${m.content || (m.message_type ? `[Mídia: ${m.message_type}]` : '')}`)
        .join('\n');

      const prompt = `Você é um Analista de Negócios e Especialista em Atendimento WhatsApp do Ateliê Amoreja (artesanato em amigurumi e moda infantil gerenciado por Márcia Reggiani).
Analise o seguinte extrato de mensagens recentes do WhatsApp e forneça um relatório executivo estruturado com:
1. Resumo Executivo da Conversa / Atendimento
2. Principais Assuntos e Intenções do Cliente (Dúvidas sobre receitas, encomendas, preços, frete, elogios)
3. Sentimento Geral do Cliente (Muito Satisfeito, Neutro, Dúvida ou Reclamação)
4. Oportunidades Comerciais e Próximos Passos recomendados para Márcia fechar mais vendas.

Mensagens analisadas:
${sampleTexts || 'Nenhuma mensagem recente encontrada.'}`;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      setAiReport(text);
    } catch (e) {
      setAiReport(`❌ Erro ao gerar análise com IA: ${e.message}`);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Copiar todos os Instagrams
  const handleCopyAllInstagram = () => {
    const text = extractedInstagram.map(ig => ig.handle).join(', ');
    navigator.clipboard.writeText(text);
    setCopiedType('instagram');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Exportar CSV
  const handleExportCSV = () => {
    const headers = ['Data', 'Remetente', 'Tipo', 'Conteúdo / Legenda', 'Mídia'];
    const rows = analyzedMessages.map(m => [
      `"${new Date(m.created_at).toLocaleString('pt-BR')}"`,
      `"${m.sender_name || (m.from_me ? 'Márcia' : 'Cliente')}"`,
      `"${m.message_type || 'texto'}"`,
      `"${(m.content || '').replace(/"/g, '""')}"`,
      `"${m.preview_url ? 'Sim' : 'Não'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_whatsapp_${activeChat?.name || 'amoreja'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir / Salvar PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="wab-report-modal-overlay" onClick={onClose}>
      <div className="wab-report-modal-container" onClick={e => e.stopPropagation()}>
        {/* Top Header */}
        <div className="wab-report-header">
          <div className="wab-report-title-row">
            <div className="wab-report-badge-icon">
              <Sparkles size={20} color="#008069" />
            </div>
            <div>
              <h2 className="wab-report-title">Central de Inteligência & Relatórios WhatsApp</h2>
              <p className="wab-report-subtitle">
                Extração automática de Instagrams, biblioteca de mídias, leads e análise inteligente • <strong>{targetScope}</strong>
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
        <div className="wab-report-body">
          {/* ════════ TAB 1: RESUMO EXECUTIVO & MÉTRICAS ════════ */}
          {activeTab === 'summary' && (
            <div className="wab-tab-pane">
              {/* Cards de Métricas Principais */}
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

              {/* Seção IA com Gemini */}
              <div className="wab-ai-diagnostic-card">
                <div className="wab-ai-diagnostic-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={20} color="#008069" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111b21' }}>
                      Diagnóstico & Resumo com IA Gemini
                    </h3>
                  </div>

                  <button 
                    type="button" 
                    className="wab-ai-generate-btn"
                    onClick={handleGenerateAiReport}
                    disabled={aiAnalyzing}
                  >
                    {aiAnalyzing ? <RefreshCw size={15} className="fa-spin" /> : <Sparkles size={15} />}
                    <span>{aiAnalyzing ? 'Analisando mensagens com IA...' : (aiReport ? 'Atualizar Diagnóstico' : 'Gerar Análise com IA')}</span>
                  </button>
                </div>

                {aiReport ? (
                  <div className="wab-ai-report-content">
                    {aiReport}
                  </div>
                ) : (
                  <div className="wab-ai-report-empty">
                    <Sparkles size={32} color="#86efac" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                      Clique em <strong>Gerar Análise com IA</strong> para o Gemini extrair automaticamente o sentimento do cliente, principais tópicos, intenções de compra e oportunidades de vendas para a Márcia.
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
                  {extractedInstagram.map(ig => (
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
              {/* Toolbar de Filtros de Mídia */}
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
                    onChange={e => setSearchTerm(e.target.value)}
                    className="wab-media-search-input"
                  />
                </div>
              </div>

              {/* Grid Visual de Mídia */}
              {filteredMedia.length === 0 ? (
                <div className="wab-empty-list">
                  <ImageIcon size={40} color="#94a3b8" />
                  <p>Nenhuma mídia encontrada com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="wab-media-gallery-grid">
                  {filteredMedia.map(item => (
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
                {/* Telefones & WhatsApps */}
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

                {/* E-mails */}
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

                {/* Códigos de Rastreio dos Correios */}
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

                {/* Endereços e CEPs */}
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

                {/* Transações & Comprovantes PIX */}
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
