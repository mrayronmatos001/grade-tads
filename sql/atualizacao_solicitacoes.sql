-- =====================================================================
-- Pedidos de página para outro curso ou universidade.
-- Ficam na tabela de sugestões com o tipo NOVO_CURSO e aparecem no /admin.
-- Pode rodar mais de uma vez.
-- =====================================================================
BEGIN;
ALTER TABLE sugestao DROP CONSTRAINT IF EXISTS ck_sugestao_tipo;
ALTER TABLE sugestao ADD CONSTRAINT ck_sugestao_tipo
    CHECK (tipo IN ('SUGESTAO', 'ERRO_DADOS', 'OUTRO', 'NOVO_CURSO'));
COMMIT;
