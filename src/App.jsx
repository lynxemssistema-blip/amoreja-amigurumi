import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Store from './pages/Store';
import ProductDetail from './pages/ProductDetail';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Checkout from './pages/Checkout';

// Importando páginas administrativas
import AdminLayout from './pages/Admin/AdminLayout';
import ManageProducts from './pages/Admin/ManageProducts';
import ManageOrders from './pages/Admin/ManageOrders';
import InstagramWeb from './pages/Admin/InstagramWeb';
import ManageSiteContent from './pages/Admin/ManageSiteContent';
import InstagramAI from './pages/Admin/InstagramAI';
import ManageWhatsApp from './pages/Admin/ManageWhatsApp';
import WhatsAppWeb from './pages/Admin/WhatsAppWeb';
import ManageSettings from './pages/Admin/ManageSettings';
import ManageUsers from './pages/Admin/ManageUsers';
import FinancialDashboard from './pages/Admin/FinancialDashboard';
import ManageCoupons from './pages/Admin/ManageCoupons';
import Help from './pages/Admin/Help';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import './App.css';

// Componente Wrapper para Rotas Protegidas de Clientes
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="loader"></div></div>;
  return user ? children : <Navigate to="/login" />;
};

function MainAppContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Recupera carrinho do localStorage se houver
  useEffect(() => {
    const storedCart = localStorage.getItem('amoreja_cart');
    if (storedCart) setCart(JSON.parse(storedCart));
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem('amoreja_cart', JSON.stringify(newCart));
  };

  const handleAddToCart = (product) => {
    // Verifica se já está no carrinho (receitas em PDF vende-se apenas uma unidade por cliente)
    if (cart.some(item => item.id === product.id)) {
      alert("Esta receita já está no seu carrinho!");
      return;
    }
    const newCart = [...cart, product];
    saveCart(newCart);
    setIsCartOpen(true); // Abre o carrinho automaticamente
  };

  const handleRemoveFromCart = (productId) => {
    const newCart = cart.filter(item => item.id !== productId);
    saveCart(newCart);
  };

  const handleCheckout = () => {
    if (!user) {
      setIsCartOpen(false);
      navigate('/login');
      return;
    }

    if (cart.length === 0) return;
    
    setIsCartOpen(false);
    navigate('/checkout/carrinho');
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);

  return (
    <div className="app-layout">
      <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />

        <div className="main-content-wrapper">
          <Routes>
            <Route path="/" element={<Home onAddToCart={handleAddToCart} />} />
            <Route path="/loja" element={<Store onAddToCart={handleAddToCart} />} />
            <Route path="/receita/:id" element={<ProductDetail onAddToCart={handleAddToCart} />} />
            <Route path="/login" element={<Login />} />
            
            {/* Rota Protegida do Cliente */}
            <Route path="/painel" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />

            <Route path="/checkout/:id" element={
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            } />

            {/* Rotas Protegidas do Admin */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<ManageProducts />} />
              <Route path="pedidos" element={<ManageOrders />} />
              <Route path="instagram" element={<Navigate to="/admin/instagram-chat" replace />} />
              <Route path="instagram-chat" element={<InstagramWeb defaultTab="direct" />} />
              <Route path="conteudo" element={<ManageSiteContent />} />
              <Route path="whatsapp" element={<WhatsAppWeb />} />
              <Route path="configuracoes" element={<ManageSettings />} />
              <Route path="usuarios" element={<ManageUsers />} />
              <Route path="financeiro" element={<FinancialDashboard />} />
              <Route path="cupons" element={<ManageCoupons />} />
              <Route path="ajuda" element={<Help />} />
            </Route>
          </Routes>
        </div>

        <Footer />

        {/* Sliding Shopping Cart Drawer */}
        {isCartOpen && (
          <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
            <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="cart-drawer-header">
                <div className="cart-header-title">
                  <ShoppingBag size={20} />
                  <h3>Meu Carrinho</h3>
                </div>
                <button className="btn-close-cart" onClick={() => setIsCartOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              {cart.length > 0 ? (
                <>
                  <div className="cart-drawer-items">
                    {cart.map((item) => (
                      <div key={item.id} className="cart-item">
                        <img src={item.image_url} alt={item.title} className="cart-item-img" />
                        <div className="cart-item-info">
                          <h4>{item.title}</h4>
                          <span className="cart-item-price">R$ {parseFloat(item.price).toFixed(2)}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveFromCart(item.id)} 
                          className="btn-remove-item"
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="cart-drawer-footer">
                    <div className="cart-subtotal">
                      <span>Subtotal:</span>
                      <strong className="subtotal-value">R$ {totalCartPrice.toFixed(2)}</strong>
                    </div>
                    <button onClick={handleCheckout} className="btn btn-primary w-full btn-checkout">
                      Finalizar e Baixar PDFs
                    </button>
                    <p className="cart-footer-hint">As receitas digitais são disponibilizadas imediatamente após a confirmação da compra.</p>
                  </div>
                </>
              ) : (
                <div className="cart-drawer-empty">
                  <ShoppingBag size={48} className="empty-cart-icon" />
                  <p>Seu carrinho está vazio!</p>
                  <button onClick={() => setIsCartOpen(false)} className="btn btn-outline">
                    Continuar Comprando
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
