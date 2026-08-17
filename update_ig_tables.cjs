require('dotenv').config();
const { Client } = require('pg');

async function updateInstagramTables() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Atualizando tabelas do Instagram para controle de aceitação...');

    // Adiciona coluna approved se não existir
    await pgClient.query(`
      ALTER TABLE public.new_amoreja_ig_contacts ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;
    `);

    // Marcar contatos existentes como aprovados (para não perdermos os testes anteriores)
    await pgClient.query(`
      UPDATE public.new_amoreja_ig_contacts SET approved = true WHERE username IN ('juliana_artes', 'croche_da_lu', 'amigurumi_love');
    `);

    // Inserir contatos pendentes
    const res = await pgClient.query(`
      INSERT INTO public.new_amoreja_ig_contacts (username, full_name, profile_pic_url, approved)
      VALUES 
        ('artes_manuais_clara', 'Clara Santos', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', false),
        ('croche_passo_passo', 'Mariana Lima', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', false)
      ON CONFLICT (username) DO UPDATE SET approved = EXCLUDED.approved
      RETURNING id, username;
    `);

    const contactMap = {};
    res.rows.forEach(r => {
      contactMap[r.username] = r.id;
    });

    // Inserir mensagens para artes_manuais_clara
    if (contactMap['artes_manuais_clara']) {
      await pgClient.query(`
        DELETE FROM public.new_amoreja_ig_messages WHERE contact_id = '${contactMap['artes_manuais_clara']}';
        INSERT INTO public.new_amoreja_ig_messages (contact_id, sender_username, content, is_from_me, created_at)
        VALUES 
          ('${contactMap['artes_manuais_clara']}', 'artes_manuais_clara', 'Olá! Vi seu perfil e achei as receitas lindas.', false, NOW() - INTERVAL '1 hour'),
          ('${contactMap['artes_manuais_clara']}', 'artes_manuais_clara', 'Gostaria de saber se vocês aceitam encomendas personalizadas ou só vendem os PDFs com as receitas?', false, NOW() - INTERVAL '58 minutes')
      `);
    }

    // Inserir mensagens para croche_passo_passo
    if (contactMap['croche_passo_passo']) {
      await pgClient.query(`
        DELETE FROM public.new_amoreja_ig_messages WHERE contact_id = '${contactMap['croche_passo_passo']}';
        INSERT INTO public.new_amoreja_ig_messages (contact_id, sender_username, content, is_from_me, created_at)
        VALUES 
          ('${contactMap['croche_passo_passo']}', 'croche_passo_passo', 'Parabéns pelo trabalho! Estou apaixonada pela girafa Gigi.', false, NOW() - INTERVAL '40 minutes'),
          ('${contactMap['croche_passo_passo']}', 'croche_passo_passo', 'Tem algum cupom de desconto ativo para a primeira compra na loja?', false, NOW() - INTERVAL '39 minutes')
      `);
    }

    console.log('✅ Tabelas do Instagram atualizadas com solicitações mock!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pgClient.end();
  }
}

updateInstagramTables();
