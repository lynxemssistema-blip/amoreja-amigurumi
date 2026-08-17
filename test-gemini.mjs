const GEMINI_API_KEY = 'AIzaSyCWGYfQmnDopCbwoOhnJ5TOtj7odPDMZAw';
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const systemPrompt = `Você é o Orquestrador Chefe de Marketing da loja 'Amoreja' de amigurumis artesanais.

MISSÃO: Com base na ideia 'ursinho', crie um carrossel completo de Instagram de ALTO ENGAJAMENTO para o nicho de amigurumi e crochê.

PERFIL DO PÚBLICO: Mulheres 18-45 anos, apaixonadas por artesanato, amigurumi, crochê e brinquedos fofos. Querem aprender, se inspirar e comprar peças exclusivas.

ESTRATÉGIA DO CARROSSEL:
- Slide 1 (GANCHO/CAPA): Título irresistível que para o scroll. Pergunta, dado curioso ou afirmação impactante sobre o amigurumi.
- Slide 2 (VALOR 1): Primeira dica prática, materiais necessários, ou característica especial da peça. Máximo 4 linhas.
- Slide 3 (VALOR 2): Dica técnica de crochet (pontos, anel mágico), diferencial da peça, ou passo importante da receita. Máximo 4 linhas.
- Slide 4 (CTA FOFO): Chamada para ação clara e fofa. Ex: 'Salve esse post 🔖', 'Comente 🧸', 'Receita completa no link da bio 💕'.

REGRAS PARA imagePrompts (CRÍTICO):
- Descreva APENAS o visual da imagem. NUNCA coloque texto, palavras ou letras no prompt.
- Sempre especifique: 'no text, no words, no letters, no watermark'
- Estilo Amoreja: fundo pastel suave (rosa bebê, lilás, creme, menta), iluminação natural difusa, kawaii/cute, super clean.
- Slide 1: apresentação do amigurumi completo, lindo e fotogênico.
- Slide 2: close nos detalhes ou materiais usados.
- Slide 3: processo criativo ou close do ponto/detalhe técnico.
- Slide 4: amigurumi finalizado em cenário bonito com props fofos.

Retorne EXATAMENTE um JSON válido (sem markdown, sem explicação):
{
  "caption": "legenda fofa para Instagram com emojis, parágrafos curtos, histórico do processo, até 2000 caracteres",
  "hashtags": ["#amigurumi", "#croche", "#amoreja", "#amigurumibrasil", "#feitoamao", "#receitaamigurumi", "#artesanato", "#decoracaoinfantil"],
  "imageKeyword": "keyword de fallback em inglês para Pexels (ex: amigurumi crochet handmade kawaii)",
  "carouselSlides": [
    "Texto curto e impactante da capa (máx 8 palavras)",
    "Texto fofo do slide 2 (máx 4 linhas)",
    "Texto fofo do slide 3 (máx 4 linhas)",
    "Texto fofo do CTA final (máx 2 linhas)"
  ],
  "imagePrompts": [
    "Prompt de imagem IA em inglês para o SLIDE 1: apresentação do amigurumi completo, pastel background, cute kawaii style, product photography, soft natural light, no text, no words, no letters, no watermark",
    "Prompt de imagem IA em inglês para o SLIDE 2: close-up detalhes do amigurumi ou materiais, pastel background, macro photography, no text, no words, no watermark",
    "Prompt de imagem IA em inglês para o SLIDE 3: processo de criação ou ponto de crochet, cozy craft atmosphere, pastel background, no text, no words, no watermark",
    "Prompt de imagem IA em inglês para o SLIDE 4: amigurumi finalizado em cenário fofo com props, gift presentation, pastel pink background, professional product photography, no text, no words, no watermark"
  ]
}`;

fetch(geminiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    contents: [{ parts: [{ text: systemPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json'
    }
  })
}).then(res => res.json()).then(data => {
  console.log('STATUS:', data.error ? data.error : 'OK');
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('RAW TEXT:', rawText);
  try {
    JSON.parse(rawText);
    console.log('PARSE SUCCESS');
  } catch(err) {
    console.error('PARSE FAILED', err.message);
  }
});
