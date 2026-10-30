// =====================================================================
// As consultas do sistema, em SQL (PostgreSQL). Cada consulta tem:
//   - campos:     o que o usuário escolhe na frase da tela
//   - sql:        a consulta parametrizada ($1, $2...) e os valores
//   - normalizar: deixa as linhas no formato que a tela desenha
// =====================================================================

// ---------- Funções de apoio ----------

// Ordena as alternativas de cada grupo e os grupos entre si
function ordenarGrupos(grupos) {
  return (grupos || [])
    .map((g) => [...g].sort())
    .sort((a, b) => a.join().localeCompare(b.join()));
}

// [['TAD0102'], ['TAD0003','TAD0009']]  ->  'TAD0102 E (TAD0003 OU TAD0009)'
function formatarGrupos(grupos) {
  const ordenados = ordenarGrupos(grupos);
  if (ordenados.length === 0) return '—';
  return ordenados
    .map((g) => (g.length > 1 ? `(${g.join(' OU ')})` : g[0]))
    .join(' E ');
}

const porCodigo = (a, b) =>
  (a.estrutura || '').localeCompare(b.estrutura || '') || a.codigo.localeCompare(b.codigo);

// =====================================================================
const consultas = {
  estruturas: {
    interna: true,
    titulo: "Estruturas curriculares",
    campos: [],
    colunas: [],
    sql: () => ({
      texto: `
SELECT e.codigo, e.ano, e.credito_optativas, e.horas_complementares,
       c.nome AS curso, c.sigla, c.instituicao
FROM estrutura_curricular e
JOIN curso c ON c.codigo = e.curso_codigo
ORDER BY e.codigo`,
      valores: [],
    }),
    normalizar: (linhas) => linhas.map((l) => ({
      codigo: l.codigo, ano: Number(l.ano),
      credito_optativas: Number(l.credito_optativas), horas_complementares: Number(l.horas_complementares),
      curso: l.curso, sigla: l.sigla, instituicao: l.instituicao,
    })),
  },

  buscar: {
    titulo: "Buscar disciplinas",
    descricao: "Procura por parte do código ou do nome, em uma grade ou em todas.",
    campos: [
      {
        "nome": "estrutura",
        "tipo": "estrutura",
        "obrigatorio": false
      },
      {
        "nome": "codigo",
        "tipo": "texto",
        "rotulo": "Código contém",
        "exemplo": "TAD01"
      },
      {
        "nome": "nome",
        "tipo": "texto",
        "rotulo": "Nome contém",
        "exemplo": "programacao"
      }
    ],
    colunas: [
      {
        "chave": "codigo",
        "titulo": "Código"
      },
      {
        "chave": "nome",
        "titulo": "Nome"
      },
      {
        "chave": "creditos",
        "titulo": "Créditos"
      },
      {
        "chave": "estruturas",
        "titulo": "Grades"
      }
    ],
    sql: (p) => ({
      texto: `
SELECT c.codigo, c.nome, c.creditos,
       array_agg(cde.estrutura_codigo ORDER BY cde.estrutura_codigo) AS estruturas
FROM componente c
JOIN componente_da_estrutura_curricular cde ON cde.componente_codigo = c.codigo
WHERE ($1::text IS NULL OR cde.estrutura_codigo = $1)
  AND ($2::text IS NULL OR c.codigo ILIKE '%' || $2 || '%')
  AND ($3::text IS NULL OR c.nome   ILIKE '%' || $3 || '%')
GROUP BY c.codigo, c.nome, c.creditos
ORDER BY c.codigo`,
      valores: [p.estrutura, p.codigo, p.nome],
    }),
    normalizar: (linhas) =>
      linhas
        .map((l) => ({
          codigo: l.codigo,
          nome: l.nome,
          creditos: Number(l.creditos),
          estruturas: [...l.estruturas].sort().join(', '),
        }))
        .sort(porCodigo),
  },

  prerequisitos: {
    titulo: "Pré-requisitos de uma disciplina",
    descricao: "Mostra o que é exigido para cursar a disciplina em uma grade.",
    campos: [
      {
        "nome": "estrutura",
        "tipo": "estrutura",
        "obrigatorio": true
      },
      {
        "nome": "codigo",
        "tipo": "componente",
        "rotulo": "Disciplina",
        "obrigatorio": true
      }
    ],
    colunas: [
      {
        "chave": "exigencia",
        "titulo": "Exigência"
      },
      {
        "chave": "regra",
        "titulo": "Regra"
      },
      {
        "chave": "nomes",
        "titulo": "Disciplinas"
      }
    ],
    sql: (p) => ({
      texto: `
SELECT array_agg(i.componente_codigo ORDER BY i.componente_codigo) AS codigos,
       array_agg(c.nome ORDER BY i.componente_codigo)              AS nomes
FROM grupo_de_prerequisito g
JOIN item_do_grupo_de_prerequisito i ON i.gp_prerequisito_id = g.id
JOIN componente c ON c.codigo = i.componente_codigo
WHERE g.estrutura_codigo = $1
  AND g.componente_codigo = $2
GROUP BY g.id`,
      valores: [p.estrutura, p.codigo],
    }),
    normalizar: (linhas) =>
      linhas
        .map((l) => {
          const pares = l.codigos.map((cod, i) => [cod, l.nomes[i]]).sort((a, b) => a[0].localeCompare(b[0]));
          return {
            exigencia: pares.map((x) => x[0]).join(' OU '),
            regra: pares.length > 1 ? 'Basta uma' : 'Obrigatória',
            nomes: pares.map((x) => x[1]).join(' / '),
          };
        })
        .sort((a, b) => a.exigencia.localeCompare(b.exigencia)),
  },

  libera: {
    titulo: "O que uma disciplina libera",
    descricao: "Lista as disciplinas que têm esta como pré-requisito.",
    campos: [
      {
        "nome": "codigo",
        "tipo": "componente",
        "rotulo": "Disciplina",
        "obrigatorio": true
      },
      {
        "nome": "estrutura",
        "tipo": "estrutura",
        "obrigatorio": false
      }
    ],
    colunas: [
      {
        "chave": "estrutura",
        "titulo": "Grade"
      },
      {
        "chave": "codigo",
        "titulo": "Código"
      },
      {
        "chave": "nome",
        "titulo": "Disciplina liberada"
      },
      {
        "chave": "condicao",
        "titulo": "Condição"
      }
    ],
    sql: (p) => ({
      texto: `
SELECT g.estrutura_codigo AS estrutura, g.componente_codigo AS codigo, c.nome,
       CASE WHEN (SELECT count(*) FROM item_do_grupo_de_prerequisito i2
                  WHERE i2.gp_prerequisito_id = g.id) > 1
            THEN 'É uma das alternativas' ELSE 'Obrigatória' END AS condicao
FROM item_do_grupo_de_prerequisito i
JOIN grupo_de_prerequisito g ON g.id = i.gp_prerequisito_id
JOIN componente c ON c.codigo = g.componente_codigo
WHERE i.componente_codigo = $1
  AND ($2::text IS NULL OR g.estrutura_codigo = $2)
ORDER BY estrutura, codigo`,
      valores: [p.codigo, p.estrutura],
    }),
    normalizar: (linhas) => linhas.map((l) => ({ ...l })).sort(porCodigo),
  },

  grade: {
    titulo: "Grade completa",
    descricao: "Todas as disciplinas de uma grade, com os pré-requisitos de cada uma.",
    campos: [
      {
        "nome": "estrutura",
        "tipo": "estrutura",
        "obrigatorio": true
      },
      {
        "nome": "filtro",
        "tipo": "filtro",
        "rotulo": "Mostrar"
      }
    ],
    colunas: [
      {
        "chave": "codigo",
        "titulo": "Código"
      },
      {
        "chave": "nome",
        "titulo": "Nome"
      },
      {
        "chave": "creditos",
        "titulo": "Créditos"
      },
      {
        "chave": "periodo",
        "titulo": "Período"
      },
      {
        "chave": "prerequisitos",
        "titulo": "Pré-requisitos"
      }
    ],
    sql: (p) => ({
      texto: `
SELECT c.codigo, c.nome, c.creditos, cde.periodo,
       COALESCE((
         SELECT json_agg(s.alternativas)
         FROM (SELECT array_agg(i.componente_codigo ORDER BY i.componente_codigo) AS alternativas
               FROM grupo_de_prerequisito g
               JOIN item_do_grupo_de_prerequisito i ON i.gp_prerequisito_id = g.id
               WHERE g.estrutura_codigo  = cde.estrutura_codigo
                 AND g.componente_codigo = cde.componente_codigo
               GROUP BY g.id) s
       ), '[]'::json) AS grupos
FROM componente_da_estrutura_curricular cde
JOIN componente c ON c.codigo = cde.componente_codigo
WHERE cde.estrutura_codigo = $1
  AND ( $2::text = 'todos'
     OR ($2::text = 'com') = EXISTS (SELECT 1 FROM grupo_de_prerequisito g
                                     WHERE g.estrutura_codigo  = cde.estrutura_codigo
                                       AND g.componente_codigo = cde.componente_codigo) )
ORDER BY cde.periodo, c.codigo`,
      valores: [p.estrutura, p.filtro || 'todos'],
    }),
    normalizar: (linhas) =>
      linhas
        .map((l) => ({
          codigo: l.codigo,
          nome: l.nome,
          creditos: Number(l.creditos),
          periodo: l.periodo == null ? null : Number(l.periodo),
          prerequisitos: formatarGrupos(l.grupos),
        }))
        .sort(porCodigo),
  },

  disponiveis: {
    titulo: "O que posso cursar",
    descricao: "Marque as disciplinas já concluídas e veja quais ficam liberadas.",
    campos: [
      {
        "nome": "estrutura",
        "tipo": "estrutura",
        "obrigatorio": true
      },
      {
        "nome": "concluidas",
        "tipo": "concluidas",
        "rotulo": "Disciplinas concluídas"
      }
    ],
    colunas: [
      {
        "chave": "codigo",
        "titulo": "Código"
      },
      {
        "chave": "nome",
        "titulo": "Nome"
      },
      {
        "chave": "creditos",
        "titulo": "Créditos"
      }
    ],
    sql: (p) => ({
      texto: `
SELECT c.codigo, c.nome, c.creditos
FROM componente_da_estrutura_curricular cde
JOIN componente c ON c.codigo = cde.componente_codigo
WHERE cde.estrutura_codigo = $1
  AND NOT (cde.componente_codigo = ANY($2::text[]))
  -- não existe grupo em que nenhuma alternativa foi concluída
  AND NOT EXISTS (
        SELECT 1 FROM grupo_de_prerequisito g
        WHERE g.estrutura_codigo  = cde.estrutura_codigo
          AND g.componente_codigo = cde.componente_codigo
          AND NOT EXISTS (SELECT 1 FROM item_do_grupo_de_prerequisito i
                          WHERE i.gp_prerequisito_id = g.id
                            AND i.componente_codigo = ANY($2::text[])))
ORDER BY c.codigo`,
      valores: [p.estrutura, p.concluidas || []],
    }),
    normalizar: (linhas) =>
      linhas.map((l) => ({ codigo: l.codigo, nome: l.nome, creditos: Number(l.creditos) })).sort(porCodigo),
  },
};

module.exports = consultas;
