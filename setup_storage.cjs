require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

async function setup() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Criando Buckets...');

  try {
    // 1. Criar buckets via API de admin
    await supabase.storage.createBucket('receitas_pdf', {
      public: false, // PDFs are private
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 10485760 // 10MB
    });
    console.log('Bucket receitas_pdf criado.');
  } catch (e) {
    console.log('receitas_pdf talvez ja exista.', e.message);
  }

  try {
    await supabase.storage.createBucket('produto_imagens', {
      public: true, // Imagens sao publicas
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });
    console.log('Bucket produto_imagens criado.');
  } catch (e) {
    console.log('produto_imagens talvez ja exista.', e.message);
  }

  console.log('Adicionando coluna gallery_images no PG...');
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();

    // 2. Adicionar coluna na tabela de produtos
    await pgClient.query(`
      ALTER TABLE public.new_amoreja_products 
      ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Coluna gallery_images adicionada com sucesso!');
    
    // 3. Atualizar politicas do Storage para permitir admins a upar
    await pgClient.query(`
      CREATE POLICY "Admins podem fazer tudo no storage"
      ON storage.objects FOR ALL
      USING (
        EXISTS (
            SELECT 1 FROM public.new_amoreja_profiles
            WHERE new_amoreja_profiles.id = auth.uid() AND new_amoreja_profiles.is_admin = true
        )
      );

      CREATE POLICY "Qualquer um pode ler imagens"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'produto_imagens');
      
      -- PDFs: donos do pedido poderiam ver. Mas por enquanto os PDFs estao privados 
      -- e podemos usar URLs assinadas geradas pelo Admin/Server, ou fazer RLS para donos.
      -- Como não criamos uma tabela de acesso aos PDFs ainda, usar URL assinada (CreateSignedUrl)
      -- é a forma mais facil para o frontend quando o usuario estiver no dashboard.
    `);
    console.log('Politicas de storage aplicadas.');

  } catch (err) {
    console.log('Aviso nas queries PG (talvez politicas ja existam):', err.message);
  } finally {
    await pgClient.end();
  }
}

setup();
