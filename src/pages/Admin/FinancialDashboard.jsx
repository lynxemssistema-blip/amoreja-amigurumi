import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { DollarSign, ShoppingBag, Clock, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import './FinancialDashboard.css';

export default function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageTicket: 0,
    pendingOrdersCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    if (!isSupabaseConfigured()) {
      // Mock data for demo
      setTimeout(() => {
        setStats({
          totalRevenue: 1250.50,
          totalOrders: 42,
          averageTicket: 29.77,
          pendingOrdersCount: 3
        });
        setRecentOrders([
          { id: '1', created_at: new Date().toISOString(), total_amount: 35.0, status: 'completed', user_name: 'Maria Silva' },
          { id: '2', created_at: new Date(Date.now() - 86400000).toISOString(), total_amount: 50.0, status: 'completed', user_name: 'João Pedro' }
        ]);
        setTopProducts([
          { title: 'Girafinha Amoreja', quantity: 15, revenue: 450.0 },
          { title: 'Ursinho Pimpão', quantity: 10, revenue: 300.0 }
        ]);
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      // 1. Fetch Orders for KPIs and Recent list
      const { data: ordersData, error: ordersError } = await supabase
        .from('new_amoreja_orders')
        .select(`
          id, 
          created_at, 
          total_amount, 
          status,
          new_amoreja_profiles ( full_name )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const completedOrders = ordersData.filter(o => o.status === 'completed');
      const pendingOrders = ordersData.filter(o => o.status === 'pending');

      const totalRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
      const totalOrders = completedOrders.length;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalRevenue,
        totalOrders,
        averageTicket,
        pendingOrdersCount: pendingOrders.length
      });

      // Recent 5 completed orders
      const recent = completedOrders.slice(0, 5).map(o => ({
        id: o.id,
        created_at: o.created_at,
        total_amount: o.total_amount,
        status: o.status,
        user_name: o.new_amoreja_profiles?.full_name || 'Desconhecido'
      }));
      setRecentOrders(recent);

      // 2. Fetch Top Products
      // We need to fetch order_items joined with orders (only completed) and group by product
      const { data: itemsData, error: itemsError } = await supabase
        .from('new_amoreja_order_items')
        .select(`
          price,
          products:new_amoreja_products(title),
          orders:new_amoreja_orders(status)
        `);

      if (itemsError) throw itemsError;

      // Group and sum
      const productStats = {};
      itemsData.forEach(item => {
        // count only if order is completed
        if (item.orders?.status === 'completed' && item.products) {
          const title = item.products.title;
          if (!productStats[title]) {
            productStats[title] = { title, quantity: 0, revenue: 0 };
          }
          productStats[title].quantity += 1;
          productStats[title].revenue += parseFloat(item.price);
        }
      });

      // Sort by revenue descending and take top 5
      const topArr = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setTopProducts(topArr);

    } catch (err) {
      console.error("Erro ao carregar dados do dashboard financeiro:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loader"></div>
        <p style={{marginTop: '1rem', color: 'var(--color-text-muted)'}}>Calculando métricas financeiras...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard-container">
      <div className="admin-page-header">
        <div>
          <h2>Visão Gerencial e Financeira</h2>
          <p>Acompanhe o desempenho das suas vendas em tempo real.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card highlight">
          <div className="kpi-icon-wrapper revenue-icon">
            <DollarSign size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Receita Total</span>
            <span className="kpi-value">R$ {stats.totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper orders-icon">
            <ShoppingBag size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Vendas Aprovadas</span>
            <span className="kpi-value">{stats.totalOrders}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper ticket-icon">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Ticket Médio</span>
            <span className="kpi-value">R$ {stats.averageTicket.toFixed(2)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper pending-icon">
            <Clock size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Pedidos Pendentes</span>
            <span className="kpi-value">{stats.pendingOrdersCount}</span>
          </div>
        </div>
      </div>

      <div className="finance-layout">
        {/* Top Produtos */}
        <div className="finance-card top-products-card">
          <div className="finance-card-header">
            <h3>Top Produtos Vendidos</h3>
            <Package size={20} style={{color: 'var(--color-text-muted)'}} />
          </div>
          
          {topProducts.length > 0 ? (
            <div className="top-products-list">
              {topProducts.map((prod, index) => (
                <div key={index} className="top-product-item">
                  <div className="top-product-rank">{index + 1}</div>
                  <div className="top-product-info">
                    <h4>{prod.title}</h4>
                    <span>{prod.quantity} unidades vendidas</span>
                  </div>
                  <div className="top-product-revenue">
                    R$ {prod.revenue.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="finance-empty">Nenhum dado de venda ainda.</div>
          )}
        </div>

        {/* Últimas Transações */}
        <div className="finance-card recent-sales-card">
          <div className="finance-card-header">
            <h3>Últimas Transações Aprovadas</h3>
            <TrendingUp size={20} style={{color: 'var(--color-text-muted)'}} />
          </div>

          {recentOrders.length > 0 ? (
            <div className="recent-sales-list">
              {recentOrders.map((order) => (
                <div key={order.id} className="recent-sale-item">
                  <div className="recent-sale-icon">
                    <ArrowUpRight size={18} />
                  </div>
                  <div className="recent-sale-info">
                    <h4>{order.user_name}</h4>
                    <span>{new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="recent-sale-amount">
                    + R$ {order.total_amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="finance-empty">Nenhuma transação aprovada.</div>
          )}
        </div>
      </div>
    </div>
  );
}
