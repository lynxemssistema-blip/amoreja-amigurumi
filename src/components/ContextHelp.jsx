import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  HelpCircle, 
  X, 
  Pin, 
  PinOff, 
  Search, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  MessageCircle,
  Lightbulb,
  Zap,
  ShoppingBag,
  CreditCard,
  Mail,
  Users,
  ShieldCheck
} from 'lucide-react';
import './ContextHelp.css';

// Base de Conhecimento Completa por Página/Rota
const PAGE_HELP_DATA = {
  '/': {
    title: 'Página Inicial (Vitrine)',
    category: 'Navegação Pública',
    summary: 'A vitrine principal onde os visitantes conhecem os amigurumis, maratonas ativas, receitas em destaque e novidades do Instagram.',
    keyFeatures: [
      'Banner Superior Fixo com as maratonas e receitas em destaque.',
      'Acesso direto à loja com botão "Ver Receitas em PDF".',
      'Carrossel de receitas populares e depoimentos de artesãs.',
      'Feed oficial integrado do Instagram @amorejaamigurumi.'
    ],
    tips: [
      'O banner principal agora permanece fixo enquanto você rola a página para maior destaque visual.',
      'Você pode adicionar receitas diretamente ao carrinho sem sair da página inicial.'
    ],
    faqs: [
      {
        q: 'Como compro uma receita exibida na página inicial?',
        a: 'Basta clicar no botão "Comprar Receita" no card do produto ou navegar até a aba Loja. O arquivo PDF é liberado instantaneamente após o pagamento.'
      },
      {
        q: 'O que são as Maratonas de Amigurumi?',
        a: 'São eventos especiais onde diversas artesãs renomadas lançam coleções temáticas com receitas exclusivas e preços promocionais.'
      }
    ]
  },
  '/loja': {
    title: 'Loja de Receitas em PDF',
    category: 'Catálogo de Produtos',
    summary: 'Catálogo completo com todas as receitas digitais em PDF disponíveis para compra individual ou em pacotes.',
    keyFeatures: [
      'Busca dinâmica por nome do amigurumi, designer ou categoria.',
      'Filtro por nível de dificuldade (Iniciante, Fácil, Médio, Avançado).',
      'Filtro por Maratona temática.',
      'Carrinho lateral deslizante para comprar múltiplas receitas de uma vez.'
    ],
    tips: [
      'Ao adicionar receitas ao carrinho, você pode aplicar cupons de desconto no Checkout.',
      'Todas as receitas contêm lista de materiais, passo a passo com fotos e suporte.'
    ],
    faqs: [
      {
        q: 'Como recebo a receita após a compra?',
        a: 'O download em PDF fica disponível imediatamente no seu Painel do Cliente e também é enviado um comprovante com link no seu e-mail.'
      },
      {
        q: 'Posso comprar receitas de diferentes designers no mesmo pedido?',
        a: 'Sim! O carrinho permite juntar receitas de vários parceiros e pagar tudo em uma única transação PIX ou Cartão.'
      }
    ]
  },
  '/receita': {
    title: 'Detalhes da Receita',
    category: 'Ficha do Produto',
    summary: 'Página detalhada com todas as fotos, especificações, designer responsável, materiais recomendados e botão de compra.',
    keyFeatures: [
      'Galeria de fotos do amigurumi finalizado.',
      'Informações de altura, tempo estimado e nível de habilidade.',
      'Perfil da parceira/artesã criadora da receita.',
      'Botão de compra imediata via Checkout Transparente.'
    ],
    tips: [
      'Se você tiver alguma dúvida técnica antes da compra, pode usar o botão de contato do WhatsApp.',
      'Verifique o nível de dificuldade indicado para garantir a melhor experiência na confecção.'
    ],
    faqs: [
      {
        q: 'A receita inclui tutoriais em vídeo?',
        a: 'A maioria das receitas inclui PDF ricamente ilustrado e muitas acompanham links exclusivos de vídeos de apoio das designers.'
      }
    ]
  },
  '/checkout': {
    title: 'Checkout Transparente Amoreja',
    category: 'Finalização de Compra',
    summary: 'Ambiente 100% seguro onde o cliente escolhe a forma de pagamento e finaliza o pedido sem sair do site da Amoreja.',
    keyFeatures: [
      '⚡ PIX Instantâneo com QR Code dinâmico na tela e Pix Copia e Cola.',
      '💳 Cartão de Crédito com parcelamento em até 3x sem juros.',
      '🎟️ Campo para aplicar Cupons de Desconto promocionais.',
      '🔄 Sensor de Aprovação em Tempo Real: libera o PDF automaticamente assim que o pagamento é feito no banco.'
    ],
    tips: [
      'No Pix, copie o código e pague no app do seu banco. A página detecta o pagamento em segundos sem precisar recarregar!',
      'Suas receitas são associadas ao seu e-mail de login para acesso vitalício.'
    ],
    faqs: [
      {
        q: 'O pagamento com PIX é liberado na hora?',
        a: 'Sim! A confirmação do pagamento é instantânea e o acesso à receita é liberado imediatamente.'
      },
      {
        q: 'Onde encontro minhas receitas após pagar?',
        a: 'No menu superior clique em "Meu Painel" ou aguarde o redirecionamento automático da página.'
      }
    ]
  },
  '/painel': {
    title: 'Painel do Cliente (Minhas Receitas)',
    category: 'Área do Aluno / Comprador',
    summary: 'Sua biblioteca digital vitalícia. Aqui você visualiza, baixa e organiza todas as receitas em PDF que adquiriu.',
    keyFeatures: [
      'Downloads ilimitados de todos os seus PDFs adquiridos.',
      'Histórico de pedidos com datas, valores e comprovantes.',
      'Atualização de dados cadastrais e senha de acesso.'
    ],
    tips: [
      'Salve os PDFs no seu computador, celular ou tablet para consultar mesmo sem internet.',
      'Caso a designer lance uma versão atualizada da receita, o novo arquivo estará sempre aqui.'
    ],
    faqs: [
      {
        q: 'Quantas vezes posso baixar meu PDF?',
        a: 'Quantas vezes quiser! Seu acesso às receitas compradas é vitalício e seguro.'
      }
    ]
  },
  '/parceiro': {
    title: 'Canal da Parceira & Gestão de Comissões',
    category: 'Portal da Designer',
    summary: 'Painel exclusivo para as artesãs parceiras gerenciarem suas receitas, visualizarem comissões, vendas e métricas em tempo real.',
    keyFeatures: [
      'Extrato financeiro com total de comissões acumuladas e a receber.',
      'Gráfico de vendas por receita e maratona.',
      'Métricas de engajamento: visualizações e receitas adicionadas ao carrinho.',
      'Configuração da chave PIX para recebimento de repasses.'
    ],
    tips: [
      'Acompanhe quantas vezes sua receita foi adicionada ao carrinho para planejar promoções com cupons.',
      'Mantenha sua chave PIX sempre atualizada para receber os repasses pontualmente.'
    ],
    faqs: [
      {
        q: 'Como e quando recebo minhas comissões?',
        a: 'Os repasses são feitos diretamente via PIX pela administração da Amoreja de acordo com o calendário acordado na Maratona.'
      },
      {
        q: 'O Administrador consegue ver os dados do meu canal?',
        a: 'Sim, o usuário Admin possui acesso total para prestar suporte e auditar os relatórios de todas as parceiras.'
      }
    ]
  },
  '/admin': {
    title: 'Painel Administrativo Geral',
    category: 'Gestão da Plataforma',
    summary: 'Centro de comando completo da Amoreja Amigurumi com controle de catálogo, vendas, parceiras, integrações e automações.',
    keyFeatures: [
      'Gestão de Produtos: cadastro e edição de receitas com upload de PDF e fotos.',
      'Vendas & Pedidos: auditoria de transações e controle de acessos.',
      'Pagamentos Hotmart: venda de receitas digitais integrada com links da Hotmart.',
      'Central de E-mails: webmail completo com envio e recebimento Hostinger.',
      'Instagram e WhatsApp: automações de atendimento e IA.'
    ],
    tips: [
      'Utilize o menu lateral para navegar entre os módulos administrativos.',
      'Você pode manter este painel de ajuda fixado à direita enquanto gerencia a loja.'
    ],
    faqs: [
      {
        q: 'Como cadastrar uma nova receita vinculada a uma parceira?',
        a: 'Acesse "Produtos", clique em "Novo Produto", preencha título, preço, envie a foto de capa e o arquivo PDF e selecione a parceira criadora.'
      }
    ]
  },
  '/admin/pedidos': {
    title: 'Gestão de Vendas & Pedidos',
    category: 'Administração',
    summary: 'Acompanhamento de todas as compras realizadas na loja com detalhes de comprador, valor, itens e status.',
    keyFeatures: [
      'Listagem de pedidos por status (Aprovado, Pendente, Cancelado).',
      'Auditoria e controle de transações da loja.',
      'Botão de liberação manual de acesso caso necessário.',
      'Reenvio automático de e-mail com os links das receitas.'
    ],
    tips: [
      'As vendas e acessos são atualizados de forma 100% automática.'
    ],
    faqs: [
      {
        q: 'Como saber se uma venda gerou comissão para a parceira?',
        a: 'Ao abrir os detalhes do pedido, o sistema exibe os itens comprados e credita automaticamente a comissão no canal da parceira.'
      }
    ]
  },
  '/admin/emails': {
    title: 'Central de E-mails & Webmail Hostinger',
    category: 'Comunicação',
    summary: 'Webmail integrado conectado diretamente ao servidor Hostinger (IMAP/SMTP) da conta amoreja@amoreja.com.br.',
    keyFeatures: [
      'Caixa de Entrada com leitura de mensagens.',
      'Caixa de Saída / Enviados: registra todos os e-mails disparados pelo sistema e manuais.',
      'Compositor de mensagens com suporte a imagens, anexos e assinatura automática "Amoreja Amigurumi".',
      'Filtros por tags: [Automático • Pedido], [Automático • Parceira] e [Manual].'
    ],
    tips: [
      'Todos os avisos de compra aprovada disparados pelo app ficam arquivados na pasta Enviados para consulta futura.'
    ],
    faqs: [
      {
        q: 'Posso enviar e-mails para qualquer endereço?',
        a: 'Sim! O compositor dispara mensagens reais pelo servidor SMTP autenticado da Hostinger.'
      }
    ]
  },
  '/admin/usuarios': {
    title: 'Gestão de Usuários & Parceiras',
    category: 'Administração',
    summary: 'Gerenciamento de contas de clientes, criadoras de receitas, permissões de acesso e percentuais de comissão.',
    keyFeatures: [
      'Visualização de todos os usuários cadastrados e histórico de compras.',
      'Ativação e aprovação de novas Parceiras / Designers.',
      'Definição da taxa de comissão por parceira.',
      'Edição de dados e reset de acesso.'
    ],
    tips: [
      'Ao aprovar uma nova parceira, o sistema envia automaticamente um e-mail de boas-vindas com as instruções.'
    ],
    faqs: [
      {
        q: 'Qualquer usuário pode virar parceira?',
        a: 'O cadastro de parceira passa pela aprovação do administrador nesta tela antes de liberar o acesso ao Meu Canal.'
      }
    ]
  },
  '/admin/conteudo': {
    title: 'Gerenciamento de Conteúdo & Maratonas',
    category: 'Personalização do Site',
    summary: 'Controle visual da página inicial: banners de topo, estilo coverflow/carrossel, textos do Hero e organização das maratonas.',
    keyFeatures: [
      'Upload e ordenação das imagens do banner de topo.',
      'Configuração de Coverflow com imagens em destaque por data.',
      'Ajuste de velocidade, altura e efeitos de desfoque (blur).',
      'Cadastro e organização das Maratonas de Amigurumi.'
    ],
    tips: [
      'Utilize imagens com boa resolução (proporção retangular ou paisagem) para banners nítidos.'
    ],
    faqs: [
      {
        q: 'Como ativar uma nova Maratona na página inicial?',
        a: 'Crie a maratona na seção de Maratonas, adicione os banners correspondentes e marque como visível.'
      }
    ]
  },
  '/login': {
    title: 'Acesso / Login & Cadastro',
    category: 'Autenticação',
    summary: 'Página de identificação segura para clientes, parceiras e administradores acessarem suas áreas exclusivas.',
    keyFeatures: [
      'Login com E-mail e Senha.',
      'Criação de nova conta de cliente em poucos passos.',
      'Recuperação de senha por e-mail seguro.',
      'Persistência de sessão segura.'
    ],
    tips: [
      'Utilize o mesmo e-mail usado nas compras para que todas as suas receitas apareçam unificadas no seu painel.'
    ],
    faqs: [
      {
        q: 'Esqueci minha senha, como recuperar?',
        a: 'Clique no link "Esqueci minha senha" para receber as instruções de redefinição no seu e-mail cadastrado.'
      }
    ]
  }
};

export default function ContextHelp({ isPinned, onTogglePin }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const location = useLocation();

  // Encontra os dados da página atual com base na rota
  const getHelpForCurrentPage = () => {
    const path = location.pathname;
    
    // Correspondência exata ou por prefixo
    if (PAGE_HELP_DATA[path]) return PAGE_HELP_DATA[path];
    if (path.startsWith('/receita/')) return PAGE_HELP_DATA['/receita'];
    if (path.startsWith('/checkout/')) return PAGE_HELP_DATA['/checkout'];
    if (path.startsWith('/parceiro')) return PAGE_HELP_DATA['/parceiro'];
    if (path.startsWith('/admin/pedidos')) return PAGE_HELP_DATA['/admin/pedidos'];
    if (path.startsWith('/admin/emails')) return PAGE_HELP_DATA['/admin/emails'];
    if (path.startsWith('/admin/usuarios')) return PAGE_HELP_DATA['/admin/usuarios'];
    if (path.startsWith('/admin/conteudo')) return PAGE_HELP_DATA['/admin/conteudo'];
    if (path.startsWith('/admin')) return PAGE_HELP_DATA['/admin'];
    if (path === '/login') return PAGE_HELP_DATA['/login'];
    
    return PAGE_HELP_DATA['/']; // Fallback padrão
  };

  const helpData = getHelpForCurrentPage();

  // Fecha o accordion ao trocar de página
  useEffect(() => {
    setOpenFaqIndex(null);
    setSearchQuery('');
  }, [location.pathname]);

  const toggleFaq = (idx) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  // Filtragem pela busca
  const filteredFaqs = helpData.faqs.filter(
    faq => faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
           faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFeatures = helpData.keyFeatures.filter(
    f => f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Escuta evento para abrir a ajuda sob demanda
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-context-help', handleOpen);
    return () => window.removeEventListener('open-context-help', handleOpen);
  }, []);

  return (
    <>


      {/* Backdrop para quando estiver no modo flutuante (não-fixado) */}
      {isOpen && !isPinned && (
        <div className="context-help-backdrop animate-fade-in" onClick={() => setIsOpen(false)} />
      )}

      {/* Painel Lateral de Ajuda de Contexto */}
      {(isOpen || isPinned) && (
        <aside className={`context-help-panel ${isPinned ? 'is-pinned' : 'is-drawer'} animate-slide-left`}>
          
          {/* Header do Painel */}
          <div className="help-panel-header">
            <div className="help-header-title-row">
              <div className="help-header-badge">
                <Sparkles size={14} />
                <span>Ajuda de Contexto</span>
              </div>
              <div className="help-header-controls">
                <button
                  className={`btn-help-control ${isPinned ? 'active' : ''}`}
                  onClick={onTogglePin}
                  title={isPinned ? "Desafixar painel (modo flutuante)" : "Fixar painel na lateral da página"}
                >
                  {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                  <span className="control-text">{isPinned ? 'Desafixar' : 'Fixar'}</span>
                </button>
                <button
                  className="btn-help-control btn-close"
                  onClick={() => {
                    setIsOpen(false);
                    if (isPinned) onTogglePin();
                  }}
                  title="Fechar painel de ajuda"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Identificação da Página Atual */}
            <div className="help-page-id">
              <span className="help-page-category">{helpData.category}</span>
              <h3 className="help-page-title">{helpData.title}</h3>
              <p className="help-page-summary">{helpData.summary}</p>
            </div>

            {/* Barra de Busca de Tópicos */}
            <div className="help-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar ajuda nesta página..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="help-search-input"
              />
              {searchQuery && (
                <button className="btn-clear-search" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Corpo do Conteúdo */}
          <div className="help-panel-body">
            
            {/* Seção: O que você pode fazer aqui */}
            {filteredFeatures.length > 0 && (
              <div className="help-section">
                <h4 className="help-section-heading">
                  <Zap size={16} className="heading-icon text-amber" /> O que você pode fazer
                </h4>
                <ul className="help-features-list">
                  {filteredFeatures.map((feat, idx) => (
                    <li key={idx} className="help-feature-item">
                      <CheckCircle2 size={16} className="feature-check-icon" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Seção: Dicas & Melhores Práticas */}
            {helpData.tips && helpData.tips.length > 0 && !searchQuery && (
              <div className="help-section">
                <h4 className="help-section-heading">
                  <Lightbulb size={16} className="heading-icon text-primary" /> Dicas da Amoreja
                </h4>
                <div className="help-tips-box">
                  {helpData.tips.map((tip, idx) => (
                    <p key={idx} className="help-tip-text">
                      ✨ {tip}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Seção: Dúvidas Frequentes (FAQ com Accordion) */}
            {filteredFaqs.length > 0 && (
              <div className="help-section">
                <h4 className="help-section-heading">
                  <BookOpen size={16} className="heading-icon text-blue" /> Dúvidas Frequentes
                </h4>
                <div className="help-faqs-accordion">
                  {filteredFaqs.map((faq, idx) => {
                    const isFaqOpen = openFaqIndex === idx;
                    return (
                      <div key={idx} className={`faq-card ${isFaqOpen ? 'active' : ''}`}>
                        <button className="faq-question-btn" onClick={() => toggleFaq(idx)}>
                          <span>{faq.q}</span>
                          {isFaqOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {isFaqOpen && (
                          <div className="faq-answer-content animate-fade-in">
                            <p>{faq.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Atalhos Rápidos & Suporte */}
            <div className="help-section help-footer-support">
              <h4 className="help-section-heading">
                <MessageCircle size={16} className="heading-icon text-green" /> Precisa de Ajuda Extra?
              </h4>
              <p className="support-desc">
                Nossa equipe e a comunidade Amoreja estão prontas para te apoiar em qualquer momento.
              </p>
              <div className="support-buttons-grid">
                <a 
                  href="https://chat.whatsapp.com/DvGLoH4qisk2ir4copcYSm?s=hd&p=i&ilr=0" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-support-link whatsapp"
                >
                  <MessageCircle size={15} /> Grupo VIP WhatsApp
                </a>
                <Link to="/admin/ajuda" className="btn-support-link guide">
                  <BookOpen size={15} /> Guia Completo da Loja
                </Link>
              </div>
            </div>

          </div>

          {/* Rodapé do Painel */}
          <div className="help-panel-footer">
            <ShieldCheck size={14} color="#ea7458" />
            <span>Amoreja Amigurumi • Central de Ajuda 2.0</span>
          </div>

        </aside>
      )}
    </>
  );
}
