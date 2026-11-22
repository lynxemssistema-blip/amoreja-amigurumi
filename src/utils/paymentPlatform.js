/**
 * Utilitário para identificar a plataforma de checkout externo
 * Prioridade: Hotmart (plataforma oficial de venda de receitas Amoreja)
 */
export function getPaymentPlatformInfo(url) {
  if (!url || typeof url !== 'string') {
    return {
      label: 'Comprar no Hotmart',
      badge: 'Hotmart',
      color: '#F04E23',
      textColor: '#ffffff',
      deliveryText: 'Você será direcionado para o checkout seguro da Hotmart e receberá acesso imediato à receita digital.'
    };
  }

  const lower = url.toLowerCase();

  // 1. Hotmart (Padrão e Oficial da Amoreja)
  if (lower.includes('hotmart') || lower.includes('hotm.art') || lower.includes('pay.hotmart')) {
    return {
      label: 'Comprar no Hotmart',
      badge: 'Hotmart',
      color: '#F04E23',
      textColor: '#ffffff',
      deliveryText: 'Você será direcionado para a plataforma oficial da Hotmart para concluir sua compra com segurança e receber o PDF imediatamente.'
    };
  }

  // 2. Kiwify
  if (lower.includes('kiwify')) {
    return {
      label: 'Comprar no Kiwify',
      badge: 'Kiwify',
      color: '#10B981',
      textColor: '#ffffff',
      deliveryText: 'Você será direcionado com segurança para o Kiwify para concluir sua compra e receber o acesso à receita.'
    };
  }

  // 3. Mercado Livre
  if (lower.includes('mercadolivre') || lower.includes('mercado_livre') || lower.includes('mercadolivre.com')) {
    return {
      label: 'Comprar no Mercado Livre',
      badge: 'Mercado Livre',
      color: '#FFE600',
      textColor: '#2D3277',
      deliveryText: 'Você será direcionado para o Mercado Livre com garantia de entrega e proteção da sua compra.'
    };
  }

  // 4. Mercado Pago
  if (lower.includes('mercadopago') || lower.includes('mpago.la')) {
    return {
      label: 'Comprar no Mercado Pago',
      badge: 'Mercado Pago',
      color: '#009ee3',
      textColor: '#ffffff',
      deliveryText: 'Você será direcionado com segurança para o checkout do Mercado Pago.'
    };
  }

  // 5. Eduzz
  if (lower.includes('eduzz')) {
    return {
      label: 'Comprar no Eduzz',
      badge: 'Eduzz',
      color: '#00A3FF',
      textColor: '#ffffff',
      deliveryText: 'Você será direcionado com segurança para a Eduzz.'
    };
  }

  // 6. Shopee
  if (lower.includes('shopee')) {
    return {
      label: 'Comprar na Shopee',
      badge: 'Shopee',
      color: '#EE4D2D',
      textColor: '#ffffff',
      deliveryText: 'Você será direcionado para a página oficial do produto na Shopee.'
    };
  }

  // Fallback com preferência Hotmart
  return {
    label: 'Comprar no Hotmart / Link Oficial',
    badge: 'Hotmart',
    color: '#F04E23',
    textColor: '#ffffff',
    deliveryText: 'Você será direcionado para a página de checkout oficial para concluir seu pedido com segurança.'
  };
}
