-- ==========================================
-- SCHEMA PARA BANCO DE DADOS SUPABASE
-- AMOREJA AMIGURUMI
-- ==========================================

-- 1. Tabela de Perfis de Usuários (profiles)
CREATE TABLE IF NOT EXISTS public.New_Amoreja_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em profiles
ALTER TABLE public.New_Amoreja_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Tabela de Receitas de Amigurumi (products)
CREATE TABLE IF NOT EXISTS public.New_Amoreja_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    pdf_path TEXT, -- Caminho do arquivo no Supabase Storage
    image_url TEXT, -- Imagem de capa
    difficulty TEXT DEFAULT 'Médio',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em products
ALTER TABLE public.New_Amoreja_products ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de Pedidos (orders)
CREATE TABLE IF NOT EXISTS public.New_Amoreja_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.New_Amoreja_profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_id TEXT, -- Referência do gateway de pagamento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em orders
ALTER TABLE public.New_Amoreja_orders ENABLE ROW LEVEL SECURITY;

-- 4. Tabela de Itens de Pedidos (order_items)
CREATE TABLE IF NOT EXISTS public.New_Amoreja_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.New_Amoreja_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.New_Amoreja_products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em order_items
ALTER TABLE public.New_Amoreja_order_items ENABLE ROW LEVEL SECURITY;

-- 5. Tabela de Posts do Instagram (instagram_posts)
CREATE TABLE IF NOT EXISTS public.New_Amoreja_instagram_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_url TEXT NOT NULL UNIQUE,
    caption TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em instagram_posts
ALTER TABLE public.New_Amoreja_instagram_posts ENABLE ROW LEVEL SECURITY;

-- 6. Tabela de Configurações do Sistema (settings)
CREATE TABLE IF NOT EXISTS public.New_Amoreja_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em settings
ALTER TABLE public.New_Amoreja_settings ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- POLÍTICAS DE SEGURANÇA (RLS - Row Level Security)
-- ==========================================

-- Políticas para 'profiles'
CREATE POLICY "Qualquer um pode ver perfis públicos"
    ON public.New_Amoreja_profiles FOR SELECT USING (true);

CREATE POLICY "Usuários podem atualizar seus próprios perfis"
    ON public.New_Amoreja_profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para 'products'
CREATE POLICY "Qualquer um pode ver produtos/receitas"
    ON public.New_Amoreja_products FOR SELECT USING (true);

CREATE POLICY "Apenas administradores podem inserir/editar produtos"
    ON public.New_Amoreja_products FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.New_Amoreja_profiles
            WHERE New_Amoreja_profiles.id = auth.uid() AND New_Amoreja_profiles.is_admin = true
        )
    );

-- Políticas para 'orders'
CREATE POLICY "Usuários podem ver seus próprios pedidos"
    ON public.New_Amoreja_orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios pedidos"
    ON public.New_Amoreja_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Apenas administradores podem atualizar pedidos"
    ON public.New_Amoreja_orders FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.New_Amoreja_profiles
            WHERE New_Amoreja_profiles.id = auth.uid() AND New_Amoreja_profiles.is_admin = true
        )
    );

-- Políticas para 'order_items'
CREATE POLICY "Usuários podem ver itens dos seus próprios pedidos"
    ON public.New_Amoreja_order_items FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.New_Amoreja_orders
            WHERE New_Amoreja_orders.id = New_Amoreja_order_items.order_id AND New_Amoreja_orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Usuários podem inserir itens nos seus pedidos"
    ON public.New_Amoreja_order_items FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.New_Amoreja_orders
            WHERE New_Amoreja_orders.id = New_Amoreja_order_items.order_id AND New_Amoreja_orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Apenas administradores têm controle total de itens de pedidos"
    ON public.New_Amoreja_order_items FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.New_Amoreja_profiles
            WHERE New_Amoreja_profiles.id = auth.uid() AND New_Amoreja_profiles.is_admin = true
        )
    );

-- Políticas para 'instagram_posts'
CREATE POLICY "Qualquer um pode visualizar posts do Instagram"
    ON public.New_Amoreja_instagram_posts FOR SELECT USING (true);

CREATE POLICY "Apenas administradores podem gerenciar posts do Instagram"
    ON public.New_Amoreja_instagram_posts FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.New_Amoreja_profiles
            WHERE New_Amoreja_profiles.id = auth.uid() AND New_Amoreja_profiles.is_admin = true
        )
    );

-- Políticas para 'settings'
CREATE POLICY "Apenas administradores podem gerenciar configurações"
    ON public.New_Amoreja_settings FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.New_Amoreja_profiles
            WHERE New_Amoreja_profiles.id = auth.uid() AND New_Amoreja_profiles.is_admin = true
        )
    );


-- ==========================================
-- GATILHOS (TRIGGERS) AUTOMÁTICOS
-- ==========================================

-- Gatilho para criar um perfil automaticamente quando um usuário se cadastrar no auth do Supabase
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.New_Amoreja_profiles (id, email, full_name, is_admin)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Cliente Amoreja'),
        FALSE -- Usuários novos por padrão não são admins
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- DADOS INICIAIS DE TESTE (SEED DATA)
-- ==========================================

-- Inserindo alguns produtos para demonstração
INSERT INTO public.New_Amoreja_products (title, description, price, image_url, difficulty)
VALUES 
('Gigi Love - Girafinha com Óculos', 'Receita completa para criar a Gigi Love, a girafinha elegante com óculos escuros de coração. Inclui tutorial detalhado passo a passo.', 29.90, 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80', 'Médio'),
('Rodolph - A Rena de Natal', 'Aprenda a crochetar o simpático Rodolph, perfeito para decorações de Natal e presentes especiais de final de ano.', 34.90, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80', 'Fácil'),
('Princesa Jasmine', 'Design inspirado na Princesa Jasmine, contendo todos os detalhes do cabelo, tiara e roupa clássica.', 39.90, 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80', 'Avançado')
ON CONFLICT DO NOTHING;

-- Inserindo alguns posts do Instagram simulados
INSERT INTO public.New_Amoreja_instagram_posts (post_url, caption, image_url)
VALUES
('https://www.instagram.com/p/DZCnocTDhSp/', 'MARATONA DE AMIGURUMIS | FESTIVAL DAS ESTAÇÕES ❄☀️🌸🍂 a 2ª edição chegou com 20 designers maravilhosas!', 'https://images.unsplash.com/photo-1584992791193-5dec183a2198?w=600&auto=format&fit=crop&q=80'),
('https://www.instagram.com/p/DZ42Efrjh9M/', 'Gigi Love - Girafinha amigurumi by @fofinhosamigurumi. Em breve disponível no festival!', 'https://images.unsplash.com/photo-1562040506-a9b32cb51b94?w=600&auto=format&fit=crop&q=80'),
('https://www.instagram.com/p/DZh4ZY9jr1h/', 'Designers da Maratona de Amigurumis - Conheça a Marcia Reggiani e sua história de amor por pontos!', 'https://images.unsplash.com/photo-1605007493699-af65834f8a00?w=600&auto=format&fit=crop&q=80')
ON CONFLICT DO NOTHING;

-- Inserindo configuração padrão do token
INSERT INTO public.New_Amoreja_settings (key, value)
VALUES ('instagram_access_token', 'COLOQUE_SEU_TOKEN_AQUI')
ON CONFLICT DO NOTHING;
