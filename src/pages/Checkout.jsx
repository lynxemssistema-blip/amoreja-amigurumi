import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getPaymentPlatformInfo } from '../utils/paymentPlatform';
import { 
  ArrowLeft, 
  ExternalLink,
  Flame,
  ShieldCheck, 
  Lock,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import './Checkout.css';

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id || id === 'carrinho') {
          navigate('/loja');
          return;
        }

        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('new_amoreja_products')
            .select('*')
            .eq('id', id)
            .single();

          if (!error && data) {
            setProduct(data);
            if (data.mp_payment_link) {
              // Redireciona automaticamente para o checkout oficial da Hotmart
              window.location.href = data.mp_payment_link;
              return;
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar produto para checkout:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  const targetLink = product?.mp_payment_link || (product?.title 
    ? `https://hotmart.com/pt-br/marketplace/produtos?q=${encodeURIComponent(product.title)}`
    : 'https://hotmart.com');

  const platInfo = getPaymentPlatformInfo(targetLink);

  if (loading) {
    return (
      <div className="checkout-loading-screen">
        <div className="spinner"></div>
        <p>Conectando ao checkout seguro Hotmart...</p>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      <div className="checkout-wrapper" style={{ maxWidth: '640px', margin: '40px auto', padding: '0 20px' }}>
        <button onClick={() => navigate(-1)} className="btn-back-checkout" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '20px', fontWeight: 600 }}>
          <ArrowLeft size={18} /> Voltar para a Loja
        </button>

        <div className="checkout-card" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #fed7aa', padding: '32px', boxShadow: '0 10px 25px -5px rgba(240, 78, 35, 0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', background: '#fff1ec', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#F04E23', marginBottom: '16px' }}>
              <Flame size={32} />
            </div>
            <h1 style={{ fontSize: '24px', color: '#1e293b', margin: '0 0 8px 0', fontWeight: 800 }}>
              Checkout Seguro via Hotmart
            </h1>
            <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
              Você será direcionado para efetuar a compra com segurança total na Hotmart.
            </p>
          </div>

          {product && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: '#fff7ed', borderRadius: '12px', border: '1px solid #ffedd5', marginBottom: '24px' }}>
              <img 
                src={product.image_url} 
                alt={product.title} 
                style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px' }}
              />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1e293b' }}>{product.title}</h3>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#F04E23' }}>
                  {product.is_free ? 'Grátis' : `R$ ${parseFloat(product.price).toFixed(2)}`}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', fontSize: '14px', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#059669" />
              <span>Pagamento 100% protegido pela plataforma <strong>Hotmart</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="#059669" />
              <span>Acesso imediato à receita em PDF logo após a confirmação</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#F04E23" />
              <span>Garantia de satisfação e suporte da artesã</span>
            </div>
          </div>

          <a 
            href={targetLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '16px 24px',
              background: '#F04E23',
              color: '#ffffff',
              fontSize: '17px',
              fontWeight: 800,
              borderRadius: '12px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(240, 78, 35, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <Flame size={20} />
            <span>Ir para o Checkout na Hotmart</span>
            <ExternalLink size={18} />
          </a>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', marginTop: '16px', marginBottom: 0 }}>
            Você será direcionado para o ambiente criptografado da Hotmart.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
