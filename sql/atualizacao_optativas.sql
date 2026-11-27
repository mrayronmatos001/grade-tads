-- =====================================================================
-- Optativas da grade TADS 2019 (estrutura 03, em vigor desde 2019.2),
-- conforme a lista de optativas do SIGAA (consultada em 27/11/2026).
-- Pode rodar mais de uma vez: o que já existe é mantido.
-- Os pré-requisitos das optativas NÃO estão aqui (a lista do SIGAA não traz).
-- =====================================================================
BEGIN;

-- alguns nomes passam de 60 caracteres
ALTER TABLE componente ALTER COLUMN nome TYPE VARCHAR(100);

INSERT INTO componente (codigo, nome, creditos) VALUES
    ('CCA0403', 'LÍNGUA ESPANHOLA 1', 4),
    ('CCA0404', 'LÍNGUA ESPANHOLA 2', 4),
    ('CCA0405', 'LÍNGUA INGLESA I', 4),
    ('CCA0406', 'LÍNGUA INGLESA II', 4),
    ('CCA0407', 'INGLÊS PARA FINS ACADÊMICOS I', 4),
    ('CCA0408', 'INGLÊS PARA FINS ACADÊMICOS II', 4),
    ('DAN0024', 'DIREITOS HUMANOS, DIVERSIDADE CULTURAL E RELAÇÕES ÉTNICO-RACIAIS', 4),
    ('LET0568', 'LÍNGUA BRASILEIRA DE SINAIS - LIBRAS', 4),
    ('TAD0007', 'INSTALACAO E ARQUITETURA DE COMPUTADORES', 3),
    ('TAD0010', 'BANCO DE DADOS II', 3),
    ('TAD0021', 'ENGENHARIA DE SOFTWARE', 3),
    ('TAD0034', 'TOPICOS EM REDES DE COMPUTADORES', 3),
    ('TAD0036', 'SISTEMAS EMBARCADOS', 4),
    ('TAD0042', 'GESTAO TECNOLOGICA DE EMPREENDIMENTOS FAMILIARES', 3),
    ('TAD0043', 'FONTES ALTERNATIVAS DE ENERGIA', 4),
    ('TAD0044', 'METEOROLOGIA APLICADA', 4),
    ('TAD0047', 'BANCO DE DADOS GEOGRAFICO', 3),
    ('TAD0048', 'CIÊNCIA DO SOLO', 3),
    ('TAD0054', 'MINERAÇÃO DE DADOS', 4),
    ('TAD0058', 'COMPETIÇÕES DE PROGRAMAÇÃO', 4),
    ('TAD0059', 'DESENVOLVIMENTO DE JOGOS DIGITAIS', 4),
    ('TAD0061', 'GESTÃO DE SERVIÇOS DE TI', 4),
    ('TAD0062', 'COMPUTAÇÃO UBÍQUA', 4),
    ('TAD0064', 'REDES DE ALTA VELOCIDADE', 4),
    ('TAD0065', 'APRENDIZADO DE MAQUINA', 4),
    ('TAD0066', 'INTERAÇÃO HUMANO-COMPUTADOR', 4),
    ('TAD0067', 'TECNOLOGIAS EMERGENTES E SEUS MERCADOS', 4),
    ('TAD0068', 'METAHEURÍSTICAS', 6),
    ('TAD0069', 'TÓPICOS ESPECIAIS EM CIÊNCIA DE DADOS', 4),
    ('TAD0070', 'TÓPICOS ESPECIAIS EM ESTATÍSTICA APLICADA', 4),
    ('TAD0072', 'TÓPICOS ESPECIAIS EM SISTEMAS EMBARCADOS', 4),
    ('TAD0073', 'LEITURA E PRODUÇÃO DE TEXTOS ACADÊMICOS', 4),
    ('TAD0473', 'APRENDIZADO PROFUNDO', 4)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO componente_da_estrutura_curricular (estrutura_codigo, componente_codigo, natureza)
SELECT 'TADS-2019', codigo, 'OPTATIVA'
FROM (VALUES
    ('CCA0403'),
    ('CCA0404'),
    ('CCA0405'),
    ('CCA0406'),
    ('CCA0407'),
    ('CCA0408'),
    ('DAN0024'),
    ('LET0568'),
    ('TAD0007'),
    ('TAD0010'),
    ('TAD0021'),
    ('TAD0034'),
    ('TAD0036'),
    ('TAD0042'),
    ('TAD0043'),
    ('TAD0044'),
    ('TAD0047'),
    ('TAD0048'),
    ('TAD0054'),
    ('TAD0058'),
    ('TAD0059'),
    ('TAD0061'),
    ('TAD0062'),
    ('TAD0064'),
    ('TAD0065'),
    ('TAD0066'),
    ('TAD0067'),
    ('TAD0068'),
    ('TAD0069'),
    ('TAD0070'),
    ('TAD0072'),
    ('TAD0073'),
    ('TAD0473')
) AS optativa(codigo)
ON CONFLICT (estrutura_codigo, componente_codigo) DO NOTHING;

COMMIT;
