const { Client } = require('pg');

async function setupCustomerChannel() {
  const connectionString = 'postgresql://postgres:10207597Rdv*@db.slgpkokjcaiprqxpoefr.supabase.co:5432/postgres';
  const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await pgClient.connect();
    
    // 1. Add columns to new_amoreja_profiles
    console.log("Adding columns to new_amoreja_profiles...");
    await pgClient.query(`
      ALTER TABLE public.new_amoreja_profiles
      ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
    console.log("Columns added successfully.");

    // 2. Create avatars bucket via SQL
    console.log("Creating 'avatars' bucket...");
    await pgClient.query(`
      INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
      VALUES ('avatars', 'avatars', true, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[], 5242880)
      ON CONFLICT (id) DO UPDATE SET 
        public = EXCLUDED.public,
        allowed_mime_types = EXCLUDED.allowed_mime_types,
        file_size_limit = EXCLUDED.file_size_limit;
    `);
    console.log("Bucket created/updated.");

    // 3. Set policies
    await pgClient.query(`
      DO $$ BEGIN
        CREATE POLICY "Avatar images are publicly accessible." 
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'avatars');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Users can upload their own avatars." 
        ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Users can update their own avatars." 
        ON storage.objects FOR UPDATE 
        USING (bucket_id = 'avatars' AND auth.uid() = owner);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Users can delete their own avatars." 
        ON storage.objects FOR DELETE 
        USING (bucket_id = 'avatars' AND auth.uid() = owner);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    console.log("Storage policies applied.");

  } catch (error) {
    console.error("Error setting up customer channel:", error);
  } finally {
    await pgClient.end();
  }
}

setupCustomerChannel();
