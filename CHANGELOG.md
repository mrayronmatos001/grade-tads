# Histórico de versões

## 2.2.0
- Grade completa: ao clicar numa disciplina, abre um painel com créditos,
  carga horária, limite de faltas, pré-requisitos, o que ela libera e a
  ementa (texto do PPC do TADS).
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
