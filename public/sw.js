// =====================================================================
// Service worker do Grade TADS (PWA).
// - Página e dados: tenta a rede primeiro; sem internet, usa a última
//   versão salva. Assim o app abre offline com o que o aluno já viu.
// - Arquivos com ?v= (CSS, JS): vêm do cache, porque cada versão tem um
//   endereço próprio.
// - Área /admin e envios (sugestões, pedidos): nunca passam pelo cache.
// A VERSAO é trocada a cada versão do site; ao mudar, o cache antigo é apagado.
// =====================================================================
const VERSAO = '2.13.2';
const CACHE = `grade-tads-${VERSAO}`;
const ESSENCIAIS = [
  '/',
  `/style.css?v=${VERSAO}`,
  `/app.js?v=${VERSAO}`,
  `/complementares.js?v=${VERSAO}`,
  '/manifest.webmanifest',
  '/img/logo-tads.png',
  '/img/ufrn-selo.png',
  '/img/favicon-32.png',
  '/img/icone-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('grade-tads-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// rede primeiro; guarda a resposta boa; sem rede, devolve a guardada
async function redePrimeiro(pedido, chave = pedido) {
  const cache = await caches.open(CACHE);
  try {
    const resposta = await fetch(pedido);
    if (resposta.ok) cache.put(chave, resposta.clone());
    return resposta;
  } catch (erro) {
    const salva = await cache.match(chave);
    if (salva) return salva;
    throw erro;
  }
}

// cache primeiro (arquivos versionados e imagens)
async function cachePrimeiro(pedido) {
  const cache = await caches.open(CACHE);
  const salva = await cache.match(pedido);
  if (salva) return salva;
  const resposta = await fetch(pedido);
  if (resposta.ok || resposta.type === 'opaque') cache.put(pedido, resposta.clone());
  return resposta;
}

self.addEventListener('fetch', (e) => {
  const pedido = e.request;
  const url = new URL(pedido.url);
  const mesmoSite = url.origin === self.location.origin;

  // nunca em cache: área administrativa e envios
  if (mesmoSite && (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin'))) return;

  // consultas (POST): a chave do cache é o próprio pedido (tipo + parâmetros)
  if (mesmoSite && pedido.method === 'POST' && url.pathname === '/api/consulta') {
    e.respondWith((async () => {
      const corpo = await pedido.clone().text();
      const chave = new Request(`/__consulta?${encodeURIComponent(corpo)}`);
      return redePrimeiro(pedido, chave);
    })());
    return;
  }
  if (pedido.method !== 'GET') return;

  if (pedido.mode === 'navigate') {
    // páginas: rede primeiro; offline, a página inicial salva
    e.respondWith(redePrimeiro(pedido).catch(() => caches.match('/')));
    return;
  }
  if (mesmoSite && url.pathname.startsWith('/api/')) {
    e.respondWith(redePrimeiro(pedido));
    return;
  }
  if (mesmoSite || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'].includes(url.hostname)) {
    e.respondWith(cachePrimeiro(pedido));
  }
});
