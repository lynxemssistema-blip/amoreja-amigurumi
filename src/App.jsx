import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import ScrollRestoration from './components/ScrollRestoration';

// Componente de carregamento para as rotas
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <div className="loader"></div>
  </div>
);

// Lazy loading das páginas para Code-Splitting
const Home = lazy(() => import('./pages/Home'));
const Store = lazy(() => import('./pages/Store'));
const Maratonas = lazy(() => import('./pages/Maratonas'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Journal = lazy(() => import('./pages/Journal/Journal'));
const JournalArchive = lazy(() => import('./pages/Journal/JournalArchive'));

// Lazy loading das páginas administrativas
const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout'));
const ManageProducts = lazy(() => import('./pages/Admin/ManageProducts'));
const ManageOrders = lazy(() => import('./pages/Admin/ManageOrders'));
const ManageSiteContent = lazy(() => import('./pages/Admin/ManageSiteContent'));
const ManageWhatsApp = lazy(() => import('./pages/Admin/ManageWhatsApp'));
const WhatsAppWeb = lazy(() => import('./pages/Admin/WhatsAppWeb'));
const WhatsAppWebMarcia = lazy(() => import('./pages/Admin/WhatsAppWebMarcia'));
const ManageSettings = lazy(() => import('./pages/Admin/ManageSettings'));
const ManageUsers = lazy(() => import('./pages/Admin/ManageUsers'));
const AdminJournal = lazy(() => import('./pages/Admin/AdminJournal'));
const FinancialDashboard = lazy(() => import('./pages/Admin/FinancialDashboard'));
const ManageCoupons = lazy(() => import('./pages/Admin/ManageCoupons'));
const Help = lazy(() => import('./pages/Admin/Help'));
const PartnerDashboard = lazy(() => import('./pages/Partner/PartnerDashboard'));
const ColumnistDashboard = lazy(() => import('./pages/Columnist/ColumnistDashboard'));
const EmailWeb = lazy(() => import('./pages/Admin/EmailWeb'));
import ContextHelp from './components/ContextHelp';
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
  const location = useLocation();
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHelpPinned, setIsHelpPinned] = useState(() => {
    return localStorage.getItem('amoreja_help_pinned') === 'true';
  });

  // Efeito para ajustar o corpo da página quando o painel de ajuda for fixado
  useEffect(() => {
    if (isHelpPinned) {
      document.body.classList.add('help-pinned');
    } else {
      document.body.classList.remove('help-pinned');
    }
    localStorage.setItem('amoreja_help_pinned', isHelpPinned.toString());
  }, [isHelpPinned]);

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
    // Se a receita em PDF já estiver no carrinho, abre o carrinho diretamente
    if (cart.some(item => item.id === product.id)) {
      setIsCartOpen(true);
      return;
    }

    // Rastrear intenção de compra / carrinho para estatísticas da parceira
    try {
      const cartKey = `recipe_cart_added_${product.id}`;
      const count = parseInt(localStorage.getItem(cartKey) || '0') + 1;
      localStorage.setItem(cartKey, count.toString());
    } catch (_) {}

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
      <ScrollRestoration />
      <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />

        <div className="main-content-wrapper">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home onAddToCart={handleAddToCart} />} />
              <Route path="/loja" element={<Store onAddToCart={handleAddToCart} />} />
              <Route path="/maratonas" element={<Maratonas onAddToCart={handleAddToCart} />} />
              <Route path="/jornal" element={<Journal />} />
              <Route path="/jornal/arquivo" element={<JournalArchive />} />
              <Route path="/receita/:id" element={<ProductDetail onAddToCart={handleAddToCart} />} />
              <Route path="/produto/:id" element={<ProductDetail onAddToCart={handleAddToCart} />} />
              <Route path="/login" element={<Login />} />
              
              {/* Rota Protegida do Cliente */}
              <Route path="/painel" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />

              {/* Rota Exclusiva do Canal da Parceira */}
              {/* Rotas de Parceiros / Colunistas Unificada */}
              <Route path="/meu-canal" element={<PrivateRoute><PartnerDashboard /></PrivateRoute>} />
              <Route path="/parceiro" element={<PrivateRoute><PartnerDashboard /></PrivateRoute>} />
              <Route path="/colunista" element={<PrivateRoute><Navigate to="/meu-canal" replace /></PrivateRoute>} />

              <Route path="/checkout/:id" element={
                <PrivateRoute>
                  <Checkout />
                </PrivateRoute>
              } />

              {/* Rotas Protegidas do Admin */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<ManageProducts />} />
                <Route path="produtos" element={<Navigate to="/admin" replace />} />
                <Route path="pedidos" element={<ManageOrders />} />
                <Route path="conteudo" element={<ManageSiteContent />} />
                <Route path="jornal" element={<AdminJournal />} />
                <Route path="whatsapp" element={<WhatsAppWeb />} />
                <Route path="whatsapp-marcia" element={<WhatsAppWebMarcia />} />
                <Route path="configuracoes" element={<ManageSettings />} />
                <Route path="usuarios" element={<ManageUsers />} />
                <Route path="financeiro" element={<FinancialDashboard />} />
                <Route path="cupons" element={<ManageCoupons />} />
                <Route path="emails" element={<EmailWeb />} />
                <Route path="ajuda" element={<Help />} />
              </Route>
            </Routes>
          </Suspense>
        </div>

        {/* Footer e navegação mobile inferior apenas em páginas públicas (fora do painel admin) */}
        {!location.pathname.startsWith('/admin') && (
          <>
            <Footer />
            <BottomNav />
          </>
        )}

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

        {/* Componente de Ajuda de Contexto Flutuante e Fixável */}
        <ContextHelp 
          isPinned={isHelpPinned} 
          onTogglePin={() => setIsHelpPinned(!isHelpPinned)} 
        />
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
