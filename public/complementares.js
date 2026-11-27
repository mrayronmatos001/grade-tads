// =====================================================================
// Atividades complementares do TADS/UFRN
// Fonte: tabela da Resolução nº 01/2019 do Colegiado do Curso
// (alterada pela Resolução nº 01/2021), publicada no SIGAA.
//
// chi  = carga horária que cada atividade vale
// por  = 'mes'    -> chi por mês de atividade
//        'item'   -> chi por atividade
//        'total'  -> vale a carga horária total do curso/minicurso
//        'dobro'  -> vale o dobro da carga horária
//        'metade' -> vale a metade da carga horária
// teto = máximo de horas que aquele item pode somar no curso (CHTP)
// =====================================================================
window.ATIVIDADES_COMPLEMENTARES = [
  {
    artigo: 'Art. 5º', titulo: 'Iniciação profissional', itens: [
      { d: 'Bolsas de apoio técnico', chi: 10, por: 'mes', teto: 60 },
      { d: 'Atividade profissional na área de Análise e Desenvolvimento de Sistemas ou áreas correlatas', chi: 10, por: 'mes', teto: 60 },
      { d: 'Produto de software devidamente registrado, desenvolvido a partir de um projeto de ensino, pesquisa ou extensão', chi: 30, por: 'item', teto: 60 },
      { d: 'Participação em iniciativa de pré-incubação em incubadora de negócios instituída nacionalmente', chi: 5, por: 'mes', teto: 120 },
      { d: 'Participação em iniciativa de incubação em incubadora de negócios instituída nacionalmente', chi: 15, por: 'mes', teto: 120 },
      { d: 'Participação em empresa júnior, devidamente registrada pela Pró-Reitoria de Pesquisa', chi: 15, por: 'mes', teto: 120 },
    ],
  },
  {
    artigo: 'Art. 6º', titulo: 'Iniciação à docência', itens: [
      { d: 'Monitoria remunerada ou voluntária reconhecida pela Pró-Reitoria de Graduação', chi: 15, por: 'mes', teto: 120 },
      { d: 'Participação em Programa de Educação Tutorial (PET) reconhecido pela Pró-Reitoria de Graduação', chi: 15, por: 'mes', teto: 120 },
      { d: 'Participação no EIPE (Encontro Integrado dos Projetos de Ensino) como ouvinte', chi: 2, por: 'item', teto: 4 },
      { d: 'Participação no EIPE (Encontro Integrado dos Projetos de Ensino) como apresentador', chi: 8, por: 'item', teto: 16 },
      { d: 'Participação como ouvinte na apresentação pública da defesa de TCC', chi: 1, por: 'item', teto: 20 },
      { d: 'Participação como ouvinte na apresentação pública da defesa de dissertações e teses de pós-graduação', chi: 3, por: 'item', teto: 30 },
      { d: 'Participação em visita técnica organizada por professor e/ou pelo departamento ao qual o aluno está vinculado', chi: 5, por: 'item', teto: 30 },
      { d: 'Atividades diretamente relacionadas à educação das relações étnico-raciais e ao ensino de história e cultura afro-brasileira e indígena', chi: 15, por: 'item', teto: 60 },
    ],
  },
  {
    artigo: 'Art. 7º', titulo: 'Iniciação à pesquisa', itens: [
      { d: 'Iniciação científica remunerada ou voluntária, vinculada a projeto cadastrado na Pró-Reitoria de Pesquisa', chi: 15, por: 'mes', teto: 120 },
      { d: 'Comunicação oral em congressos, seminários ou congêneres científicos de âmbito local ou regional', chi: 5, por: 'item', teto: 120 },
      { d: 'Comunicação oral em congressos, seminários ou congêneres científicos de âmbito nacional', chi: 10, por: 'item', teto: 120 },
      { d: 'Comunicação oral em congressos, seminários ou congêneres científicos de âmbito internacional', chi: 25, por: 'item', teto: 120 },
      { d: 'Publicação de artigo em congressos, seminários ou congêneres científicos de âmbito local ou regional', chi: 10, por: 'item', teto: 120 },
      { d: 'Publicação de artigo em congressos, seminários ou congêneres científicos de âmbito nacional', chi: 20, por: 'item', teto: 120 },
      { d: 'Publicação de artigo em congressos, seminários ou congêneres científicos de âmbito internacional', chi: 50, por: 'item', teto: 120 },
      { d: 'Apresentação de banners/pôsteres em congressos, seminários ou congêneres científicos de âmbito local ou regional', chi: 5, por: 'item', teto: 120 },
      { d: 'Apresentação de banners/pôsteres em congressos, seminários ou congêneres científicos de âmbito nacional', chi: 15, por: 'item', teto: 120 },
      { d: 'Apresentação de banners/pôsteres em congressos, seminários ou congêneres científicos de âmbito internacional', chi: 25, por: 'item', teto: 120 },
      { d: 'Artigo científico publicado em periódico especializado — Qualis CAPES "A"', chi: 90, por: 'item', teto: 120 },
      { d: 'Artigo científico publicado em periódico especializado — Qualis CAPES "B"', chi: 60, por: 'item', teto: 120 },
      { d: 'Artigo científico publicado em periódico especializado — Qualis CAPES "C"', chi: 30, por: 'item', teto: 120 },
      { d: 'Palestra proferida em eventos científicos e/ou culturais', chi: 10, por: 'item', teto: 40 },
      { d: 'Publicação de capítulo de livro em Análise e Desenvolvimento de Sistemas ou área correlata', chi: 30, por: 'item', teto: 60 },
      { d: 'Publicação de livro em Análise e Desenvolvimento de Sistemas ou área correlata', chi: 100, por: 'item', teto: 120 },
    ],
  },
  {
    artigo: 'Art. 8º', titulo: 'Extensão', itens: [
      { d: 'Participação em cursos e/ou minicursos reconhecidos por IES, em Análise e Desenvolvimento de Sistemas ou áreas correlatas', chi: null, por: 'total', teto: 60 },
      { d: 'Curso de idiomas ofertado por departamentos ou institutos vinculados à UFRN/MEC', chi: 10, por: 'mes', teto: 60 },
      { d: 'Representante estudantil no colegiado do curso, nas plenárias departamentais ou em conselhos', chi: 2, por: 'mes', teto: 30 },
    ],
  },
  {
    artigo: 'Art. 8º-A', titulo: 'Extensão curricular', itens: [
      { d: 'Participação em projetos de extensão registrados na Pró-Reitoria de Extensão, remunerada ou voluntária', chi: 15, por: 'mes', teto: 120 },
      { d: 'Participação na organização de atividades de extensão registradas na Pró-Reitoria de Extensão', chi: 10, por: 'item', teto: 60 },
      { d: 'Ministrante de minicurso em eventos de extensão registrados na Pró-Reitoria de Extensão', chi: null, por: 'dobro', teto: 120 },
      { d: 'Produção técnico-científica gerada a partir de ações de extensão, publicada em congressos, seminários ou congêneres de âmbito local ou regional', chi: 10, por: 'item', teto: 120 },
      { d: 'Produção técnico-científica gerada a partir de ações de extensão, publicada em congressos, seminários ou congêneres de âmbito nacional', chi: 20, por: 'item', teto: 120 },
      { d: 'Produção técnico-científica gerada a partir de ações de extensão, publicada em congressos, seminários ou congêneres de âmbito internacional', chi: 50, por: 'item', teto: 120 },
      { d: 'Estágio não obrigatório conveniado com a UFRN', chi: 15, por: 'mes', teto: 120 },
    ],
  },
  {
    artigo: 'Art. 9º', titulo: 'Participação em eventos', itens: [
      { d: 'Participação em eventos', chi: null, por: 'metade', teto: 60 },
      { d: 'Participação em concurso, prêmio, certame, competição, hackathon ou congêneres de âmbito nacional em Análise e Desenvolvimento de Sistemas ou área correlata', chi: 30, por: 'item', teto: 120 },
      { d: 'Participação em concurso, prêmio, certame, competição, hackathon ou congêneres de âmbito internacional em Análise e Desenvolvimento de Sistemas ou área correlata', chi: 60, por: 'item', teto: 120 },
      { d: 'Participação em competições esportivas, nacionais ou regionais, como representante da UFRN', chi: 15, por: 'item', teto: 60 },
    ],
  },
];
