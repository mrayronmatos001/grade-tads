// =====================================================================
// Servidor web: entrega a página (pasta public) e a API de consultas.
// Roda localmente com "npm start" e na Vercel como função (export do app).
// =====================================================================
const express = require('express');
const path = require('path');
const config = require('./config');
const consultas = require('./consultas');
const { executar, status } = require('./db');
const admin = require('./admin');

const app = express();
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  // o service worker precisa ser conferido a cada visita, para as versões novas chegarem
  setHeaders: (res, arquivo) => {
    if (arquivo.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
  },
}));

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
    // ementas: se a coluna ainda não existir no banco, a página funciona sem elas
    let ementas = {};
    try { ementas = consultas.ementas.normalizar(await executar(consultas.ementas.sql())); } catch { /* sem ementas */ }
    const optativas = consultas.optativas.normalizar(await executar(consultas.optativas.sql()));
    res.json({ estruturas, componentes, optativas, detalhes, ementas });
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

// ---------------------------------------------------------------------
// Sugestões enviadas pela aba "Sugestões"
// ---------------------------------------------------------------------
const TIPOS_SUGESTAO = ['SUGESTAO', 'ERRO_DADOS', 'OUTRO'];
const envios = new Map();           // limite simples por IP (vale por instância do servidor)
const LIMITE_ENVIOS = 5;
const JANELA_MS = 10 * 60 * 1000;

function podeEnviar(ip) {
  const agora = Date.now();
  const recentes = (envios.get(ip) || []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= LIMITE_ENVIOS) return false;
  recentes.push(agora);
  envios.set(ip, recentes);
  return true;
}

app.post('/api/sugestoes', async (req, res) => {
  const corpo = req.body || {};
  // campo invisível na página: só robôs preenchem. Finge que deu certo e descarta.
  if (corpo.site) return res.status(201).json({ ok: true });

  const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const tipo = TIPOS_SUGESTAO.includes(corpo.tipo) ? corpo.tipo : null;
  const mensagem = texto(corpo.mensagem, 2000);
  const nome = texto(corpo.nome, 80) || null;
  const email = texto(corpo.email, 120) || null;

  if (!tipo) return res.status(400).json({ erro: 'Escolha o tipo da mensagem.' });
  if (mensagem.length < 10) return res.status(400).json({ erro: 'Escreva pelo menos 10 caracteres na mensagem.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: 'Confira o e-mail, ou deixe o campo em branco.' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (!podeEnviar(ip)) {
    return res.status(429).json({ erro: 'Você enviou várias mensagens seguidas. Tente de novo em alguns minutos.' });
  }

  try {
    await executar({
      texto: 'INSERT INTO sugestao (tipo, mensagem, nome, email) VALUES ($1, $2, $3, $4)',
      valores: [tipo, mensagem, nome, email],
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: 'Não foi possível enviar agora. Tente de novo em alguns minutos.' });
  }
});

// ---------------------------------------------------------------------
// Pedido de página para outro curso ou universidade (tela inicial, "+").
// Vai para a mesma tabela das sugestões, com o tipo NOVO_CURSO.
// ---------------------------------------------------------------------
app.post('/api/solicitacoes', async (req, res) => {
  const corpo = req.body || {};
  if (corpo.site) return res.status(201).json({ ok: true });   // robô

  const texto = (v, max) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
  const link = (v) => {
    const t = texto(v, 400);
    if (!t) return '';
    try {
      const url = new URL(t);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  };
  const universidade = texto(corpo.universidade, 120);
  const curso = texto(corpo.curso, 120);
  const campus = texto(corpo.campus, 120);
  const linkPpc = link(corpo.linkPpc);
  const linkGrade = link(corpo.linkGrade);
  const observacao = texto(corpo.observacao, 800);
  const nome = texto(corpo.nome, 80) || null;
  const email = texto(corpo.email, 120);

  if (!universidade) return res.status(400).json({ erro: 'Informe a universidade.' });
  if (!curso) return res.status(400).json({ erro: 'Informe o curso.' });
  if (linkPpc === null || linkGrade === null) {
    return res.status(400).json({ erro: 'Os links precisam começar com http:// ou https://.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: 'Informe um e-mail válido, para combinarmos o envio do PPC e da grade.' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (!podeEnviar(ip)) {
    return res.status(429).json({ erro: 'Você enviou várias mensagens seguidas. Tente de novo em alguns minutos.' });
  }

  const mensagem = [
    `Universidade: ${universidade}`,
    `Curso: ${curso}`,
    campus && `Campus ou unidade: ${campus}`,
    `PPC: ${linkPpc || 'não informado'}`,
    `Grade curricular com pré-requisitos: ${linkGrade || 'não informado'}`,
    observacao && `Observações: ${observacao}`,
  ].filter(Boolean).join('\n');

  try {
    await executar({
      texto: 'INSERT INTO sugestao (tipo, mensagem, nome, email) VALUES ($1, $2, $3, $4)',
      valores: ['NOVO_CURSO', mensagem, nome, email],
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('Falha ao salvar pedido de curso:', e.message);
    res.status(500).json({ erro: 'Não foi possível enviar agora. Tente de novo em alguns minutos.' });
  }
});

// E-mails de contato das páginas legais (vêm da variável CONTATO_EMAIL)
app.get('/api/contato', (req, res) => res.json({ emails: config.contatoEmails }));

// Área administrativa (a página fica em public/admin/; os dados, aqui)
app.use('/api/admin', admin);

// Localmente, sobe o servidor; na Vercel, o app é exportado e vira uma função
if (require.main === module) {
  app.listen(config.porta, () => {
    console.log(`Grade curricular rodando em http://localhost:${config.porta}`);
  });
}

module.exports = app;
