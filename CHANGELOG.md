# Histórico de versões

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
