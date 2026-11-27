-- =====================================================================
-- Pré-requisitos das optativas da grade TADS 2019, conforme a tabela
-- "Componentes curriculares optativos" do PPC (estrutura 03, 2019.2).
-- Como nas obrigatórias, só entram códigos da grade 2019 (os códigos
-- antigos equivalentes, como TAD0002 e TAD0003, ficam de fora).
-- Optativas criadas depois do PPC não aparecem aqui.
-- Pode rodar mais de uma vez: apaga e recria os pré-requisitos destas.
-- Rode depois de atualizacao_optativas.sql.
-- =====================================================================
BEGIN;

DELETE FROM grupo_de_prerequisito
WHERE estrutura_codigo = 'TADS-2019'
  AND componente_codigo IN ('TAD0010', 'TAD0021', 'TAD0036', 'TAD0047', 'TAD0054', 'TAD0058', 'TAD0059', 'TAD0062', 'TAD0064', 'TAD0065');

-- TAD0010 requer (TAD0103 Banco de Dados)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0010') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0103') AS c(codigo);
-- TAD0021 requer (TAD0012 Processo de Desenvolvimento de Software)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0021') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0012') AS c(codigo);
-- TAD0036 requer (TAD0123 Sistemas Digitais)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0036') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0123') AS c(codigo);
-- TAD0047 requer (TAD0103 Banco de Dados)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0047') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0103') AS c(codigo);
-- TAD0054 requer (TAD0103 Banco de Dados)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0054') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0103') AS c(codigo);
-- TAD0058 requer (TAD0020 Estruturas de Dados)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0058') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0020') AS c(codigo);
-- TAD0059 requer (TAD0009 Programação Orientada a Objetos) E (TAD0020 Estruturas de Dados)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0059') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0009') AS c(codigo);
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0059') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0020') AS c(codigo);
-- TAD0062 requer (TAD0160 Sistemas Distribuídos)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0062') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0160') AS c(codigo);
-- TAD0064 requer (TAD0114 Redes de Computadores)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0064') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0114') AS c(codigo);
-- TAD0065 requer (TAD0102 Algoritmos e Programação)
WITH g AS (INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
           VALUES ('TADS-2019', 'TAD0065') RETURNING id)
INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
SELECT c.codigo, g.id FROM g, (SELECT 'TAD0102') AS c(codigo);

COMMIT;
