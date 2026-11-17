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
    ementa        TEXT,
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
    ('TAD0035', 'LEGISLACAO E ETICA EM TI', 3),
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

-- Ementas (texto do PPC do TADS e alterações aprovadas)
UPDATE componente AS c
SET ementa = v.ementa,
    atualizado_em = CURRENT_TIMESTAMP
FROM (VALUES
    ('TAD0001', $em$Introdução aos sistemas de informação (entradas, processamento/algoritmos, saídas, realimentação, usuários); Eras da computação e histórico; Sistemas numéricos (Decimal, Binário, Octal, Hexadecimal) e onde são encontrados/usados na computação, conversões, aritmética e codificação/representação inteira, ponto flutuante (ieee 754 mantissa-expoente precisão simples, precisão dupla); Conceitos de dados, processamento, informação; Sistemas de informação nas organizações; Carreiras e papéis na área de informática; Internet das Coisas, tecnologias habilitadoras e conceitos associados; Fundamentos de Hardware: definição, arquitetura de computadores x86_64, ARM, assembler básico (relação código fonte/assembler gerado), instruções microcódigo, componentes básicos de um computador, velocidade, frequência, largura de banda, principais barramentos, chipset e suas características, placas lógicas e componentes; Fundamentos de Software: definição, algoritmos, software básico (so, compiladores - como funcionam), tipos de software (utilitários, orientados à tarefa, de sistema), transações, interações entre camadas (aplicação, sistema operacional), comandos básicos de console Windows/Linux; Programação: paradigmas de linguagem de programação (estruturada, orientada a objetos, funcional, script, eventos etc.).$em$),
    ('TAD0004', $em$Engenharia de requisitos (conceitos, requisitos funcionais, não funcionais, rastreabilidade, pontos de vista); Levantamento de requisitos (artefatos do levantamento de requisitos, aplicação da qualidade por Quality Function Deployment, cenários de uso, levantamento de requisitos ágil); Desenvolvimento de casos de uso; Construção do modelo de análise (elementos do modelo, padrões de análise, engenharia de requisitos ágil, requisitos de sistemas autoadaptativos); Negociação, monitoramento e validação de requisitos; Modelagem de requisitos (métodos baseados em cenários, métodos baseados em classes); Diagramas da Linguagem de Modelagem Unificada (diagramas comportamentais, diagramas estruturais, mecanismo de extensão, restrições); Modelagem de sistemas para web; Modelagem de sistemas para dispositivos móveis; Modelagem de sistemas embarcados.$em$),
    ('TAD0006', $em$Fundamentos de sistemas operacionais; Funções e características de um Sistema Operacional; Tipos de Sistemas Operacionais; Monoprocessamento e Multiprocessamento; Concorrência; Estrutura do Sistema Operacional; O núcleo do Sistema Operacional; Conceitos de processos; Sincronização de Processos; Escalonamento de processos; Gerenciamento de memória; Memória virtual; Alocação de recursos; Problemas de deadlock e Starvation e soluções; Gerenciamento de arquivos; Sistemas de arquivos: proteções, segurança; Gerência de Dispositivos de E/S; Métodos de acesso a dispositivos; Comparativo entre sistemas operacionais de mercado.$em$),
    ('TAD0007', $em$Instalação de SO; Função do SO; Sistemas Proprietários X Sistemas Abertos; Etapas típicas de uma instalação; Laboratório de instalação de SO; Gerenciamento de Discos; Sistemas de Arquivos; Dual Boot; Particionamento; Formatação; Alteração de Partições; Instalação de Placas de Expansão; Motivação para a instalação de placas de expansão; Principais barramentos e suas características; Identificação de interfaces dos barramentos (slots); Plug and Play, IRQ, DMA, ROM e I/O; Manipulação de placas (Eletrostática);Principais Sistemas em uma Placa-Mãe; Laboratório: identificação visual e medição dos principais sinais; Principais sistemas de um processador; Gerenciamento de Memória; Gerenciamento de memória nos principais SO; Gerenciamento de Processos; Gerenciamento em Sistemas multinúcleos.$em$),
    ('TAD0008', $em$A Formação do Espaço Nordestino. Os Elementos da Paisagem Natural: estrutura geológica, relevo, clima, hidrografia, vegetação. Problemas ambientais do Nordeste e o processo de desertificação. A Regionalização e Planejamento do Espaço Nordestino. Políticas Públicas para o Desenvolvimento do Nordeste. Estrutura Fundiária e Conflitos Sociais no Nordeste. Aspectos socioeconômicos do Nordeste.$em$),
    ('TAD0009', $em$Conceitos básicos do paradigma de orientação a objetos; Classes e objetos: estado, comportamento e identidade; Atributos, métodos e construtores; Pilares da orientação a objetos: encapsulamento e modifcadores de acesso, herança, polimorfismo, classes abstratas e interfaces; Tipos enumerados; Agrupamento de classes (vetores, listas, conjuntos, etc.); Biblioteca de objetos; Introdução ao diagrama de classes UML: composição, agregação e herança; Tratamento de Exceções; Fluxo de dados, InputStream e outputStream; Projeto e implementação de uma aplicação OO (API de interface gráfica e conexão com banco de dados).$em$),
    ('TAD0010', $em$Consultas avançadas; Visões, gatilhos e procedimentos armazenados; Transações; Controle de concorrência; Introdução a Segurança em Banco de Dados; Introdução a Integridade em Banco de Dados; Introdução a Banco de Dados Distribuídos; XML.$em$),
    ('TAD0012', $em$Estrutura do processo de software; Processo de software genérico; Padrões de processo; Modelos de processo prescritivo (Cascata, incremental, evolucioário, concorrentes); Modelos do processo especializado (Componentes, métodos formais, orientados a aspectos); Processo unificado de desenvolvimento de software (Princípios, conceitos e fases); Processo de ágil (Princípios, conceitos, XP, Scrum, Processo unificado ágil); Equipe de software (Estruturas de equipe, equipes ágeis, equipes globais); Avaliação e aperfeiçoamento de processos; Principais atividades metodológicas (Comunicação, planejamento, modelagem, construção e disponibilização); Processo do projeto (Diretrizes, atributos de qualidade e evolução); Conceitos do projeto (Abstração, arquitetura, padrões, separação de interesses, modularidade, encapsulamento, independencia funcional, refinamento, aspectos, refatoração); Iniciativas de modelos de maturidade e melhoria da qualidade de processos de software; Aplicação prática de um processo ágil em um projeto de desenvolvimento de sistema; Aplicação prática de um processo de acordo o Processo Unificado em um projeto de desenvolvimento de sistema.$em$),
    ('TAD0013', $em$Limites de funções: definição, limites laterais, assíntotas, continuidade e descontinuidade; Derivadas: o problema da tangente, interpretação gráfica do sinal da derivada. Regras de derivação, regra da cadeia, derivadas especiais (exponencial, logaritmo, trigonométrica), derivadas de ordem superior (Taylor), derivadas parciais e pontos singulares; Integrais: primitiva, integral definida e indefinida, propriedades e métodos analíticos (partes, substituição), aplicações; Noções de Equações Diferenciais e Métodos Numéricos para aproximação; Práticas de simulação de Sistemas Dinâmicos.$em$),
    ('TAD0015', $em$Fundamentos Conceituação de empreendedorismo; Relação entre empreendedorismo e desenvolvimento econômico e social; O comportamento empreendedor: análise de oportunidades; Projeto de uma startup. Desenvolvimento de prática extensionista.$em$),
    ('TAD0016', $em$Sistemas de produção de bovinos; Sistemas de produção de ovinos e caprinos; Sistemas de produção de suínos; Sistemas de produção de aves; Outros sistemas de produção; Meio ambiente e produção sustentável; Sistemas de automação nos diferentes cultivos. Desenvolvimento de prática extensionista nos setores produtivos.$em$),
    ('TAD0018', $em$Imagem digital; Sistemas de processamento de imagens digitais; Elementos de percepção visual; Fundamentos de cor. Amostragem e quantização; Técnicas de modificação da escala de cinza; Operações com imagens no domínio espacial; Filtragem; Pseudocoloração; Restauração; Aplicações.$em$),
    ('TAD0019', $em$Protocolo de Transferência de Hipertexto (HTTP); Arquitetura Cliente-Servidor; Obtenção de dados da solicitação e escrita da resposta HTTP; Configuração de variáveis de inicialização do serviço e do servidor web; Controle de estado (Sessão e Cookies); Escopo de variáveis em uma aplicação web (Servidor, aplicação, sessão, solicitação/resposta); Controle de acesso e filtros; Redirecionamento e encaminhamento; Composição de páginas (include); Frameworks para programação no servidor; Implantação de serviços web em servidores remotos; Padrão arquitetural MVC (Conceitos básicos, MVC em sistemas web e web apps, Framework MVC); Acesso a camada de persistência; Estilo arquitetural REST; Cross-origin resource sharing; Padrão de projeto Data-access-object; Framework para gerenciamento de banco de dados.$em$),
    ('TAD0020', $em$Variáveis; Estruturas de dados homogênas (Vetores e Matrizes); Pilhas (propriedades, inserção e remoção); Filas (propriedades, inserção e remoção); Listas ligadas (propriedades, inserção e remoção); Listas duplamente ligadas (propriedades, inserção e remoção); Filas de prioridade (propriedades, inserção e remoção); Conjuntos (propriedades, inserção e remoção); Dicinários e hashes; Tabela hash (inserção, remoção, tratamento de colisão); Árvores binárias (Percursos, busca, inserção e remoção); Árvores binárias balanceadas (Árvores AVL - busca, inserção, remoção e balanceamento); Grafos (propriedade, percurso, algoritmos de daminhos mais curtos); Algoritmos de ordenação(bubble sort, selection sort, insertion sort, quick sort, heap sort); Algoritmos de busca (busca sequencial e busca binária); Programação dinâmica; Algoritmos gulosos; Complexidade de algoritmos (notação big-O, comparação das complexidades dos algoritmos de busca e inserção); Introdução à teoria de NP-completo.$em$),
    ('TAD0021', $em$Introdução à engenharia de software: Conceitos e Definições; Modelos de processos de desenvolvimento de software; Técnicas de gerenciamento e planejamento de software; Garantia de qualidade de software; Reengenharia e engenharia reversa; Ferramentas e ambientes de software; Padrões de desenvolvimento e documentação de software; Verificação e Validação de Software; Manutenção de Software; Gerência de Configuração.$em$),
    ('TAD0022', $em$Estatística Descritiva; Probabilidade Básica e Principais Distribuições; Intervalo de Confiança; Testes de Hipóteses; Correlação e Regressão Linear Simples; Introdução ao Planejamento de Experimentos; Introdução aos Processos Estocásticos; Análise Estatística com R.$em$),
    ('TAD0025', $em$Introdução à inteligência computacional; Sistemas especialistas; Sistemas fuzzy; Computação evolutiva; Introdução ao aprendizado de máquina; Redes neurais artificiais; Aplicações.$em$),
    ('TAD0027', $em$Conceitos básicos; Controlador da tela; Gerenciadores de Layout; Componentes de Layout; Integração de aplicações; Reúso de componentes e telas; Persistência de dados; Receivers; Serviços; Usabilidade de um sistema em dispositivo móvel; Arquitetura de uma aplicação para dispositivos móveis; Sensores; Integração entre dispositivos móveis e a Internet; Implantação; Projeto de sistemas para dispositivos móveis.$em$),
    ('TAD0028', $em$Estruturas e etapas de um projeto; Análise econômica de projetos; Impacto social e ambiental de projetos; Gerenciamento de projetos (seguindo o PMBOK); Processos de gerenciamento de projetos de um projeto: iniciação, planejamento, execução, monitoramento e controle, encerramento; Áreas de conhecimento do gerenciamento de projetos: integração do projeto, escopo do projeto, tempo do projeto, custos do projeto, qualidade do projeto, recursos humanos do projeto, comunicações do projeto, riscos do projeto, aquisições do projeto; Gestão de configuração do software (dependências, controle de versão, auditoria); Métricas de projeto (métricas orientadas a tamanho, métricas orientadas a função, métricas de qualidade de software); Estimativas de projeto de software (planejamento, escopo, técnicas de estimativa); Cronograma do projeto; Gestão de riscos (mitigação e monitoramento); Manutenção e reengenharia (engenharia reversa, reestruturação, engenharia direta).$em$),
    ('TAD0029', $em$Conceitos de arquitetura de software; Estilos arquiteturais; Atributos de qualidade e requisitos não-funcionais; Linguagens de descrição arquitetural; Visões arquiteturais; Análise arquitetural; métricas arquiteturais, arquiteturas dinâmicas e auto-gerenciáveis; Requisitos Arquiteturais; Padrões de Projetos (padrões de criação, estruturais e comportamentais); Desenvolvimento dirigido a testes.$em$),
    ('TAD0030', $em$Introdução a Microcontroladores; Registradores; Pinagem; Reset; Clock; Portas de I/0; Temporizadores e interrupção; Canal Serial; Expansão das Capacidades I/0; Interfaces com o Mundo Real e Sistemas Práticos; Protocolos de Comunicação; Persistência de Dados; Comunicação com Sistemas Microcontrolados através de uma Linguagem de Alto Nível.$em$),
    ('TAD0032', $em$Introdução ao Trabalho Científico; Estilos de Pesquisa em Computação e Nível de Exigência dos Trabalhos de Conclusão de Curso; Ética na Pesquisa; Método Científico e o Método de Engenharia; Tipos de Pesquisa; Elaboração de Projeto de Pesquisa; Elaboração da Monografia e de Artigo Científico.$em$),
    ('TAD0035', $em$Ética: introdução e conceitos; Postura profissional: confiabilidade, tratamento e privacidade dos dados; Acesso não autorizado a recursos computacionais; Especificidade do Direito; Origem, conceitos fundamentais; Aspectos jurídicos da Internet e comércio eletrônico; Direitos Autorais; Direitos Humanos; Responsabilidade civil e penal sobre a tutela da informação; Regulamentação do trabalho do profissional da informática; Legislação relativa aos direitos de defesa do consumidor; Considerações sobre contratos de prestação de serviços; Responsabilidade socioambiental; Sanções penais.$em$),
    ('TAD0057', $em$Desenvolvimento de Projeto II referente à Atividade Integradora Coletiva Projetos Aplicados II.$em$),
    ('TAD0102', $em$Introdução a algoritmos; Conceitos de memória, variáveis e constantes; Tipos básicos de dados; Operadores aritméticos, relacionais e lógicos; Comandos básicos de entrada, saída e atribuição; Conceito de bloco de comandos (escopo); Estruturas de controle de fluxo (condicionais e repetição); Estruturas de Dados Homogêneas (vetores e matrizes); Estruturas de Dados Heterogêneas (registros); Funções; Variáveis locais e globais; Passagem de parâmetros por valor e por referência; Ponteiros; Interpretação de mensagens de erro, depuração, noções de tratamento de erro.$em$),
    ('TAD0103', $em$Conceitos Básicos de Banco de Dados; Sistemas Gerenciadores de Bancos de Dados; Modelos de base de dados (Modelo Plano, Modelo em Rede, Modelo Hierárquico, Modelo Relacional, Orientado a objetos e Objeto-Relacional); Linguagem de Consulta Estruturada (Manipulação de Dados, Definição de Dados, Controle de Dados, Transação de Dados e Consulta de Dados); Visões, gatilhos e procedimentos armazenados; Controle de concorrência; Introdução a Segurança em Banco de Dados; Introdução a Integridade em Banco de Dados; Backup e Recuperação de banco de dados; Projeto de Banco de Dados.$em$),
    ('TAD0105', $em$Teoria de Conjuntos: tipos, notação, subconjuntos, intervalos, operações entre conjuntos; Matrizes e Determinantes: tipos, operações, aplicações em computação; Sistemas de equações lineares: solução, interpretação gráfica, representação matricial, método da matriz inversa; Relações e funções: conceitos, par ordenado, cartesiano, cardinalidade, domínio, imagem, tipos de funções, representação gráfica, método das diferenças finitas, exponenciais e logarítmicas, trigonométricas, função inversa, construção computacional de gráficos.$em$),
    ('TAD0108', $em$A Formação do Espaço Nordestino: processo histórico, etnias, povos, imigração e emigração. Os Elementos da Paisagem Natural: estrutura geológica, relevo, clima, hidrografia, vegetação. Problemas ambientais do Nordeste e o processo de desertificação. Meio ambiente e sustentabilidade. A Regionalização e Planejamento do Espaço Nordestino. Políticas Públicas para o Desenvolvimento do Nordeste. Estrutura Fundiária e Conflitos Sociais no Nordeste. Aspectos socioeconômicos do Nordeste. Diversidade Cultural e Relações Étnico-raciais. Desenvolvimento de prática extensionista.$em$),
    ('TAD0111', $em$Introdução à autoria web; Projeto e criação de conteúdos web; Linguagem HTML: estrutura, textos, links, listas, imagens, tabelas e formulários; Usabilidade, navegabilidade e projeto visual de websites; Diretrizes de acessibilidade (WCAG 2.1) para a produção de conteúdo web para portadores de necessidades especiais; Folhas de Estilo CSS; Formatos de transferência de Dados na Web (XML e JSON); Comunicação Cliente-Servidor (Definição de servidor, definição de cliente, Protocolo HTTP, solicitação e resposta; Características da linguagem JavaScript (sintaxe, tipos de dados, variáveis, expressões, comandos, funções, objetos, vetores, estruturas de controle de fluxo, de repetição e de sequência); Programação no Cliente (Document Object Model); HTML dinâmico e controle de eventos; Frameworks para programação no cliente.$em$),
    ('TAD0114', $em$Conceitos básicos em redes de computadores; Classificação das redes; Meios físicos de transmissão; Topologias (estrela, anel, barra); Protocolos de acesso ao meio; O padrão IEEE 802.3; O padrão IEEE 802.11 (Wireless); Modelo OSI x TCP/IP; TCP/IP; Modelos de comunicação cliente-servidor, mestre-escravo, publish-subscribe; Mecanismos de controle de acesso ao meio; Tcnicas de correção e detecção de erros; Equipamentos de comunicação.$em$),
    ('TAD0123', $em$Funções e Portas lógicas; Formas de Representação de Circuitos (Tabelas verdade, Expressões Booleanas e Circuitos); Simplificação de Circuitos (Álgebra de Boole e Mapas de Karnaugh); Projeto de Circuitos Lógicos Combinacionais; Circuitos Codificadores/Decodificadores; Circuitos Aritméticos; Multiplexadores/Demultiplexadores; Circuitos Lógicos Sequenciais; Flip-Flops RS, JK, D e T; Registradores Simples e de Deslocamento; Contadores; Ambiente de Software EDA; Linguagem de Descrição de Hardware; Projetos e Simulação de Circuitos Combinacionais e Sequenciais utilizando HDL.$em$),
    ('TAD0140', $em$Desenvolvimento do Trabalho de Conclusão de Curso e escrita de monografia.$em$),
    ('TAD0156', $em$Desenvolvimento de prática extensionista de Projeto I referente à Atividade Integradora Coletiva Projetos Aplicados I.$em$),
    ('TAD0157', $em$Desenvolvimento de prática extensionista de Projeto I referente à Atividade Integradora Coletiva Projetos Aplicados II.$em$),
    ('TAD0160', $em$Conceito e Caracterização dos Sistemas Distribuídos; Arquitetura de Sistemas Distribuídos; Comunicação entre processos, Objetos distribuídos e invocação remota; Nomeação; Sincronização; Consistência e Replicação; Tolerância a Falhas; Segurança; Web Services: SOAP, REST; Middleware; Redes peer-to-peer; Computação móvel e ubíqua; Estudo de caso: Redes de sensores sem fio.$em$),
    ('TAD0201', $em$Introdução ao pensamento computacional: decomposição, reconhecimento de padrões, abstração, algoritmo (sequência de passos e formas de representação). Raciocínio lógico (dedutivo, indutivo e abdutivo) e lógicomatemático (problemas e jogos); Fundamentos de Lógica Computacional; Lógica Proposicional; Tabelas Verdade (negação, conjunção, disjunção, implicação, bi-implicação); Axiomas e regra de inferência; Lógica de Predicados.$em$),
    ('TAD0202', $em$Linguagem e variações linguísticas; Gêneros textuais; Coesão e coerência; Concordância verbal e nominal; Aspectos da norma culta; Resumo e fichamento; Técnicas de produção de texto; Técnicas de argumentação; Leitura e interpretação de textos com temas transversais; Leitura e interpretação de textos técnicos de informática.$em$),
    ('TAD0203', $em$Conceitos de qualidade de software; Garantia de qualidade de software (tarefas, metas e métricas SQA, confiabilidade de software, padrões de qualidade ISO 9000); Técnicas de revisão; Teste de software (verificação e validação, teste de unidade, teste de integração, teste caixa-branca, teste do caminho básico, teste de estrutura de controle, teste caixa-preta, teste baseados em modelos); Testes em aplicações orientadas a objetos; Iteração homemmáquina: Interação, interface, usabilidade, experiência de usuário, comunicabilidade, acessibilidade e respeito às diferenças culturais e sociais; Testes de interface; Automação de testes; Métricas de produto.$em$),
    ('TAD0204', $em$Introdução a ciência de dados e Big Data; Banco de dados não relacionais (desnormalização); Principais conceitos para gerenciamento de Big Data; Tecnologias para Big Data; Técnicas estatísticas de predição; Data Discovery, OLAP e Visualização de Dados; Processamento paralelo e distribuído de dados; Introdução a mineração de dados; Análise de dados de redes sociais.$em$),
    ('TAD0205', $em$Desenvolvimento do projeto de Trabalho de Conclusão de Curso.$em$)
) AS v(codigo, ementa)
WHERE c.codigo = v.codigo;

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
