import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, ShoppingCart, BookOpen, Tag, Settings, Layout, TrendingUp, Users } from 'lucide-react';
import './Help.css';

const FAQItem = ({ question, answer, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item ${isOpen ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setIsOpen(!isOpen)}>
        <span className="faq-question-text">
          {Icon && <Icon size={18} className="faq-icon" />}
          {question}
        </span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <div className="faq-answer-wrapper">
        <div className="faq-answer">
          {answer}
        </div>
      </div>
    </div>
  );
};

export default function Help() {
  return (
    <div className="help-container">
      <div className="admin-page-header">
        <div>
          <h2><HelpCircle size={28} className="inline-icon text-[var(--primary-color)]" style={{marginRight: '10px'}}/>Central de Ajuda</h2>
          <p>Aprenda a utilizar todos os recursos do painel administrativo da Amoreja.</p>
        </div>
      </div>

      <div className="help-content">
        
        <section className="help-section">
          <h3 className="help-section-title">Guia Rápido das Funcionalidades</h3>
          
          <div className="faq-list">
            <FAQItem 
              icon={ShoppingCart}
              question="Vendas & Pedidos (Aprovação de PIX)" 
              answer={
                <>
                  <p>Sempre que um cliente finaliza uma compra usando PIX, o pedido cai aqui com o status <strong>Pendente</strong>.</p>
                  <ul>
                    <li>Verifique no extrato do seu banco se o valor exato foi depositado.</li>
                    <li>Se sim, clique no botão verde <strong>"Aprovar PIX"</strong>. Nesse exato momento, o cliente já consegue baixar o PDF lá no "Meu Painel" dele.</li>
                    <li>Opcionalmente, você pode enviar uma mensagem no WhatsApp do cliente agradecendo a compra, clicando no botão verde do WhatsApp.</li>
                  </ul>
                </>
              } 
            />

            <FAQItem 
              icon={BookOpen}
              question="Gerenciamento de Receitas" 
              answer={
                <>
                  <p>Aqui é onde você cadastra seus Amigurumis e os PDFs das receitas.</p>
                  <ul>
                    <li><strong>Receita Ativa:</strong> Se você desmarcar, ela some da loja (ideal para quando você quiser pausar as vendas de uma receita temporariamente).</li>
                    <li><strong>Receita Grátis:</strong> Se marcado, o valor vai para R$ 0,00. O cliente ainda passa pelo carrinho para "comprar", o que garante que ele fará cadastro e você terá o e-mail dele.</li>
                    <li>Dica: Suba o PDF original e imagens de boa qualidade para a capa.</li>
                  </ul>
                </>
              } 
            />

            <FAQItem 
              icon={Tag}
              question="Cupons de Desconto" 
              answer={
                <>
                  <p>Crie códigos promocionais para impulsionar suas vendas (ex: NATAL20, BEMVINDO10).</p>
                  <ul>
                    <li>Você pode dar desconto em <strong>Porcentagem (%)</strong> ou <strong>Valor Fixo (R$)</strong>.</li>
                    <li>Se quiser que o cupom tenha um limite de tempo, preencha a <strong>Data de Validade</strong>. Se não preencher, ele valerá para sempre.</li>
                    <li>Se precisar desativar um cupom antes da validade, basta desmarcar a opção "Cupom Ativo".</li>
                  </ul>
                </>
              } 
            />

            <FAQItem 
              icon={Layout}
              question="Conteúdo do Site" 
              answer={
                <>
                  <p>Altere a aparência da página inicial e da loja sem precisar de programador.</p>
                  <ul>
                    <li>Você pode trocar o <strong>Banner principal</strong>, a foto da seção "Sobre Mim" e todos os textos da página inicial.</li>
                    <li>Basta fazer o upload da nova foto, digitar o texto e clicar em Salvar. As mudanças vão para o ar imediatamente.</li>
                  </ul>
                </>
              } 
            />

            <FAQItem 
              icon={Settings}
              question="Configurações Gerais" 
              answer={
                <>
                  <p>Ajustes técnicos vitais para a loja funcionar.</p>
                  <ul>
                    <li><strong>Chave PIX:</strong> É fundamental que sua chave PIX esteja preenchida corretamente aqui, pois é ela que o cliente copiará no final da compra.</li>
                    <li><strong>WhatsApp:</strong> Você pode ativar a notificação via API. Lembre-se que para isso é necessário escanear o QR Code no seu celular através da aba "WhatsApp Web".</li>
                  </ul>
                </>
              } 
            />

            <FAQItem 
              icon={Users}
              question="Gerenciamento de Usuários" 
              answer={
                <>
                  <p>Acompanhe todos os clientes que se cadastraram no seu site.</p>
                  <ul>
                    <li>Você pode ver as informações de contato deles.</li>
                    <li>Pode clicar em "Ver Compras" para saber exatamente quais receitas cada cliente possui.</li>
                    <li>Se necessário, você pode suspender ou deletar um usuário.</li>
                  </ul>
                </>
              } 
            />

            <FAQItem 
              icon={TrendingUp}
              question="Dashboard Financeiro" 
              answer={
                <>
                  <p>Sua visão gerencial e de relatórios.</p>
                  <ul>
                    <li>Acompanhe o faturamento total e mensal da sua loja.</li>
                    <li>Veja o ranking das <strong>Top Receitas</strong> (quais vendem mais) para saber o que seu público mais gosta.</li>
                    <li>Visualize rapidamente as últimas transações aprovadas.</li>
                  </ul>
                </>
              } 
            />
          </div>
        </section>

        <section className="help-section tips-section">
          <h3 className="help-section-title">Dicas Importantes</h3>
          <div className="tips-grid">
            <div className="tip-card">
              <h4>📸 Tamanho das Imagens</h4>
              <p>Para um site rápido, evite fotos maiores que 2MB. Use formatos JPG ou WEBP e recortes quadrados (1:1) para os produtos da loja.</p>
            </div>
            <div className="tip-card">
              <h4>💬 WhatsApp e Evolut API</h4>
              <p>Para que o disparo automático de mensagens funcione, mantenha seu WhatsApp sempre conectado (celular com internet) na aba WhatsApp Web.</p>
            </div>
            <div className="tip-card">
              <h4>🔒 Segurança</h4>
              <p>Os PDFs comprados ficam vinculados à conta do cliente. Só ele tem acesso ao link clicando em "Meu Painel &gt; Minhas Receitas" logado na conta.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
