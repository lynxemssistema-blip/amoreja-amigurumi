require('dotenv').config();
const { Client } = require('pg');

async function fixStoragePolicy() {
  const connectionString = process.env.SUPABASE_DB_URL;
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();

    await pgClient.query(`
      CREATE POLICY "Compradores podem ler PDFs"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'receitas_pdf' AND auth.role() = 'authenticated');
    `);
    console.log('Politica de leitura de PDFs aplicada.');

  } catch (err) {
    console.log('Aviso (talvez politica ja exista):', err.message);
  } finally {
    await pgClient.end();
  }
}

fixStoragePolicy();
