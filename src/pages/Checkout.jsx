import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Copy, CheckCircle, Info, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Checkout.css';

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [totalAmount, setTotalAmount] = useState(0);
  
  // PIX Config
  const [pixEnabled, setPixEnabled] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [copied, setCopied] = useState(false);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!user) {
      alert("Você precisa fazer login para finalizar a compra.");
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch PIX Settings
        if (isSupabaseConfigured()) {
          const { data: settingsData } = await supabase
            .from('new_amoreja_settings')
            .select('key, value')
            .in('key', ['payment_pix_enabled', 'payment_pix_key']);
            
          if (settingsData) {
            const enabledSetting = settingsData.find(s => s.key === 'payment_pix_enabled');
            const keySetting = settingsData.find(s => s.key === 'payment_pix_key');
            if (enabledSetting && enabledSetting.value === 'true') {
              setPixEnabled(true);
            }
            if (keySetting) {
              setPixKey(keySetting.value || '');
            }
          }
        }

        // 2. Fetch Products (Single or Cart)
        if (id === 'carrinho') {
          const storedCart = localStorage.getItem('amoreja_cart');
          if (storedCart) {
            const parsedCart = JSON.parse(storedCart);
            setItems(parsedCart);
            setTotalAmount(parsedCart.reduce((sum, item) => sum + parseFloat(item.price), 0));
          } else {
            navigate('/loja');
          }
        } else {
          // Fetch single product
          const { data: productData, error } = await supabase
            .from('new_amoreja_products')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          setItems([productData]);
          setTotalAmount(productData.price);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do checkout:', error);
        navigate('/loja');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyCoupon = async () => {
    setCouponMessage({ text: '', type: '' });
    if (!couponCode) return;
    
    if (!isSupabaseConfigured()) {
      if (couponCode.toUpperCase() === 'BEMVINDO10') {
        setAppliedCoupon({ discount_type: 'percent', discount_value: 10, code: 'BEMVINDO10' });
        setCouponMessage({ text: 'Cupom aplicado com sucesso!', type: 'success' });
      } else {
        setCouponMessage({ text: 'Cupom inválido ou expirado.', type: 'error' });
      }
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('new_amoreja_coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();
        
      if (error || !data) {
        setCouponMessage({ text: 'Cupom inválido ou inativo.', type: 'error' });
        setAppliedCoupon(null);
      } else {
        // Verifica data de validade
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setCouponMessage({ text: 'Este cupom já expirou.', type: 'error' });
          setAppliedCoupon(null);
          return;
        }

        setAppliedCoupon(data);
        setCouponMessage({ text: 'Cupom aplicado com sucesso!', type: 'success' });
      }
    } catch(err) {
      setCouponMessage({ text: 'Erro ao validar cupom.', type: 'error' });
      setAppliedCoupon(null);
    }
  };

  const discountAmount = appliedCoupon 
    ? (appliedCoupon.discount_type === 'percent' 
        ? totalAmount * (appliedCoupon.discount_value / 100) 
        : appliedCoupon.discount_value)
    : 0;
    
  const finalTotal = Math.max(0, totalAmount - discountAmount);

  const handleConfirmPayment = async () => {
    setProcessing(true);
    
    try {
      if (!isSupabaseConfigured()) {
        alert("Modo demonstração: Pedido registrado!");
        if (id === 'carrinho') localStorage.setItem('amoreja_cart', JSON.stringify([]));
        navigate('/painel');
        return;
      }

      // Se for PIX, status é pending (aguardando aprovação manual)
      // Se for Cartão (mock), status seria completed, mas aqui vamos focar no fluxo real
      const orderStatus = paymentMethod === 'pix' ? 'pending' : 'completed';

      // 1. Criar o pedido (Order)
        const { data: order, error: orderError } = await supabase
          .from('new_amoreja_orders')
          .insert([{
            user_id: user.id,
            total_amount: finalTotal,
            status: orderStatus,
            payment_id: paymentMethod === 'pix' ? 'pix_manual' : `mock_mp_${Math.floor(Math.random() * 1000000)}`
          }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Criar os itens do pedido (Order Items)
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        price: item.price
      }));

      const { error: itemError } = await supabase
        .from('new_amoreja_order_items')
        .insert(orderItems);

      if (itemError) throw itemError;

      // Limpar carrinho se for compra por carrinho
      if (id === 'carrinho') {
        localStorage.setItem('amoreja_cart', JSON.stringify([]));
      }

      // Notificação via WhatsApp EVO API
      if (paymentMethod === 'pix') {
        try {
          const EVO_API_KEY = import.meta.env.VITE_EVO_API_KEY;
          const EVO_INSTANCE = import.meta.env.VITE_EVO_INSTANCE;
          const EVO_URL = import.meta.env.VITE_EVO_URL;
          
          if (EVO_API_KEY && EVO_INSTANCE && EVO_URL) {
            const itemsListText = items.map(i => `- 1x ${i.title} (R$ ${parseFloat(i.price).toFixed(2)})`).join('\n');
            const waText = `🚨 *NOVA VENDA PIX MANUAL* 🚨

*👤 Dados do Cliente:*
Nome: ${profile?.full_name || user.email}
E-mail: ${profile?.email || user.email}
Instagram: ${profile?.instagram_handle || 'Não informado'}

*🛍️ Resumo do Pedido (#${order.id.slice(0,8)}):*
${itemsListText}
${appliedCoupon ? `\n*🎟️ Cupom Utilizado:* ${appliedCoupon.code} (-R$ ${discountAmount.toFixed(2)})` : ''}

*💰 Total a receber:* R$ ${finalTotal.toFixed(2)}

*Atenção:* O cliente informou que já realizou o PIX. Verifique seu extrato e acesse o painel para aprovar a venda!`;

            await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
              method: 'POST',
              headers: { 
                'apikey': EVO_API_KEY, 
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({ 
                number: "5531999522412", 
                text: waText 
              })
            });
          }
        } catch (evoErr) {
          console.error("Erro ao notificar via EVO:", evoErr);
        }

        alert('Pedido realizado! O seu pagamento está em análise. Assim que confirmado, as receitas serão liberadas no seu painel.');
      } else {
        alert('Pagamento aprovado! Receitas liberadas na sua conta.');
      }
      navigate('/painel');

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      alert('Ocorreu um erro ao processar o pedido. Tente novamente.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading" style={{minHeight: '100vh', paddingTop: '4rem'}}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="checkout-page section-padding animate-fade-in">
      <div className="container checkout-container">
        
        <div className="checkout-card">
          
          {/* Header */}
          <div className="checkout-header">
            <Link to="/loja" className="btn-back-store">
              <ArrowLeft size={20} /> Voltar para Loja
            </Link>
            <h2>Finalizar Compra</h2>
            <p>Verifique seu pedido e escolha a forma de pagamento</p>
          </div>

          <div className="checkout-body">
            
            {/* Resumo do Pedido */}
            <div className="checkout-summary">
              <h2 className="checkout-section-title">Resumo do Pedido</h2>
              
              <div className="checkout-items-list">
                {items.map(item => (
                  <div key={item.id} className="checkout-item">
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="checkout-item-img"
                    />
                    <div className="checkout-item-info">
                      <h3>{item.title}</h3>
                      <p className="checkout-item-price">
                        R$ {parseFloat(item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="checkout-coupon-box">
                <p className="checkout-coupon-title">Possui um cupom de desconto?</p>
                <div className="checkout-coupon-input-group">
                  <input 
                    type="text" 
                    placeholder="Digite o código" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button onClick={handleApplyCoupon} className="btn-apply-coupon">Aplicar</button>
                </div>
                {couponMessage.text && (
                  <p className={`checkout-coupon-msg ${couponMessage.type}`}>{couponMessage.text}</p>
                )}
              </div>

              <div className="checkout-totals">
                <div className="checkout-totals-row">
                  <span>Subtotal</span>
                  <span>R$ {totalAmount.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="checkout-totals-row discount-row">
                    <span>Desconto ({appliedCoupon.code})</span>
                    <span>- R$ {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="checkout-totals-row total-row">
                  <span>Total</span>
                  <span>R$ {finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Pagamento */}
            <div className="checkout-payment">
              <h2 className="checkout-section-title">Forma de Pagamento</h2>
              
              <div className="checkout-payment-options">
                {pixEnabled && (
                  <label className={`payment-option ${paymentMethod === 'pix' ? 'active pix-active' : ''}`}>
                    <div className="payment-option-inner">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="pix"
                        checked={paymentMethod === 'pix'}
                        onChange={() => setPaymentMethod('pix')}
                      />
                      <span className="payment-option-label">
                        <span className="pix-dot"></span> PIX (Transferência)
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {paymentMethod === 'pix' && pixEnabled && (
                <div className="pix-instructions-box">
                  <h4 className="pix-instructions-title">
                    <Info size={18} /> Como pagar com PIX
                  </h4>
                  <p className="pix-instructions-text">
                    Copie a chave PIX abaixo e faça a transferência no aplicativo do seu banco. Após pagar, clique no botão para confirmar.
                  </p>
                  
                  <div className="pix-key-box">
                    <span className="pix-key-text">{pixKey}</span>
                    <button 
                      onClick={copyToClipboard}
                      className="btn-copy-pix"
                    >
                      {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirmPayment}
                disabled={processing || !pixKey}
                className="btn-confirm-payment btn-pix"
              >
                {processing ? (
                  <>
                    <div className="spinner-small"></div>
                    Processando...
                  </>
                ) : (
                  'Já fiz o pagamento (PIX)'
                )}
              </button>
              
              <p className="payment-disclaimer">
                A liberação das receitas ocorrerá após a confirmação do pagamento pela nossa equipe.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
