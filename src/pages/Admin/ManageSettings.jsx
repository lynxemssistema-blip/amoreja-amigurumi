import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { Save, Settings as SettingsIcon, CreditCard, Info } from 'lucide-react';
import './ManageSettings.css';

export default function ManageSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // PIX Settings
  const [pixEnabled, setPixEnabled] = useState(false);
  const [pixKey, setPixKey] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      // Busca as configurações de PIX
      const { data, error } = await supabase
        .from('new_amoreja_settings')
        .select('key, value')
        .in('key', ['payment_pix_enabled', 'payment_pix_key']);
        
      if (error) throw error;
      
      if (data) {
        const enabledSetting = data.find(s => s.key === 'payment_pix_enabled');
        const keySetting = data.find(s => s.key === 'payment_pix_key');
        
        if (enabledSetting) setPixEnabled(enabledSetting.value === 'true');
        if (keySetting) setPixKey(keySetting.value || '');
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) return;
    
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'payment_pix_enabled', value: pixEnabled.toString() },
        { key: 'payment_pix_key', value: pixKey }
      ];

      for (const setting of settingsToSave) {
        // Usa upsert simulado via update/insert ou ON CONFLICT
        const { error } = await supabase
          .from('new_amoreja_settings')
          .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' });
          
        if (error) throw error;
      }
      
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      alert('Erro ao salvar as configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-loading"><div className="loader"></div></div>;

  return (
    <div className="manage-settings-container">
      <div className="admin-page-header">
        <div>
          <h2>Configurações Gerais</h2>
          <p>Ajuste os parâmetros de funcionamento da loja.</p>
        </div>
      </div>

      <div className="product-form-card" style={{ maxWidth: '600px' }}>
        <div className="form-header">
          <h3><CreditCard size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom'}}/> Formas de Pagamento (PIX)</h3>
        </div>
        
        <div style={{backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', fontSize: '14px'}}>
          <Info size={20} style={{flexShrink: 0}} />
          <p>
            O pagamento via PIX manual deixa o pedido com status <strong>Pendente</strong>. O cliente fará a transferência e você precisará aprovar o pedido manualmente na aba "Vendas & Pedidos" para liberar os PDFs.
          </p>
        </div>

        <form onSubmit={saveSettings} className="admin-form">
          <div className="form-grid">
            <div className="form-group col-span-2 form-toggles-row">
            <label className="custom-toggle-label">
              <input 
                type="checkbox" 
                className="custom-toggle-input"
                checked={pixEnabled}
                onChange={(e) => setPixEnabled(e.target.checked)}
              />
              <div className="custom-toggle-slider"></div>
              <span className="toggle-text">Ativar pagamento via PIX</span>
            </label>
          </div>

          <div className="form-group col-span-2" style={{ opacity: pixEnabled ? 1 : 0.5, pointerEvents: pixEnabled ? 'auto' : 'none' }}>
            <label className="form-label">Sua Chave PIX (E-mail, CPF/CNPJ, Celular ou Aleatória)</label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="ex: contato@amoreja.com.br"
              className="form-control"
              required={pixEnabled}
            />
          </div>
          </div>

          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button 
              type="submit" 
              disabled={saving}
              className="btn btn-primary"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
