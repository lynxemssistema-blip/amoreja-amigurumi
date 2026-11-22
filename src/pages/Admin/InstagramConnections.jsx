import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import {
  Users, Search, UserCheck, UserPlus, Trash2, RefreshCw,
  CheckCircle, AlertCircle, X, Network, List, Save,
  ChevronDown, ChevronUp, Download, Monitor, Play, Square,
  Camera, Zap, BarChart2, WifiOff, Copy, LogIn
} from 'lucide-react';
import InstagramIcon from '../../components/InstagramIcon';
import './InstagramConnections.css';

// ─── utils ────────────────────────────────────────────────────
const norm  = (u = '') => u.replace('@', '').trim().toLowerCase();
const AGENT = 'http://localhost:7788';

export default function InstagramConnections() {

  // ── Contas Instagram ──
  const [accounts, setAccounts]             = useState([]);
  const [activeAccount, setActiveAccount]   = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [imgErrors, setImgErrors]           = useState({});

  // ── Abas ──
  const [tab, setTab] = useState('referencia');

  // ══════════════════════════════════════════════════════════════
  // ABA 1 — LISTA DE REFERÊNCIA
  // ══════════════════════════════════════════════════════════════
  const [refRaw, setRefRaw]           = useState('');        // textarea
  const [refList, setRefList]         = useState([]);        // salva no banco
  const [savingRef, setSavingRef]     = useState(false);
  const [refSaved, setRefSaved]       = useState(false);
  const [refExpanded, setRefExpanded] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // ABA 2 — VERIFICADOR (Browser Agent)
  // ══════════════════════════════════════════════════════════════
  const [agentStatus, setAgentStatus]           = useState('unknown');
  const [agentOpening, setAgentOpening]         = useState(false);
  const [agentError, setAgentError]             = useState('');
  const [screenshot, setScreenshot]             = useState(null);
  const [screenshotTs, setScreenshotTs]         = useState(0);

  // Solicitações pendentes
  const [pendingRequesters, setPendingRequesters]       = useState([]);
  const [loadingPending, setLoadingPending]             = useState(false);
  const [pendingError, setPendingError]                 = useState('');

  // Análise em andamento
  const [analysisRunning, setAnalysisRunning]     = useState(false);
  const [analysisLogs, setAnalysisLogs]           = useState([]);
  const [analysisResults, setAnalysisResults]     = useState([]);
  const [selectedResult, setSelectedResult]       = useState(null);

  // Verificação manual de um perfil
  const [manualUsername, setManualUsername]       = useState('');
  const [checkingManual, setCheckingManual]       = useState(false);
  const [manualResult, setManualResult]           = useState(null);

  const pollRef    = useRef(null);
  const screenshotRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (activeAccount) loadRefList(activeAccount.instagram_user_id);
  }, [activeAccount]);

  useEffect(() => {
    if (tab === 'verificador') {
      checkAgent();
    } else {
      stopScreenshotLoop();
      stopPoll();
    }
    return () => { stopScreenshotLoop(); stopPoll(); };
  }, [tab]);

  // ─────────────────────────────────────────────────────────────
  // Contas
  // ─────────────────────────────────────────────────────────────
  async function loadAccounts() {
    if (!isSupabaseConfigured()) return;
    setLoadingAccounts(true);
    try {
      const { data } = await supabase.from('new_amoreja_instagram_accounts')
        .select('*').order('created_at', { ascending: true });
      setAccounts(data || []);
      const saved = localStorage.getItem('selected_ig_account_id');
      const active = data?.find(a => a.id === saved) || data?.[0] || null;
      if (active) setActiveAccount(active);
    } finally { setLoadingAccounts(false); }
  }

  function switchAccount(id) {
    const acc = accounts.find(a => a.id === id);
    if (acc) { setActiveAccount(acc); localStorage.setItem('selected_ig_account_id', id); }
  }

  // ─────────────────────────────────────────────────────────────
  // Lista de Referência — carrega / salva
  // ─────────────────────────────────────────────────────────────
  function refKey(igId) { return igId ? `ig_ref_contacts_${igId}` : 'ig_ref_contacts'; }

  async function loadRefList(igId) {
    setRefList([]); setRefRaw('');
    try {
      const { data } = await supabase.from('new_amoreja_settings')
        .select('value').eq('key', refKey(igId)).maybeSingle();
      if (data?.value) {
        const list = JSON.parse(data.value);
        setRefList(list);
        setRefRaw(list.join('\n'));
      }
    } catch {}
  }

  async function saveRefList() {
    const list = [...new Set(
      refRaw.split(/[\n,;\t]+/)
        .map(norm)
        .filter(u => u.length > 0 && /^[a-z0-9._]+$/.test(u))
    )];
    setSavingRef(true);
    try {
      const key = refKey(activeAccount?.instagram_user_id);
      await supabase.from('new_amoreja_settings')
        .upsert({ key, value: JSON.stringify(list), updated_at: new Date().toISOString() });
      setRefList(list);
      setRefSaved(true);
      setTimeout(() => setRefSaved(false), 3000);
    } finally { setSavingRef(false); }
  }

  // ─────────────────────────────────────────────────────────────
  // Agent: status / open / close
  // ─────────────────────────────────────────────────────────────
  async function checkAgent() {
    try {
      const r = await fetch(`${AGENT}/status`, { signal: AbortSignal.timeout(3000) });
      const d = await r.json();
      setAgentStatus(d.browserOpen ? 'open' : 'closed');
      setAnalysisRunning(d.analysisRunning || false);
      if (d.analysisRunning) startPoll();
    } catch {
      setAgentStatus('offline');
    }
  }

  async function openBrowser() {
    setAgentOpening(true); setAgentError('');
    try {
      const r = await fetch(`${AGENT}/open-browser`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setAgentStatus('open');
      startScreenshotLoop();
    } catch (e) { setAgentError(e.message); }
    finally { setAgentOpening(false); }
  }

  async function closeBrowser() {
    stopScreenshotLoop();
    await fetch(`${AGENT}/close-browser`, { method: 'POST' }).catch(() => {});
    setAgentStatus('closed'); setScreenshot(null);
  }

  // ─────────────────────────────────────────────────────────────
  // Screenshot loop
  // ─────────────────────────────────────────────────────────────
  function startScreenshotLoop() {
    stopScreenshotLoop();
    takeScreenshot();
    screenshotRef.current = setInterval(takeScreenshot, 4000);
  }

  function stopScreenshotLoop() {
    if (screenshotRef.current) { clearInterval(screenshotRef.current); screenshotRef.current = null; }
  }

  async function takeScreenshot() {
    try {
      const r = await fetch(`${AGENT}/screenshot`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const blob = await r.blob();
        setScreenshot(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        setScreenshotTs(Date.now());
      }
    } catch {}
  }

  // ─────────────────────────────────────────────────────────────
  // Solicitações pendentes
  // ─────────────────────────────────────────────────────────────
  async function loadPendingRequests() {
    setLoadingPending(true); setPendingError('');
    try {
      const r = await fetch(`${AGENT}/pending-requests`, { signal: AbortSignal.timeout(30000) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setPendingRequesters(d.requesters || []);
    } catch (e) {
      setPendingError(e.message);
    } finally { setLoadingPending(false); }
  }

  // ─────────────────────────────────────────────────────────────
  // Análise completa de todos os pendentes
  // ─────────────────────────────────────────────────────────────
  async function startFullAnalysis() {
    if (!refList.length) { setAgentError('Adicione perfis na lista de referência primeiro.'); return; }
    if (!pendingRequesters.length) { setAgentError('Carregue as solicitações pendentes primeiro.'); return; }
    setAgentError('');
    setAnalysisResults([]);
    setAnalysisLogs([]);
    setSelectedResult(null);

    try {
      const r = await fetch(`${AGENT}/analyze-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceContacts: refList, requesters: pendingRequesters })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setAnalysisRunning(true);
      startPoll();
    } catch (e) { setAgentError(e.message); }
  }

  // ─────────────────────────────────────────────────────────────
  // Verificação manual de 1 perfil
  // ─────────────────────────────────────────────────────────────
  async function checkManual(e) {
    e.preventDefault();
    if (!manualUsername || !refList.length) return;
    setCheckingManual(true); setManualResult(null);
    try {
      const r = await fetch(`${AGENT}/check-one`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: norm(manualUsername), referenceContacts: refList })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setManualResult(d);
      takeScreenshot();
    } catch (e) { setAgentError(e.message); }
    finally { setCheckingManual(false); }
  }

  // ─────────────────────────────────────────────────────────────
  // Poll de progresso
  // ─────────────────────────────────────────────────────────────
  function startPoll() {
    stopPoll();
    pollRef.current = setInterval(pollProgress, 2500);
  }
  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function pollProgress() {
    try {
      const r = await fetch(`${AGENT}/analysis-progress`);
      const d = await r.json();
      setAnalysisLogs(d.logs || []);
      setAnalysisResults(d.results || []);
      if (!d.running) {
        setAnalysisRunning(false);
        stopPoll();
      }
    } catch {}
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers visuais
  // ─────────────────────────────────────────────────────────────
  function scoreClass(s) {
    if (s >= 80) return 'score-high';
    if (s >= 40) return 'score-mid';
    return 'score-low';
  }
  function scoreEmoji(r) {
    if (r.profilePrivate) return '🔒';
    if (r.score >= 80) return '✅';
    if (r.score >= 40) return '⚠️';
    return '❌';
  }

  const parsedRef = [...new Set(
    refRaw.split(/[\n,;\t]+/).map(norm).filter(u => u.length > 0 && /^[a-z0-9._]+$/.test(u))
  )];

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="ig-connections-page">

      {/* ══ TOPBAR ══ */}
      <div className="igc-topbar">
        <div className="igc-topbar-left">
          <div className="igc-topbar-icon"><Network size={18} /></div>
          <div>
            <h1 className="igc-topbar-title">Verificador de Conexões</h1>
            <p className="igc-topbar-subtitle">
              Veja se quem pediu para te seguir também segue seus contatos de referência
            </p>
          </div>
        </div>

        {/* Seletor de conta */}
        <div className="igc-account-selector-wrap">
          <span className="igc-account-selector-label">Gerenciando:</span>
          {loadingAccounts ? (
            <div className="igc-account-loading"><RefreshCw size={14} className="igc-spin" /></div>
          ) : accounts.length === 0 ? (
            <div className="igc-no-account"><AlertCircle size={14} /> Sem conta</div>
          ) : (
            <div className="igc-account-selector">
              <div className="igc-account-avatar">
                {activeAccount?.profile_picture_url && !imgErrors[activeAccount.id] ? (
                  <img src={activeAccount.profile_picture_url}
                    alt="" onError={() => setImgErrors(p => ({ ...p, [activeAccount.id]: true }))} />
                ) : <InstagramIcon size={14} />}
              </div>
              <select value={activeAccount?.id || ''} onChange={e => switchAccount(e.target.value)}
                className="igc-account-select">
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.account_name || a.instagram_username}
                    {a.instagram_username ? ` (@${a.instagram_username})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ══ STATS ══ */}
      <div className="igc-stats-row">
        <div className="igc-stat-chip">
          <List size={13} />
          <span><strong>{refList.length}</strong> na lista de referência</span>
        </div>
        <div className="igc-stat-chip">
          <Users size={13} />
          <span><strong>{pendingRequesters.length}</strong> solicitações pendentes</span>
        </div>
        <div className="igc-stat-chip">
          <Monitor size={13} />
          <span>
            Agente:{' '}
            {agentStatus === 'open' && <strong style={{ color: '#22c55e' }}>● Online</strong>}
            {agentStatus === 'closed' && <strong style={{ color: '#f59e0b' }}>Fechado</strong>}
            {agentStatus === 'offline' && <strong style={{ color: '#ef4444' }}>Offline</strong>}
            {agentStatus === 'unknown' && <strong style={{ color: '#64748b' }}>--</strong>}
          </span>
        </div>
      </div>

      {/* ══ ABAS ══ */}
      <div className="igc-tabs">
        <button
          className={`igc-tab ${tab === 'referencia' ? 'igc-tab--active' : ''}`}
          onClick={() => setTab('referencia')}
        >
          <List size={15} /> Lista de Referência
          {refList.length > 0 && <span className="igc-tab-badge">{refList.length}</span>}
        </button>
        <button
          className={`igc-tab igc-tab--agent ${tab === 'verificador' ? 'igc-tab--active' : ''}`}
          onClick={() => setTab('verificador')}
        >
          <Monitor size={15} /> Verificador
          {agentStatus === 'open' && <span className="igc-tab-dot igc-tab-dot--on" />}
          {agentStatus === 'offline' && <span className="igc-tab-dot igc-tab-dot--off" />}
        </button>
        <button
          className={`igc-tab ${tab === 'resultados' ? 'igc-tab--active' : ''}`}
          onClick={() => setTab('resultados')}
        >
          <BarChart2 size={15} /> Resultados
          {analysisResults.length > 0 && <span className="igc-tab-badge">{analysisResults.length}</span>}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ABA 1 — LISTA DE REFERÊNCIA
      ════════════════════════════════════════════════════════════ */}
      {tab === 'referencia' && (
        <div className="igc-panel">
          <div className="igc-panel-header">
            <List size={20} />
            <h2>Lista de Referência</h2>
          </div>
          <p className="igc-panel-desc">
            Cadastre aqui os perfis do Instagram que fazem parte da sua comunidade.
            Quando alguém pedir para te seguir, o sistema verificará se ela segue
            <strong> todos</strong> os perfis desta lista.
          </p>

          <div className="igc-info-banner" style={{ marginBottom: '20px' }}>
            <InstagramIcon size={14} />
            <p>
              Esta lista é salva por conta. Troque a conta no topo para ter listas separadas.
              Cole um username por linha — o @ é opcional.
            </p>
          </div>

          <div className="igc-form-group">
            <label htmlFor="igc-ref-list">
              Seus contatos de referência
              {parsedRef.length > 0 && (
                <span className="igc-label-count">{parsedRef.length} detectados</span>
              )}
            </label>
            <textarea
              id="igc-ref-list"
              className="igc-textarea igc-textarea--large"
              placeholder={"@amiga_croche\nbeltrana_amigurumi\ncirculinho_craft\n..."}
              value={refRaw}
              onChange={e => setRefRaw(e.target.value)}
              rows={16}
            />
          </div>

          <div className="igc-form-actions">
            {refSaved && (
              <span className="igc-success-msg"><CheckCircle size={14} /> Salvo!</span>
            )}
            <button
              className="igc-btn-primary"
              onClick={saveRefList}
              disabled={savingRef || parsedRef.length === 0}
            >
              {savingRef
                ? <><RefreshCw size={14} className="igc-spin" /> Salvando...</>
                : <><Save size={14} /> Salvar Lista ({parsedRef.length})</>
              }
            </button>
          </div>

          {refList.length > 0 && (
            <div className="igc-saved-preview">
              <button className="igc-preview-toggle" onClick={() => setRefExpanded(v => !v)}>
                <CheckCircle size={14} />
                {refList.length} contatos de referência salvos
                {refExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {refExpanded && (
                <div className="igc-preview-chips">
                  {refList.map(u => (
                    <a key={u} href={`https://instagram.com/${u}`} target="_blank"
                      rel="noopener noreferrer" className="igc-chip igc-chip--link">
                      @{u}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ABA 2 — VERIFICADOR (Browser Agent)
      ════════════════════════════════════════════════════════════ */}
      {tab === 'verificador' && (
        <div className="igc-verificador-layout">

          {/* ── Coluna esquerda: controles ── */}
          <div className="igc-verif-controls">

            {/* Status do agente */}
            <div className="igc-panel" style={{ marginBottom: '14px' }}>
              <div className="igc-panel-header">
                <Monitor size={18} /> <h2>Agente de Browser</h2>
              </div>
              <p className="igc-panel-desc">
                O agente usa o <strong>seu Chrome</strong> (já logado no Instagram)
                para navegar automaticamente e verificar seguidos.
              </p>

              <div className={`igc-agent-status igc-agent-status--${agentStatus}`}>
                <div className="igc-agent-status-dot" />
                <span>
                  {agentStatus === 'unknown'  && 'Verificando...'}
                  {agentStatus === 'offline'  && 'Servidor offline'}
                  {agentStatus === 'closed'   && 'Servidor ativo · Chrome fechado'}
                  {agentStatus === 'open'     && 'Chrome aberto e pronto!'}
                </span>
                <button className="igc-btn-refresh" onClick={checkAgent}>
                  <RefreshCw size={13} />
                </button>
              </div>

              {agentStatus === 'offline' && (
                <div className="igc-agent-cmd">
                  <Monitor size={13} />
                  <code>npm run ig-agent</code>
                  <span>Execute em outro terminal e volte aqui</span>
                </div>
              )}

              <div className="igc-agent-btns">
                {agentStatus !== 'open' ? (
                  <button className="igc-btn-primary" onClick={openBrowser}
                    disabled={agentOpening || agentStatus === 'offline'}>
                    {agentOpening
                      ? <><RefreshCw size={14} className="igc-spin" /> Abrindo...</>
                      : <><Play size={14} /> Abrir Chrome</>
                    }
                  </button>
                ) : (
                  <button className="igc-btn-secondary" onClick={closeBrowser}>
                    <Square size={14} /> Fechar Chrome
                  </button>
                )}
                <button className="igc-btn-secondary" onClick={takeScreenshot}
                  disabled={agentStatus !== 'open'}>
                  <Camera size={14} /> Capturar Tela
                </button>
              </div>

              {agentError && (
                <div className="igc-alert igc-alert--error" style={{ marginTop: '12px' }}>
                  <AlertCircle size={14} /> {agentError}
                </div>
              )}
            </div>

            {/* ── Solicitações Pendentes ── */}
            <div className="igc-panel" style={{ marginBottom: '14px' }}>
              <div className="igc-panel-header">
                <UserPlus size={18} /> <h2>Solicitações Pendentes</h2>
              </div>
              <p className="igc-panel-desc">
                O agente abre o seu Instagram e lista quem está aguardando ser aprovado para te seguir.
              </p>

              {refList.length === 0 && (
                <div className="igc-alert igc-alert--warning" style={{ marginBottom: '12px' }}>
                  <AlertCircle size={14} />
                  Configure a{' '}
                  <button className="igc-inline-link" onClick={() => setTab('referencia')}>
                    lista de referência →
                  </button>
                </div>
              )}

              <button
                className="igc-btn-primary"
                onClick={loadPendingRequests}
                disabled={loadingPending || agentStatus !== 'open'}
                style={{ width: '100%', marginBottom: '10px' }}
              >
                {loadingPending
                  ? <><RefreshCw size={14} className="igc-spin" /> Buscando no Instagram...</>
                  : <><Download size={14} /> Buscar Solicitações Pendentes</>
                }
              </button>

              {pendingError && (
                <div className="igc-alert igc-alert--error">
                  <AlertCircle size={14} /> {pendingError}
                </div>
              )}

              {pendingRequesters.length > 0 && (
                <div className="igc-pending-list">
                  {pendingRequesters.map((r, i) => (
                    <div key={i} className="igc-pending-item">
                      <InstagramIcon size={14} />
                      <a href={`https://instagram.com/${r.username}`} target="_blank"
                        rel="noopener noreferrer" className="igc-inline-link">
                        @{r.username}
                      </a>
                      <button
                        className="igc-btn-check-one"
                        onClick={() => { setManualUsername(r.username); }}
                        title="Verificar este perfil"
                      >
                        <Zap size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {pendingRequesters.length > 0 && (
                <button
                  className="igc-btn-primary"
                  onClick={startFullAnalysis}
                  disabled={analysisRunning || agentStatus !== 'open' || !refList.length}
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  {analysisRunning
                    ? <><RefreshCw size={14} className="igc-spin" /> Analisando {pendingRequesters.length} perfis...</>
                    : <><Zap size={14} /> Analisar Todos ({pendingRequesters.length})</>
                  }
                </button>
              )}
            </div>

            {/* ── Verificação manual ── */}
            <div className="igc-panel">
              <div className="igc-panel-header">
                <UserCheck size={18} /> <h2>Verificar Perfil Avulso</h2>
              </div>
              <p className="igc-panel-desc">
                Informe um @username e verifique manualmente se ele segue sua lista de referência.
              </p>
              <form onSubmit={checkManual} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="igc-input-prefix">
                  <span>@</span>
                  <input
                    type="text"
                    placeholder="username_do_perfil"
                    value={manualUsername}
                    onChange={e => setManualUsername(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <button type="submit" className="igc-btn-primary"
                  disabled={checkingManual || agentStatus !== 'open' || !manualUsername || !refList.length}>
                  {checkingManual
                    ? <><RefreshCw size={14} className="igc-spin" /> Verificando...</>
                    : <><Zap size={14} /> Verificar</>
                  }
                </button>
              </form>

              {manualResult && (
                <div className={`igc-check-result ${manualResult.score >= 80 ? 'igc-check-result--yes' : 'igc-check-result--no'}`}
                  style={{ marginTop: '12px' }}>
                  <div className="igc-check-result-icon">
                    {manualResult.score >= 80 ? <CheckCircle size={26} /> : <X size={26} />}
                  </div>
                  <div className="igc-check-result-text">
                    <strong>@{manualResult.username}</strong>
                    <span className={manualResult.score >= 80 ? 'igc-result-yes' : 'igc-result-no'}>
                      {' '}{manualResult.score}% — {manualResult.found?.length}/{refList.length} contatos em comum
                    </span>
                    {manualResult.profilePrivate && <small>🔒 Conta privada</small>}
                  </div>
                </div>
              )}
            </div>

            {/* ── Logs da análise ── */}
            {(analysisRunning || analysisLogs.length > 0) && (
              <div className="igc-logs-box">
                <div className="igc-logs-header">
                  <RefreshCw size={12} className={analysisRunning ? 'igc-spin' : ''} />
                  <span>{analysisRunning ? 'Análise em andamento...' : 'Log da última análise'}</span>
                  {!analysisRunning && <button className="igc-btn-refresh" onClick={() => setTab('resultados')}>
                    Ver resultados →
                  </button>}
                </div>
                <div className="igc-logs-content">
                  {analysisLogs.slice(-20).map((l, i) => (
                    <div key={i} className={`igc-log-line igc-log-${l.level}`}>
                      <span className="igc-log-time">
                        {new Date(l.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {l.msg}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Coluna direita: Screenshot ── */}
          <div className="igc-verif-preview">
            <div className="igc-preview-header">
              <Monitor size={15} />
              <span>Visualização do Browser</span>
              {agentStatus === 'open' && <span className="igc-live-badge">● LIVE</span>}
            </div>
            {screenshot ? (
              <img src={screenshot} alt="Browser" className="igc-browser-screenshot"
                key={screenshotTs} />
            ) : (
              <div className="igc-preview-empty">
                <Monitor size={44} strokeWidth={1} />
                <p>{agentStatus === 'open'
                  ? 'Clique em "Capturar Tela" para ver o browser'
                  : 'Abra o Chrome para ver o preview aqui'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ABA 3 — RESULTADOS
      ════════════════════════════════════════════════════════════ */}
      {tab === 'resultados' && (
        <div className="igc-results-layout">

          {/* ── Sidebar ── */}
          <aside className="igc-results-sidebar">
            <div className="igc-sidebar-header">
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--igc-text-muted)' }}>
                {analysisResults.length} perfil(is) analisado(s)
              </span>
              <button className="igc-btn-add" onClick={() => setTab('verificador')} title="Verificar mais">
                <Zap size={14} />
              </button>
            </div>

            {analysisResults.length === 0 ? (
              <div className="igc-empty-list">
                <BarChart2 size={32} />
                <p>Sem resultados ainda</p>
                <button className="igc-btn-primary"
                  style={{ fontSize: '0.78rem', padding: '7px 14px' }}
                  onClick={() => setTab('verificador')}>
                  <Monitor size={13} /> Ir para Verificador
                </button>
              </div>
            ) : (
              <ul className="igc-profile-list">
                {[...analysisResults]
                  .sort((a, b) => b.score - a.score)
                  .map((r, i) => (
                    <li key={i}
                      className={`igc-profile-item ${selectedResult?.username === r.username ? 'igc-profile-item--active' : ''}`}
                      onClick={() => setSelectedResult(r)}>
                      <div className="igc-profile-avatar"><InstagramIcon size={15} /></div>
                      <div className="igc-profile-info">
                        <span className="igc-profile-username">@{r.username}</span>
                        <span className="igc-profile-meta">
                          {r.profilePrivate ? '🔒 Privado' : `${r.found?.length}/${refList.length} em comum`}
                        </span>
                      </div>
                      <div className={`igc-score-badge ${scoreClass(r.score)}`}>
                        {scoreEmoji(r)} {r.score}%
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </aside>

          {/* ── Detalhe ── */}
          <main className="igc-results-main">
            {selectedResult ? (
              <div className="igc-analysis-panel">
                <div className="igc-analysis-header">
                  <div className="igc-analysis-avatar"><InstagramIcon size={24} /></div>
                  <div className="igc-analysis-profile-info">
                    <h2>
                      <a href={`https://instagram.com/${selectedResult.username}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}>
                        @{selectedResult.username} ↗
                      </a>
                    </h2>
                    <span className="igc-analysis-meta">
                      {selectedResult.found?.length} de {refList.length} contatos em comum
                    </span>
                  </div>
                </div>

                <div className={`igc-score-card ${scoreClass(selectedResult.score)}`}>
                  <div className="igc-score-circle">
                    <span className="igc-score-value">{selectedResult.score}%</span>
                  </div>
                  <div className="igc-score-details">
                    <span className="igc-score-label">
                      {selectedResult.profilePrivate && '🔒 Conta Privada'}
                      {!selectedResult.profilePrivate && selectedResult.score >= 80 && '✅ Fortemente Conectado'}
                      {!selectedResult.profilePrivate && selectedResult.score >= 40 && selectedResult.score < 80 && '⚠️ Parcialmente Conectado'}
                      {!selectedResult.profilePrivate && selectedResult.score < 40 && selectedResult.score > 0 && '❌ Pouco Conectado'}
                      {!selectedResult.profilePrivate && selectedResult.score === 0 && '❌ Sem Conexão'}
                    </span>
                    <span className="igc-score-desc">
                      Segue <strong>{selectedResult.found?.length}</strong> dos{' '}
                      <strong>{refList.length}</strong> contatos da sua lista
                    </span>
                    <div className="igc-score-bar-track">
                      <div className="igc-score-bar-fill"
                        style={{ width: `${Math.min(selectedResult.score, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Segue ✅ */}
                {selectedResult.found?.length > 0 && (
                  <div className="igc-common-section">
                    <div className="igc-common-header">
                      <div className="igc-common-title">
                        <CheckCircle size={15} />
                        <h3>Segue ({selectedResult.found.length})</h3>
                      </div>
                    </div>
                    <div className="igc-common-chips">
                      {selectedResult.found.map(u => (
                        <a key={u} href={`https://instagram.com/${u}`} target="_blank"
                          rel="noopener noreferrer" className="igc-common-chip">
                          @{u}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Não segue ❌ */}
                {selectedResult.notFound?.length > 0 && (
                  <div className="igc-common-section">
                    <div className="igc-common-header">
                      <div className="igc-common-title" style={{ color: 'var(--igc-danger)' }}>
                        <X size={15} />
                        <h3>Não Segue ({selectedResult.notFound.length})</h3>
                      </div>
                    </div>
                    <div className="igc-common-chips">
                      {selectedResult.notFound.map(u => (
                        <a key={u} href={`https://instagram.com/${u}`} target="_blank"
                          rel="noopener noreferrer"
                          className="igc-common-chip"
                          style={{ background: 'rgba(239,68,68,.08)', borderColor: 'rgba(239,68,68,.25)', color: '#fca5a5' }}>
                          @{u}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="igc-empty-state">
                <div className="igc-empty-icon"><BarChart2 size={48} strokeWidth={1.2} /></div>
                <h2>Selecione um perfil</h2>
                <p>Clique em um perfil da lista para ver o detalhamento de quem ele segue ou não segue.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
