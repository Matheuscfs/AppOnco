-- ==========================================
-- 1. TABELA DE PACIENTES (PERFIL CLÍNICO)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cid_principal VARCHAR(10) NOT NULL, -- Ex: C50
    diagnostico_patologico TEXT NOT NULL, -- Ex: Carcinoma Mamário Invasivo...
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. TABELA DE EXAMES E DOCUMENTOS (VAULT)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.exams_and_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL, -- Ultrassonografia, Ressonância, etc.
    data_exame DATE NOT NULL,
    medico_responsavel VARCHAR(255),
    crm_medico VARCHAR(50),
    arquivo_url TEXT, -- URL do Supabase Storage
    birads_categoria VARCHAR(10), -- Ex: 4C, 6
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. TABELA DE MÉTRICAS DO TUMOR (GRÁFICOS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.tumor_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    localizacao_anatomica TEXT NOT NULL, -- Ex: Mama Esquerda, 11h
    eixo_x_mm NUMERIC(10, 2) NOT NULL, -- Armazenado sempre em mm
    eixo_y_mm NUMERIC(10, 2) NOT NULL,
    eixo_z_mm NUMERIC(10, 2) NOT NULL,
    tils_porcentagem NUMERIC(5, 2), -- Linfócitos Infiltrantes Tumorais
    data_medicao DATE NOT NULL,
    
    -- COLUNA GERADA: Extrai automaticamente o maior eixo para o gráfico
    maior_eixo_mm NUMERIC(10, 2) GENERATED ALWAYS AS (
        GREATEST(eixo_x_mm, eixo_y_mm, eixo_z_mm)
    ) STORED,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. TABELA DE LICENÇAS MÉDICAS (ATESTADOS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.medical_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    dias_concedidos INTEGER NOT NULL,
    
    -- COLUNA GERADA: Cálculo automático da data de retorno
    data_retorno_prevista DATE GENERATED ALWAYS AS (
        (data_inicio + (dias_concedidos * INTERVAL '1 day'))::date
    ) STORED,
    
    medico_atestado VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. GALERIA DE TRATAMENTO (DIÁRIO VISUAL)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.treatment_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    imagem_url TEXT NOT NULL,
    data_registro DATE DEFAULT CURRENT_DATE,
    anotacoes TEXT,
    tags TEXT[], -- Array de tags: ["Pele", "Cabelo", etc]
    categoria VARCHAR(50), -- Categoria principal
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 11. BLOCO DE PERGUNTAS PARA CONSULTA (Q&A)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.questions_and_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pergunta TEXT NOT NULL,
    resposta TEXT,
    respondida BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.questions_and_answers ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DO $$ 
BEGIN
    -- ... existing policies ...
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own questions') THEN
        CREATE POLICY "Users can see their own questions" ON public.questions_and_answers FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- ==========================================
-- CONFIGURAÇÃO DE SEGURANÇA (RLS)
-- ==========================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams_and_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tumor_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_gallery ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own patient data') THEN
        CREATE POLICY "Users can see their own patient data" ON public.patients FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own exams') THEN
        CREATE POLICY "Users can see their own exams" ON public.exams_and_documents FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own metrics') THEN
        CREATE POLICY "Users can see their own metrics" ON public.tumor_metrics FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own leaves') THEN
        CREATE POLICY "Users can see their own leaves" ON public.medical_leaves FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own gallery') THEN
        CREATE POLICY "Users can see their own gallery" ON public.treatment_gallery FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- ==========================================
-- 6. RECEITAS DE MEDICAMENTOS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    medicamento VARCHAR(255) NOT NULL,
    dosagem VARCHAR(100),
    frequencia VARCHAR(100), -- Ex: 12/12h
    data_inicio DATE,
    data_fim DATE,
    arquivo_url TEXT, -- Foto da receita
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. CHECKLIST DE QUIMIOTERAPIA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.chemo_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo VARCHAR(20) CHECK (tipo IN ('Vermelha', 'Branca')),
    ciclo_atual INTEGER NOT NULL,
    total_ciclos INTEGER NOT NULL,
    data_prevista DATE NOT NULL,
    realizada BOOLEAN DEFAULT FALSE,
    data_realizacao DATE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. ACOMPANHAMENTO DE HEMOGRAMAS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.blood_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data_exame DATE NOT NULL,
    leucocitos NUMERIC(10, 2), -- Valor em mm³
    hemoglobina NUMERIC(10, 2), -- Valor em g/dL
    plaquetas NUMERIC(10, 2), -- Valor em mm³
    neutrofilos NUMERIC(10, 2), -- Valor em % ou absoluto
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 9. DIÁRIO DE SINTOMAS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sintoma VARCHAR(100) NOT NULL, -- Febre, Náusea, Dor, etc.
    intensidade INTEGER CHECK (intensidade >= 1 AND intensidade <= 10),
    data_registro TIMESTAMPTZ DEFAULT NOW(),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 10. LOG DE MEDICAMENTOS (TOMADOS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    data_tomada TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams_and_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tumor_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chemo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own patient data') THEN
        CREATE POLICY "Users can see their own patient data" ON public.patients FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own exams') THEN
        CREATE POLICY "Users can see their own exams" ON public.exams_and_documents FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own metrics') THEN
        CREATE POLICY "Users can see their own metrics" ON public.tumor_metrics FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own leaves') THEN
        CREATE POLICY "Users can see their own leaves" ON public.medical_leaves FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own gallery') THEN
        CREATE POLICY "Users can see their own gallery" ON public.treatment_gallery FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own prescriptions') THEN
        CREATE POLICY "Users can see their own prescriptions" ON public.prescriptions FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own chemo') THEN
        CREATE POLICY "Users can see their own chemo" ON public.chemo_sessions FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own blood counts') THEN
        CREATE POLICY "Users can see their own blood counts" ON public.blood_counts FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own symptoms') THEN
        CREATE POLICY "Users can see their own symptoms" ON public.symptoms FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own medication logs') THEN
        CREATE POLICY "Users can see their own medication logs" ON public.medication_logs FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
