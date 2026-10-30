// =====================================================================
// Servidor web: entrega a página (pasta public) e a API de consultas.
// Roda localmente com "npm start" e na Vercel como função (export do app).
// =====================================================================
const express = require('express');
const path = require('path');
const config = require('./config');
const consultas = require('./consultas');
const { executar, status } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Lista de perguntas disponíveis (a tela monta a frase a partir daqui)
app.get('/api/consultas', (req, res) => {
  const lista = Object.entries(consultas)
    .filter(([, c]) => !c.interna)
    .map(([id, c]) => ({ id, titulo: c.titulo, descricao: c.descricao, campos: c.campos, colunas: c.colunas }));
  res.json(lista);
});

// Usado para checar se o banco está no ar (e para o "ping" que evita a pausa do Supabase)
app.get('/api/status', async (req, res) => {
  const s = await status();
  res.status(s.ok ? 200 : 503).json(s);
});

// Grades, disciplinas (com período e pré-requisitos) e cargas horárias
app.get('/api/opcoes', async (req, res) => {
  try {
    const detalhes = {};
    consultas.estruturas.normalizar(await executar(consultas.estruturas.sql()))
      .forEach((e) => (detalhes[e.codigo] = e));
    const estruturas = Object.keys(detalhes).sort();
    const componentes = {};
    for (const estrutura of estruturas) {
      const linhas = consultas.grade.normalizar(await executar(consultas.grade.sql({ estrutura, filtro: 'todos' })));
      componentes[estrutura] = linhas.map((l) => ({
        codigo: l.codigo, nome: l.nome, creditos: l.creditos, periodo: l.periodo, prerequisitos: l.prerequisitos,
      }));
    }
    res.json({ estruturas, componentes, detalhes });
  } catch (e) {
    res.status(503).json({ erro: 'Não foi possível acessar o banco de dados. Confira o arquivo .env.' });
  }
});

// Converte campos vazios em null e valida os obrigatórios
function prepararParametros(consulta, recebidos = {}) {
  const p = {};
  for (const campo of consulta.campos) {
    let valor = recebidos[campo.nome];
    if (typeof valor === 'string') valor = valor.trim();
    if (valor === '' || valor === undefined) valor = null;
    if (campo.obrigatorio && (valor === null || (Array.isArray(valor) && valor.length === 0))) {
      throw new Error(`Preencha o campo "${campo.rotulo || campo.nome}".`);
    }
    p[campo.nome] = valor;
  }
  return p;
}

// Executa a pergunta escolhida
app.post('/api/consulta', async (req, res) => {
  const { tipo, parametros } = req.body || {};
  const consulta = consultas[tipo];
  if (!consulta || consulta.interna) return res.status(400).json({ erro: 'Consulta desconhecida.' });

  let p;
  try { p = prepararParametros(consulta, parametros); }
  catch (e) { return res.status(400).json({ erro: e.message }); }

  try {
    const dados = consulta.normalizar(await executar(consulta.sql(p)));
    res.json({ dados });
  } catch (e) {
    res.status(500).json({ erro: 'A consulta falhou no banco de dados.' });
  }
});

// Localmente, sobe o servidor; na Vercel, o app é exportado e vira uma função
if (require.main === module) {
  app.listen(config.porta, () => {
    console.log(`Grade curricular rodando em http://localhost:${config.porta}`);
  });
}

module.exports = app;
