// =====================================================================
// Atividades complementares do TADS/UFRN
// Fonte: tabela da Resolução nº 01/2019 do Colegiado do Curso
// (alterada pela Resolução nº 01/2021), publicada no SIGAA.
//
// d      = descrição da atividade
// chi    = horas que cada atividade vale
// por    = 'mes' (por mês) | 'item' (por atividade)
//          'total' (a carga do curso feito) | 'dobro' (2× a carga) | 'metade' (½ da carga)
// teto   = máximo que aquele item pode somar no curso (CHTP)
// niveis = quando a mesma atividade vale diferente conforme o âmbito:
//          [rótulo, horas] — cada nível tem o mesmo teto
// =====================================================================
window.ATIVIDADES_COMPLEMENTARES = [
  {
    artigo: 'Art. 5º', titulo: 'Iniciação profissional', itens: [
      { d: 'Bolsa de apoio técnico', chi: 10, por: 'mes', teto: 60 },
      { d: 'Atividade profissional em Análise e Desenvolvimento de Sistemas ou área correlata', chi: 10, por: 'mes', teto: 60 },
      { d: 'Produto de software registrado, feito a partir de projeto de ensino, pesquisa ou extensão', chi: 30, por: 'item', teto: 60 },
      { d: 'Pré-incubação em incubadora de negócios instituída nacionalmente', chi: 5, por: 'mes', teto: 120 },
      { d: 'Incubação em incubadora de negócios instituída nacionalmente', chi: 15, por: 'mes', teto: 120 },
      { d: 'Empresa júnior registrada na Pró-Reitoria de Pesquisa', chi: 15, por: 'mes', teto: 120 },
    ],
  },
  {
    artigo: 'Art. 6º', titulo: 'Iniciação à docência', itens: [
      { d: 'Monitoria, remunerada ou voluntária, reconhecida pela Pró-Reitoria de Graduação', chi: 15, por: 'mes', teto: 120 },
      { d: 'Programa de Educação Tutorial (PET) reconhecido pela Pró-Reitoria de Graduação', chi: 15, por: 'mes', teto: 120 },
      { d: 'EIPE (Encontro Integrado dos Projetos de Ensino) como ouvinte', chi: 2, por: 'item', teto: 4 },
      { d: 'EIPE (Encontro Integrado dos Projetos de Ensino) como apresentador', chi: 8, por: 'item', teto: 16 },
      { d: 'Assistir à defesa pública de TCC', chi: 1, por: 'item', teto: 20 },
      { d: 'Assistir à defesa pública de dissertação ou tese de pós-graduação', chi: 3, por: 'item', teto: 30 },
      { d: 'Visita técnica organizada por professor ou pelo departamento do aluno', chi: 5, por: 'item', teto: 30 },
      { d: 'Atividades de educação das relações étnico-raciais e de história e cultura afro-brasileira e indígena', chi: 15, por: 'item', teto: 60 },
    ],
  },
  {
    artigo: 'Art. 7º', titulo: 'Iniciação à pesquisa', itens: [
      { d: 'Iniciação científica, remunerada ou voluntária, em projeto cadastrado na Pró-Reitoria de Pesquisa', chi: 15, por: 'mes', teto: 120 },
      { d: 'Comunicação oral em congresso, seminário ou evento científico', por: 'item', teto: 120,
        niveis: [['Local ou regional', 5], ['Nacional', 10], ['Internacional', 25]] },
      { d: 'Artigo publicado em congresso, seminário ou evento científico', por: 'item', teto: 120,
        niveis: [['Local ou regional', 10], ['Nacional', 20], ['Internacional', 50]] },
      { d: 'Banner ou pôster apresentado em congresso, seminário ou evento científico', por: 'item', teto: 120,
        niveis: [['Local ou regional', 5], ['Nacional', 15], ['Internacional', 25]] },
      { d: 'Artigo em periódico científico, conforme o Qualis CAPES', por: 'item', teto: 120,
        niveis: [['Qualis A', 90], ['Qualis B', 60], ['Qualis C', 30]] },
      { d: 'Palestra em evento científico ou cultural', chi: 10, por: 'item', teto: 40 },
      { d: 'Capítulo de livro em Análise e Desenvolvimento de Sistemas ou área correlata', chi: 30, por: 'item', teto: 60 },
      { d: 'Livro em Análise e Desenvolvimento de Sistemas ou área correlata', chi: 100, por: 'item', teto: 120 },
    ],
  },
  {
    artigo: 'Art. 8º', titulo: 'Extensão', itens: [
      { d: 'Cursos e minicursos reconhecidos por IES, em Análise e Desenvolvimento de Sistemas ou área correlata', por: 'total', teto: 60 },
      { d: 'Curso de idiomas de departamento ou instituto ligado à UFRN/MEC', chi: 10, por: 'mes', teto: 60 },
      { d: 'Representante estudantil no colegiado do curso, em plenárias departamentais ou conselhos', chi: 2, por: 'mes', teto: 30 },
    ],
  },
  {
    artigo: 'Art. 8º-A', titulo: 'Extensão curricular', itens: [
      { d: 'Projeto de extensão registrado na Pró-Reitoria de Extensão, remunerado ou voluntário', chi: 15, por: 'mes', teto: 120 },
      { d: 'Organização de atividade de extensão registrada na Pró-Reitoria de Extensão', chi: 10, por: 'item', teto: 60 },
      { d: 'Ministrar minicurso em evento de extensão registrado na Pró-Reitoria de Extensão', por: 'dobro', teto: 120 },
      { d: 'Produção técnico-científica de ações de extensão, publicada em evento', por: 'item', teto: 120,
        niveis: [['Local ou regional', 10], ['Nacional', 20], ['Internacional', 50]] },
      { d: 'Estágio não obrigatório conveniado com a UFRN', chi: 15, por: 'mes', teto: 120 },
    ],
  },
  {
    artigo: 'Art. 9º', titulo: 'Participação em eventos', itens: [
      { d: 'Participação em eventos', por: 'metade', teto: 60 },
      { d: 'Concurso, prêmio, competição ou hackathon em Análise e Desenvolvimento de Sistemas ou área correlata', por: 'item', teto: 120,
        niveis: [['Nacional', 30], ['Internacional', 60]] },
      { d: 'Competição esportiva, nacional ou regional, representando a UFRN', chi: 15, por: 'item', teto: 60 },
    ],
  },
];
