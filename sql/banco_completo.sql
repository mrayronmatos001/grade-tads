-- =====================================================================
-- Grade curricular TADS/UFRN - banco completo (PostgreSQL / Supabase)
-- Cria as tabelas, insere as grades 2015 e 2019 (com períodos e
-- pré-requisitos) e ativa a proteção de linhas (RLS).
--
-- No Supabase: SQL Editor > New query > cole tudo > Run.
-- No pgAdmin:  Query Tool no banco desejado > cole tudo > F5.
-- Pode rodar de novo: o script apaga e recria tudo.
-- =====================================================================

-- Permite rodar o script de novo durante os testes (apaga tudo antes)
DROP TABLE IF EXISTS item_do_grupo_de_prerequisito,
                     grupo_de_prerequisito,
                     componente_da_estrutura_curricular,
                     componente,
                     estrutura_curricular,
                     curso CASCADE;

-- 1) CURSO ------------------------------------------------------------
CREATE TABLE curso (
    codigo        VARCHAR(10) NOT NULL,
    nome          VARCHAR(50) NOT NULL,
    sigla         VARCHAR(10),
    instituicao   VARCHAR(50),
    criado_em     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_curso PRIMARY KEY (codigo)
);

-- 2) ESTRUTURA CURRICULAR ---------------------------------------------
CREATE TABLE estrutura_curricular (
    codigo               VARCHAR(12) NOT NULL,
    ano                  SMALLINT    NOT NULL,
    credito_optativas    SMALLINT    NOT NULL DEFAULT 0,
    horas_complementares SMALLINT    NOT NULL DEFAULT 0,
    criado_em            TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    curso_codigo         VARCHAR(10) NOT NULL,

    CONSTRAINT pk_estrutura_curricular PRIMARY KEY (codigo),
    CONSTRAINT fk_estrutura_curso
        FOREIGN KEY (curso_codigo) REFERENCES curso (codigo)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ck_estrutura_ano          CHECK (ano BETWEEN 1900 AND 2100),
    CONSTRAINT ck_estrutura_optativas    CHECK (credito_optativas >= 0),
    CONSTRAINT ck_estrutura_complementar CHECK (horas_complementares >= 0)
);

-- 3) COMPONENTE -------------------------------------------------------
CREATE TABLE componente (
    codigo        VARCHAR(10) NOT NULL,
    nome          VARCHAR(60) NOT NULL,
    creditos      SMALLINT    NOT NULL,
    criado_em     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_componente PRIMARY KEY (codigo),
    CONSTRAINT ck_componente_creditos CHECK (creditos > 0)
);

-- 4) COMPONENTE DA ESTRUTURA CURRICULAR (associativa N:N) -------------
CREATE TABLE componente_da_estrutura_curricular (
    estrutura_codigo  VARCHAR(12) NOT NULL,
    componente_codigo VARCHAR(10) NOT NULL,
    natureza          VARCHAR(15) NOT NULL DEFAULT 'OBRIGATORIA',
    periodo           SMALLINT,
    criado_em         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_componente_da_estrutura
        PRIMARY KEY (estrutura_codigo, componente_codigo),
    CONSTRAINT fk_cde_estrutura
        FOREIGN KEY (estrutura_codigo) REFERENCES estrutura_curricular (codigo)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cde_componente
        FOREIGN KEY (componente_codigo) REFERENCES componente (codigo)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ck_cde_natureza CHECK (natureza IN ('OBRIGATORIA', 'OPTATIVA')),
    CONSTRAINT ck_cde_periodo  CHECK (periodo BETWEEN 1 AND 12)
);

-- 5) GRUPO DE PRÉ-REQUISITO -------------------------------------------
--    Grupos diferentes do mesmo componente = E
--    Itens dentro do mesmo grupo         = OU
CREATE TABLE grupo_de_prerequisito (
    id                INT         GENERATED ALWAYS AS IDENTITY,
    criado_em         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estrutura_codigo  VARCHAR(12) NOT NULL,
    componente_codigo VARCHAR(10) NOT NULL,

    CONSTRAINT pk_grupo_de_prerequisito PRIMARY KEY (id),
    CONSTRAINT fk_grupo_componente_da_estrutura
        FOREIGN KEY (estrutura_codigo, componente_codigo)
        REFERENCES componente_da_estrutura_curricular (estrutura_codigo, componente_codigo)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6) ITEM DO GRUPO DE PRÉ-REQUISITO -----------------------------------
CREATE TABLE item_do_grupo_de_prerequisito (
    componente_codigo  VARCHAR(10) NOT NULL,
    gp_prerequisito_id INT         NOT NULL,
    criado_em          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_item_do_grupo PRIMARY KEY (componente_codigo, gp_prerequisito_id),
    CONSTRAINT fk_item_componente
        FOREIGN KEY (componente_codigo) REFERENCES componente (codigo)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_item_grupo
        FOREIGN KEY (gp_prerequisito_id) REFERENCES grupo_de_prerequisito (id)
        ON DELETE CASCADE
);

-- ÍNDICES NAS FOREIGN KEYS --------------------------------------------
-- O PostgreSQL cria índice automático para PK, mas NÃO para FK.
-- Só é preciso criar onde a FK não é a primeira coluna de uma PK.
CREATE INDEX idx_estrutura_curso     ON estrutura_curricular (curso_codigo);
CREATE INDEX idx_cde_componente      ON componente_da_estrutura_curricular (componente_codigo);
CREATE INDEX idx_grupo_cde           ON grupo_de_prerequisito (estrutura_codigo, componente_codigo);
CREATE INDEX idx_item_grupo          ON item_do_grupo_de_prerequisito (gp_prerequisito_id);


-- Limpa os dados anteriores (inclusive os de teste) e zera o contador do id.
-- Listando todas as tabelas no mesmo TRUNCATE, as FKs não atrapalham.
TRUNCATE item_do_grupo_de_prerequisito,
         grupo_de_prerequisito,
         componente_da_estrutura_curricular,
         componente,
         estrutura_curricular,
         curso
RESTART IDENTITY;

BEGIN;

-- ---------------------------------------------------------------------
-- 1) CURSO
-- ---------------------------------------------------------------------
INSERT INTO curso (codigo, nome, sigla, instituicao)
VALUES ('TADS', 'Análise e Desenvolvimento de Sistemas', 'TADS', 'UFRN');

-- ---------------------------------------------------------------------
-- 2) ESTRUTURAS CURRICULARES
-- ---------------------------------------------------------------------
INSERT INTO estrutura_curricular (codigo, ano, credito_optativas, horas_complementares, curso_codigo) VALUES
    ('TADS-2015', 2015, 16, 180, 'TADS'),
    ('TADS-2019', 2019, 16, 180, 'TADS');

-- ---------------------------------------------------------------------
-- 3) COMPONENTES (catálogo único; disciplinas comuns às duas grades
--    aparecem uma vez só)
-- ---------------------------------------------------------------------
INSERT INTO componente (codigo, nome, creditos) VALUES
    -- Presentes em 2015
    ('TAD0001', 'FUNDAMENTOS DA COMPUTACAO', 4),
    ('TAD0002', 'LOGICA COMPUTACIONAL E ALGORITMOS', 6),
    ('TAD0003', 'BANCO DE DADOS I', 4),
    ('TAD0004', 'ANALISE E PROJETO ORIENTADO A OBJETOS', 3),
    ('TAD0005', 'MATEMATICA APLICADA I', 3),
    ('TAD0006', 'SISTEMAS OPERACIONAIS', 4),
    ('TAD0007', 'INSTALACAO E ARQUITETURA DE COMPUTADORES', 3),
    ('TAD0008', 'CONTEXTO GEOGRAFICO REGIONAL', 4),
    ('TAD0009', 'PROGRAMACAO ORIENTADA A OBJETOS', 4),
    ('TAD0010', 'BANCO DE DADOS II', 3),
    ('TAD0011', 'PROGRAMACAO VISUAL E AUTORIA WEB', 3),
    ('TAD0012', 'PROCESSO DE DESENVOLVIMENTO DE SOFTWARE', 3),
    ('TAD0013', 'MATEMATICA APLICADA II', 4),
    ('TAD0014', 'REDES DE COMPUTADORES', 6),
    ('TAD0015', 'EMPREENDEDORISMO', 3),
    ('TAD0016', 'VERTENTES PRODUTIVAS NAS CIENCIAS AGRARIAS', 3),
    ('TAD0018', 'PROCESSAMENTO DIGITAL DE IMAGENS', 4),
    ('TAD0019', 'PROGRAMACAO WEB', 4),
    ('TAD0020', 'ESTRUTURAS DE DADOS', 4),
    ('TAD0021', 'ENGENHARIA DE SOFTWARE', 3),
    ('TAD0022', 'ESTATISTICA APLICADA', 3),
    ('TAD0023', 'CIRCUITOS DIGITAIS', 3),
    ('TAD0025', 'INTELIGÊNCIA COMPUTACIONAL', 4),
    ('TAD0027', 'PROGRAMACAO PARA DISPOSITIVOS MOVEIS', 6),
    ('TAD0028', 'PLANEJAMENTO E GERENCIA DE PROJETOS', 3),
    ('TAD0029', 'ARQUITETURA DE SOFTWARE', 3),
    ('TAD0030', 'MICROCONTROLADORES', 4),
    ('TAD0032', 'METODOLOGIA DO TRABALHO CIENTIFICO', 2),
    ('TAD0035', 'LEGISLACAO E ETICA EM TI', 2),
    ('TAD0040', 'TRABALHO DE CONCLUSAO DE CURSO', 7),
    ('TAD0056', 'PROJETOS APLICADOS I', 6),
    ('TAD0057', 'PROJETOS APLICADOS II', 6),
    -- Novos em 2019
    ('TAD0102', 'ALGORITMOS E PROGRAMAÇÃO', 6),
    ('TAD0103', 'BANCO DE DADOS', 4),
    ('TAD0105', 'MATEMATICA APLICADA I', 4),
    ('TAD0108', 'CONTEXTO GEOGRAFICO REGIONAL', 2),
    ('TAD0111', 'PROGRAMACAO VISUAL E AUTORIA WEB', 4),
    ('TAD0114', 'REDES DE COMPUTADORES', 4),
    ('TAD0123', 'SISTEMAS DIGITAIS', 3),
    ('TAD0140', 'TRABALHO DE CONCLUSAO DE CURSO II', 4),
    ('TAD0156', 'PROJETOS APLICADOS I', 4),
    ('TAD0157', 'PROJETOS APLICADOS II', 4),
    ('TAD0160', 'SISTEMAS DISTRIBUÍDOS', 2),
    ('TAD0201', 'RACIOCÍNIO LÓGICO', 3),
    ('TAD0202', 'LEITURA E PRODUÇÃO DE TEXTOS', 4),
    ('TAD0203', 'GESTÃO DE QUALIDADE DE SOFTWARE', 3),
    ('TAD0204', 'FUNDAMENTOS E TÉCNICAS EM CIÊNCIAS DE DADOS', 4),
    ('TAD0205', 'TRABALHO DE CONCLUSAO DE CURSO I', 2);

-- ---------------------------------------------------------------------
-- 4) COMPONENTES DE CADA ESTRUTURA
--    Optativas e Atividades Complementares não são componentes:
--    ficam em credito_optativas e horas_complementares da estrutura.
-- ---------------------------------------------------------------------

-- Estrutura 2015 (32 componentes)
INSERT INTO componente_da_estrutura_curricular (estrutura_codigo, componente_codigo, natureza)
SELECT 'TADS-2015', c, 'OBRIGATORIA'
FROM unnest(ARRAY[
    'TAD0001','TAD0002','TAD0003','TAD0004','TAD0005','TAD0006','TAD0007','TAD0008',
    'TAD0009','TAD0010','TAD0011','TAD0012','TAD0013','TAD0014','TAD0015','TAD0016',
    'TAD0018','TAD0019','TAD0020','TAD0021','TAD0022','TAD0023','TAD0025','TAD0027',
    'TAD0028','TAD0029','TAD0030','TAD0032','TAD0035','TAD0040','TAD0056','TAD0057'
]) AS c;

-- Estrutura 2019 (35 componentes)
INSERT INTO componente_da_estrutura_curricular (estrutura_codigo, componente_codigo, natureza)
SELECT 'TADS-2019', c, 'OBRIGATORIA'
FROM unnest(ARRAY[
    'TAD0001','TAD0004','TAD0006','TAD0009','TAD0012','TAD0013','TAD0015','TAD0016',
    'TAD0018','TAD0019','TAD0020','TAD0022','TAD0025','TAD0027','TAD0028','TAD0029',
    'TAD0030','TAD0032','TAD0035',
    'TAD0102','TAD0103','TAD0105','TAD0108','TAD0111','TAD0114','TAD0123','TAD0140',
    'TAD0156','TAD0157','TAD0160','TAD0201','TAD0202','TAD0203','TAD0204','TAD0205'
]) AS c;

-- Período de cada disciplina em cada grade
UPDATE componente_da_estrutura_curricular AS cde
SET periodo = v.periodo
FROM (VALUES
    ('TADS-2015', 'TAD0001', 1),
    ('TADS-2015', 'TAD0002', 1),
    ('TADS-2015', 'TAD0003', 1),
    ('TADS-2015', 'TAD0005', 1),
    ('TADS-2015', 'TAD0006', 1),
    ('TADS-2015', 'TAD0007', 1),
    ('TADS-2015', 'TAD0012', 1),
    ('TADS-2015', 'TAD0004', 2),
    ('TADS-2015', 'TAD0009', 2),
    ('TADS-2015', 'TAD0010', 2),
    ('TADS-2015', 'TAD0013', 2),
    ('TADS-2015', 'TAD0011', 2),
    ('TADS-2015', 'TAD0014', 2),
    ('TADS-2015', 'TAD0015', 2),
    ('TADS-2015', 'TAD0018', 3),
    ('TADS-2015', 'TAD0019', 3),
    ('TADS-2015', 'TAD0020', 3),
    ('TADS-2015', 'TAD0023', 3),
    ('TADS-2015', 'TAD0022', 3),
    ('TADS-2015', 'TAD0021', 3),
    ('TADS-2015', 'TAD0016', 3),
    ('TADS-2015', 'TAD0025', 4),
    ('TADS-2015', 'TAD0027', 4),
    ('TADS-2015', 'TAD0028', 4),
    ('TADS-2015', 'TAD0029', 4),
    ('TADS-2015', 'TAD0030', 4),
    ('TADS-2015', 'TAD0056', 4),
    ('TADS-2015', 'TAD0008', 5),
    ('TADS-2015', 'TAD0032', 5),
    ('TADS-2015', 'TAD0035', 5),
    ('TADS-2015', 'TAD0057', 5),
    ('TADS-2015', 'TAD0040', 6),
    ('TADS-2019', 'TAD0001', 1),
    ('TADS-2019', 'TAD0102', 1),
    ('TADS-2019', 'TAD0201', 1),
    ('TADS-2019', 'TAD0105', 1),
    ('TADS-2019', 'TAD0006', 1),
    ('TADS-2019', 'TAD0202', 1),
    ('TADS-2019', 'TAD0012', 2),
    ('TADS-2019', 'TAD0009', 2),
    ('TADS-2019', 'TAD0103', 2),
    ('TADS-2019', 'TAD0013', 2),
    ('TADS-2019', 'TAD0111', 2),
    ('TADS-2019', 'TAD0114', 2),
    ('TADS-2019', 'TAD0016', 2),
    ('TADS-2019', 'TAD0025', 3),
    ('TADS-2019', 'TAD0019', 3),
    ('TADS-2019', 'TAD0020', 3),
    ('TADS-2019', 'TAD0123', 3),
    ('TADS-2019', 'TAD0022', 3),
    ('TADS-2019', 'TAD0004', 3),
    ('TADS-2019', 'TAD0203', 3),
    ('TADS-2019', 'TAD0018', 4),
    ('TADS-2019', 'TAD0027', 4),
    ('TADS-2019', 'TAD0028', 4),
    ('TADS-2019', 'TAD0029', 4),
    ('TADS-2019', 'TAD0030', 4),
    ('TADS-2019', 'TAD0032', 4),
    ('TADS-2019', 'TAD0204', 4),
    ('TADS-2019', 'TAD0108', 5),
    ('TADS-2019', 'TAD0205', 5),
    ('TADS-2019', 'TAD0015', 5),
    ('TADS-2019', 'TAD0156', 5),
    ('TADS-2019', 'TAD0160', 5),
    ('TADS-2019', 'TAD0140', 6),
    ('TADS-2019', 'TAD0157', 6),
    ('TADS-2019', 'TAD0035', 6)
) AS v(estrutura, componente, periodo)
WHERE cde.estrutura_codigo = v.estrutura
  AND cde.componente_codigo = v.componente;

-- ---------------------------------------------------------------------
-- 5) PRÉ-REQUISITOS
--    Cada linha da lista abaixo = 1 grupo de pré-requisito.
--      - O array são as alternativas do grupo (OU, seta tracejada).
--      - Várias linhas para o mesmo componente = E (setas contínuas).
--    O bloco DO percorre a lista: para cada linha cria o grupo,
--    pega o id gerado e insere um item para cada alternativa.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    r       RECORD;
    novo_id INT;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            -- ===================== ESTRUTURA 2015 =====================
            ('TADS-2015', 'TAD0009', ARRAY['TAD0002']),
            ('TADS-2015', 'TAD0018', ARRAY['TAD0002']),
            ('TADS-2015', 'TAD0020', ARRAY['TAD0002']),
            ('TADS-2015', 'TAD0025', ARRAY['TAD0002']),
            ('TADS-2015', 'TAD0010', ARRAY['TAD0003']),
            ('TADS-2015', 'TAD0013', ARRAY['TAD0005']),
            ('TADS-2015', 'TAD0019', ARRAY['TAD0009']),
            ('TADS-2015', 'TAD0027', ARRAY['TAD0009']),
            ('TADS-2015', 'TAD0021', ARRAY['TAD0012']),
            -- Arquitetura de Software: TAD0003 OU TAD0009 OU TAD0011
            ('TADS-2015', 'TAD0029', ARRAY['TAD0003', 'TAD0009', 'TAD0011']),
            -- Projetos Aplicados I: TAD0002 E TAD0003 E TAD0012
            ('TADS-2015', 'TAD0056', ARRAY['TAD0002']),
            ('TADS-2015', 'TAD0056', ARRAY['TAD0003']),
            ('TADS-2015', 'TAD0056', ARRAY['TAD0012']),
            -- Projetos Aplicados II: TAD0056 E TAD0028
            ('TADS-2015', 'TAD0057', ARRAY['TAD0056']),
            ('TADS-2015', 'TAD0057', ARRAY['TAD0028']),

            -- ===================== ESTRUTURA 2019 =====================
            ('TADS-2019', 'TAD0009', ARRAY['TAD0102']),
            ('TADS-2019', 'TAD0018', ARRAY['TAD0102']),
            ('TADS-2019', 'TAD0020', ARRAY['TAD0102']),
            ('TADS-2019', 'TAD0025', ARRAY['TAD0102']),
            ('TADS-2019', 'TAD0013', ARRAY['TAD0105']),
            ('TADS-2019', 'TAD0019', ARRAY['TAD0009']),
            ('TADS-2019', 'TAD0027', ARRAY['TAD0009']),
            ('TADS-2019', 'TAD0160', ARRAY['TAD0114']),
            -- Arquitetura de Software: TAD0103 OU TAD0009 OU TAD0111
            ('TADS-2019', 'TAD0029', ARRAY['TAD0103', 'TAD0009', 'TAD0111']),
            -- Projetos Aplicados I: TAD0102 E TAD0103 E TAD0012
            ('TADS-2019', 'TAD0156', ARRAY['TAD0102']),
            ('TADS-2019', 'TAD0156', ARRAY['TAD0103']),
            ('TADS-2019', 'TAD0156', ARRAY['TAD0012']),
            -- Projetos Aplicados II: TAD0156 E TAD0028
            ('TADS-2019', 'TAD0157', ARRAY['TAD0156']),
            ('TADS-2019', 'TAD0157', ARRAY['TAD0028']),
            -- Ciência de Dados: TAD0102 E TAD0022
            ('TADS-2019', 'TAD0204', ARRAY['TAD0102']),
            ('TADS-2019', 'TAD0204', ARRAY['TAD0022'])
        ) AS t(estrutura, componente, alternativas)
    LOOP
        INSERT INTO grupo_de_prerequisito (estrutura_codigo, componente_codigo)
        VALUES (r.estrutura, r.componente)
        RETURNING id INTO novo_id;

        INSERT INTO item_do_grupo_de_prerequisito (componente_codigo, gp_prerequisito_id)
        SELECT unnest(r.alternativas), novo_id;
    END LOOP;
END $$;

COMMIT;



-- =====================================================================
-- Segurança (recomendação do Supabase)
-- Com RLS ligado e sem políticas, a API pública do Supabase não consegue
-- ler nem alterar estas tabelas. O sistema continua funcionando porque o
-- servidor se conecta diretamente ao PostgreSQL com o usuário do banco.
-- =====================================================================
ALTER TABLE curso                              ENABLE ROW LEVEL SECURITY;
ALTER TABLE estrutura_curricular               ENABLE ROW LEVEL SECURITY;
ALTER TABLE componente                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE componente_da_estrutura_curricular ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_de_prerequisito              ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_do_grupo_de_prerequisito      ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- CONFERÊNCIA
-- =====================================================================

-- Quantidade de componentes por estrutura (esperado: 2015 = 32, 2019 = 35)
SELECT estrutura_codigo, COUNT(*) AS componentes
FROM componente_da_estrutura_curricular
GROUP BY estrutura_codigo
ORDER BY estrutura_codigo;

-- Pré-requisitos em formato legível, ex.: (TAD0002) E (TAD0003) E (TAD0012)
WITH grupos AS (
    SELECT g.id,
           g.estrutura_codigo,
           g.componente_codigo,
           '(' || string_agg(i.componente_codigo, ' OU ' ORDER BY i.componente_codigo) || ')' AS alternativas
    FROM grupo_de_prerequisito g
    JOIN item_do_grupo_de_prerequisito i ON i.gp_prerequisito_id = g.id
    GROUP BY g.id, g.estrutura_codigo, g.componente_codigo
)
SELECT gr.estrutura_codigo,
       gr.componente_codigo,
       c.nome,
       string_agg(gr.alternativas, ' E ' ORDER BY gr.id) AS prerequisitos
FROM grupos gr
JOIN componente c ON c.codigo = gr.componente_codigo
GROUP BY gr.estrutura_codigo, gr.componente_codigo, c.nome
ORDER BY gr.estrutura_codigo, gr.componente_codigo;
