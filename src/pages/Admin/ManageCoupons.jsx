import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { Plus, Edit, Trash, Check, X, Tag } from 'lucide-react';
import './ManageCoupons.css';

export default function ManageCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Form
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');

  const loadCoupons = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setCoupons([
        { id: '1', code: 'BEMVINDO10', discount_type: 'percent', discount_value: 10, is_active: true }
      ]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('new_amoreja_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setCode('');
    setDiscountType('percent');
    setDiscountValue('');
    setIsActive(true);
    setExpiresAt('');
    setIsEditing(false);
  };

  const handleEditClick = (coupon) => {
    setEditId(coupon.id);
    setCode(coupon.code);
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value);
    setIsActive(coupon.is_active);
    
    // Format TIMESTAMPTZ to datetime-local format (YYYY-MM-DDTHH:MM)
    if (coupon.expires_at) {
      const date = new Date(coupon.expires_at);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      setExpiresAt(date.toISOString().slice(0, 16));
    } else {
      setExpiresAt('');
    }
    
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!code || !discountValue) {
      alert('Preencha o código e o valor do desconto.');
      return;
    }

    const payload = {
      code: code.toUpperCase().replace(/\s+/g, ''),
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      is_active: isActive,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
    };

    if (!isSupabaseConfigured()) {
      alert("Modo de demonstração: Cupom salvo!");
      resetForm();
      return;
    }

    try {
      if (editId) {
        const { error } = await supabase
          .from('new_amoreja_coupons')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
        setMessage('Cupom atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('new_amoreja_coupons')
          .insert([payload]);
        if (error) throw error;
        setMessage('Cupom criado com sucesso!');
      }
      loadCoupons();
      resetForm();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja deletar este cupom?")) return;
    
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase.from('new_amoreja_coupons').delete().eq('id', id);
      if (error) throw error;
      setMessage('Cupom excluído!');
      loadCoupons();
    } catch(err) {
      alert("Erro ao deletar: " + err.message);
    }
  };

  return (
    <div className="manage-coupons-container">
      <div className="admin-page-header">
        <div>
          <h2>Gerenciamento de Cupons</h2>
          <p>Crie códigos promocionais para seus clientes.</p>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn btn-primary">
            <Plus size={16} /> Novo Cupom
          </button>
        )}
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      {isEditing ? (
        <div className="coupon-form-card">
          <div className="form-header">
            <h3>{editId ? 'Editar Cupom' : 'Criar Novo Cupom'}</h3>
            <button onClick={resetForm} className="btn-close-form">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} className="admin-form">
            <div className="form-grid">
              
              <div className="form-group">
                <label className="form-label">Código do Cupom *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.toUpperCase())} 
                  placeholder="Ex: NATAL20"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Desconto</label>
                <select 
                  className="form-control" 
                  value={discountType} 
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  <option value="percent">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Valor do Desconto *</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-control" 
                  value={discountValue} 
                  onChange={(e) => setDiscountValue(e.target.value)} 
                  placeholder={discountType === 'percent' ? "Ex: 10" : "Ex: 5.00"}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data de Validade (Opcional)</label>
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  value={expiresAt} 
                  onChange={(e) => setExpiresAt(e.target.value)} 
                />
              </div>

              <div className="form-group form-toggles-row col-span-2" style={{alignItems: 'flex-end', paddingBottom: '10px'}}>
                <label className="toggle-switch-label">
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="toggle-checkbox"
                  />
                  <div className="toggle-slider"></div>
                  <span className="toggle-text">Cupom Ativo</span>
                </label>
              </div>

            </div>
            
            <div className="form-actions">
              <button type="button" onClick={resetForm} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary">
                <Check size={16} /> Salvar Cupom
              </button>
            </div>
          </form>
        </div>
      ) : loading ? (
        <div className="admin-loading">
          <div className="loader"></div>
        </div>
      ) : coupons.length > 0 ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Desconto</th>
                <th>Validade</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <strong><Tag size={14} className="inline-icon" style={{marginRight: '5px', color: 'var(--primary-color)'}}/>{coupon.code}</strong>
                  </td>
                  <td>
                    {coupon.discount_type === 'percent' 
                      ? `${parseFloat(coupon.discount_value)}%` 
                      : `R$ ${parseFloat(coupon.discount_value).toFixed(2)}`
                    }
                  </td>
                  <td>
                    {coupon.expires_at ? new Date(coupon.expires_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem limite'}
                  </td>
                  <td>
                    {coupon.is_active ? (
                      <span className="badge badge-medio">Ativo</span>
                    ) : (
                      <span className="badge text-muted" style={{border: '1px solid #ddd'}}>Inativo</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="actions-cell">
                      <button 
                        onClick={() => handleEditClick(coupon)} 
                        className="btn-action-icon edit" 
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(coupon.id)} 
                        className="btn-action-icon delete" 
                        title="Excluir"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <Tag size={48} className="empty-icon" />
          <h3>Nenhum cupom cadastrado</h3>
          <p>Crie o seu primeiro cupom de desconto para os clientes.</p>
        </div>
      )}
    </div>
  );
}
