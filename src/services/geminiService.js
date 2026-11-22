// Serviço centralizado dos modelos Gemini (otimizado para melhor custo-benefício e máxima velocidade)
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Modelos mais rápidos e econômicos ativos na API (padrão)
export const ECONOMY_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.8-flash'
];

// Modelos mais profundos para relatórios complexos ou análises densas
export const DEEP_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

// Modelos para transcrição de áudio
export const TRANSCRIPTION_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash'
];

// Modelos para geração/edição de imagem
export const IMAGE_MODELS = [
  'gemini-3.1-flash-lite-image',
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image'
];

const extractGeminiText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return '';
  const nonThought = parts
    .filter((p) => typeof p?.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('\n')
    .trim();
  if (nonThought) return nonThought;
  return parts
    .filter((p) => typeof p?.text === 'string')
    .map((p) => p.text)
    .join('\n')
    .trim();
};

/**
 * Executa uma conversa multi-turno com o Gemini usando cascata automática dos modelos mais baratos/rápidos.
 */
export const callGeminiChat = async ({
  systemInstruction,
  history = [],
  userMessage,
  mode = 'economy',
  temperature = 0.35
}) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Chave do Gemini (VITE_GEMINI_API_KEY) não configurada.');
  }

  const models = mode === 'deep' ? DEEP_MODELS : ECONOMY_MODELS;
  const formattedHistory = (Array.isArray(history) ? history : [])
    .slice(-24)
    .filter((m) => m && typeof m.text === 'string' && m.text.trim())
    .map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

  const contents = [
    ...formattedHistory,
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const payload = {
    ...(systemInstruction
      ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
      : {}),
    contents,
    generationConfig: { temperature }
  };

  let lastError = null;
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const rawText = await res.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        lastError = new Error(`${model}: ${msg}`);
        if ([404, 429, 500, 503].includes(res.status)) {
          continue;
        }
        throw lastError;
      }

      const text = extractGeminiText(data);
      if (!text) {
        lastError = new Error(`${model}: resposta vazia`);
        continue;
      }

      return {
        text,
        modelUsed: model,
        usageMetadata: data?.usageMetadata || null
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Todos os modelos Gemini falharam ou estão indisponíveis no momento.');
};

/**
 * Atalho de turno único (prompt direto) delegando para callGeminiChat.
 */
export const callGeminiPrompt = ({
  prompt,
  systemInstruction,
  mode = 'economy',
  temperature = 0.35
}) =>
  callGeminiChat({
    systemInstruction,
    history: [],
    userMessage: prompt,
    mode,
    temperature
  });
