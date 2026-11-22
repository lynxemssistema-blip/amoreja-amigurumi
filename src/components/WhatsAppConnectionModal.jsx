import React, { useState, useEffect } from 'react';
import { QrCode, Phone, CheckCircle2, AlertCircle, RefreshCw, LogOut, X, Wifi, Smartphone, ArrowRight, ShieldCheck } from 'lucide-react';
import './WhatsAppConnectionModal.css';

const DEFAULT_EVO_URL = import.meta.env.VITE_EVO_URL || 'https://evo.lynxems.com.br';
const DEFAULT_EVO_API_KEY = import.meta.env.VITE_EVO_API_KEY || '77D7885BAC58-4064-9782-45B81785ADAA';
const DEFAULT_EVO_INSTANCE = import.meta.env.VITE_EVO_INSTANCE || 'AmorejaAmigurumi';

export default function WhatsAppConnectionModal({ 
  isOpen, 
  onClose, 
  onStatusChange, 
  instanceName, 
  apiKey, 
  apiUrl 
}) {
  const activeUrl = apiUrl || DEFAULT_EVO_URL;
  const activeKey = apiKey || DEFAULT_EVO_API_KEY;
  const activeInstance = instanceName || DEFAULT_EVO_INSTANCE;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting'); // 'open' | 'connecting' | 'close'
  const [instanceData, setInstanceData] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetchConnectionStatus();

    // Polling a cada 5 segundos para detectar quando o usuário escanear o QR Code
    const interval = setInterval(() => {
      fetchConnectionStatus(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, activeInstance, activeKey]);

  const fetchConnectionStatus = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Estado da conexão
      const stateRes = await fetch(`${activeUrl}/instance/connectionState/${activeInstance}`, {
        headers: { 'apikey': activeKey }
      });
      const stateJson = await stateRes.json();
      const state = stateJson.instance?.state || 'close';
      setConnectionState(state);

      // 2. Dados da instância (número, nome de perfil, etc.)
      const fetchRes = await fetch(`${activeUrl}/instance/fetchInstances`, {
        headers: { 'apikey': activeKey }
      });
      const instances = await fetchRes.json();
      const inst = Array.isArray(instances) ? instances.find(i => i.name === activeInstance) : null;
      setInstanceData(inst);

      if (onStatusChange) {
        onStatusChange({ state, instance: inst });
      }

      // 3. Se não estiver conectado ('open'), busca o QR Code
      if (state !== 'open') {
        const connectRes = await fetch(`${activeUrl}/instance/connect/${activeInstance}`, {
          headers: { 'apikey': activeKey }
        });
        const connectJson = await connectRes.json();
        if (connectJson.base64) {
          setQrCodeData(connectJson.base64);
        } else if (connectJson.code) {
          setQrCodeData(connectJson.code);
        }
      } else {
        setQrCodeData(null);
      }
    } catch (err) {
      console.error('Erro ao verificar status do WhatsApp:', err);
      if (!isBackground) {
        setErrorMessage('Não foi possível conectar com a Evolution API. Verifique a URL e API Key.');
      }
    } finally {
      if (!isBackground) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchConnectionStatus();
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Deseja realmente desconectar o WhatsApp desta instância? Você precisará ler o QR Code novamente para reconectar.')) {
      return;
    }

    setDisconnecting(true);
    try {
      await fetch(`${activeUrl}/instance/logout/${activeInstance}`, {
        method: 'DELETE',
        headers: { 'apikey': activeKey }
      });
      await fetchConnectionStatus();
    } catch (err) {
      alert('Erro ao desconectar: ' + err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const formatPhoneNumber = (num) => {
    if (!num) return null;
    const clean = num.replace(/\D/g, '');
    if (clean.length === 13 && clean.startsWith('55')) {
      return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return num;
  };

  if (!isOpen) return null;

  const isConnected = connectionState === 'open';
  const phoneNumber = instanceData?.number || '31999522412';
  const profileName = instanceData?.profileName || 'Amoreja Amigurumi';

  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-modal-card" onClick={e => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="wa-modal-header">
          <div className="wa-modal-title-group">
            <div className={`wa-status-dot ${isConnected ? 'online' : 'connecting'}`}></div>
            <div>
              <h3>Conexão WhatsApp (Evolution API)</h3>
              <p className="wa-modal-subtitle">Instância: <strong>{EVO_INSTANCE}</strong></p>
            </div>
          </div>
          <button className="wa-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="wa-modal-body">
          {loading ? (
            <div className="wa-modal-loading">
              <RefreshCw size={32} className="spin-icon" />
              <p>Consultando status da instância no servidor...</p>
            </div>
          ) : isConnected ? (
            /* Estado 1: CONECTADO */
            <div className="wa-connected-box">
              <div className="wa-connected-badge">
                <CheckCircle2 size={48} color="#10b981" />
                <h4>WhatsApp Conectado com Sucesso!</h4>
                <p>O número está ativo e sincronizado para envio de notificações e mensagens automáticas.</p>
              </div>

              <div className="wa-info-cards">
                <div className="wa-info-card">
                  <div className="wa-info-icon"><Phone size={20} color="#6366f1" /></div>
                  <div className="wa-info-content">
                    <span className="wa-info-label">Número Conectado:</span>
                    <strong className="wa-phone-highlight">{formatPhoneNumber(phoneNumber) || 'Número Ativo'}</strong>
                  </div>
                </div>

                <div className="wa-info-card">
                  <div className="wa-info-icon"><Smartphone size={20} color="#ec4899" /></div>
                  <div className="wa-info-content">
                    <span className="wa-info-label">Perfil da Conta:</span>
                    <strong>{profileName}</strong>
                  </div>
                </div>

                <div className="wa-info-card">
                  <div className="wa-info-icon"><ShieldCheck size={20} color="#10b981" /></div>
                  <div className="wa-info-content">
                    <span className="wa-info-label">Webhook de Eventos:</span>
                    <span className="wa-webhook-url">https://amoreja.com.br/api/webhook</span>
                  </div>
                </div>
              </div>

              <div className="wa-actions-row">
                <button className="btn btn-outline" onClick={handleManualRefresh} disabled={refreshing}>
                  <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
                  Atualizar Status
                </button>
                <button className="btn btn-danger-outline" onClick={handleDisconnect} disabled={disconnecting}>
                  <LogOut size={16} />
                  {disconnecting ? 'Desconectando...' : 'Desconectar Aparelho'}
                </button>
              </div>
            </div>
          ) : (
            /* Estado 2: AGUARDANDO LEITURA DO QR CODE */
            <div className="wa-qr-box">
              <div className="wa-qr-header-notice">
                <div className="wa-notice-pill">
                  <Wifi size={14} className="pulse-icon" /> Aguardando Leitura do QR Code
                </div>
                <p>Número associado à instância: <strong className="wa-phone-highlight">{formatPhoneNumber(phoneNumber)}</strong></p>
              </div>

              <div className="wa-qr-container">
                {qrCodeData ? (
                  <div className="wa-qr-image-wrapper">
                    <img
                      src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                      alt="QR Code WhatsApp"
                      className="wa-qr-image"
                    />
                    <div className="wa-qr-pulse-ring"></div>
                  </div>
                ) : (
                  <div className="wa-qr-placeholder">
                    <RefreshCw size={36} className="spin-icon" color="#ea7458" />
                    <p>Gerando QR Code atualizado...</p>
                  </div>
                )}
              </div>

              {/* Instruções */}
              <div className="wa-steps-guide">
                <h5>Como conectar seu WhatsApp:</h5>
                <ol className="wa-steps-list">
                  <li>Abra o <strong>WhatsApp</strong> no seu celular;</li>
                  <li>Acesse <strong>Configurações</strong> ou <strong>Menu (⋮)</strong>;</li>
                  <li>Toque em <strong>Aparelhos Conectados</strong> e depois em <strong>Conectar um aparelho</strong>;</li>
                  <li>Aponte a câmera do celular para o <strong>QR Code acima</strong>.</li>
                </ol>
              </div>

              {errorMessage && (
                <div className="wa-error-banner">
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="wa-actions-row">
                <button className="btn btn-primary" onClick={handleManualRefresh} disabled={refreshing}>
                  <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
                  {refreshing ? 'Atualizando QR Code...' : 'Gerar Novo QR Code / Atualizar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="wa-modal-footer">
          <span className="wa-footer-hint">
            A conexão é mantida automaticamente ativa pelo servidor Evolution API na VPS.
          </span>
          <button className="btn btn-outline" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
