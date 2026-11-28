// =====================================================================
// Página /admin: login e gestão das sugestões
// =====================================================================
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TIPOS = { SUGESTAO: 'Sugestão', ERRO_DADOS: 'Erro nos dados', OUTRO: 'Outro assunto', NOVO_CURSO: 'Novo curso' };
const STATUS = [
  ['NOVA', 'Novas'], ['LIDA', 'Lidas'], ['RESOLVIDA', 'Resolvidas'], ['DESCARTADA', 'Descartadas'], ['', 'Todas'],
];
const ROTULO_STATUS = { NOVA: 'Nova', LIDA: 'Lida', RESOLVIDA: 'Resolvida', DESCARTADA: 'Descartada' };
let filtro = 'NOVA';

async function api(caminho, opcoes = {}) {
  const r = await fetch(`/api/admin${caminho}`, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
    credentials: 'same-origin',
  });
  const corpo = await r.json().catch(() => ({}));
  if (r.status === 401 && caminho !== '/login') { mostrarEntrar(); throw new Error(corpo.erro); }
  if (!r.ok) throw new Error(corpo.erro || 'Algo deu errado.');
  return corpo;
}

function mostrarEntrar(aviso) {
  $('#painelAdmin').hidden = true;
  $('#sair').hidden = true;
  $('#entrar').hidden = false;
  if (aviso) $('#avisoEntrar').textContent = aviso;
  $('#formEntrar').elements.senha.focus();
}

async function mostrarPainel() {
  $('#entrar').hidden = true;
  $('#painelAdmin').hidden = false;
  $('#sair').hidden = false;
  await carregar();
}

async function carregar() {
  $('#lista').classList.add('carregando');
  try {
    const { sugestoes, contagem } = await api(`/sugestoes${filtro ? `?status=${filtro}` : ''}`);
    const total = Object.values(contagem).reduce((s, n) => s + n, 0);
    $('#filtros').innerHTML = STATUS.map(([valor, rotulo]) => `
      <button type="button" class="tipo" role="tab" data-filtro="${valor}" aria-selected="${valor === filtro}">
        ${rotulo} <span class="adm-num">${valor ? contagem[valor] || 0 : total}</span></button>`).join('');
    $('#lista').innerHTML = sugestoes.length
      ? sugestoes.map(cartao).join('')
      : `<p class="vazio">Nenhuma sugestão ${filtro ? `com a situação "${ROTULO_STATUS[filtro].toLowerCase()}"` : 'recebida ainda'}.</p>`;
  } catch (e) {
    $('#statusAdmin').className = 'sug-status erro';
    $('#statusAdmin').textContent = e.message;
  } finally {
    $('#lista').classList.remove('carregando');
  }
}

function cartao(s) {
  const data = new Date(s.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const autor = [s.nome && esc(s.nome), s.email && `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`].filter(Boolean).join(' · ');
  return `
    <article class="adm-cartao" data-id="${s.id}" data-status="${s.status}">
      <header>
        <span class="adm-tipo adm-tipo-${s.tipo.toLowerCase()}">${TIPOS[s.tipo] || s.tipo}</span>
        <span class="adm-data">#${s.id} · ${data}</span>
      </header>
      <p class="adm-mensagem">${esc(s.mensagem)}</p>
      <p class="adm-autor">${autor || 'Anônimo'}</p>
      <footer>
        <div class="adm-status" role="group" aria-label="Situação da sugestão">
          ${Object.entries(ROTULO_STATUS).map(([valor, rotulo]) => `
            <button type="button" data-status="${valor}" aria-pressed="${valor === s.status}">${rotulo}</button>`).join('')}
        </div>
        <button type="button" class="adm-apagar" data-apagar>Apagar</button>
      </footer>
    </article>`;
}

// ---------- eventos ----------
$('#formEntrar').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#erroEntrar').textContent = '';
  const senha = e.currentTarget.elements.senha;
  try {
    await api('/login', { method: 'POST', body: JSON.stringify({ senha: senha.value }) });
    senha.value = '';
    await mostrarPainel();
  } catch (erro) {
    $('#erroEntrar').textContent = erro.message;
    senha.select();
  }
});

$('#sair').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' }).catch(() => {});
  mostrarEntrar('Você saiu. Digite a senha para entrar de novo.');
});

$('#filtros').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filtro]');
  if (!b) return;
  filtro = b.dataset.filtro;
  carregar();
});

$('#lista').addEventListener('click', async (e) => {
  const item = e.target.closest('.adm-cartao');
  if (!item) return;
  const id = item.dataset.id;
  const botaoStatus = e.target.closest('[data-status]');
  const apagar = e.target.closest('[data-apagar]');
  try {
    if (botaoStatus && botaoStatus.tagName === 'BUTTON') {
      await api(`/sugestoes/${id}`, { method: 'PATCH', body: JSON.stringify({ status: botaoStatus.dataset.status }) });
      await carregar();
    } else if (apagar) {
      // primeiro clique pede confirmação; o segundo apaga
      if (!apagar.classList.contains('confirmar')) {
        apagar.classList.add('confirmar');
        apagar.textContent = 'Confirmar exclusão';
        setTimeout(() => { apagar.classList.remove('confirmar'); apagar.textContent = 'Apagar'; }, 4000);
        return;
      }
      await api(`/sugestoes/${id}`, { method: 'DELETE' });
      await carregar();
    }
  } catch (erro) {
    $('#statusAdmin').className = 'sug-status erro';
    $('#statusAdmin').textContent = erro.message;
  }
});

$('#limpeza').addEventListener('click', async () => {
  try {
    const { apagadas } = await api('/limpeza', { method: 'POST' });
    $('#statusAdmin').className = 'sug-status';
    $('#statusAdmin').textContent = apagadas
      ? `${apagadas} ${apagadas === 1 ? 'sugestão antiga apagada' : 'sugestões antigas apagadas'}.`
      : 'Nenhuma sugestão com mais de 12 meses.';
    await carregar();
  } catch (erro) {
    $('#statusAdmin').className = 'sug-status erro';
    $('#statusAdmin').textContent = erro.message;
  }
});

// ---------- início ----------
(async () => {
  try {
    const { ativo, logado } = await (await fetch('/api/admin/sessao', { credentials: 'same-origin' })).json();
    if (!ativo) {
      mostrarEntrar('A área admin está desativada. Configure a variável ADMIN_SENHA no servidor.');
      $('#formEntrar').querySelectorAll('input, button').forEach((el) => (el.disabled = true));
      return;
    }
    if (logado) await mostrarPainel(); else mostrarEntrar();
  } catch {
    mostrarEntrar('O servidor não respondeu. Tente de novo em alguns segundos.');
  }
})();
