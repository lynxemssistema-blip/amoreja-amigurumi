import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Heart, 
  Sparkles, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { downloadJournalGuide, acceptJournalTerms } from '../services/journalDocumentService';
import './JournalTermsModal.css';

export default function JournalTermsModal({ isOpen, onClose, onAccepted, user, profile }) {
  const [agreed, setAgreed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      await downloadJournalGuide(user, profile);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      setError("Erro ao baixar documento: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleAccept = async () => {
    if (!agreed) {
      setError("Por favor, marque a caixa confirmando que leu e aceita as diretrizes antes de continuar.");
      return;
    }

    try {
      setAccepting(true);
      setError(null);
      await acceptJournalTerms(user, profile, '1.0 (Ed. 001/26)');
      if (onAccepted) {
        onAccepted();
      }
    } catch (err) {
      setError("Erro ao registrar aceite: " + err.message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="terms-modal-overlay">
      <div className="terms-modal-card">
        
        {/* Cabeçalho do Contrato / Termos */}
        <div className="terms-modal-header">
          <div className="terms-seal-badge">
            <Sparkles size={16} /> JORNAL DO AMIGURUMI
          </div>
          <h2 className="terms-modal-title">Termo de Adesão & Guia de Participação</h2>
          <p className="terms-modal-subtitle">
            Diretrizes Editoriais, Princípios de Autoria e Compromisso Colaborativo • Edição 001/26
          </p>
          <div className="terms-meta-strip">
            <span>Idealização: Marcia Reggiani (@amorejaamigurumi)</span>
            <span>Edição: Cíntia Ferrer (@micajitadesuenos)</span>
          </div>
        </div>

        {/* Banner de Aviso de Primeira Publicação */}
        <div className="terms-notice-banner">
          <div className="terms-notice-icon">
            <Lock size={20} />
          </div>
          <div>
            <strong>Aceite Obrigatório de Colunista</strong>
            <p>
              Antes de redigir ou publicar sua primeira matéria no Jornal Amoreja, é necessário ler, compreender e dar seu aceite formal nas diretrizes editoriais e regras de autoria deste projeto.
            </p>
          </div>
        </div>

        {/* Ação de Download do PDF Oficial */}
        <div className="terms-download-bar">
          <div className="terms-download-info">
            <FileText size={22} color="#4a2c11" />
            <div>
              <strong>Documento Oficial Completo (PDF)</strong>
              <small>JdA-GPColaboradores Atualizado.pdf (5 páginas com diagramação oficial)</small>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-download-guide" 
            onClick={handleDownload} 
            disabled={downloading}
          >
            <Download size={16} />
            {downloading ? 'Baixando...' : 'Baixar PDF Oficial'}
          </button>
        </div>

        {downloadSuccess && (
          <div className="terms-alert-success">
            <CheckCircle2 size={16} /> Download registrado com sucesso! O arquivo foi salvo no seu dispositivo.
          </div>
        )}

        {error && (
          <div className="terms-alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Corpo do Documento com Scroll */}
        <div className="terms-document-scroll">
          
          <section className="terms-doc-section">
            <h3 className="terms-heading-highlight">"Fios que nos Unem: Cada criação carrega uma história"</h3>
            <blockquote className="terms-quote">
              "Mais do que criar receitas, eu escolhi criar movimentos que fortalecem pessoas. O Jornal do Amigurumi é um espaço onde nenhuma artesã precisa caminhar sozinha. Cada pessoa traz o seu fio. Juntos, construímos a rede."
            </blockquote>
          </section>

          <section className="terms-doc-section">
            <h4>1. O QUE É O JORNAL</h4>
            <p>
              O <strong>Jornal do Amigurumi</strong> é um projeto editorial sazonal e colaborativo criado para ser um ponto de encontro da comunidade do amigurumi. Ele conecta designers, artesãs, marcas, lojas e apaixonados pelo universo do artesanato, dando visibilidade a talentos, compartilhando informações e fortalecendo laços reais.
            </p>
          </section>

          <section className="terms-doc-section">
            <h4>2. OS 5 PILARES FUNDAMENTAIS</h4>
            <div className="terms-pillars-grid">
              <div className="terms-pillar-card">
                <strong>1. Informação</strong>
                <span>Levar conteúdo relevante, educativo e de valor prático para a comunidade.</span>
              </div>
              <div className="terms-pillar-card">
                <strong>2. Valorização</strong>
                <span>Dar visibilidade ao trabalho de designers, artesãs e profissionais reais.</span>
              </div>
              <div className="terms-pillar-card">
                <strong>3. Conexão</strong>
                <span>Aproximar pessoas, projetos, lançamentos e oportunidades no meio artesanal.</span>
              </div>
              <div className="terms-pillar-card">
                <strong>4. Autoria</strong>
                <span>Valorizar a criação original e respeitar rigorosamente os direitos autorais.</span>
              </div>
              <div className="terms-pillar-card">
                <strong>5. Comunidade</strong>
                <span>Criar um espaço colaborativo, acolhedor, transparente e sem concorrência destrutiva.</span>
              </div>
            </div>
          </section>

          <section className="terms-doc-section">
            <h4>3. O QUE O JORNAL NÃO É</h4>
            <ul className="terms-list-disallowed">
              <li>❌ Não é um catálogo comercial de receitas soltas;</li>
              <li>❌ Não é um espaço para reprodução de trabalhos de terceiros sem crédito e consentimento;</li>
              <li>❌ Não é uma vitrine exclusiva para uma única designer;</li>
              <li>❌ Não é um perfil ou veículo voltado apenas para publicidade fria;</li>
              <li>❌ Não é um ambiente de disputa ou concorrência desleal entre artesãs.</li>
            </ul>
          </section>

          <section className="terms-doc-section">
            <h4>4. PRINCÍPIO FUNDAMENTAL SOBRE AUTORIA (DIVULGAR NÃO É COPIAR)</h4>
            <p>
              Todo colunista deve compreender que o Jornal educa e conscientiza a comunidade sobre a importância do respeito à propriedade intelectual:
            </p>
            <ul className="terms-list-allowed">
              <li>✅ Sempre identificar e dar créditos claros à designer autora da criação;</li>
              <li>✅ Marcar o perfil oficial <code>@usuario</code> e direcionar o leitor para a fonte original;</li>
              <li>✅ Respeitar imagens e materiais protegidos por direitos de imagem;</li>
              <li>🚫 <strong>Estritamente Proibido:</strong> Nunca disponibilizar receitas pagas, PDFs piratas ou conteúdos protegidos sem expressa autorização formal da criadora.</li>
            </ul>
          </section>

          <section className="terms-doc-section">
            <h4>5. COMO FUNCIONA A COLABORAÇÃO (VIA DE MÃO DUPLA)</h4>
            <p>
              A colaboração no Jornal do Amigurumi é mútua e se fortalece quando todos divulgam o projeto:
            </p>
            <div className="terms-rules-box">
              <p><strong>Para menção no Calendário e Agenda:</strong></p>
              <ul>
                <li>Repostar o resumo das matérias da edição do Jornal;</li>
                <li>Publicar nos Stories do Instagram pelo menos 2 vezes por semana durante o período de veiculação da sua atividade.</li>
              </ul>
              <p><strong>Para divulgação na Coluna de Classificados / Pautas:</strong></p>
              <ul>
                <li>Cumprir as publicações nos Stories e reposts da edição;</li>
                <li>Contribuir com pelo menos uma matéria ou conteúdo para uma das colunas editoriais do Jornal.</li>
              </ul>
            </div>
          </section>

          <section className="terms-doc-section">
            <h4>6. CRITÉRIOS DE CURADORIA (AS 4 PERGUNTAS)</h4>
            <p>Antes de redigir ou submeter qualquer matéria, o colunista deve se certificar de que o conteúdo atende a pelo menos uma destas diretrizes:</p>
            <ol className="terms-questions-list">
              <li><strong>Isso informa?</strong> (Traz conhecimento ou utilidade?)</li>
              <li><strong>Isso valoriza alguém?</strong> (Reconhece o trabalho e o talento de alguém?)</li>
              <li><strong>Isso conecta pessoas?</strong> (Cria pontes e redes na comunidade?)</li>
              <li><strong>Isso fortalece a comunidade?</strong> (Inspira e apoia o crescimento coletivo?)</li>
            </ol>
          </section>

          <section className="terms-doc-section">
            <h4>7. MONETIZAÇÃO TRANSPARENTE</h4>
            <p>
              Futuras parcerias, classificados pagos e patrocínios serão sempre sinalizados de forma explícita e transparente. 
              <strong> "A monetização sustenta a estrutura do Jornal; ela não define a nossa linha editorial."</strong>
            </p>
          </section>

          <section className="terms-doc-section terms-credits-box">
            <h4>EXPEDIENTE & CONTATOS OFICIAIS</h4>
            <p><strong>Idealização & Organização:</strong> Marcia Reggiani (@amorejaamigurumi)</p>
            <p><strong>Edição de Textos & Revisão:</strong> Cíntia Ferrer (@micajitadesuenos)</p>
            <p><strong>WhatsApp Informativo:</strong> (31) 99952.2412 - Marcia</p>
            <p><strong>Instagram Oficial:</strong> @jornaldoamigurumi</p>
            <p><strong>Portal Web:</strong> www.amoreja.com.br/jornal</p>
          </section>

        </div>

        {/* Rodapé de Aceite e Ações */}
        <div className="terms-modal-footer">
          <label className="terms-checkbox-label">
            <input 
              type="checkbox" 
              checked={agreed} 
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (error) setError(null);
              }} 
            />
            <span>
              Declaro que li atentamente e <strong>concordo integralmente com todos os termos, princípios de autoria e diretrizes de colaboração</strong> do Jornal do Amigurumi.
            </span>
          </label>

          <div className="terms-actions-group">
            {onClose && (
              <button type="button" className="btn-terms-cancel" onClick={onClose} disabled={accepting}>
                Voltar / Fechar
              </button>
            )}
            <button 
              type="button" 
              className="btn-terms-submit" 
              onClick={handleAccept} 
              disabled={!agreed || accepting}
            >
              <ShieldCheck size={18} />
              {accepting ? 'Registrando Aceite...' : 'Assinar Termo e Liberar Publicações'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
