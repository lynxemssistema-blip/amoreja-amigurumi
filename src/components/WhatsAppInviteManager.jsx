import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Send, 
  Search, 
  CheckSquare, 
  Square, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Pause, 
  Play, 
  Sparkles, 
  RefreshCw, 
  FileText, 
  Phone,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Timer
} from 'lucide-react';
import './WhatsAppInviteManager.css';

const EVO_API_KEY = import.meta.env.VITE_EVO_API_KEY;
const EVO_INSTANCE = import.meta.env.VITE_EVO_INSTANCE;
const EVO_URL = import.meta.env.VITE_EVO_URL;

// Modelos pré-definidos de convite
const TEMPLATES = [
  {
    id: 'loja',
    title: '✨ Conhecer a Loja Amoreja',
    text: `Olá {nome}! Tudo bem? 🧶✨\n\nPassando para te convidar a conhecer as novas receitas digitais da Amoreja Amigurumi!\n\nTemos passo a passos detalhados em PDF para você criar peças lindas com muito amor.\n\n👉 Acesse agora: https://amoreja.com.br\n\nQualquer dúvida estou à disposição por aqui!`
  },
  {
    id: 'jornal',
    title: '🗞️ Jornal do Amigurumi',
    text: `Oi {nome}! 🗞️🧶\n\nVocê já conferiu a edição deste mês do nosso Jornal do Amigurumi?\n\nTrazemos matérias inspiradoras, técnicas exclusivas e histórias da nossa comunidade de artesãs.\n\n👉 Leia gratuitamente: https://amoreja.com.br/jornal\n\nEspero que goste!`
  },
  {
    id: 'desconto',
    title: '🎁 Presente & Novidades',
    text: `Olá {nome}! Tudo bem? 🎁\n\nPreparamos uma seleção incrível de receitas de amigurumi com condições especiais esta semana.\n\n👉 Escolha as suas favoritas: https://amoreja.com.br/loja\n\nSe precisar de ajuda para escolher ou baixar, só me responder!`
  }
];

export default function WhatsAppInviteManager({ onBackToChat }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyNamed, setOnlyNamed] = useState(false);
  const [selectedJids, setSelectedJids] = useState(new Set());
  
  // Mensagem e Configuração
  const [messageTemplate, setMessageTemplate] = useState(TEMPLATES[0].text);
  const [standardDelaySeconds, setStandardDelaySeconds] = useState(5);
  
  // Estado do Disparo
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [sendStatusMap, setSendStatusMap] = useState({}); // jid -> 'pending' | 'sending' | 'success' | 'failed'
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [nextTargetName, setNextTargetName] = useState('');
  
  const isCancelledRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Carregar contatos da instância
  const fetchContacts = async () => {
    setLoading(true);
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
        // Filtrar apenas contatos individuais com identificador de telefone válido
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

        // Ordenar: primeiro os que têm nome, depois por ordem alfabética
        validContacts.sort((a, b) => {
          if (a.name && !b.name) return -1;
          if (!a.name && b.name) return 1;
          return (a.name || a.phone).localeCompare(b.name || b.phone);
        });

        setContacts(validContacts);
      }
    } catch (err) {
      console.error('Erro ao buscar contatos do WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Filtragem dos contatos
  const filteredContacts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return contacts.filter(c => {
      if (onlyNamed && !c.name) return false;
      if (!term) return true;
      const matchName = c.name && c.name.toLowerCase().includes(term);
      const matchPhone = c.phone.includes(term) || c.formattedPhone.includes(term);
      return matchName || matchPhone;
    });
  }, [contacts, searchTerm, onlyNamed]);

  // Manipuladores de Seleção
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

  const handleClearAllSelection = () => {
    if (isSending) return;
    setSelectedJids(new Set());
  };

  // Obter primeiro nome para personalização
  const getFirstName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.split(' ').filter(Boolean);
    return parts[0] || '';
  };

  // Gerar mensagem personalizada para um contato
  const formatMessageForContact = (contact) => {
    const firstName = getFirstName(contact.name);
    if (firstName) {
      return messageTemplate.replace(/\{nome\}/gi, firstName);
    }
    // Se não tiver nome cadastrado, substitui {nome} graciosamente
    return messageTemplate.replace(/\{nome\}[\s,!.]*/gi, '').trim();
  };

  // Exemplo de pré-visualização para o primeiro contato selecionado ou primeiro visível
  const previewContact = useMemo(() => {
    if (selectedJids.size > 0) {
      const firstSelectedJid = Array.from(selectedJids)[0];
      return contacts.find(c => c.jid === firstSelectedJid);
    }
    return filteredContacts[0] || null;
  }, [selectedJids, contacts, filteredContacts]);

  // Regra de Delay solicitada pelo usuário:
  // Se > 5 contatos selecionados: delay variável entre 2 e 7 minutos (120s a 420s)
  // Se <= 5 contatos: delay curto configurado (padrão 5 segundos)
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

  // Função de Envio em Lote
  const startBatchSending = async () => {
    const listToSend = contacts.filter(c => selectedJids.has(c.jid));
    if (listToSend.length === 0) {
      alert('Por favor, selecione ao menos um contato para enviar o convite.');
      return;
    }

    if (!messageTemplate.trim()) {
      alert('Por favor, escreva a mensagem de convite.');
      return;
    }

    const useVariableDelay = listToSend.length > 5;
    const delayDescription = useVariableDelay 
      ? 'variável de 2 a 7 minutos (proteção anti-bloqueio para mais de 5 contatos)' 
      : `${standardDelaySeconds} segundos`;

    const confirmMsg = `Deseja iniciar o envio do convite para ${listToSend.length} contato(s)?\n\nTempo entre envios: ${delayDescription}.`;
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

    // Marcar todos como pendentes
    const initialStatus = {};
    listToSend.forEach(c => { initialStatus[c.jid] = 'pending'; });
    setSendStatusMap(prev => ({ ...prev, ...initialStatus }));

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < listToSend.length; i++) {
      if (isCancelledRef.current) break;

      // Se pausado, espera despausar
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise(r => setTimeout(r, 600));
      }
      if (isCancelledRef.current) break;

      const contact = listToSend[i];
      setSendStatusMap(prev => ({ ...prev, [contact.jid]: 'sending' }));

      const text = formatMessageForContact(contact);

      try {
        const res = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
          method: 'POST',
          headers: {
            'apikey': EVO_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            number: contact.phone,
            text: text,
            options: {
              delay: 1200,
              presence: 'composing'
            }
          })
        });

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

      // Aguarda o delay configurado antes do próximo envio (exceto no último item)
      if (i < listToSend.length - 1 && !isCancelledRef.current) {
        const nextContact = listToSend[i + 1];
        setNextTargetName(nextContact.name || nextContact.formattedPhone);

        // Se mais de 5 contatos, gera tempo variável de 2 a 7 minutos (120s a 420s)
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
    <div className="wa-invite-container">
      {/* ── BARRA SUPERIOR DE CABEÇALHO ── */}
      <div className="wa-invite-header">
        <div className="wa-invite-title-group">
          <h2>
            <Users size={22} className="text-wa-green" />
            Disparo de Convites via WhatsApp
          </h2>
          <p className="wa-invite-subtitle">
            Selecione contatos da sua agenda conectada ({contacts.length} contatos carregados) e envie mensagens personalizadas de convite com proteção anti-bloqueio.
          </p>
        </div>

        <div className="wa-invite-top-actions">
          {onBackToChat && (
            <button type="button" onClick={onBackToChat} className="btn-wa-secondary">
              Voltar para o Chat
            </button>
          )}
          <button type="button" onClick={fetchContacts} disabled={loading || isSending} className="btn-wa-refresh" title="Recarregar Agenda">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {loading ? 'Carregando...' : 'Atualizar Contatos'}
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO DIVIDIDO EM 2 COLUNAS (EDITOR E LISTA) ── */}
      <div className="wa-invite-grid">
        
        {/* COLUNA ESQUERDA: EDITOR DE MENSAGEM & DISPARO */}
        <div className="wa-invite-editor-card">
          <div className="card-header">
            <h3><FileText size={18} /> Mensagem de Convite</h3>
            <span className="badge-variable font-mono">{`{nome}`} disponível</span>
          </div>

          {/* Modelos Prontos */}
          <div className="templates-selector">
            <span className="label-sm">Modelos Prontos:</span>
            <div className="templates-pills">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`template-pill ${messageTemplate === t.text ? 'active' : ''}`}
                  onClick={() => setMessageTemplate(t.text)}
                  disabled={isSending}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de Texto do Convite */}
          <div className="form-group mt-3">
            <label className="label-sm">
              Texto da Mensagem:
              <span className="label-hint">Dica: use <strong>{`{nome}`}</strong> para chamar o contato pelo primeiro nome.</span>
            </label>
            <textarea
              rows={7}
              value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)}
              disabled={isSending}
              className="wa-message-textarea"
              placeholder="Digite o convite aqui..."
            />
          </div>

          {/* Pré-visualização da Mensagem */}
          {previewContact && (
            <div className="preview-bubble-card">
              <span className="preview-label">
                <Sparkles size={13} /> Prévia da Mensagem (ex: {previewContact.name || previewContact.formattedPhone}):
              </span>
              <div className="preview-bubble">
                {formatMessageForContact(previewContact)}
              </div>
            </div>
          )}

          {/* Banner de Proteção Anti-Bloqueio (> 5 Contatos) */}
          {isAntiBanActive ? (
            <div className="anti-ban-alert">
              <ShieldAlert size={20} className="text-amber-600 flex-shrink-0" style={{ marginTop: '2px' }} />
              <div>
                <h4>Proteção Anti-Bloqueio Automática Ativada</h4>
                <p>
                  Você selecionou <strong>{selectedJids.size} contatos</strong> (mais de 5). Para proteger o seu número contra bloqueios no WhatsApp, o sistema aplicará automaticamente um <strong>tempo variável aleatório de 2 a 7 minutos</strong> entre cada mensagem.
                </p>
              </div>
            </div>
          ) : (
            <div className="delay-control-box mt-3">
              <div className="delay-header">
                <span className="delay-title">
                  <Clock size={16} /> Intervalo entre Envios (≤ 5 contatos):
                </span>
                <strong className="delay-value">{standardDelaySeconds} segundos</strong>
              </div>
              <input 
                type="range" 
                min="3" 
                max="15" 
                step="1"
                value={standardDelaySeconds} 
                onChange={e => setStandardDelaySeconds(Number(e.target.value))}
                disabled={isSending}
                className="delay-slider"
              />
              <div className="delay-hints">
                <span className="hint-safe"><ShieldCheck size={13} /> Seleções de até 5 contatos usam envio ágil com delay curto.</span>
              </div>
            </div>
          )}

          {/* Barra de Progresso Durante o Disparo */}
          {isSending && (
            <div className="sending-progress-card mt-3">
              <div className="progress-info-row">
                <span>Progresso: <strong>{sendProgress.current} de {sendProgress.total}</strong></span>
                <span className="progress-counts">
                  <span className="text-success">✅ {sendProgress.success}</span> | <span className="text-danger">❌ {sendProgress.failed}</span>
                </span>
              </div>
              <div className="progress-bar-track">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${(sendProgress.current / Math.max(sendProgress.total, 1)) * 100}%` }}
                />
              </div>

              {/* Countdown ao vivo entre envios */}
              {countdownRemaining > 0 && (
                <div className="countdown-box">
                  <Timer size={16} className="spin" />
                  <span>
                    Aguardando intervalo seguro: <strong>{formatCountdown(countdownRemaining)} min</strong> antes de enviar para <em>{nextTargetName}</em>...
                  </span>
                </div>
              )}

              <div className="sending-actions-row mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsPaused(!isPaused)} 
                  className="btn-pause"
                >
                  {isPaused ? <><Play size={14} /> Retomar</> : <><Pause size={14} /> Pausar</>}
                </button>
                <button 
                  type="button" 
                  onClick={handleCancelSending} 
                  className="btn-cancel-batch"
                >
                  <XCircle size={14} /> Cancelar Restantes
                </button>
              </div>
            </div>
          )}

          {/* Botão de Disparo */}
          {!isSending && (
            <button
              type="button"
              onClick={startBatchSending}
              disabled={selectedJids.size === 0 || !messageTemplate.trim()}
              className="btn-start-send"
            >
              <Send size={18} />
              <span>
                {selectedJids.size === 0 
                  ? 'Selecione os Contatos ao Lado' 
                  : `Enviar Convites (${selectedJids.size} Selecionados)`}
              </span>
            </button>
          )}
        </div>

        {/* COLUNA DIREITA: LISTA E SELEÇÃO DE CONTATOS */}
        <div className="wa-invite-contacts-card">
          <div className="card-header">
            <h3><Phone size={18} /> Contatos da Agenda ({filteredContacts.length})</h3>
            <div className="selected-counter">
              <strong>{selectedJids.size}</strong> selecionado(s)
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="contacts-filter-bar">
            <div className="search-box">
              <Search size={15} color="#54656f" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <label className="checkbox-filter">
              <input
                type="checkbox"
                checked={onlyNamed}
                onChange={e => setOnlyNamed(e.target.checked)}
              />
              <span>Apenas com nome</span>
            </label>
          </div>

          {/* Ações em Massa de Seleção */}
          <div className="selection-actions-bar">
            <div className="action-buttons-group">
              <button type="button" onClick={handleSelectAllVisible} disabled={isSending} className="btn-filter-action">
                <CheckSquare size={14} /> Marcar Visíveis ({filteredContacts.length})
              </button>
              <button type="button" onClick={handleDeselectAllVisible} disabled={isSending} className="btn-filter-action">
                <Square size={14} /> Desmarcar Visíveis
              </button>
            </div>
            {selectedJids.size > 0 && (
              <button type="button" onClick={handleClearAllSelection} disabled={isSending} className="btn-clear-selection">
                Limpar Todos ({selectedJids.size})
              </button>
            )}
          </div>

          {/* Lista de Contatos com Scroll */}
          <div className="contacts-scroll-area">
            {loading ? (
              <div className="empty-contacts-state">
                <RefreshCw size={24} className="spin text-wa-green" />
                <p>Carregando contatos da sua conta WhatsApp...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="empty-contacts-state">
                <Users size={32} color="#94a3b8" />
                <p>Nenhum contato encontrado para o filtro aplicado.</p>
              </div>
            ) : (
              filteredContacts.map(c => {
                const isSelected = selectedJids.has(c.jid);
                const status = sendStatusMap[c.jid];
                const initial = (c.name || c.phone).charAt(0).toUpperCase();

                return (
                  <div
                    key={c.id}
                    className={`contact-item-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleSelect(c.jid)}
                  >
                    <div className="item-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // controlado pelo onClick da linha
                        disabled={isSending}
                      />
                    </div>

                    <div className="contact-avatar">
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

                    <div className="contact-meta">
                      <strong className="contact-name">{c.name || 'Contato sem nome'}</strong>
                      <span className="contact-phone font-mono">{c.formattedPhone}</span>
                    </div>

                    {/* Status de Envio */}
                    <div className="contact-status-col">
                      {status === 'pending' && (
                        <span className="status-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                          Pendente
                        </span>
                      )}
                      {status === 'sending' && (
                        <span className="status-badge sending">
                          <RefreshCw size={12} className="spin" /> Enviando...
                        </span>
                      )}
                      {status === 'success' && (
                        <span className="status-badge success">
                          <CheckCircle2 size={13} /> Enviado
                        </span>
                      )}
                      {status === 'failed' && (
                        <span className="status-badge failed">
                          <XCircle size={13} /> Falha
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
