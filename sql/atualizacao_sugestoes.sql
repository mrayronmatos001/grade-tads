-- =====================================================================
-- Atualização: tabela de sugestões enviadas pelo site
-- Rode UMA vez no banco que já existe (Supabase: SQL Editor > Run).
-- Pode rodar de novo sem apagar as sugestões já recebidas.
-- Para ler as sugestões: Supabase > Table Editor > sugestao.
-- =====================================================================

CREATE TABLE IF NOT EXISTS sugestao (
    id         INT          GENERATED ALWAYS AS IDENTITY,
    tipo       VARCHAR(20)  NOT NULL,
    mensagem   TEXT         NOT NULL,
    nome       VARCHAR(80),
    email      VARCHAR(120),
    status     VARCHAR(20)  NOT NULL DEFAULT 'NOVA',
    criado_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_sugestao PRIMARY KEY (id),
    CONSTRAINT ck_sugestao_tipo     CHECK (tipo IN ('SUGESTAO', 'ERRO_DADOS', 'OUTRO')),
    CONSTRAINT ck_sugestao_status   CHECK (status IN ('NOVA', 'LIDA', 'RESOLVIDA', 'DESCARTADA')),
    CONSTRAINT ck_sugestao_mensagem CHECK (char_length(mensagem) BETWEEN 10 AND 2000)
);

CREATE INDEX IF NOT EXISTS idx_sugestao_criado_em ON sugestao (criado_em DESC);

-- A API pública do Supabase não lê nem grava esta tabela;
-- só o servidor do site, que se conecta direto ao PostgreSQL.
ALTER TABLE sugestao ENABLE ROW LEVEL SECURITY;

-- Conferência
SELECT COUNT(*) AS sugestoes FROM sugestao;
