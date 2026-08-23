require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { generateJournalDateWarningEmail, sendAppNotificationEmail } = require('./src/utils/emailService.js');

// Para importar módulos ES em CommonJS, podemos usar o import() dinâmico
async function run() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Iniciando checagem de datas do Jornal Amoreja...');
  
  // Como emailService.js está usando import/export do ES6, precisaremos carregar dinamicamente.
  // Uma alternativa para simplificar neste script CJS é ler direto ou chamar fetch na API local se aplicável,
  // mas aqui vamos só fazer a lógica de Supabase e imprimir no console, 
  // já que o Vite não está rodando no ambiente de cron puro facilmente sem compilar.
  // Para fins de demonstração e MVP local, vamos apenas listar e simular.

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow.setHours(0,0,0,0)).toISOString();
  const tomorrowEnd = new Date(tomorrow.setHours(23,59,59,999)).toISOString();

  // 1. Procurar matérias que começam amanhã e ainda não foram notificadas
  const { data: startingArticles } = await supabase
    .from('new_amoreja_journal_articles')
    .select('id, title, start_date, author_id, new_amoreja_profiles(email, full_name)')
    .eq('status', 'approved')
    .eq('notified_start', false)
    .gte('start_date', tomorrowStart)
    .lte('start_date', tomorrowEnd);

  if (startingArticles && startingArticles.length > 0) {
    for (const article of startingArticles) {
      console.log(`[NOTIFICAÇÃO START] Enviar email para ${article.new_amoreja_profiles.email} sobre a matéria "${article.title}".`);
      // Simulação do envio. Num ambiente produtivo real, chamar a lib de email aqui.
      
      // Marcar como notificado
      await supabase.from('new_amoreja_journal_articles').update({ notified_start: true }).eq('id', article.id);
    }
  } else {
    console.log('Nenhuma matéria entrando no ar amanhã.');
  }

  // 2. Procurar matérias que vencem amanhã e ainda não foram notificadas
  const { data: endingArticles } = await supabase
    .from('new_amoreja_journal_articles')
    .select('id, title, end_date, author_id, new_amoreja_profiles(email, full_name)')
    .eq('status', 'approved')
    .eq('notified_end', false)
    .gte('end_date', tomorrowStart)
    .lte('end_date', tomorrowEnd);

  if (endingArticles && endingArticles.length > 0) {
    for (const article of endingArticles) {
      console.log(`[NOTIFICAÇÃO END] Enviar email para ${article.new_amoreja_profiles.email} sobre a matéria "${article.title}".`);
      // Marcar como notificado
      await supabase.from('new_amoreja_journal_articles').update({ notified_end: true }).eq('id', article.id);
    }
  } else {
    console.log('Nenhuma matéria saindo do ar amanhã.');
  }

  console.log('Checagem concluída.');
}

run();
