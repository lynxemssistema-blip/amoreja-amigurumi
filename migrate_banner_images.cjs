require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado ao banco. Iniciando migração de banner_images...');

    // Buscar todas as maratonas com banner_images preenchido
    const { rows } = await client.query(
      `SELECT id, title, banner_images FROM public.new_amoreja_maratonas WHERE banner_images IS NOT NULL AND banner_images != '[]'::jsonb`
    );

    console.log(`Encontradas ${rows.length} maratonas com banner_images para migrar.`);

    for (const row of rows) {
      const images = row.banner_images;

      // Verifica se já está no novo formato (array de objetos com "url")
      if (images.length > 0 && typeof images[0] === 'object' && images[0].url) {
        console.log(`  ✅ Maratona "${row.title}" já está no novo formato. Pulando.`);
        continue;
      }

      // Migra de ["url1", "url2"] para [{url, is_featured, featured_from, featured_until}]
      const newFormat = images.map(img => ({
        url: img,
        is_featured: false,
        featured_from: null,
        featured_until: null
      }));

      await client.query(
        `UPDATE public.new_amoreja_maratonas SET banner_images = $1::jsonb WHERE id = $2`,
        [JSON.stringify(newFormat), row.id]
      );

      console.log(`  🔄 Maratona "${row.title}" migrada com ${newFormat.length} imagem(ns).`);
    }

    console.log('\n✅ Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
