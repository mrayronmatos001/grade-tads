// =====================================================================
// Área /admin: login por senha (variável ADMIN_SENHA) e gestão das sugestões.
// A sessão é um cookie assinado (HMAC), então funciona também na Vercel,
// onde cada requisição pode cair numa instância diferente do servidor.
// =====================================================================
const crypto = require('crypto');
const express = require('express');
const config = require('./config');
const { executar } = require('./db');

const router = express.Router();
const COOKIE = 'grade_admin';
const DURACAO_MS = 8 * 60 * 60 * 1000;            // a sessão vale 8 horas
const STATUS = ['NOVA', 'LIDA', 'RESOLVIDA', 'DESCARTADA'];

const ativo = () => config.adminSenha.length > 0;
// a chave de assinatura deriva da senha: trocar a senha encerra todas as sessões
const chave = () => crypto.createHash('sha256').update(`grade-tads:sessao:${config.adminSenha}`).digest();
const assinar = (texto) => crypto.createHmac('sha256', chave()).update(texto).digest('base64url');

function iguais(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function lerCookie(req) {
  const linha = req.headers.cookie || '';
  const par = linha.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  return par ? decodeURIComponent(par.slice(COOKIE.length + 1)) : '';
}

function sessaoValida(req) {
  if (!ativo()) return false;
  const [expira, assinatura] = lerCookie(req).split('.');
  if (!expira || !assinatura || Number(expira) < Date.now()) return false;
  return iguais(assinatura, assinar(expira));
}

function gravarCookie(req, res, valor, maxAgeSeg) {
  const https = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', [
    `${COOKIE}=${encodeURIComponent(valor)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict',
    `Max-Age=${maxAgeSeg}`, https ? 'Secure' : '',
  ].filter(Boolean).join('; '));
}

// limite de tentativas de login por endereço
const tentativas = new Map();
function podeTentar(ip) {
  const agora = Date.now();
  const recentes = (tentativas.get(ip) || []).filter((t) => agora - t < 15 * 60 * 1000);
  tentativas.set(ip, recentes);
  return recentes.length < 5;
}
// repassa erros de rotas assíncronas para a resposta, sem derrubar o servidor
const seguro = (fn) => (req, res) => fn(req, res).catch(() => {
  if (!res.headersSent) res.status(500).json({ erro: 'Falha ao acessar o banco de dados.' });
});
const ipDe = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.get('/sessao', (req, res) => {
  res.json({ ativo: ativo(), logado: sessaoValida(req) });
});

router.post('/login', (req, res) => {
  if (!ativo()) return res.status(503).json({ erro: 'A área admin está desativada: configure ADMIN_SENHA.' });
  const ip = ipDe(req);
  if (!podeTentar(ip)) return res.status(429).json({ erro: 'Muitas tentativas. Espere 15 minutos.' });
  if (!iguais((req.body || {}).senha || '', config.adminSenha)) {
    tentativas.get(ip).push(Date.now());
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  const expira = String(Date.now() + DURACAO_MS);
  gravarCookie(req, res, `${expira}.${assinar(expira)}`, DURACAO_MS / 1000);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  gravarCookie(req, res, '', 0);
  res.json({ ok: true });
});

// daqui para baixo, só com sessão válida
router.use((req, res, next) => {
  if (!sessaoValida(req)) return res.status(401).json({ erro: 'Entre com a senha para continuar.' });
  next();
});

router.get('/sugestoes', async (req, res) => {
  try {
    const status = STATUS.includes(req.query.status) ? req.query.status : null;
    const lista = await executar({
      texto: `SELECT id, tipo, mensagem, nome, email, status, criado_em
              FROM sugestao
              WHERE ($1::text IS NULL OR status = $1)
              ORDER BY criado_em DESC
              LIMIT 500`,
      valores: [status],
    });
    const contagem = await executar({ texto: 'SELECT status, COUNT(*)::int AS total FROM sugestao GROUP BY status' });
    res.json({ sugestoes: lista, contagem: Object.fromEntries(contagem.map((c) => [c.status, c.total])) });
  } catch (e) {
    res.status(500).json({ erro: 'Não foi possível ler as sugestões. Confira se a tabela sugestao existe.' });
  }
});

router.patch('/sugestoes/:id', seguro(async (req, res) => {
  const id = Number(req.params.id);
  const status = (req.body || {}).status;
  if (!Number.isInteger(id) || !STATUS.includes(status)) return res.status(400).json({ erro: 'Dados inválidos.' });
  await executar({ texto: 'UPDATE sugestao SET status = $1 WHERE id = $2', valores: [status, id] });
  res.json({ ok: true });
}));

router.delete('/sugestoes/:id', seguro(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ erro: 'Dados inválidos.' });
  await executar({ texto: 'DELETE FROM sugestao WHERE id = $1', valores: [id] });
  res.json({ ok: true });
}));

// apaga as sugestões com mais de 12 meses (prazo da Política de Privacidade)
router.post('/limpeza', seguro(async (req, res) => {
  const apagadas = await executar({
    texto: "DELETE FROM sugestao WHERE criado_em < now() - interval '12 months' RETURNING id",
  });
  res.json({ apagadas: apagadas.length });
}));

module.exports = router;
