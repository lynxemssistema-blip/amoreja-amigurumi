require('dotenv').config();
const { Client } = require('pg');

async function updateInstagramInfo() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Atualizando banco com colunas extras e tabela de notificações...');

    // 1. Colunas adicionais na tabela de contatos
    await pgClient.query(`
      ALTER TABLE public.new_amoreja_ig_contacts 
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS unread BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS last_msg_preview TEXT,
        ADD COLUMN IF NOT EXISTS last_msg_time TEXT;
    `);

    // 2. Tabela de Notificações do Instagram
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS public.new_amoreja_ig_notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        type TEXT NOT NULL, -- 'follow', 'like_post', 'like_reel', 'comment'
        username TEXT NOT NULL,
        user_avatar TEXT,
        post_thumbnail TEXT,
        extra_text TEXT,
        created_time_label TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.new_amoreja_ig_notifications ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "Allow all for authenticated on notifications" ON public.new_amoreja_ig_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Allow read for anon on notifications" ON public.new_amoreja_ig_notifications FOR SELECT TO anon USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      GRANT ALL ON public.new_amoreja_ig_notifications TO authenticated, anon;
    `);

    // Limpar contatos e mensagens anteriores para recriar exatamente conforme a referência
    await pgClient.query('DELETE FROM public.new_amoreja_ig_messages');
    await pgClient.query('DELETE FROM public.new_amoreja_ig_contacts');
    await pgClient.query('DELETE FROM public.new_amoreja_ig_notifications');

    console.log('✅ Tabelas limpas. Populando contatos com dados ricos...');

    // 3. Contatos ricos (do print de referência de DMs)
    const contacts = [
      {
        username: 'ninjagurumi',
        full_name: 'NinjaGurumi • Adri Kutani Fukumoto',
        profile_pic_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        approved: true,
        is_verified: false,
        unread: true,
        last_msg_preview: 'Chamei',
        last_msg_time: '2h'
      },
      {
        username: 'tati_tonetti',
        full_name: 'Tati Tonetti | Amigurumi Designer',
        profile_pic_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        approved: true,
        is_verified: true,
        unread: false,
        last_msg_preview: 'Você: Que seja ótimo!',
        last_msg_time: '3h'
      },
      {
        username: 'nice_leana',
        full_name: 'Nice Leana | Viajar na Arte do Crochê',
        profile_pic_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        approved: true,
        is_verified: false,
        unread: false,
        last_msg_preview: 'Nice enviou uma mensagem de voz.',
        last_msg_time: '4h'
      },
      {
        username: 'loja_amigu',
        full_name: 'Loja Amigu • Audrey 🧡',
        profile_pic_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        approved: true,
        is_verified: false,
        unread: false,
        last_msg_preview: 'Você: 🥰🥰',
        last_msg_time: '5h'
      },
      {
        username: 'duamo_armarinho',
        full_name: 'Duamô Armarinho',
        profile_pic_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80',
        approved: true,
        is_verified: false,
        unread: false,
        last_msg_preview: 'Imagina minha querida! Estamos ju...',
        last_msg_time: '6h'
      },
      {
        username: 'blanca_garcia',
        full_name: 'Blanca Garcia',
        profile_pic_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        approved: true,
        is_verified: false,
        unread: false,
        last_msg_preview: 'Blanca enviou uma foto.',
        last_msg_time: '6h'
      },
      // Solicitações pendentes (para testar aprovação)
      {
        username: 'artes_manuais_clara',
        full_name: 'Clara Santos',
        profile_pic_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        approved: false,
        is_verified: false,
        unread: false,
        last_msg_preview: 'Gostaria de saber se vocês aceitam...',
        last_msg_time: '1h'
      }
    ];

    const contactMap = {};
    for (const c of contacts) {
      const res = await pgClient.query(`
        INSERT INTO public.new_amoreja_ig_contacts 
          (username, full_name, profile_pic_url, approved, is_verified, unread, last_msg_preview, last_msg_time)
        VALUES 
          ('${c.username}', '${c.full_name}', '${c.profile_pic_url}', ${c.approved}, ${c.is_verified}, ${c.unread}, '${c.last_msg_preview}', '${c.last_msg_time}')
        RETURNING id, username;
      `);
      contactMap[c.username] = res.rows[0].id;
    }

    // 4. Mensagens iniciais
    await pgClient.query(`
      INSERT INTO public.new_amoreja_ig_messages (contact_id, sender_username, content, is_from_me, created_at)
      VALUES 
        ('${contactMap['ninjagurumi']}', 'ninjagurumi', 'Chamei', false, NOW() - INTERVAL '2 hours'),
        
        ('${contactMap['tati_tonetti']}', 'tati_tonetti', 'Desejo muito sucesso no lançamento!', false, NOW() - INTERVAL '3 hours 10 minutes'),
        ('${contactMap['tati_tonetti']}', 'Você', 'Que seja ótimo!', true, NOW() - INTERVAL '3 hours'),

        ('${contactMap['nice_leana']}', 'nice_leana', 'Enviei o áudio explicando os detalhes.', false, NOW() - INTERVAL '4 hours 5 minutes'),
        ('${contactMap['nice_leana']}', 'nice_leana', 'Nice enviou uma mensagem de voz.', false, NOW() - INTERVAL '4 hours'),

        ('${contactMap['loja_amigu']}', 'loja_amigu', 'Recebi o pedido aqui! Obrigada!', false, NOW() - INTERVAL '5 hours 10 minutes'),
        ('${contactMap['loja_amigu']}', 'Você', '🥰🥰', true, NOW() - INTERVAL '5 hours'),

        ('${contactMap['duamo_armarinho']}', 'duamo_armarinho', 'Imagina minha querida! Estamos juntas.', false, NOW() - INTERVAL '6 hours'),

        ('${contactMap['blanca_garcia']}', 'blanca_garcia', 'Blanca enviou uma foto.', false, NOW() - INTERVAL '6 hours'),

        ('${contactMap['artes_manuais_clara']}', 'artes_manuais_clara', 'Gostaria de saber se vocês aceitam encomendas.', false, NOW() - INTERVAL '1 hour')
    `);

    // 5. Popular Notificações (do print de referência de Notificações)
    const notifications = [
      {
        type: 'follow',
        username: 'doce_croche_jaqueline_albino',
        user_avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
        extra_text: 'começou a seguir você.',
        created_time_label: '21 min'
      },
      {
        type: 'like_post',
        username: 'soraya_alvesoliveira',
        user_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        post_thumbnail: 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=150&auto=format&fit=crop&q=80',
        extra_text: 'soraya_alvesoliveira, anna_sosa_16 e outras 586 pessoas curtiram seu post.',
        created_time_label: '27 min'
      },
      {
        type: 'like_reel',
        username: 'fabicastanhacompositora',
        user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        post_thumbnail: 'https://images.unsplash.com/photo-1562040506-a9b32cb51b94?w=150&auto=format&fit=crop&q=80',
        extra_text: 'fabicastanhacompositora, floreocrochetdesign e outras 12 pessoas curtiram seu reel.',
        created_time_label: '2h'
      },
      {
        type: 'like_reel',
        username: 'josianalavor',
        user_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
        post_thumbnail: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=150&auto=format&fit=crop&q=80',
        extra_text: 'josianalavor, amigurumeira.cassia e outras 94 pessoas curtiram seu reel.',
        created_time_label: '3h'
      },
      {
        type: 'follow',
        username: 'soraya_alvesoliveira',
        user_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        extra_text: 'começou a seguir você.',
        created_time_label: '3h'
      },
      {
        type: 'follow',
        username: 'claudiamarciadess',
        user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        extra_text: 'começou a seguir você.',
        created_time_label: '3h'
      }
    ];

    for (const n of notifications) {
      await pgClient.query(`
        INSERT INTO public.new_amoreja_ig_notifications 
          (type, username, user_avatar, post_thumbnail, extra_text, created_time_label)
        VALUES 
          ('${n.type}', '${n.username}', '${n.user_avatar}', ${n.post_thumbnail ? `'${n.post_thumbnail}'` : 'NULL'}, '${n.extra_text}', '${n.created_time_label}')
      `);
    }

    console.log('✅ Todas as informações e notificações mockadas foram inseridas com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pgClient.end();
  }
}

updateInstagramInfo();
