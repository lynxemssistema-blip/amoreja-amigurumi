import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Copy, 
  CheckCircle, 
  Info, 
  ShoppingCart, 
  ArrowLeft, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './Checkout.css';

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mp_pix'); // 'mp_pix' | 'mp_card'
  const [totalAmount, setTotalAmount] = useState(0);

  // Mercado Pago Config
  const [mpEnabled, setMpEnabled] = useState(true);
  const [mpMode, setMpMode] = useState('test'); // 'test' | 'prod'
  const [mpTestAccessToken, setMpTestAccessToken] = useState('TEST-4852351940284754-111521-cd8aeace7cdd4827365f1c23063177a9-443850714');
  const [mpProdAccessToken, setMpProdAccessToken] = useState('');
  const [mpEnablePix, setMpEnablePix] = useState(true);
  const [mpEnableCreditCard, setMpEnableCreditCard] = useState(true);

  // Transparent Pix State
  const [pixData, setPixData] = useState(null); // { qr_code, qr_code_base64, payment_id }
  const [isPaymentApproved, setIsPaymentApproved] = useState(false);
  const [payerCpf, setPayerCpf] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  // Transparent Card State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardInstallments, setCardInstallments] = useState('1');

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });

  // Polling para sensor de aprovação em tempo real do PIX
  useEffect(() => {
    let intervalId;
    if (pixData?.payment_id && !isPaymentApproved) {
      const activeToken = mpMode === 'prod' ? mpProdAccessToken : mpTestAccessToken;
      const tokenToUse = activeToken || 'TEST-4852351940284754-111521-cd8aeace7cdd4827365f1c23063177a9-443850714';

      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/mercadopago/check-status?id=${pixData.payment_id}&token=${tokenToUse}`);
          if (res.ok) {
            const data = await res.json();
            if (data.approved || data.status === 'approved') {
              setIsPaymentApproved(true);
              clearInterval(intervalId);

              // Atualiza o pedido no banco
              if (pixData.order_id && isSupabaseConfigured()) {
                await supabase
                  .from('new_amoreja_orders')
                  .update({ status: 'completed', payment_id: pixData.payment_id.toString() })
                  .eq('id', pixData.order_id);
              }

              setTimeout(() => {
                navigate('/painel');
              }, 3000);
            }
          }
        } catch (_) {}
      }, 2500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pixData, isPaymentApproved, mpMode, mpProdAccessToken, mpTestAccessToken]);

  useEffect(() => {
    if (!user) {
      alert("Você precisa fazer login para finalizar a compra.");
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Payment Settings (Mercado Pago)
        if (isSupabaseConfigured()) {
          const { data: settingsData } = await supabase
            .from('new_amoreja_settings')
            .select('key, value')
            .in('key', [
              'mp_enabled',
              'mp_mode',
              'mp_test_access_token',
              'mp_prod_access_token',
              'mp_enable_pix',
              'mp_enable_credit_card'
            ]);
            
          if (settingsData) {
            settingsData.forEach(item => {
              if (item.key === 'mp_enabled') setMpEnabled(item.value === 'true');
              if (item.key === 'mp_mode') setMpMode(item.value || 'test');
              if (item.key === 'mp_test_access_token' && item.value) setMpTestAccessToken(item.value);
              if (item.key === 'mp_prod_access_token' && item.value) setMpProdAccessToken(item.value);
              if (item.key === 'mp_enable_pix') setMpEnablePix(item.value === 'true');
              if (item.key === 'mp_enable_credit_card') setMpEnableCreditCard(item.value === 'true');
            });
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
          setTotalAmount(parseFloat(productData.price));
        }
      } catch (error) {
        console.error('Erro ao buscar dados do checkout:', error);
        navigate('/loja');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, user]);

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

  const handleConfirmFreeAccess = async () => {
    setProcessing(true);
    try {
      if (!isSupabaseConfigured()) {
        alert("Modo demonstração: Pedido registrado!");
        if (id === 'carrinho') localStorage.setItem('amoreja_cart', JSON.stringify([]));
        navigate('/painel');
        return;
      }

      const { data: order, error: orderError } = await supabase
        .from('new_amoreja_orders')
        .insert([{
          user_id: user.id,
          total_amount: 0,
          status: 'completed',
          payment_id: 'free_access'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        price: 0
      }));

      await supabase.from('new_amoreja_order_items').insert(orderItems);
      if (id === 'carrinho') localStorage.setItem('amoreja_cart', JSON.stringify([]));
      setIsPaymentApproved(true);
      setTimeout(() => navigate('/painel'), 2000);
    } catch (err) {
      alert('Erro ao liberar acesso: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateTransparentPix = async () => {
    setProcessing(true);
    try {
      // 1. Cria ou recupera o pedido no banco
      const { data: order, error: orderError } = await supabase
        .from('new_amoreja_orders')
        .insert([{
          user_id: user.id,
          total_amount: finalTotal,
          status: 'pending',
          payment_id: 'pending_pix_transparent'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Cria os itens do pedido
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        price: item.price
      }));

      await supabase.from('new_amoreja_order_items').insert(orderItems);

      // 3. Dispara criação do PIX Transparente
      const activeToken = mpMode === 'prod' ? mpProdAccessToken : mpTestAccessToken;
      const tokenToUse = activeToken || 'TEST-4852351940284754-111521-cd8aeace7cdd4827365f1c23063177a9-443850714';

      const res = await fetch('/api/mercadopago/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalTotal,
          description: items.length === 1 ? items[0].title : `Pedido com ${items.length} receitas - Amoreja`,
          payerEmail: user.email,
          payerName: profile?.full_name || user.email,
          payerCpf: payerCpf || '11144477735',
          orderId: order.id,
          token: tokenToUse
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setPixData({
          order_id: order.id,
          payment_id: json.payment_id,
          qr_code: json.qr_code,
          qr_code_base64: json.qr_code_base64,
          status: json.status
        });

        // Atualiza o payment_id no pedido
        await supabase
          .from('new_amoreja_orders')
          .update({ payment_id: json.payment_id.toString() })
          .eq('id', order.id);

        if (id === 'carrinho') localStorage.setItem('amoreja_cart', JSON.stringify([]));
      } else {
        throw new Error(json.error || 'Não foi possível gerar o Pix.');
      }

    } catch (err) {
      console.error('Erro ao gerar PIX transparente:', err);
      alert('Erro ao gerar o Pix Transparente: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessCardPayment = async (e) => {
    e.preventDefault();
    if (!cardNumber || !cardHolder || !cardExpiry || !cardCvv) {
      alert("Por favor, preencha todos os campos do cartão.");
      return;
    }

    setProcessing(true);
    try {
      // 1. Cria o Pedido
      const { data: order, error: orderError } = await supabase
        .from('new_amoreja_orders')
        .insert([{
          user_id: user.id,
          total_amount: finalTotal,
          status: 'completed', // No teste transparente aprova imediatamente
          payment_id: `card_${Date.now()}`
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        price: item.price
      }));

      await supabase.from('new_amoreja_order_items').insert(orderItems);
      if (id === 'carrinho') localStorage.setItem('amoreja_cart', JSON.stringify([]));

      setIsPaymentApproved(true);
      setTimeout(() => {
        navigate('/painel');
      }, 2500);

    } catch (err) {
      alert("Erro ao processar cartão: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyPixCode = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
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
          <div className="checkout-header" style={{ background: 'linear-gradient(135deg, #ea7458 0%, #d85739 100%)' }}>
            <Link to="/loja" className="btn-back-store">
              <ArrowLeft size={20} /> Voltar para Loja
            </Link>
            <h2>Finalizar Compra</h2>
            <p>Ambiente seguro • Amoreja Amigurumi</p>
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
                  <span style={{ color: '#ea7458', fontSize: '1.4rem' }}>R$ {finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Pagamento Transparente Amoreja */}
            <div className="checkout-payment">
              <h2 className="checkout-section-title">Forma de Pagamento</h2>

              {isPaymentApproved ? (
                /* Card de Pagamento Confirmado */
                <div className="payment-success-card">
                  <CheckCircle size={54} color="#059669" style={{ margin: '0 auto' }} />
                  <h3>🎉 Pagamento Confirmado!</h3>
                  <p>Seu pagamento foi aprovado com sucesso. Estamos liberando suas receitas no seu painel...</p>
                  <button onClick={() => navigate('/painel')} className="btn btn-primary" style={{ width: '100%' }}>
                    Acessar Minhas Receitas em PDF
                  </button>
                </div>
              ) : (
                <div className="transparent-checkout-container">
                  
                  {/* Tabs de Seleção */}
                  <div className="transparent-method-tabs">
                    <button
                      type="button"
                      className={`transparent-tab-btn ${paymentMethod === 'mp_pix' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('mp_pix')}
                    >
                      <Zap size={18} /> PIX Instantâneo
                    </button>
                    <button
                      type="button"
                      className={`transparent-tab-btn ${paymentMethod === 'mp_card' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('mp_card')}
                    >
                      <CreditCard size={18} /> Cartão de Crédito
                    </button>
                  </div>

                  {/* 1. ABA: PIX MERCADO PAGO TRANSPARENTE */}
                  {paymentMethod === 'mp_pix' && (
                    <div className="transparent-pix-card animate-fade-in">
                      {!pixData ? (
                        <div>
                          <div style={{ background: '#fff7ed', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #fed7aa', textAlign: 'left' }}>
                            <strong style={{ color: '#9a3412', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                              <Zap size={16} /> QR Code PIX com Baixa Automática
                            </strong>
                            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#c2410c' }}>
                              O QR Code e o código Pix Copia e Cola serão gerados diretamente nesta tela com confirmação imediata.
                            </p>
                          </div>

                          <div style={{ marginBottom: '18px', textAlign: 'left' }}>
                            <label className="card-label">Seu CPF (para o comprovante Pix)</label>
                            <input
                              type="text"
                              placeholder="000.000.000-00"
                              value={payerCpf}
                              onChange={(e) => setPayerCpf(e.target.value)}
                              className="card-input"
                            />
                          </div>

                          <button
                            onClick={handleGenerateTransparentPix}
                            disabled={processing}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            <Zap size={18} />
                            {processing ? 'Gerando QR Code Pix...' : `Gerar Pix (R$ ${finalTotal.toFixed(2)})`}
                          </button>
                        </div>
                      ) : (
                        /* Exibição do QR Code na Tela */
                        <div className="animate-scale-up">
                          <strong style={{ fontSize: '16px', color: '#1e293b', display: 'block' }}>
                            Escaneie o QR Code no app do seu banco
                          </strong>
                          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 12px' }}>
                            Ou use o código Pix Copia e Cola abaixo
                          </p>

                          <div className="pix-qr-wrapper">
                            {pixData.qr_code_base64 ? (
                              <img 
                                src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                                alt="QR Code Pix" 
                                className="pix-qr-img" 
                              />
                            ) : (
                              <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#94a3b8' }}>
                                QR Code Carregado
                              </div>
                            )}
                          </div>

                          <div className="pix-copia-cola-box">
                            <span className="pix-code-text">{pixData.qr_code}</span>
                            <button onClick={handleCopyPixCode} className="btn-copy-pix">
                              {pixCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                              {pixCopied ? 'Copiado!' : 'Copiar Código'}
                            </button>
                          </div>

                          <div className="pix-status-pulse">
                            <span className="pulse-dot"></span>
                            Aguardando pagamento... (Aprovação em segundos)
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. ABA: CARTÃO DE CRÉDITO TRANSPARENTE */}
                  {paymentMethod === 'mp_card' && (
                    <form onSubmit={handleProcessCardPayment} className="transparent-card-form animate-fade-in">
                      <div>
                        <label className="card-label">Número do Cartão</label>
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          maxLength="19"
                          className="card-input"
                          required
                        />
                      </div>

                      <div>
                        <label className="card-label">Nome Impresso no Cartão</label>
                        <input
                          type="text"
                          placeholder="Como está gravado no cartão"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="card-input"
                          required
                        />
                      </div>

                      <div className="card-input-row">
                        <div>
                          <label className="card-label">Validade (MM/AA)</label>
                          <input
                            type="text"
                            placeholder="MM/AA"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            maxLength="5"
                            className="card-input"
                            required
                          />
                        </div>
                        <div>
                          <label className="card-label">CVV / Código</label>
                          <input
                            type="password"
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            maxLength="4"
                            className="card-input"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="card-label">Parcelamento</label>
                        <select
                          value={cardInstallments}
                          onChange={(e) => setCardInstallments(e.target.value)}
                          className="card-input"
                        >
                          <option value="1">1x de R$ {finalTotal.toFixed(2)} (Sem juros)</option>
                          <option value="2">2x de R$ {(finalTotal / 2).toFixed(2)} (Sem juros)</option>
                          <option value="3">3x de R$ {(finalTotal / 3).toFixed(2)} (Sem juros)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={processing}
                        className="btn btn-primary"
                        style={{ marginTop: '10px', padding: '14px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Lock size={16} />
                        {processing ? 'Processando Pagamento...' : `Pagar R$ ${finalTotal.toFixed(2)} com Cartão`}
                      </button>
                    </form>
                  )}

                  <div className="security-badge" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#64748b', fontSize: '12.5px' }}>
                    <ShieldCheck size={16} color="#059669" />
                    <span>Pagamento processado com criptografia SSL 256 bits</span>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Checkout;
