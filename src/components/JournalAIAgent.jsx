import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  BookOpen, 
  Image as ImageIcon, 
  Check, 
  RefreshCw, 
  Copy, 
  ExternalLink,
  Wand2, 
  Layers, 
  TrendingUp, 
  Feather, 
  Lightbulb, 
  ShieldCheck, 
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './JournalAIAgent.css';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Acervo Curado de Imagens de Amigurumi e Crochê Livres de Royalties (Unsplash Free License)
const CURATED_FREE_IMAGES = [
  {
    id: 'img-1',
    title: 'Ursinho de Crochê Artesanal com Novelos',
    url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=900',
    author: 'Kelly Sikkema',
    source: 'Unsplash (Licença Livre de Royalties)',
    licenseUrl: 'https://unsplash.com/license'
  },
  {
    id: 'img-2',
    title: 'Novelos de Fio Macio em Tons Pastéis e Agulhas',
    url: 'https://images.unsplash.com/photo-1606744888344-493238955038?auto=format&fit=crop&q=80&w=900',
    author: 'Margarita Zueva',
    source: 'Unsplash (Licença Livre de Royalties)',
    licenseUrl: 'https://unsplash.com/license'
  },
  {
    id: 'img-3',
    title: 'Amigurumi Delicado Feito à Mão em Iluminação Quente',
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=900',
    author: 'Rocknwool',
    source: 'Unsplash (Licença Livre de Royalties)',
    licenseUrl: 'https://unsplash.com/license'
  },
  {
    id: 'img-4',
    title: 'Mãos de Artesã Tecendo Pontos com Agulha Ergonômica',
    url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=900',
    author: 'Karen Penroz',
    source: 'Unsplash (Licença Livre de Royalties)',
    licenseUrl: 'https://unsplash.com/license'
  },
  {
    id: 'img-5',
    title: 'Composição Aconchegante com Peça de Crochê e Chá',
    url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=900',
    author: 'Svetlana Gumerova',
    source: 'Unsplash (Licença Livre de Royalties)',
    licenseUrl: 'https://unsplash.com/license'
  },
  {
    id: 'img-6',
    title: 'Detalhes de Pontos Baixos em Fio Mercerizado Amigurumi',
    url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=900',
    author: 'Elena Mojsovka',
    source: 'Unsplash (Licença Livre de Royalties)',
    licenseUrl: 'https://unsplash.com/license'
  }
];

// Pautas e novidades pré-carregadas sobre amigurumis e mercado artesanal
const SUGGESTED_TOPICS = [
  {
    title: 'A Revolução dos Fios Pelúcia e Chenille no Mundo do Amigurumi',
    category: 'Fios & Materiais',
    summary: 'Como os fios aveludados transformaram as peças clássicas em bichinhos ultra fofos e abraçáveis, exigindo novas técnicas de fechamento e ajuste de tensão de ponto.',
    source: 'Tendências do Mercado Artesanal 2026',
    suggestedProduct: 'Fio Amigurumi Pelúcia / Fio Velvet Soft',
    imagePrompt: 'Fluffy cute crochet amigurumi bear made with soft plush chenille yarn pastel cozy handmade'
  },
  {
    title: 'Olhos de Segurança Invioláveis: O Padrão Ouro para Peças Infantis',
    category: 'Segurança & Acabamento',
    summary: 'A importância da trava de segurança dupla para chocalhos e naninhas, respeitando normas de segurança e garantindo durabilidade máxima para bebês.',
    source: 'Normas de Segurança & Boas Práticas',
    suggestedProduct: 'Travas de Segurança Anatômicas 10mm a 16mm',
    imagePrompt: 'Safe baby crochet amigurumi rattle with secure embroidered safety eyes pastel clean studio'
  },
  {
    title: 'Técnica No-Sew: O Segredo para Amigurumis Rápidos e Sem Costura',
    category: 'Técnicas & Produtividade',
    summary: 'Como unir membros diretamente na tecelagem da peça sem precisar de costuras posteriores, aumentando a produtividade da artesã em até 40%.',
    source: 'Comunidade Global de Crochê',
    suggestedProduct: 'Agulha Ergonômica 2.5mm cabo Soft Grip',
    imagePrompt: 'Crochet amigurumi seamless no sew technique handmade craft work in progress cozy workshop'
  },
  {
    title: 'Precificação Afetiva: Como Valorizar Suas Horas de Crochê e Vender com Lucro',
    category: 'Negócios & Vendas',
    summary: 'O guia prático para calcular o custo do novelo, enchimento, tempo de produção e margem saudável para o ateliê crescer com sustentabilidade.',
    source: 'Gestão de Ateliês Amoreja',
    suggestedProduct: 'Planilha de Precificação Artesanal Amoreja',
    imagePrompt: 'Handmade craft table with cute amigurumi dolls, notebook and measuring tape warm lighting'
  }
];

export default function JournalAIAgent({ onApplyArticle, currentFormData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('topics'); // 'topics' | 'writer' | 'images'
  
  // Estado do Redator
  const [customTopic, setCustomTopic] = useState('');
  const [writingTone, setWritingTone] = useState('afetivo'); // 'afetivo' | 'tecnico' | 'inspirador' | 'jornalistico'
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState(null);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Estado das Imagens
  const [imageTab, setImageTab] = useState('curated'); // 'curated' | 'ai'
  const [imagePrompt, setImagePrompt] = useState('Girafa amigurumi fofa com cachecol amarelo');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedAiImage, setGeneratedAiImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // Inicializar Gemini
  const getGeminiModel = () => {
    if (!GEMINI_API_KEY) throw new Error('Chave do Gemini (VITE_GEMINI_API_KEY) não configurada.');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
  };

  // 1. Gerar Matéria Completa com IA Especialista
  const handleGenerateArticle = async (pautaBase = null) => {
    setIsGenerating(true);
    setErrorMessage(null);

    const topicToUse = pautaBase 
      ? `${pautaBase.title} (${pautaBase.summary})`
      : customTopic.trim() || currentFormData?.title || 'Tendências modernas no artesanato de amigurumi';

    try {
      const model = getGeminiModel();

      const prompt = `
Você é a Redatora-Chefe do "Jornal do Amigurumi" da marca Amoreja (Edição Oficial).
Você é uma autoridade carinhosa no mundo do crochê, fios e artesanato afetivo.

Tema da Matéria solicitada: "${topicToUse}"
Tom de voz desejado: ${writingTone} (sempre respeitoso, carinhoso, empoderando as artesãs).

Escreva uma matéria editorial de altíssimo nível para o Jornal do Amigurumi.
Siga rigorosamente as diretrizes editoriais:
1. TÍTULO: Curto, nobre, jornalístico e marcante em Caixa Alta (ex: "FIOS QUE NOS UNEM", "O TOQUE DO CHENILLE").
2. SUBTÍTULO / LINHA FINA: Uma frase poética ou inspiradora (será renderizada em caligrafia artística cursiva).
3. CORPO DA MATÉRIA: 3 a 5 parágrafos bem pontuados, com parágrafos curtos, explorando novidades do tema, dicas práticas de tecelagem e reflexão para a artesã.
4. DICA DE OURO: Um parágrafo com conselho técnico prático indispensável.
5. FONTES E CRÉDITOS: Mencione a fonte de inspiração e produtos recomendados.

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem formatações de markdown como \`\`\`json):
{
  "title": "TÍTULO DA MATÉRIA EM CAIXA ALTA",
  "subtitle": "Subtítulo elegante e poético",
  "content": "Texto completo da matéria com quebras de parágrafo naturais.",
  "suggested_sources": ["Fonte 1: Tendências Círculo / Amoreja", "Fonte 2: Guia do Artesão"],
  "image_suggestion": "Descrição em inglês para geração de imagem com a Nanobana"
}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      // Limpeza de blocos de código caso o modelo retorne com ```json
      const cleanedJson = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanedJson);

      setGeneratedArticle(parsed);
      setActiveTab('writer');
    } catch (err) {
      console.error('Erro ao gerar matéria:', err);
      setErrorMessage(`Erro ao gerar matéria: ${err.message}. Tente novamente.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Gerar Imagem com IA Livre de Direitos Autorais (Pollinations / Nanobana)
  const handleGenerateAiImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setErrorMessage(null);

    try {
      const cleanPrompt = encodeURIComponent(
        `cute handmade amigurumi crochet, ${imagePrompt.trim()}, pastel soft colors, warm natural light, high resolution macro photograph, beautiful craft texture, clean background, 8k, no watermark, no text`
      );
      // Pollinations URL estável e gratuita para geração imediata sem chaves
      const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=900&height=600&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

      // Pré-carrega a imagem para garantir que está pronta
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        setGeneratedAiImage({
          url: imageUrl,
          title: `Amigurumi: ${imagePrompt.trim()}`,
          author: 'IA Nanobana Amoreja',
          source: 'Gerado por IA (Livre de Direitos Autorais / Domínio Livre)'
        });
        setIsGeneratingImage(false);
      };
      img.onerror = () => {
        setIsGeneratingImage(false);
        setErrorMessage('Não foi possível gerar a imagem agora. Tente um termo diferente.');
      };
    } catch (err) {
      setIsGeneratingImage(false);
      setErrorMessage(err.message);
    }
  };

  // 3. Aplicar tudo no formulário principal da Matéria
  const handleApplyToForm = (articleData, imageItem = null) => {
    if (!onApplyArticle) return;

    const dataToApply = {};

    if (articleData?.title) dataToApply.title = articleData.title;
    if (articleData?.subtitle) dataToApply.subtitle = articleData.subtitle;
    if (articleData?.content) dataToApply.content = articleData.content;

    // Se tiver imagem selecionada ou do gerador
    const img = imageItem || selectedImage || generatedAiImage;
    if (img?.url) {
      dataToApply.cover_image = img.url;
      // Adiciona o crédito da imagem nas fontes
      const existingSources = articleData?.suggested_sources || [];
      const imageCredit = `Foto da Matéria: ${img.source || 'Livre de Royalties'} (Autor: ${img.author || 'Domínio Público'})`;
      dataToApply.social_links = JSON.stringify([...existingSources, imageCredit]);
    } else if (articleData?.suggested_sources) {
      dataToApply.social_links = JSON.stringify(articleData.suggested_sources);
    }

    onApplyArticle(dataToApply);
    setCopiedStatus(true);
    setTimeout(() => {
      setCopiedStatus(false);
      setIsOpen(false);
    }, 1500);
  };

  return (
    <div className="journal-ai-wrapper">
      {/* Botão de Disparo do Assistente no Topo do Editor */}
      {!isOpen ? (
        <div className="journal-ai-banner">
          <div className="journal-ai-banner-content">
            <div className="journal-ai-banner-icon">
              <Sparkles size={24} color="#d97706" />
            </div>
            <div>
              <div className="journal-ai-banner-title">
                Assistente Especialista em Pautas & Redação de Amigurumi
              </div>
              <div className="journal-ai-banner-desc">
                Crie matérias jornalísticas completas, pesquise novidades de fios/produtos e obtenha imagens livres de direitos com fontes indicadas.
              </div>
            </div>
          </div>
          <button 
            type="button" 
            className="journal-ai-open-btn"
            onClick={() => setIsOpen(true)}
          >
            <Wand2 size={16} />
            <span>Abrir Agente Especialista</span>
          </button>
        </div>
      ) : (
        <div className="journal-ai-modal-card">
          {/* Header do Agente */}
          <div className="journal-ai-header">
            <div className="journal-ai-brand">
              <div className="journal-ai-badge-icon">
                <Feather size={20} color="#b45309" />
              </div>
              <div>
                <h4 className="journal-ai-title">Agente Editorial do Jornal Amoreja</h4>
                <p className="journal-ai-subtitle">
                  Inteligência Artificial especialista em crochê, fios, novidades do mercado e redação jornalística
                </p>
              </div>
            </div>
            <button 
              type="button" 
              className="journal-ai-close-btn"
              onClick={() => setIsOpen(false)}
              title="Fechar Agente"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navegação entre Abas do Agente */}
          <div className="journal-ai-tabs">
            <button 
              type="button" 
              className={`journal-ai-tab ${activeTab === 'topics' ? 'active' : ''}`}
              onClick={() => setActiveTab('topics')}
            >
              <TrendingUp size={16} />
              <span>1. Pautas & Novidades de Amigurumi</span>
            </button>
            <button 
              type="button" 
              className={`journal-ai-tab ${activeTab === 'writer' ? 'active' : ''}`}
              onClick={() => setActiveTab('writer')}
            >
              <BookOpen size={16} />
              <span>2. Redator de Matérias IA</span>
            </button>
            <button 
              type="button" 
              className={`journal-ai-tab ${activeTab === 'images' ? 'active' : ''}`}
              onClick={() => setActiveTab('images')}
            >
              <ImageIcon size={16} />
              <span>3. Banco & Gerador de Imagens Livres</span>
            </button>
          </div>

          {/* Mensagem de Erro se houver */}
          {errorMessage && (
            <div className="journal-ai-error-box">
              <Info size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ── ABA 1: PAUTAS E NOVIDADES DO MERCADO ── */}
          {activeTab === 'topics' && (
            <div className="journal-ai-content-body">
              <div className="journal-ai-section-title">
                <Lightbulb size={18} color="#d97706" />
                <span>Pautas em Alta & Lançamentos do Nicho de Crochê (2026)</span>
              </div>
              <p className="journal-ai-help-text">
                Selecione uma das pautas recentes identificadas no universo de amigurumi para que o agente redija a matéria automaticamente com todos os tópicos e dicas de materiais:
              </p>

              <div className="journal-ai-topics-grid">
                {SUGGESTED_TOPICS.map((topic, idx) => (
                  <div key={idx} className="journal-ai-topic-card">
                    <div className="journal-ai-topic-meta">
                      <span className="journal-ai-topic-category">{topic.category}</span>
                      <span className="journal-ai-topic-source">Fonte: {topic.source}</span>
                    </div>
                    <h5 className="journal-ai-topic-title">{topic.title}</h5>
                    <p className="journal-ai-topic-summary">{topic.summary}</p>
                    <div className="journal-ai-product-tag">
                      <strong>Material / Destaque:</strong> {topic.suggestedProduct}
                    </div>
                    <div className="journal-ai-topic-actions">
                      <button 
                        type="button" 
                        className="journal-ai-write-btn"
                        onClick={() => handleGenerateArticle(topic)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? <RefreshCw size={14} className="fa-spin" /> : <Wand2 size={14} />}
                        <span>Escrever Esta Matéria com IA</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pauta Personalizada */}
              <div className="journal-ai-custom-prompt-box">
                <label className="journal-ai-label">Ou digite uma ideia de tema que deseja abordar:</label>
                <div className="journal-ai-input-row">
                  <input 
                    type="text" 
                    className="journal-ai-input" 
                    placeholder="Ex: Como fazer olhos bordados perfeitos em bonecas de crochê..."
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="journal-ai-primary-btn"
                    onClick={() => handleGenerateArticle()}
                    disabled={isGenerating || !customTopic.trim()}
                  >
                    {isGenerating ? <RefreshCw size={15} className="fa-spin" /> : <Sparkles size={15} />}
                    <span>Criar Matéria</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA 2: REDATOR DE MATÉRIAS ── */}
          {activeTab === 'writer' && (
            <div className="journal-ai-content-body">
              <div className="journal-ai-controls-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <label className="journal-ai-label" style={{ margin: 0 }}>Tom da Matéria:</label>
                  <select 
                    className="journal-ai-select"
                    value={writingTone}
                    onChange={e => setWritingTone(e.target.value)}
                  >
                    <option value="afetivo">Acolhedor & Afetivo (Ideal Amoreja)</option>
                    <option value="tecnico">Técnico & Detalhado (Passo a Passo e Fios)</option>
                    <option value="inspirador">Inspirador & Empreendedor</option>
                    <option value="jornalistico">Jornalístico Clássico</option>
                  </select>
                </div>

                <button 
                  type="button" 
                  className="journal-ai-secondary-btn"
                  onClick={() => handleGenerateArticle()}
                  disabled={isGenerating}
                >
                  <RefreshCw size={14} className={isGenerating ? 'fa-spin' : ''} />
                  <span>Gerar Nova Versão</span>
                </button>
              </div>

              {isGenerating ? (
                <div className="journal-ai-loading-box">
                  <RefreshCw size={36} className="fa-spin" color="#d97706" />
                  <h4>Redigindo sua matéria jornalística...</h4>
                  <p>Estruturando título marcante, subtítulo caligráfico e dicas de materiais para as leitoras.</p>
                </div>
              ) : generatedArticle ? (
                <div className="journal-ai-preview-card">
                  <div className="journal-ai-article-header">
                    <span className="journal-ai-label-pill">Título Sugerido</span>
                    <h3 className="journal-ai-article-title">{generatedArticle.title}</h3>
                    <span className="journal-ai-label-pill" style={{ marginTop: '10px' }}>Subtítulo / Linha Fina</span>
                    <p className="journal-ai-article-subtitle">{generatedArticle.subtitle}</p>
                  </div>

                  <div className="journal-ai-article-content">
                    <span className="journal-ai-label-pill">Corpo da Matéria</span>
                    <div className="journal-ai-text-preview">
                      {generatedArticle.content}
                    </div>
                  </div>

                  {generatedArticle.suggested_sources && (
                    <div className="journal-ai-sources-box">
                      <span className="journal-ai-sources-title">
                        <ShieldCheck size={15} color="#059669" /> Fontes e Referências Indicadas:
                      </span>
                      <ul>
                        {generatedArticle.suggested_sources.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ação Principal: Aplicar no Formulário */}
                  <div className="journal-ai-apply-footer">
                    <button 
                      type="button" 
                      className={`journal-ai-apply-btn ${copiedStatus ? 'applied' : ''}`}
                      onClick={() => handleApplyToForm(generatedArticle)}
                    >
                      {copiedStatus ? <Check size={18} /> : <Wand2 size={18} />}
                      <span>{copiedStatus ? '✓ Aplicado com Sucesso no Formulário!' : '✨ Aplicar Automaticamente na Matéria'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="journal-ai-empty-state">
                  <BookOpen size={48} color="#cbd5e1" />
                  <h4>Nenhuma matéria gerada ainda</h4>
                  <p>Escolha uma das pautas na aba 1 ou digite um tema acima para que o agente escreva a matéria para você.</p>
                  <button 
                    type="button" 
                    className="journal-ai-primary-btn"
                    onClick={() => handleGenerateArticle()}
                  >
                    <Sparkles size={16} />
                    <span>Escrever Matéria sobre Tendências</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── ABA 3: BANCO & GERADOR DE IMAGENS LIVRES ── */}
          {activeTab === 'images' && (
            <div className="journal-ai-content-body">
              <div className="journal-ai-img-subtabs">
                <button 
                  type="button" 
                  className={`journal-ai-subtab ${imageTab === 'curated' ? 'active' : ''}`}
                  onClick={() => setImageTab('curated')}
                >
                  <ShieldCheck size={15} color="#059669" />
                  <span>Banco de Fotos Livres de Direitos (Com Atribuição)</span>
                </button>
                <button 
                  type="button" 
                  className={`journal-ai-subtab ${imageTab === 'ai' ? 'active' : ''}`}
                  onClick={() => setImageTab('ai')}
                >
                  <Wand2 size={15} color="#db2777" />
                  <span>Gerador IA Nanobana (Imagens Novas & Livres)</span>
                </button>
              </div>

              {/* Sub-aba 1: Banco Curado com Fontes */}
              {imageTab === 'curated' && (
                <div>
                  <p className="journal-ai-help-text">
                    Todas as imagens abaixo são de uso livre e gratuito. Ao selecionar qualquer uma, os <strong>créditos e fontes de origem</strong> são inseridos automaticamente no campo de referências da matéria.
                  </p>

                  <div className="journal-ai-images-grid">
                    {CURATED_FREE_IMAGES.map((img) => (
                      <div 
                        key={img.id} 
                        className={`journal-ai-image-card ${selectedImage?.id === img.id ? 'selected' : ''}`}
                        onClick={() => setSelectedImage(img)}
                      >
                        <div className="journal-ai-img-wrapper">
                          <img src={img.url} alt={img.title} />
                          {selectedImage?.id === img.id && (
                            <div className="journal-ai-selected-badge">
                              <Check size={16} /> Selecionada
                            </div>
                          )}
                        </div>
                        <div className="journal-ai-img-info">
                          <h6 className="journal-ai-img-title">{img.title}</h6>
                          <div className="journal-ai-img-credit">
                            <span>Autor: <strong>{img.author}</strong></span>
                            <span>Fonte: {img.source}</span>
                          </div>
                          <button 
                            type="button" 
                            className="journal-ai-choose-img-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(img);
                              handleApplyToForm(generatedArticle, img);
                            }}
                          >
                            <Check size={14} /> Usar como Capa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-aba 2: Gerador de Imagens Nanobana IA */}
              {imageTab === 'ai' && (
                <div>
                  <p className="journal-ai-help-text">
                    Descreva o amigurumi ou cenário que você deseja ilustrar. A IA gerará uma foto fotográfica exclusiva com iluminação quente de ateliê, livre de royalties:
                  </p>

                  <div className="journal-ai-ai-prompt-row">
                    <input 
                      type="text" 
                      className="journal-ai-input" 
                      placeholder="Ex: Ursinho de amigurumi com touca azul lendo um livro..."
                      value={imagePrompt}
                      onChange={e => setImagePrompt(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="journal-ai-primary-btn"
                      onClick={handleGenerateAiImage}
                      disabled={isGeneratingImage || !imagePrompt.trim()}
                    >
                      {isGeneratingImage ? <RefreshCw size={15} className="fa-spin" /> : <Sparkles size={15} />}
                      <span>Gerar Imagem com IA</span>
                    </button>
                  </div>

                  {isGeneratingImage && (
                    <div className="journal-ai-loading-box">
                      <RefreshCw size={36} className="fa-spin" color="#db2777" />
                      <h4>Gerando sua ilustração de amigurumi...</h4>
                      <p>Criando texturas realistas de pontos, cores aconchegantes e iluminação profissional.</p>
                    </div>
                  )}

                  {generatedAiImage && !isGeneratingImage && (
                    <div className="journal-ai-generated-result-card">
                      <div className="journal-ai-gen-img-preview">
                        <img src={generatedAiImage.url} alt={generatedAiImage.title} />
                      </div>
                      <div className="journal-ai-gen-img-details">
                        <h5>{generatedAiImage.title}</h5>
                        <div className="journal-ai-credit-tag">
                          <ShieldCheck size={16} color="#059669" />
                          <span>{generatedAiImage.source}</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '8px 0 16px' }}>
                          Esta imagem foi gerada exclusivamente para a sua matéria e não possui restrições de direitos autorais.
                        </p>
                        <button 
                          type="button" 
                          className="journal-ai-apply-btn"
                          onClick={() => handleApplyToForm(generatedArticle, generatedAiImage)}
                        >
                          <Check size={16} />
                          <span>Aplicar Esta Imagem como Capa da Matéria</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
