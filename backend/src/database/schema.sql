-- Habilita a extensão pgcrypto para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela para armazenar informações dos usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sso_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    master_password_salt VARCHAR(255) NOT NULL,
    master_password_hint VARCHAR(255),
    master_password_hash VARCHAR(255) NOT NULL,
    
    -- Colunas para Criptografia Assimétrica (Compartilhamento)
    public_key TEXT, -- Chave pública, armazenada em texto plano.
    encrypted_private_key TEXT, -- Chave privada, criptografada com a senha mestra do usuário.

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false
);

-- Tabela para as pastas que organizam as senhas
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_name TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela principal para armazenar os itens do cofre (senhas, notas, etc.)
CREATE TABLE secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'login',
    encrypted_title TEXT NOT NULL,
    encrypted_username TEXT,
    encrypted_password TEXT,
    encrypted_url TEXT,
    encrypted_notes TEXT,
    iv TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para grupos de compartilhamento
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- O nome do grupo também precisará ser criptografado, mas com uma chave de grupo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de associação entre usuários e grupos (Muitos para Muitos)
CREATE TABLE user_groups (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    -- Aqui armazenaremos a chave do grupo, criptografada para este usuário específico
    encrypted_group_key TEXT,
    PRIMARY KEY (user_id, group_id)
);

-- Tabela para compartilhar um segredo específico com um grupo
-- A abordagem mais simples é duplicar o segredo e re-criptografá-lo com a chave do grupo.
CREATE TABLE secret_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_secret_id UUID REFERENCES secrets(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    -- Dados do segredo, re-criptografados com a chave do grupo
    encrypted_data TEXT NOT NULL, 
    iv TEXT NOT NULL,
    shared_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (original_secret_id, group_id)
);

-- Índices para otimizar consultas
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_secrets_user_id ON secrets(user_id);
CREATE INDEX idx_secrets_folder_id ON secrets(folder_id);
CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);