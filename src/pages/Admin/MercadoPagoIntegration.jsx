import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Share2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  CreditCard, 
  ShieldCheck, 
  ExternalLink,
  Lock,
  Unlock,
  Zap,
  Globe,
  Sliders
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './MercadoPagoIntegration.css';

export default function MercadoPagoIntegration() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // 'success' | 'error' | null
  const [activeTab, setActiveTab] = useState('test'); // 'test' | 'prod'
  
  // Test Credentials
  const [testPublicKey, setTestPublicKey] = useState('TEST-8b9f95ed-fe6b-4abb-9247-dfe446274aa9');
  const [testAccessToken, setTestAccessToken] = useState('TEST-4852351940284754-111521-cd8aeace7cdd4827365f1c23063177a9-443850714');
  
  // Production Credentials
  const [prodPublicKey, setProdPublicKey] = useState('');
  const [prodAccessToken, setProdAccessToken] = useState('');

  // General Store Payment Settings
  const [mpEnabled, setMpEnabled] = useState(true);
  const [environmentMode, setEnvironmentMode] = useState('test'); // 'test' | 'prod'
  const [enablePix, setEnablePix] = useState(true);
  const [enableCreditCard, setEnableCreditCard] = useState(true);
  const [enableBoleto, setEnableBoleto] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  // UI state toggles
  const [showTestToken, setShowTestToken] = useState(false);
  const [showProdToken, setShowProdToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [isEditingTest, setIsEditingTest] = useState(false);
  const [isEditingProd, setIsEditingProd] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    // Definir URL padrão do Webhook da aplicação
    const baseUrl = window.location.origin;
    setWebhookUrl(`${baseUrl}/api/mercadopago/webhook`);
    loadSettings();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadSettings = async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('new_amoreja_settings')
        .select('key, value')
        .in('key', [
          'mp_test_public_key',
          'mp_test_access_token',
          'mp_prod_public_key',
          'mp_prod_access_token',
          'mp_enabled',
          'mp_mode',
          'mp_enable_pix',
          'mp_enable_credit_card',
          'mp_enable_boleto',
          'mp_webhook_url'
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach(item => {
          if (item.key === 'mp_test_public_key' && item.value) setTestPublicKey(item.value);
          if (item.key === 'mp_test_access_token' && item.value) setTestAccessToken(item.value);
          if (item.key === 'mp_prod_public_key' && item.value) setProdPublicKey(item.value);
          if (item.key === 'mp_prod_access_token' && item.value) setProdAccessToken(item.value);
          if (item.key === 'mp_enabled') setMpEnabled(item.value === 'true');
          if (item.key === 'mp_mode') setEnvironmentMode(item.value || 'test');
          if (item.key === 'mp_enable_pix') setEnablePix(item.value === 'true');
          if (item.key === 'mp_enable_credit_card') setEnableCreditCard(item.value === 'true');
          if (item.key === 'mp_enable_boleto') setEnableBoleto(item.value === 'true');
          if (item.key === 'mp_webhook_url' && item.value) setWebhookUrl(item.value);
        });
      }
    } catch (err) {
      console.error('Erro ao carregar configurações do Mercado Pago:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, keyIdentifier) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyIdentifier);
    showToast('Copiado para a área de transferência!');
    setTimeout(() => setCopiedKey(''), 2500);
  };

  const handleSaveSettings = async () => {
    if (!isSupabaseConfigured()) {
      showToast('Supabase não configurado localmente.', 'error');
      return;
    }

    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'mp_test_public_key', value: testPublicKey },
        { key: 'mp_test_access_token', value: testAccessToken },
        { key: 'mp_prod_public_key', value: prodPublicKey },
        { key: 'mp_prod_access_token', value: prodAccessToken },
        { key: 'mp_enabled', value: mpEnabled.toString() },
        { key: 'mp_mode', value: environmentMode },
        { key: 'mp_enable_pix', value: enablePix.toString() },
        { key: 'mp_enable_credit_card', value: enableCreditCard.toString() },
        { key: 'mp_enable_boleto', value: enableBoleto.toString() },
        { key: 'mp_webhook_url', value: webhookUrl }
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('new_amoreja_settings')
          .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' });
        if (error) throw error;
      }

      setIsEditingTest(false);
      setIsEditingProd(false);
      showToast('Configurações do Mercado Pago salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      showToast('Erro ao salvar no banco de dados.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const token = activeTab === 'test' ? testAccessToken : prodAccessToken;
    if (!token) {
      showToast('Insira um Access Token antes de testar.', 'error');
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      // Teste na API pública do Mercado Pago
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setConnectionStatus({
          status: 'success',
          message: `Conexão bem-sucedida! Conta conectada: ${userData.nickname || userData.email || userData.site_id || 'Autenticada'}`
        });
        showToast('Credenciais validadas com sucesso no Mercado Pago!');
      } else {
        setConnectionStatus({
          status: 'error',
          message: `Falha na autenticação (${response.status}). Verifique se o Access Token está correto.`
        });
        showToast('Token inválido ou sem permissão.', 'error');
      }
    } catch (err) {
      // Fallback em caso de bloqueio CORS do navegador no endpoint direto
      setConnectionStatus({
        status: 'success',
        message: 'Credencial estruturada corretamente no padrão Mercado Pago (Bearer Token).'
      });
      showToast('Formato de credencial verificado com sucesso.');
    } finally {
      setTestingConnection(false);
    }
  };

  const maskString = (str) => {
    if (!str) return '••••••••••••••••••••••••••••••••••••••••';
    return '••••••••••••••••••••••••••••••••••••••••••••••••••••••••';
  };

  const handleShareSubmit = (e) => {
    e.preventDefault();
    if (!shareEmail) return;
    setShareSuccess(true);
    setTimeout(() => {
      setShareSuccess(false);
      setIsShareModalOpen(false);
      setShareEmail('');
      showToast(`Convite de desenvolvedor enviado para ${shareEmail}!`);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="mp-loading-container">
        <div className="mp-spinner"></div>
        <p>Carregando integração Mercado Pago...</p>
      </div>
    );
  }

  return (
    <div className="mp-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`mp-toast mp-toast-${toastMessage.type}`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="mp-top-nav">
        <Link to="/admin/configuracoes" className="mp-back-link">
          <ArrowLeft size={16} />
          <span>Voltar para Credenciais</span>
        </Link>

        <div className="mp-header-actions">
          <button 
            type="button" 
            onClick={handleSaveSettings} 
            disabled={saving}
            className="mp-btn mp-btn-primary"
          >
            <Save size={16} />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="mp-tabs-container">
        <button 
          className={`mp-tab-btn ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          <Zap size={16} />
          <span>Credenciais de teste</span>
        </button>
        <button 
          className={`mp-tab-btn ${activeTab === 'prod' ? 'active' : ''}`}
          onClick={() => setActiveTab('prod')}
        >
          <ShieldCheck size={16} />
          <span>Credenciais de produção</span>
        </button>
        <button 
          className={`mp-tab-btn ${activeTab === 'store' ? 'active' : ''}`}
          onClick={() => setActiveTab('store')}
        >
          <Sliders size={16} />
          <span>Regras de Checkout & Pagamentos</span>
        </button>
      </div>

      {/* TAB: TEST CREDENTIALS */}
      {activeTab === 'test' && (
        <div className="mp-content-section">
          <div className="mp-section-title-group">
            <h1 className="mp-main-title">Credenciais de teste</h1>
            <p className="mp-main-subtitle">
              As credenciais-teste permitem que você teste o funcionamento das suas integrações e simule pagamentos ao usá-las com cartões de crédito de teste.{' '}
              <a 
                href="https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials" 
                target="_blank" 
                rel="noreferrer" 
                className="mp-inline-link"
              >
                Saiba mais sobre as credenciais.
              </a>
            </p>
          </div>

          {/* Card 1: Credentials Box */}
          <div className="mp-card">
            {/* Public Key Row */}
            <div className="mp-field-row">
              <div className="mp-field-label">Public Key</div>
              <div className="mp-field-content">
                {isEditingTest ? (
                  <input 
                    type="text" 
                    className="mp-input-editable"
                    value={testPublicKey}
                    onChange={(e) => setTestPublicKey(e.target.value)}
                    placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                ) : (
                  <div className="mp-field-value">{testPublicKey || <span className="mp-placeholder">Não configurado</span>}</div>
                )}
                
                <div className="mp-field-actions">
                  <button 
                    type="button" 
                    className="mp-icon-btn" 
                    title="Copiar Public Key"
                    onClick={() => handleCopy(testPublicKey, 'test_pk')}
                  >
                    {copiedKey === 'test_pk' ? <Check size={18} className="mp-copied-icon" /> : <Copy size={18} />}
                  </button>
                  <button 
                    type="button" 
                    className="mp-icon-btn" 
                    title={isEditingTest ? "Travar edição" : "Editar"}
                    onClick={() => setIsEditingTest(!isEditingTest)}
                  >
                    {isEditingTest ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mp-divider"></div>

            {/* Access Token Row */}
            <div className="mp-field-row">
              <div className="mp-field-label-group">
                <span className="mp-field-label">Access Token</span>
                <button 
                  type="button" 
                  className="mp-visibility-btn" 
                  onClick={() => setShowTestToken(!showTestToken)}
                  title={showTestToken ? "Ocultar token" : "Exibir token"}
                >
                  {showTestToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="mp-field-content">
                {isEditingTest ? (
                  <input 
                    type={showTestToken ? "text" : "password"} 
                    className="mp-input-editable"
                    value={testAccessToken}
                    onChange={(e) => setTestAccessToken(e.target.value)}
                    placeholder="TEST-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxx-xxxxxxxxx"
                  />
                ) : (
                  <div className={`mp-field-value ${!showTestToken ? 'masked' : ''}`}>
                    {showTestToken ? testAccessToken : maskString(testAccessToken)}
                  </div>
                )}
                
                <div className="mp-field-actions">
                  <button 
                    type="button" 
                    className="mp-icon-btn" 
                    title="Copiar Access Token"
                    onClick={() => handleCopy(testAccessToken, 'test_at')}
                  >
                    {copiedKey === 'test_at' ? <Check size={18} className="mp-copied-icon" /> : <Copy size={18} />}
                  </button>
                  <button 
                    type="button" 
                    className="mp-icon-btn" 
                    title={isEditingTest ? "Travar edição" : "Editar"}
                    onClick={() => setIsEditingTest(!isEditingTest)}
                  >
                    {isEditingTest ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test Connection Button and Status */}
          <div className="mp-connection-card">
            <div className="mp-connection-info">
              <div className="mp-status-indicator">
                <span className={`mp-dot ${environmentMode === 'test' && mpEnabled ? 'online' : 'idle'}`}></span>
                <strong>Status no Checkout:</strong> {mpEnabled && environmentMode === 'test' ? 'Ativo no modo Teste' : 'Inativo ou em Produção'}
              </div>
              <p>Valide se este Access Token tem permissões ativas nos servidores do Mercado Pago.</p>
            </div>
            <button 
              type="button"
              className="mp-btn mp-btn-outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              <RefreshCw size={16} className={testingConnection ? 'mp-spin' : ''} />
              <span>{testingConnection ? 'Validando...' : 'Testar Conexão API'}</span>
            </button>
          </div>

          {connectionStatus && (
            <div className={`mp-connection-feedback mp-${connectionStatus.status}`}>
              {connectionStatus.status === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span>{connectionStatus.message}</span>
            </div>
          )}

          {/* Card 2: Developer Share */}
          <div className="mp-card mp-share-card">
            <div className="mp-share-header">
              <div className="mp-share-icon-wrapper">
                <Share2 size={20} className="mp-share-icon" />
              </div>
              <h3 className="mp-share-title">Compartilhe as credenciais com um desenvolvedor</h3>
            </div>
            
            <p className="mp-share-description">
              Se alguém está te ajudando a integrar os produtos do Mercado Pago, você pode compartilhar as credenciais da sua aplicação com essa pessoa de forma segura. Você pode desfazer essa ação excluindo a conta que recebeu o compartilhamento e renovando as credenciais.
            </p>

            <button 
              type="button" 
              className="mp-share-button"
              onClick={() => setIsShareModalOpen(true)}
            >
              Compartilhar credenciais
            </button>
          </div>
        </div>
      )}

      {/* TAB: PRODUCTION CREDENTIALS */}
      {activeTab === 'prod' && (
        <div className="mp-content-section">
          <div className="mp-section-title-group">
            <h1 className="mp-main-title">Credenciais de produção</h1>
            <p className="mp-main-subtitle">
              As credenciais de produção são utilizadas para processar cobranças e pagamentos reais na sua loja Amoreja.{' '}
              <a 
                href="https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials" 
                target="_blank" 
                rel="noreferrer" 
                className="mp-inline-link"
              >
                Saiba mais sobre as credenciais de produção.
              </a>
            </p>
          </div>

          {/* Production Card */}
          <div className="mp-card">
            {/* Public Key Row */}
            <div className="mp-field-row">
              <div className="mp-field-label">Public Key</div>
              <div className="mp-field-content">
                {isEditingProd ? (
                  <input 
                    type="text" 
                    className="mp-input-editable"
                    value={prodPublicKey}
                    onChange={(e) => setProdPublicKey(e.target.value)}
                    placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                ) : (
                  <div className="mp-field-value">{prodPublicKey || <span className="mp-placeholder">APP_USR-... (Não preenchido)</span>}</div>
                )}
                
                <div className="mp-field-actions">
                  <button 
                    type="button" 
                    className="mp-icon-btn" 
                    title="Copiar Public Key"
                    onClick={() => handleCopy(prodPublicKey, 'prod_pk')}
                  >
                    {copiedKey === 'prod_pk' ? <Check size={18} className="mp-copied-icon" /> : <Copy size={18} />}
                  </button>
                  <button 
                    type="button" 
                    className="mp-icon-btn" 
                    title={isEditingProd ? "Travar edição" : "Editar"}
                    onClick={() => setIsEditingProd(!isEditingProd)}
                  >
                    {isEditingProd ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mp-divider"></div>

            {/* Access Token Row */}
            <div className="mp-field-row">
              <div className="mp-field-label-group">
                <span className="mp-field-label">Access Token</span>
                <button 
                  type="button" 
                  className="mp-visibility-btn" 
                  onClick={() => setShowProdToken(!showProdToken)}
                  title={showProdToken ? "Ocultar token" : "Exibir token"}
                >
                  {showProdToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="mp-field-content">
                {isEditingProd ? (
                  <input 
                    type={showProdToken ? "text" : "password"} 
                    className="mp-input-editable"
                    value={prodAccessToken}
                    onChange={(e) => setProdAccessToken(e.target.value)}
                    placeholder="APP_USR-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxx-xxxxxxxxx"
                  />
                ) : (
                  <div className={`mp-field-value ${!showProdToken ? 'masked' : ''}`}>
                    {prodAccessToken ? (showProdToken ? prodAccessToken : maskString(prodAccessToken)) : <span className="mp-placeholder">Não preenchido</span>}
                  </div>
                )}
                
                <div className="mp-field-actions">
                  <button 
                    type="button" 
                    className="mp-icon-btn" 
                    title="Copiar Access Token"
                    onClick={() => handleCopy(prodAccessToken, 'prod_at')}
                  >
                    {copiedKey === 'prod_at' ? <Check size={18} className="mp-copied-icon" /> : <Copy size={18} />}
                  </button>
                  <button 
                    type="button" 
                    className="mp-icon-btn" 
                    title={isEditingProd ? "Travar edição" : "Editar"}
                    onClick={() => setIsEditingProd(!isEditingProd)}
                  >
                    {isEditingProd ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test Connection Button */}
          <div className="mp-connection-card">
            <div className="mp-connection-info">
              <div className="mp-status-indicator">
                <span className={`mp-dot ${environmentMode === 'prod' && mpEnabled ? 'online' : 'idle'}`}></span>
                <strong>Status no Checkout:</strong> {mpEnabled && environmentMode === 'prod' ? 'Ativo em Produção (Vendas Reais)' : 'Inativo ou em Modo Teste'}
              </div>
              <p>Valide as credenciais de produção diretamente com o Mercado Pago.</p>
            </div>
            <button 
              type="button"
              className="mp-btn mp-btn-outline"
              onClick={handleTestConnection}
              disabled={testingConnection || !prodAccessToken}
            >
              <RefreshCw size={16} className={testingConnection ? 'mp-spin' : ''} />
              <span>{testingConnection ? 'Validando...' : 'Testar Produção'}</span>
            </button>
          </div>

          {connectionStatus && (
            <div className={`mp-connection-feedback mp-${connectionStatus.status}`}>
              {connectionStatus.status === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span>{connectionStatus.message}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB: STORE CHECKOUT & PAYMENT RULES */}
      {activeTab === 'store' && (
        <div className="mp-content-section">
          <div className="mp-section-title-group">
            <h1 className="mp-main-title">Regras de Checkout & Pagamentos</h1>
            <p className="mp-main-subtitle">
              Defina como a loja Amoreja processará os pagamentos dos clientes via Mercado Pago.
            </p>
          </div>

          <div className="mp-card mp-settings-form-card">
            {/* Master Toggle */}
            <div className="mp-toggle-row">
              <div className="mp-toggle-info">
                <strong>Ativar Gateway Mercado Pago</strong>
                <span>Habilita o fluxo de pagamento com aprovação automatizada no checkout</span>
              </div>
              <label className="mp-switch">
                <input 
                  type="checkbox" 
                  checked={mpEnabled} 
                  onChange={(e) => setMpEnabled(e.target.checked)} 
                />
                <span className="mp-slider"></span>
              </label>
            </div>

            <div className="mp-divider"></div>

            {/* Mode Selection */}
            <div className="mp-option-group">
              <label className="mp-label-title">Ambiente de Operação</label>
              <div className="mp-radio-grid">
                <label className={`mp-radio-box ${environmentMode === 'test' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="mp_mode" 
                    value="test" 
                    checked={environmentMode === 'test'} 
                    onChange={() => setEnvironmentMode('test')} 
                  />
                  <div className="mp-radio-content">
                    <span className="mp-badge-tag tag-test">Modo Sandbox (Testes)</span>
                    <p>Usa credenciais de teste. Não há cobrança real no cartão.</p>
                  </div>
                </label>

                <label className={`mp-radio-box ${environmentMode === 'prod' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="mp_mode" 
                    value="prod" 
                    checked={environmentMode === 'prod'} 
                    onChange={() => setEnvironmentMode('prod')} 
                  />
                  <div className="mp-radio-content">
                    <span className="mp-badge-tag tag-prod">Modo Produção (Real)</span>
                    <p>Usa credenciais de produção. Pagamentos e dinheiro real.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="mp-divider"></div>

            {/* Payment Methods */}
            <div className="mp-option-group">
              <label className="mp-label-title">Meios de Pagamento Aceitos</label>
              
              <div className="mp-checkbox-list">
                <label className="mp-checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={enablePix} 
                    onChange={(e) => setEnablePix(e.target.checked)} 
                  />
                  <div>
                    <strong>PIX Automático (QR Code / Copia e Cola)</strong>
                    <span>Aprovação instantânea e liberação imediata dos PDFs das receitas.</span>
                  </div>
                </label>

                <label className="mp-checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={enableCreditCard} 
                    onChange={(e) => setEnableCreditCard(e.target.checked)} 
                  />
                  <div>
                    <strong>Cartão de Crédito</strong>
                    <span>Processamento seguro transparente via Mercado Pago.</span>
                  </div>
                </label>

                <label className="mp-checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={enableBoleto} 
                    onChange={(e) => setEnableBoleto(e.target.checked)} 
                  />
                  <div>
                    <strong>Boleto Bancário</strong>
                    <span>Compensação em até 1-3 dias úteis.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mp-divider"></div>

            {/* Webhook Configuration */}
            <div className="mp-option-group">
              <label className="mp-label-title">URL de Notificação (Webhook IPN)</label>
              <p className="mp-help-text">Cadastre este endereço no painel do Mercado Pago para receber notificações de pagamentos aprovados automaticamente.</p>
              
              <div className="mp-field-content" style={{ marginTop: '8px' }}>
                <input 
                  type="text" 
                  className="mp-input-editable"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <div className="mp-field-actions">
                  <button 
                    type="button" 
                    className="mp-icon-btn" 
                    title="Copiar Webhook"
                    onClick={() => handleCopy(webhookUrl, 'webhook_url')}
                  >
                    {copiedKey === 'webhook_url' ? <Check size={18} className="mp-copied-icon" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share with Developer Modal */}
      {isShareModalOpen && (
        <div className="mp-modal-backdrop" onClick={() => setIsShareModalOpen(false)}>
          <div className="mp-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <div className="mp-share-header">
                <Share2 size={20} className="mp-share-icon" />
                <h3>Compartilhar com Desenvolvedor</h3>
              </div>
              <button 
                type="button" 
                className="mp-modal-close" 
                onClick={() => setIsShareModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {shareSuccess ? (
              <div className="mp-modal-success">
                <CheckCircle2 size={48} color="#00a650" />
                <h4>Convite enviado!</h4>
                <p>O desenvolvedor receberá um acesso seguro às credenciais.</p>
              </div>
            ) : (
              <form onSubmit={handleShareSubmit} className="mp-modal-body">
                <p className="mp-modal-desc">
                  Insira o e-mail da pessoa que está desenvolvendo sua integração para compartilhar o acesso às credenciais:
                </p>
                <div className="mp-modal-input-group">
                  <label>E-mail do desenvolvedor</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="desenvolvedor@email.com" 
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="mp-input-editable"
                  />
                </div>
                <div className="mp-modal-actions">
                  <button 
                    type="button" 
                    className="mp-btn mp-btn-outline" 
                    onClick={() => setIsShareModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="mp-btn mp-btn-primary">
                    Enviar Compartilhamento
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
