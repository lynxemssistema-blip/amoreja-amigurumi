import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { ShoppingCart, Check, X, RefreshCw } from 'lucide-react';
import './ManageOrders.css';

const INITIAL_MOCK_ORDERS = [
  {
    id: 'ord-12345',
    user_email: 'cliente.estudo@gmail.com',
    user_name: 'Ana Souza',
    created_at: '2026-07-02T10:00:00Z',
    total_amount: 29.90,
    status: 'completed',
    payment_id: 'pay_stripe_987654'
  },
  {
    id: 'ord-67890',
    user_email: 'mariana.croche@hotmail.com',
    user_name: 'Mariana Costa',
    created_at: '2026-07-03T14:22:00Z',
    total_amount: 64.80,
    status: 'pending',
    payment_id: 'pay_mp_121212'
  }
];

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      const stored = localStorage.getItem('demo_orders_list');
      if (stored) {
        setOrders(JSON.parse(stored));
      } else {
        setOrders(INITIAL_MOCK_ORDERS);
        localStorage.setItem('demo_orders_list', JSON.stringify(INITIAL_MOCK_ORDERS));
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('new_amoreja_orders')
        .select(`
          id,
          created_at,
          status,
          total_amount,
          payment_id,
          new_amoreja_profiles (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(order => ({
        id: order.id,
        created_at: order.created_at,
        status: order.status,
        total_amount: order.total_amount,
        payment_id: order.payment_id,
        user_email: order.new_amoreja_profiles?.email || 'N/A',
        user_name: order.new_amoreja_profiles?.full_name || 'N/A'
      }));

      setOrders(formatted);
    } catch (err) {
      console.error(err.message);
      setOrders(INITIAL_MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    if (!isSupabaseConfigured()) {
      const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
      setOrders(updated);
      localStorage.setItem('demo_orders_list', JSON.stringify(updated));
      setMessage(`Status do pedido #${orderId.slice(0, 5)} alterado no Modo Demo.`);
      return;
    }

    try {
      const { error } = await supabase
        .from('new_amoreja_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      setMessage(`Pedido #${orderId.slice(0, 8)} atualizado com sucesso!`);
      loadOrders();
    } catch (err) {
      alert("Erro ao alterar status: " + err.message);
    }
  };

  return (
    <div className="manage-orders-container">
      <div className="admin-page-header">
        <h2>Vendas & Pedidos</h2>
        <button onClick={loadOrders} className="btn btn-outline btn-refresh" title="Atualizar Pedidos">
          <RefreshCw size={14} /> Atualizar Lista
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      {loading ? (
        <div className="admin-loading">
          <div className="loader"></div>
        </div>
      ) : orders.length > 0 ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Total</th>
                <th>Status</th>
                <th>Transação</th>
                <th className="text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span className="font-mono">#{order.id.slice(0, 8)}</span>
                  </td>
                  <td>
                    <div>
                      <strong>{order.user_name}</strong>
                      <div className="text-muted font-12">{order.user_email}</div>
                    </div>
                  </td>
                  <td>
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    R$ {parseFloat(order.total_amount).toFixed(2)}
                  </td>
                  <td>
                    <span className={`order-status-badge ${order.status}`}>
                      {order.status === 'completed' ? 'Aprovado' : order.status === 'pending' ? 'Pendente' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="font-mono font-12 text-muted">
                    {order.payment_id || 'manual/teste'}
                  </td>
                  <td className="text-right actions-cell-orders">
                    {order.status !== 'completed' && (
                      <button 
                        onClick={() => handleStatusChange(order.id, 'completed')} 
                        className="btn-order-action approve"
                        title="Aprovar Pedido e Liberar PDF"
                      >
                        <Check size={14} /> Aprovar
                      </button>
                    )}
                    {order.status !== 'failed' && (
                      <button 
                        onClick={() => handleStatusChange(order.id, 'failed')} 
                        className="btn-order-action cancel"
                        title="Cancelar Pedido"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <ShoppingCart size={48} className="text-muted" />
          <p>Nenhuma venda registrada até o momento.</p>
        </div>
      )}
    </div>
  );
}
