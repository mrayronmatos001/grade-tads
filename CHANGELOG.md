# Histórico de versões

## 2.14.0 — otimização
Lighthouse no celular: Desempenho 81 → 99, Acessibilidade 96 → 100,
SEO 91 → 100. CLS (página pulando ao carregar) 0,279 → 0; peso da primeira
visita 291 KB → ~80 KB.
- A página não pula mais ao carregar: o espaço dos contadores do cabeçalho,
  da barra de abas e da frase fica reservado, e o conteúdo ocupa ao menos a
  altura da tela (o rodapé começava no meio e era empurrado).
- Logotipo de 67 KB trocado por uma versão de 128 px (4 KB); favicons
  comprimidos (20 KB → 4 KB); removido o `favicon-180.png`, que não era usado.
- Servidor: respostas compactadas (`compression`; o JSON das opções cai de
  32 KB para 9 KB), as consultas de `/api/opcoes` vão juntas ao banco, e as
  leituras ficam 5 minutos em memória. `/api/opcoes` também fica 5 minutos
  no cache da Vercel. Depois de rodar um script no banco, as mudanças podem
  levar até 5 minutos para aparecer (ou aparecem na hora com um novo deploy).
- Com a tela inicial aberta, as animações de trás ficam paradas, e no
  celular ela não usa mais desfoque (já era opaca).
- Acessibilidade: contraste dos códigos das disciplinas e do verde de texto
  no tema claro; o nome lido pelo leitor de tela nos seletores da frase
  inclui o valor escolhido.
- SEO: descrição da página (meta description).

## 2.13.2
- Optativas: o rodapé diz o motivo do asterisco: "* criada depois do PPC:
  confira o pré-requisito no SIGAA".

## 2.13.1
- PWA: o app instalado se chama "Grades" e usa o símbolo da tela inicial
  (cartões ligados, fundo verde) como ícone, também no iPhone.

## 2.13.0
- PWA: o site pode ser instalado como app (Android, Chrome e Edge no
  computador, e iPhone pelo "Adicionar à Tela de Início"). Tem manifesto
  (`public/manifest.webmanifest`), ícones (`public/img/icone-*.png`) e
  service worker (`public/sw.js`). Sem internet, o app abre com os últimos
  dados vistos. A área /admin e os envios nunca passam pelo cache.
- Botão "Instalar o app" no rodapé, quando o navegador permite.
- Optativas: a nota do topo saiu; ficou só um rodapé curto,
  "* pré-requisito: confira no SIGAA", para as criadas depois do PPC.
- Ao lançar uma versão, troque também `VERSAO` em `public/sw.js` (junto com
  o `?v=` dos arquivos), senão o app instalado continua com a versão antiga.

## 2.12.2
- Tela inicial: o cartão do TADS (depois de escolher a UFRN) mostra o
  logotipo do curso no lugar da sigla.

## 2.12.1
- Tela inicial: o logotipo do TADS no topo deu lugar a um símbolo genérico de
  grade curricular (cartões ligados, como no mapa), e o cartão da UFRN passou
  a mostrar o logotipo da universidade (`public/img/ufrn-selo.png`).

## 2.12.0
- Tela inicial: na primeira visita, o site mostra as universidades
  cadastradas (por enquanto, UFRN) e depois os cursos (TADS). A escolha fica
  guardada no navegador; o logotipo e o link "trocar" no cabeçalho reabrem
  o menu.
- Botão "+" para pedir a página de outro curso ou universidade: o formulário
  pede universidade, curso, campus, links do PPC e da grade com
  pré-requisitos, nome e e-mail (obrigatório). Os pedidos aparecem no /admin
  como "Novo curso".
- Clicar em "créditos obrigatórios" no cabeçalho abre a grade completa.
- Banco: nova migração `sql/atualizacao_solicitacoes.sql`, que aceita o tipo
  NOVO_CURSO na tabela de sugestões.
- Política de Privacidade: inclui os pedidos de curso e a escolha guardada
  no navegador.

## 2.11.1
- Celular, aba de pré-requisitos: os pré-requisitos ficam em cima e a
  disciplina escolhida (verde) embaixo, na mesma ordem do desktop.
- Celular, grade completa: o cabeçalho de cada período tinha fundo e borda
  por cima dos fios e cortava o fluxo na passagem de um período para outro.

## 2.11.0
- Pré-requisitos das optativas, conforme a tabela de optativas do PPC
  (estrutura 03): 10 optativas têm pré-requisito e aparecem com "requer ..."
  na lista e como "Bloqueada" em "O que posso cursar" até ele ser marcado.
- As 11 optativas criadas depois do PPC ficam marcadas com * e a nota pede
  para conferir o pré-requisito no SIGAA.
- Banco: nova migração `sql/atualizacao_prerequisitos_optativas.sql` (pode
  rodar mais de uma vez; rode depois de `atualizacao_optativas.sql`).

## 2.10.0
- Painel de detalhes no desktop: deixou de ser uma coluna da altura da tela
  e virou um cartão compacto no canto de baixo (nome, créditos, horas e
  faltas). "Ver mais" abre o resto; o botão "Recolher" fica fixo no rodapé.
- O texto longo de instruções embaixo do mapa virou uma legenda curta acima
  dele: 1 clique o que libera (azul), 2 cliques pré-requisitos (verde),
  3 cliques solta.
- Optativas com pré-requisito cadastrado mostram "requer ..." na lista e
  aparecem como "Bloqueada" em "O que posso cursar" até o pré-requisito ser
  marcado. (Os pré-requisitos das optativas ainda precisam ser cadastrados.)

## 2.9.1
- Optativas na grade completa: viraram uma barra fechada embaixo do mapa
  ("Optativas · 240 h exigidas · 33 opções"); ao abrir, uma lista simples em
  colunas, com nome e carga horária, sem uma caixa para cada disciplina.
- O atalho "créditos optativos" do cabeçalho abre a barra e rola até ela,
  também quando a grade completa já está na tela.

## 2.9.0
- Optativas da grade TADS 2019 (33, conforme a lista do SIGAA):
  - Grade completa: seção "Optativas" embaixo do mapa, separada entre as do
    curso e as de outros departamentos, com a carga horária de cada uma.
  - O que posso cursar: as optativas podem ser marcadas (ou vêm do histórico
    importado) e um contador mostra quantas horas faltam para as 240 h.
  - Busca: a grade aparece como "TADS 2019 · optativa".
  - Clicar em "créditos optativos" no cabeçalho abre a grade nas optativas.
- Banco: nova migração `sql/atualizacao_optativas.sql` (pode rodar mais de uma
  vez). O nome das disciplinas passou de 60 para 100 caracteres.
- Os pré-requisitos das optativas não estão cadastrados (a lista do SIGAA não
  traz), por isso elas não aparecem como "Liberada" nem nas abas de
  pré-requisitos; a página avisa para conferir no SIGAA.

## 2.8.1
- Aba "Complementares" mais limpa: cada tipo de atividade virou um cartão que
  abre e fecha; atividades que só mudam pelo âmbito (local, nacional,
  internacional) ou pelo Qualis ficaram numa linha só, com os valores lado a
  lado (44 linhas viraram 33); textos mais curtos.
- A busca abre sozinha os cartões com resultado e, ao limpar, volta como estava.
- Clicar em "180 h complementares" no cabeçalho abre a aba.

## 2.8.0
- Nova aba "Complementares" (no celular, "Horas"): tabela das atividades que
  contam como horas complementares, separadas por tipo (Arts. 5º a 9º da
  Resolução nº 01/2019 do Colegiado, alterada pela nº 01/2021), com quanto cada
  uma vale e o limite no curso. Tem busca sem acentos e atalhos por tipo.
- Os dados ficam em `public/complementares.js` (sem mudança no banco).
- A barra inferior do celular passou a ter 7 botões; "Sugestões" virou "Sugerir".

## 2.7.2
- Correção: no desktop, clicar em Algoritmos e Programação (ou em outra
  disciplina que libera várias) fazia o fluxo recomeçar sem parar. O cartão
  "emissor" ganhava borda de 2 px, a linha crescia 4 px, os fios eram
  redesenhados e o fluxo reiniciava. A borda agora é desenhada por dentro,
  sem mudar o tamanho do cartão.
- Os SVGs dos fios recortam o próprio conteúdo, para o brilho não aumentar
  a área de rolagem.

## 2.7.1
- Correção: ao girar o celular e voltar para a vertical, a grade completa
  ficava miniaturizada (a página ficava mais larga que a tela e o navegador
  reduzia o zoom). O SVG dos fios agora é medido sem o tamanho antigo.
- Correção: no desktop, depois de vir de uma tela estreita, o mapa da grade
  ganhava uma barra de rolagem vertical sem necessidade (mesma causa).
- Os e-mails de contato (mrayronmatos01@gmail.com e heitorf777@gmail.com)
  ficam escritos nos Termos e na Política de Privacidade; a variável
  `CONTATO_EMAIL`, se definida, os substitui.

## 2.7.0
- Desempenho: o brilho dos fios animados deixou de usar `filter: drop-shadow`
  e passou a ser um halo (traço largo e translúcido por baixo). Num celular
  simulado, o fluxo de Algoritmos e Programação subiu de 12 a 20 para 60
  quadros por segundo, sem travadas.
- Os e-mails de contato dos Termos de Uso e da Política de Privacidade
  passaram a vir da variável `CONTATO_EMAIL`, para não serem apagados em
  atualizações dos arquivos da página.

## 2.6.0
- Celular: as abas viraram uma barra de navegação fixa no rodapé, com ícone
  e nome curto (Buscar, Requisitos, Libera, Grade, Cursar, Sugestões),
  sempre visível e sem precisar deslizar.
- Celular: os detalhes da disciplina na grade completa abrem como um cartão
  compacto acima da barra (nome, créditos, horas e faltas numa linha), com
  "Ver mais" para a ementa, os pré-requisitos e o que ela libera.

## 2.5.0
- Layout de celular (até 720 px) refeito para toque e uma mão:
  - cabeçalho compacto, com as cargas horárias numa linha deslizante e o
    seletor de tema só com ícones;
  - abas numa linha que desliza de lado;
  - lista de opções e painel de detalhes como folhas que sobem de baixo;
  - cadeias de pré-requisitos e de "O que libera" na vertical, com a
    disciplina escolhida no topo e o pulso descendo;
  - grade completa em blocos por período, com duas colunas de cartões e
    fios que passam pelo corredor central, sem cruzar outros cartões;
  - "O que posso cursar", resultados e área /admin em duas colunas ou
    com botões maiores.

## 2.4.0
- Área `/admin`, protegida por senha (variável `ADMIN_SENHA`), para ler as
  sugestões, filtrar por situação, marcar como lida, resolvida ou
  descartada, apagar e remover as que têm mais de 12 meses.
- Sessão em cookie assinado (HttpOnly, SameSite=Strict, 8 horas) e limite
  de 5 tentativas de senha a cada 15 minutos.
- Arquivos da página carregados com a versão no endereço, para o navegador
  não usar uma cópia antiga.

## 2.3.0
- Aba "Sugestões": formulário para enviar ideias ou avisar sobre erros nos
  dados, com nome e e-mail opcionais. As mensagens ficam na tabela
  `sugestao` do banco.
- Proteções no envio: validação no servidor, campo-isca contra robôs e
  limite de 5 envios a cada 10 minutos por endereço.
- Política de Privacidade e Termos de Uso atualizados para as sugestões.

## 2.2.0
- Grade completa: ao clicar numa disciplina, abre um painel com créditos,
  carga horária, limite de faltas, pré-requisitos, o que ela libera e a
  ementa (texto do PPC do TADS), exibida em badges, um por tópico.
- Cartões da grade mostram a carga horária e o limite de faltas.
- Aba Pré-requisitos: o pulso verde sai da disciplina escolhida e corre da
  direita para a esquerda, até a base da cadeia.
- Banco: coluna `ementa` na tabela `componente` e correção de Legislação e
  Ética em TI para 3 créditos (45 h), conforme o PPC e o SIGAA.
- Correção: o mapa antigo não é mais redesenhado depois de trocar de grade.

## 2.1.0
- Tema claro, escuro ou do sistema, com a escolha salva no navegador.
- Grade completa: segundo clique mostra o fluxo inverso (verde) até os
  pré-requisitos; o terceiro clique solta o fluxo.
- Cabeçalho exibe os créditos e as horas obrigatórias da grade.
- "O que libera" começa na grade mais recente (TADS 2019).
- Documentação de lançamento: licença proprietária, termos de uso,
  política de privacidade, avisos de terceiros, arquitetura, implantação
  e guia de registro do programa de computador pela AGIR/UFRN.
- Autoria: Ayron Matos e Heitor Felipe.

## 2.0.0
- Versão de produção somente com PostgreSQL (Supabase).
- Configuração por variáveis de ambiente (`.env`).
- Respostas atualizadas automaticamente, sem botão de envio.
- Publicação na Vercel e automação que mantém o banco ativo.

## 1.x (versão acadêmica)
- Mesma grade modelada em PostgreSQL, MongoDB e Neo4j, com comparação de
  resultados e de tempo de resposta entre os três bancos.
- Cadeia de pré-requisitos, fluxo de liberação e mapa por período.
- Importação do histórico do SIGAA em PDF.
