// =====================================================================
// Grade TADS: a pergunta é uma frase com lacunas; a resposta é uma
// corrida entre os bancos, seguida da tabela de cada um.
// =====================================================================

// Como cada consulta aparece como frase. Strings são texto; {campo} vira lacuna.
const FRASES = {
  buscar:        ['Mostre as disciplinas com código contendo', '{codigo}', 'e nome contendo', '{nome}', '{estrutura}', '.'],
  prerequisitos: ['O que preciso ter cursado para fazer', '{codigo}', 'na grade', '{estrutura}', '?'],
  libera:        ['Quais disciplinas', '{codigo}', 'libera', '{estrutura}', '?'],
  grade:         ['Mostre a grade', '{estrutura}', 'com', '{filtro}', '.'],
  disponiveis:   ['Já cursei as disciplinas marcadas abaixo, da grade', '{estrutura}', '. O que posso cursar agora?'],
};
const ROTULOS_CURTOS = {
  buscar: 'Buscar', prerequisitos: 'Pré-requisitos', libera: 'O que libera',
  grade: 'Grade completa', disponiveis: 'O que posso cursar',
  complementares: 'Complementares', sugestoes: 'Sugestões',
};
// nomes da barra de navegação do celular
const ROTULOS_BARRA = {
  buscar: 'Buscar', prerequisitos: 'Requisitos', libera: 'Libera',
  grade: 'Grade', disponiveis: 'Cursar', complementares: 'Horas', sugestoes: 'Sugerir',
};
const ICONES = {
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  prerequisitos: '<circle cx="5" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="12" r="2.6"/><path d="M7 6.2c4 1 5.5 3.6 9.4 5.2M7 17.8c4-1 5.5-3.6 9.4-5.2"/>',
  libera: '<circle cx="5" cy="12" r="2.6"/><circle cx="19" cy="5" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M7.6 11.4c4-1.6 5.4-4.2 9.2-5.2M7.6 12.6c4 1.6 5.4 4.2 9.2 5.2"/>',
  grade: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  disponiveis: '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.4"/>',
  complementares: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  sugestoes: '<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>',
};
const htmlAba = (id, titulo, selecionada, extra = '') => `
  <button type="button" class="tipo ${extra}" role="tab" data-tipo="${id}" title="${esc(titulo)}" aria-selected="${selecionada}">
    <svg class="tipo-icone" viewBox="0 0 24 24" aria-hidden="true">${ICONES[id] || ''}</svg>
    <span class="tipo-longo">${esc(ROTULOS_CURTOS[id] || titulo)}</span>
    <span class="tipo-curto" aria-hidden="true">${esc(ROTULOS_BARRA[id] || titulo)}</span>
  </button>`;

let consultas = [];
let opcoes = { estruturas: [], componentes: {}, optativas: {} };
let ancoraPendente = null;   // rola até esta seção quando a resposta chegar
let tipoAtual = 'prerequisitos';
let ultimoContexto = {};

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// "PROGRAMACAO ORIENTADA A OBJETOS" -> "Programacao Orientada a Objetos"
const PEQUENAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'nas', 'nos', 'na', 'no', 'para']);
function bonito(texto) {
  return String(texto ?? '').toLowerCase().split(' ').map((p, i) => {
    if (/^(i|ii|iii|iv)$/.test(p)) return p.toUpperCase();
    if (p === 'ti') return 'TI';
    if (i > 0 && PEQUENAS.has(p)) return p;
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(' ');
}
const anoDa = (estrutura) => estrutura.replace(/\D/g, '') || estrutura;

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Tema: claro, escuro ou o do sistema (a escolha fica salva no navegador)
// ---------------------------------------------------------------------
function aplicarTema(tema) {
  if (tema === 'claro' || tema === 'escuro') document.documentElement.dataset.tema = tema;
  else delete document.documentElement.dataset.tema;
  try {
    if (tema === 'claro' || tema === 'escuro') localStorage.setItem('tema', tema);
    else localStorage.removeItem('tema');
  } catch { /* navegador sem armazenamento: o tema vale só nesta visita */ }
  document.querySelectorAll('.temas button').forEach((b) => b.setAttribute('aria-checked', b.dataset.tema === tema));
}

function prepararTemas() {
  let atual = 'sistema';
  try { atual = localStorage.getItem('tema') || 'sistema'; } catch { /* ignora */ }
  aplicarTema(atual);
  const grupo = document.querySelector('.temas');
  grupo?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tema]');
    if (b) aplicarTema(b.dataset.tema);
  });
  // setas do teclado trocam a opção, como num grupo de rádio
  grupo?.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const botoes = [...grupo.querySelectorAll('button')];
    const i = botoes.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const prox = botoes[(i + (e.key === 'ArrowRight' ? 1 : botoes.length - 1)) % botoes.length];
    aplicarTema(prox.dataset.tema);
    prox.focus();
  });
}

// ---------------------------------------------------------------------
// Tela inicial: universidade -> curso. Aparece na primeira visita e ao
// clicar no logotipo ou em "trocar". O "+" pede a página de outro curso.
// ---------------------------------------------------------------------
const CATALOGO = [
  {
    sigla: 'UFRN', nome: 'Universidade Federal do Rio Grande do Norte', logo: 'img/ufrn-selo.png',
    cursos: [
      { id: 'ufrn-tads', sigla: 'TADS', nome: 'Análise e Desenvolvimento de Sistemas', unidade: 'Escola Agrícola de Jundiaí · Macaíba', logo: 'img/logo-tads.png' },
    ],
  },
];
const CHAVE_CURSO = 'grade_curso';

function cursoEscolhido() {
  try { return localStorage.getItem(CHAVE_CURSO); } catch { return null; }
}

function abrirInicio(primeiraVez = false) {
  let tela = $('#inicio');
  if (!tela) {
    tela = document.createElement('div');
    tela.id = 'inicio';
    tela.className = 'inicio';
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-modal', 'true');
    tela.setAttribute('aria-labelledby', 'inicioTitulo');
    tela.innerHTML = `
      <div class="inicio-caixa">
        <div class="inicio-topo">
          <span class="inicio-marca" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/>
              <rect x="3.5" y="15.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="15.5" width="7" height="5" rx="1.5"/>
              <path d="M7 8.5v7M7 12h7.5a2.5 2.5 0 0 1 2.5 2.5v1"/></svg>
          </span>
          <strong>Grade curricular</strong>
          <button type="button" class="inicio-fechar" aria-label="Fechar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </div>
        <div class="inicio-passo" id="inicioPasso"></div>
      </div>`;
    document.body.appendChild(tela);
    tela.querySelector('.inicio-fechar').addEventListener('click', fecharInicio);
    tela.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cursoEscolhido()) fecharInicio(); });
  }
  // na primeira visita é preciso escolher um curso: sem botão de fechar
  tela.querySelector('.inicio-fechar').hidden = primeiraVez || !cursoEscolhido();
  tela.hidden = false;
  document.body.classList.add('com-inicio');
  passoUniversidades();
}

function fecharInicio() {
  const tela = $('#inicio');
  if (!tela) return;
  tela.hidden = true;
  document.body.classList.remove('com-inicio');
}

function mostrarPasso(html, aoMontar) {
  const passo = $('#inicioPasso');
  passo.innerHTML = html;
  aoMontar?.(passo);
  passo.querySelector('h1')?.focus();
  $('#inicio').scrollTop = 0;
}

const htmlVoltar = (rotulo) => `<button type="button" class="inicio-voltar" data-voltar>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>${rotulo}</button>`;

function passoUniversidades() {
  mostrarPasso(`
    <h1 id="inicioTitulo" tabindex="-1">Escolha sua universidade</h1>
    <p class="inicio-sub">Veja a grade, os pré-requisitos e o que você já pode cursar.</p>
    <div class="inicio-opcoes">
      ${CATALOGO.map((u, i) => `
        <button type="button" class="inicio-opcao" data-universidade="${i}">
          ${u.logo
            ? `<img class="inicio-logo" src="${esc(u.logo)}" alt="${esc(u.sigla)}" width="92" height="46">`
            : `<span class="inicio-sigla">${esc(u.sigla)}</span>`}
          <span class="inicio-texto"><b>${esc(u.nome)}</b><small>${plural(u.cursos.length, 'curso', 'cursos')}</small></span>
          <svg class="inicio-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>
        </button>`).join('')}
      <button type="button" class="inicio-opcao inicio-novo" data-pedido>
        <span class="inicio-sigla">+</span>
        <span class="inicio-texto"><b>Outra universidade</b><small>Peça a grade do seu curso</small></span>
      </button>
    </div>`, (passo) => {
    passo.querySelectorAll('[data-universidade]').forEach((b) =>
      b.addEventListener('click', () => passoCursos(CATALOGO[b.dataset.universidade])));
    passo.querySelector('[data-pedido]').addEventListener('click', () => passoPedido(null));
  });
}

function passoCursos(uni) {
  mostrarPasso(`
    ${htmlVoltar('Universidades')}
    <h1 id="inicioTitulo" tabindex="-1">Cursos da ${esc(uni.sigla)}</h1>
    <p class="inicio-sub">${esc(uni.nome)}</p>
    <div class="inicio-opcoes">
      ${uni.cursos.map((c) => `
        <button type="button" class="inicio-opcao" data-curso="${c.id}">
          ${c.logo
            ? `<span class="inicio-logo-curso"><img src="${esc(c.logo)}" alt="${esc(c.sigla)}" width="46" height="46"></span>`
            : `<span class="inicio-sigla">${esc(c.sigla)}</span>`}
          <span class="inicio-texto"><b>${esc(c.nome)}</b><small>${esc(c.unidade)}</small></span>
          <svg class="inicio-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>
        </button>`).join('')}
      <button type="button" class="inicio-opcao inicio-novo" data-pedido>
        <span class="inicio-sigla">+</span>
        <span class="inicio-texto"><b>Outro curso da ${esc(uni.sigla)}</b><small>Peça a grade do seu curso</small></span>
      </button>
    </div>`, (passo) => {
    passo.querySelector('[data-voltar]').addEventListener('click', passoUniversidades);
    passo.querySelectorAll('[data-curso]').forEach((b) => b.addEventListener('click', () => {
      try { localStorage.setItem(CHAVE_CURSO, b.dataset.curso); } catch { /* sem armazenamento: só fecha */ }
      fecharInicio();
    }));
    passo.querySelector('[data-pedido]').addEventListener('click', () => passoPedido(uni));
  });
}

function passoPedido(uni) {
  mostrarPasso(`
    ${htmlVoltar(uni ? `Cursos da ${esc(uni.sigla)}` : 'Universidades')}
    <h1 id="inicioTitulo" tabindex="-1">Pedir a grade de outro curso</h1>
    <p class="inicio-sub">Para montar a página, precisamos do <b>PPC</b> (projeto pedagógico) e da <b>grade curricular com os pré-requisitos</b>.
      Mande os links, se tiver. Se não tiver, deixe seu e-mail que combinamos o envio.</p>
    <form class="inicio-form" novalidate>
      <div class="sug-linha">
        <label class="sug-campo"><span>Universidade</span>
          <input name="universidade" maxlength="120" required value="${uni ? esc(uni.sigla) : ''}" autocomplete="organization"></label>
        <label class="sug-campo"><span>Curso</span>
          <input name="curso" maxlength="120" required placeholder="Ex.: Engenharia de Software"></label>
      </div>
      <label class="sug-campo"><span>Campus ou unidade <em>(opcional)</em></span>
        <input name="campus" maxlength="120"></label>
      <label class="sug-campo"><span>Link do PPC <em>(opcional)</em></span>
        <input name="linkPpc" type="url" maxlength="400" placeholder="https://"></label>
      <label class="sug-campo"><span>Link da grade com pré-requisitos <em>(opcional, ex.: estrutura curricular no SIGAA)</em></span>
        <input name="linkGrade" type="url" maxlength="400" placeholder="https://"></label>
      <div class="sug-linha">
        <label class="sug-campo"><span>Seu nome <em>(opcional)</em></span>
          <input name="nome" maxlength="80" autocomplete="name"></label>
        <label class="sug-campo"><span>Seu e-mail</span>
          <input name="email" type="email" maxlength="120" required autocomplete="email"></label>
      </div>
      <label class="sug-campo"><span>Observações <em>(opcional)</em></span>
        <textarea name="observacao" rows="3" maxlength="800"></textarea></label>
      <input class="sug-isca" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="sug-acoes">
        <button type="submit" class="sug-enviar">Enviar pedido</button>
        <p class="sug-status" role="status"></p>
      </div>
    </form>`, (passo) => {
    passo.querySelector('[data-voltar]').addEventListener('click', () => (uni ? passoCursos(uni) : passoUniversidades()));
    passo.querySelector('form').addEventListener('submit', enviarPedido);
  });
}

async function enviarPedido(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const status = form.querySelector('.sug-status');
  const botao = form.querySelector('.sug-enviar');
  const dados = Object.fromEntries(new FormData(form));
  status.className = 'sug-status';
  const faltando = ['universidade', 'curso', 'email'].find((c) => !(dados[c] || '').trim());
  if (faltando) {
    status.classList.add('erro');
    status.textContent = faltando === 'email' ? 'Informe seu e-mail, para combinarmos o envio do PPC e da grade.' : `Informe ${faltando === 'curso' ? 'o curso' : 'a universidade'}.`;
    form.elements[faltando].focus();
    return;
  }
  botao.disabled = true;
  botao.textContent = 'Enviando…';
  try {
    const r = await fetch('/api/solicitacoes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(corpo.erro || 'Não foi possível enviar agora.');
    mostrarPasso(`
      <h1 id="inicioTitulo" tabindex="-1">Pedido enviado. Obrigado!</h1>
      <p class="inicio-sub">Vamos analisar e responder em <b>${esc(dados.email.trim())}</b> para combinar o PPC e a grade curricular.</p>
      <div class="inicio-opcoes">
        <button type="button" class="inicio-opcao" data-recomecar>
          <span class="inicio-texto"><b>Voltar ao início</b><small>Ver as universidades e cursos disponíveis</small></span>
          <svg class="inicio-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>
        </button>
      </div>`, (passo) => passo.querySelector('[data-recomecar]').addEventListener('click', passoUniversidades));
  } catch (erro) {
    status.classList.add('erro');
    status.textContent = erro.message;
    botao.disabled = false;
    botao.textContent = 'Enviar pedido';
  }
}

async function iniciar() {
  prepararTemas();
  prepararDetalhe();
  try {
    consultas = await (await fetch('/api/consultas')).json();
    const r = await fetch('/api/opcoes');
    if (!r.ok) throw new Error((await r.json()).erro);
    opcoes = await r.json();
  } catch (e) {
    $('#resultado').innerHTML = `<p class="vazio erro">${esc(e.message || 'Não foi possível carregar a grade.')} Tente recarregar a página em alguns segundos.</p>`;
    if (!consultas.length) return;
  }

  $('#tipos').innerHTML = consultas.map((c) => htmlAba(c.id, c.descricao, c.id === tipoAtual)).join('')
    + htmlAba('complementares', 'Atividades que contam como horas complementares', false)
    + htmlAba('sugestoes', 'Envie uma sugestão ou avise sobre um erro', false, 'tipo-sugestoes');
  $('.marca').addEventListener('click', (e) => {
    if (e.target.closest('[data-ir]')) return;   // os contadores têm atalho próprio
    e.preventDefault();
    abrirInicio();
  });
  if (!cursoEscolhido()) abrirInicio(true);

  $('#cargas').addEventListener('click', (e) => {
    const link = e.target.closest('[data-ir]');
    if (!link) return;
    e.preventDefault();   // o contador fica dentro do link do logotipo
    const ancora = link.dataset.ancora || null;
    const alvo = ancora && tipoAtual === link.dataset.ir && document.getElementById(ancora);
    if (alvo) {
      // a aba já está aberta com a seção na tela: só abre e rola até ela
      if (alvo.tagName === 'DETAILS') alvo.open = true;
      alvo.scrollIntoView({ behavior: semAnimacao() ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    ancoraPendente = ancora;
    irParaAba(link.dataset.ir);
    if (!ancora && !ehCelular()) $('#formulario').scrollIntoView({ behavior: semAnimacao() ? 'auto' : 'smooth', block: 'start' });
  });
  $('#tipos').addEventListener('click', (e) => {
    const botao = e.target.closest('.tipo');
    if (!botao) return;
    fecharEscolha(false);
    fecharDetalhe();
    tipoAtual = botao.dataset.tipo;
    document.querySelectorAll('.tipo').forEach((b) => b.setAttribute('aria-selected', b === botao));
    // no celular, a barra fica embaixo: ao trocar de aba, volta para o topo da pergunta
    if (ehCelular()) window.scrollTo({ top: 0, behavior: semAnimacao() ? 'auto' : 'smooth' });
    if (tipoAtual === 'sugestoes') mostrarSugestoes();
    else if (tipoAtual === 'complementares') mostrarComplementares();
    else montarFrase();
  });

  // a resposta atualiza sozinha a cada mudança na frase
  $('#formulario').addEventListener('submit', (e) => e.preventDefault());
  $('#frase').addEventListener('change', () => agendar(0));
  $('#frase').addEventListener('input', (e) => { if (e.target.matches('input[type="text"]')) agendar(350); });
  $('#resultado').addEventListener('click', (e) => {
    const disc = e.target.closest('[data-ver-prereq]');
    if (disc) verPrerequisitos(disc.dataset.verPrereq, disc.dataset.estrutura);
  });
  $('#frase').addEventListener('click', (e) => {
    const botao = e.target.closest('.escolha');
    if (!botao) return;
    if (painel && painel.dataset.nome === botao.dataset.nome) fecharEscolha(false);
    else abrirEscolha(botao);
  });
  montarFrase();
}

// ---------------------------------------------------------------------
// Aba "Horas complementares": tabela da resolução do curso, com busca
// ---------------------------------------------------------------------
const UNIDADE_COMP = { mes: '/mês', item: '' };
function valorAtividade(item) {
  if (item.por === 'total') return 'carga do curso';
  if (item.por === 'dobro') return '2× a carga';
  if (item.por === 'metade') return '½ da carga';
  return `${item.chi} h${UNIDADE_COMP[item.por]}`;
}

function htmlAtividade(item, grupo) {
  const busca = semAcento(`${grupo.titulo} ${item.d} ${(item.niveis || []).map((n) => n[0]).join(' ')}`);
  const niveis = item.niveis
    ? `<span class="comp-niveis">${item.niveis.map(([rotulo, h]) => `<span>${esc(rotulo)} <b>${h} h</b></span>`).join('')}</span>`
    : '';
  return `<li class="comp-item" data-busca="${esc(busca)}">
    <span class="comp-desc">${esc(item.d)}${niveis}</span>
    <span class="comp-lado">
      ${item.niveis ? '' : `<b class="comp-valor">${valorAtividade(item)}</b>`}
      <span class="comp-teto">máx. ${item.teto} h</span>
    </span>
  </li>`;
}

function mostrarComplementares() {
  const grupos = window.ATIVIDADES_COMPLEMENTARES || [];
  const det = (opcoes.detalhes || {})[[...(opcoes.estruturas || [])].sort().reverse()[0]];
  $('#frase').textContent = 'O que conta como hora complementar?';
  $('#erroForm').textContent = '';
  $('#extra').innerHTML = `
    <label class="comp-busca">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>
      <input type="search" id="buscaComp" placeholder="Procure: monitoria, estágio, hackathon…" autocomplete="off" aria-label="Procurar atividade">
    </label>`;
  $('#resultado').innerHTML = `
    <section class="complementares">
      <p class="comp-resumo">${det ? `Você precisa de <b>${det.horas_complementares} h</b>. ` : ''}Cada atividade vale um número de horas e tem um máximo no curso.</p>
      ${grupos.map((g) => {
        return `
        <details class="comp-grupo">
          <summary>
            <span class="comp-titulo">${esc(g.titulo)}</span>
            <span class="comp-conta">${plural(g.itens.length, 'atividade', 'atividades')}</span>
            <svg class="comp-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
          </summary>
          <ul class="comp-lista">${g.itens.map((item) => htmlAtividade(item, g)).join('')}</ul>
        </details>`;
      }).join('')}
      <p class="comp-vazio" hidden>Nenhuma atividade encontrada.</p>
      <p class="comp-fonte">Resolução nº 01/2019 do Colegiado do Curso (alterada pela nº 01/2021).
        Na dúvida, vale o texto oficial nos <a href="https://sigaa.ufrn.br/sigaa/public/curso/documentos.jsf?lc=pt_BR&amp;id=94598200&amp;idTipo=3" target="_blank" rel="noopener">documentos do curso no SIGAA</a>.</p>
    </section>`;

  const cartoes = [...document.querySelectorAll('.comp-grupo')];
  let abertosAntes = null;   // lembra o que estava aberto antes de buscar
  $('#buscaComp').addEventListener('input', (e) => {
    const termos = semAcento(e.target.value.trim()).split(/\s+/).filter(Boolean);
    if (termos.length && !abertosAntes) abertosAntes = cartoes.map((c) => c.open);
    let algum = false;
    cartoes.forEach((cartao, i) => {
      let visiveis = 0;
      cartao.querySelectorAll('.comp-item').forEach((li) => {
        const ok = termos.every((t) => li.dataset.busca.includes(t));
        li.hidden = !ok;
        if (ok) visiveis++;
      });
      cartao.hidden = visiveis === 0;
      if (termos.length) cartao.open = visiveis > 0;
      else if (abertosAntes) cartao.open = abertosAntes[i];
      if (visiveis) algum = true;
    });
    if (!termos.length) abertosAntes = null;
    document.querySelector('.comp-vazio').hidden = algum;
  });
}

// abre uma aba como se o botão dela tivesse sido clicado
function irParaAba(id) {
  document.querySelector(`#tipos .tipo[data-tipo="${id}"]`)?.click();
}

// ---------------------------------------------------------------------
// Aba "Sugestões": formulário enviado ao servidor e guardado no banco
// ---------------------------------------------------------------------
const TIPOS_SUGESTAO = [
  ['SUGESTAO', 'Sugestão de melhoria'],
  ['ERRO_DADOS', 'Erro nos dados da grade'],
  ['OUTRO', 'Outro assunto'],
];

function mostrarSugestoes() {
  $('#frase').textContent = 'Tem uma ideia ou encontrou um erro na grade? Conte pra gente.';
  $('#extra').innerHTML = '';
  $('#erroForm').textContent = '';
  $('#resultado').innerHTML = `
    <section class="resposta-visual sugestoes">
      <form id="formSugestao" novalidate>
        <fieldset class="sug-tipos">
          <legend>Sobre o quê?</legend>
          ${TIPOS_SUGESTAO.map(([valor, rotulo], i) => `
            <label class="sug-tipo"><input type="radio" name="tipo" value="${valor}" ${i === 0 ? 'checked' : ''}><span>${rotulo}</span></label>`).join('')}
        </fieldset>
        <label class="sug-campo">
          <span>Mensagem</span>
          <textarea name="mensagem" rows="6" maxlength="2000" required
            placeholder="Ex.: seria útil mostrar os horários das turmas; ou: o pré-requisito de Programação Web está diferente do SIGAA."></textarea>
          <small class="sug-contador" id="contadorSugestao">0 / 2000</small>
        </label>
        <div class="sug-linha">
          <label class="sug-campo"><span>Nome <em>(opcional)</em></span>
            <input type="text" name="nome" maxlength="80" autocomplete="name"></label>
          <label class="sug-campo"><span>E-mail <em>(opcional, se quiser resposta)</em></span>
            <input type="email" name="email" maxlength="120" autocomplete="email"></label>
        </div>
        <input class="sug-isca" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="sug-aviso">Não coloque CPF, matrícula ou outros dados pessoais na mensagem.
          Saiba como tratamos o que você envia na <a href="privacidade.html">Política de Privacidade</a>.</p>
        <div class="sug-acoes">
          <button type="submit" class="sug-enviar">Enviar sugestão</button>
          <p class="sug-status" id="statusSugestao" role="status"></p>
        </div>
      </form>
    </section>`;
  const form = $('#formSugestao');
  const mensagem = form.elements.mensagem;
  mensagem.addEventListener('input', () => {
    $('#contadorSugestao').textContent = `${mensagem.value.length} / 2000`;
  });
  form.addEventListener('submit', enviarSugestao);
}

async function enviarSugestao(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const status = $('#statusSugestao');
  const botao = form.querySelector('.sug-enviar');
  const dados = Object.fromEntries(new FormData(form));
  status.className = 'sug-status';
  if ((dados.mensagem || '').trim().length < 10) {
    status.classList.add('erro');
    status.textContent = 'Escreva pelo menos 10 caracteres na mensagem.';
    form.elements.mensagem.focus();
    return;
  }
  botao.disabled = true;
  botao.textContent = 'Enviando…';
  try {
    const r = await fetch('/api/sugestoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(corpo.erro || 'Não foi possível enviar agora.');
    $('#resultado').innerHTML = `
      <section class="resposta-visual sugestoes sug-obrigado">
        <h2>Mensagem enviada. Obrigado!</h2>
        <p>Vamos ler com atenção${dados.email ? ' e, se for o caso, responder no e-mail que você informou' : ''}.</p>
        <button type="button" class="sug-enviar" id="novaSugestao">Enviar outra</button>
      </section>`;
    $('#novaSugestao').addEventListener('click', mostrarSugestoes);
  } catch (erro) {
    status.classList.add('erro');
    status.textContent = erro.message;
    botao.disabled = false;
    botao.textContent = 'Enviar sugestão';
  }
}

// ---------------------------------------------------------------------
// A frase com lacunas
// ---------------------------------------------------------------------
const consultaAtual = () => consultas.find((c) => c.id === tipoAtual);

function montarFrase() {
  const c = consultaAtual();
  const campos = Object.fromEntries(c.campos.map((f) => [f.nome, f]));
  $('#frase').innerHTML = FRASES[c.id].map((parte) => {
    const m = parte.match(/^\{(\w+)\}$/);
    return m ? htmlLacuna(campos[m[1]]) : esc(parte);
  }).join(' ').replace(/ ([.?,])/g, '$1');

  const temConcluidas = c.campos.some((f) => f.tipo === 'concluidas');
  $('#extra').innerHTML = temConcluidas ? `
    <div class="historico" id="zonaHistorico">
      <div class="historico-texto">
        <strong>Tem o histórico do SIGAA?</strong>
        <span>Envie o PDF e as disciplinas aprovadas são marcadas sozinhas. O arquivo é lido no seu navegador e não é enviado para nenhum servidor.</span>
      </div>
      <label class="historico-botao">Importar histórico (PDF)
        <input type="file" id="arquivoHistorico" accept="application/pdf,.pdf"></label>
    </div>
    <p class="historico-aviso" id="avisoHistorico" role="status"></p>
    <div class="concluidas">
      <div class="concluidas-topo">
        <span><strong id="qtdConcluidas">Nenhuma marcada</strong>. Toque nas que você já concluiu; o que elas exigem é marcado junto.</span>
        <button type="button" class="link" id="limparConcluidas">Limpar</button>
      </div>
      <div class="etiquetas" id="etiquetas"></div>
    </div>` : '';
  $('#erroForm').textContent = '';

  $('#frase [name="estrutura"]')?.addEventListener('change', atualizarDependentes);
  const arquivo = $('#arquivoHistorico');
  if (arquivo) {
    arquivo.addEventListener('change', () => arquivo.files[0] && importarHistorico(arquivo.files[0]));
    const zona = $('#zonaHistorico');
    ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('arrastando'); }));
    ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('arrastando'); }));
    zona.addEventListener('drop', (e) => e.dataTransfer.files[0] && importarHistorico(e.dataTransfer.files[0]));
  }
  atualizarDependentes();
  // "O que posso cursar" é calculado na própria página; as demais perguntas vão ao banco
  if (consultaAtual().id !== 'disponiveis') agendar(0);
}

// ---------------------------------------------------------------------
// Lacunas da frase. As de escolha usam um seletor próprio (botão + painel),
// no lugar do <select> nativo, para seguir o visual da página e mostrar
// o texto inteiro.
// ---------------------------------------------------------------------
const nomeGrade = (e) => `TADS ${anoDa(e)}`;

function htmlLacuna(campo) {
  if (['estrutura', 'componente', 'filtro'].includes(campo.tipo)) {
    const rotulos = { estrutura: 'Grade', componente: 'Disciplina', filtro: 'Quais disciplinas mostrar' };
    return `<span class="lacuna"><button type="button" class="escolha" data-nome="${campo.nome}"
        aria-haspopup="listbox" aria-expanded="false" aria-label="${rotulos[campo.tipo]}">
        <span class="escolha-texto"></span></button><input type="hidden" name="${campo.nome}"></span>`;
  }
  return `<span class="lacuna texto"><input type="text" name="${campo.nome}" placeholder="${esc(campo.exemplo || '...')}"
    aria-label="${esc(campo.rotulo)}" autocomplete="off" spellcheck="false"></span>`;
}

// Opções de cada lacuna: rotulo (na lista), detalhe (linha menor) e naFrase (no botão)
const escolhas = {};

function opcoesDoCampo(campo, estrutura) {
  if (campo.tipo === 'estrutura') {
    const grades = [...opcoes.estruturas].sort().reverse().map((e) => ({
      valor: e,
      rotulo: nomeGrade(e),
      detalhe: `Estrutura curricular de ${anoDa(e)}`,
      naFrase: campo.obrigatorio ? nomeGrade(e) : `na grade ${nomeGrade(e)}`,
    }));
    return campo.obrigatorio ? grades : [
      { valor: '', rotulo: 'Todas as grades', detalhe: 'TADS 2015 e TADS 2019', naFrase: 'em todas as grades' },
      ...grades,
    ];
  }
  if (campo.tipo === 'filtro') {
    return [
      { valor: 'todos', rotulo: 'Todas as disciplinas', detalhe: 'A grade inteira', naFrase: 'todas as disciplinas' },
      { valor: 'com', rotulo: 'Só as que têm pré-requisito', detalhe: 'Exigem outra disciplina antes', naFrase: 'só as que têm pré-requisito' },
      { valor: 'sem', rotulo: 'Só as sem pré-requisito', detalhe: 'Podem ser cursadas a qualquer momento', naFrase: 'só as sem pré-requisito' },
    ];
  }
  return componentesDaGrade(estrutura).map((c) => ({
    valor: c.codigo, rotulo: bonito(c.nome), detalhe: c.codigo, naFrase: bonito(c.nome),
  }));
}

function definirOpcoes(nome, lista, padrao) {
  escolhas[nome] = lista;
  const input = $(`#frase input[name="${nome}"]`);
  if (!input) return;
  const manter = input.dataset.definido && lista.some((o) => o.valor === input.value);
  const valor = manter ? input.value : lista.some((o) => o.valor === padrao) ? padrao : (lista[0]?.valor ?? '');
  aplicarEscolha(nome, valor, false);
}

function aplicarEscolha(nome, valor, avisar = true) {
  const input = $(`#frase input[name="${nome}"]`);
  const botao = $(`#frase .escolha[data-nome="${nome}"]`);
  const opcao = escolhas[nome].find((o) => o.valor === valor);
  input.value = valor;
  input.dataset.definido = '1';
  botao.querySelector('.escolha-texto').textContent = opcao ? opcao.naFrase : '';
  if (avisar) input.dispatchEvent(new Event('change', { bubbles: true }));
}

// ---------- o painel que abre ao clicar numa lacuna ----------
let painel = null;
const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function abrirEscolha(botao) {
  fecharEscolha(false);
  const nome = botao.dataset.nome;
  const lista = escolhas[nome] || [];
  const atual = $(`#frase input[name="${nome}"]`).value;
  const comBusca = lista.length > 8;

  painel = document.createElement('div');
  painel.className = 'escolha-painel';
  painel.dataset.nome = nome;
  painel.innerHTML = `
    ${comBusca ? '<input type="search" class="escolha-busca" placeholder="Digite para filtrar" aria-label="Filtrar opções" autocomplete="off">' : ''}
    <ul class="escolha-lista" role="listbox" tabindex="-1" aria-label="${esc(botao.getAttribute('aria-label'))}"></ul>`;
  document.body.appendChild(painel);

  const ul = painel.querySelector('ul');
  const busca = painel.querySelector('.escolha-busca');
  let visiveis = lista;
  let ativo = Math.max(lista.findIndex((o) => o.valor === atual), 0);

  const desenhar = () => {
    ul.innerHTML = visiveis.length
      ? visiveis.map((o, i) => `
        <li role="option" id="opcao-${i}" data-indice="${i}" aria-selected="${o.valor === atual}" class="${i === ativo ? 'ativo' : ''}">
          <span class="opcao-rotulo">${esc(o.rotulo)}</span>
          <span class="opcao-detalhe">${esc(o.detalhe)}</span>
        </li>`).join('')
      : '<li class="opcao-vazia">Nada encontrado com esse nome</li>';
    ul.setAttribute('aria-activedescendant', visiveis.length ? `opcao-${ativo}` : '');
    ul.querySelector('.ativo')?.scrollIntoView({ block: 'nearest' });
  };
  const escolher = (i) => {
    const o = visiveis[i];
    if (!o) return;
    fecharEscolha();
    aplicarEscolha(nome, o.valor);
  };

  busca?.addEventListener('input', () => {
    const termo = semAcento(busca.value.trim());
    visiveis = lista.filter((o) => semAcento(`${o.rotulo} ${o.detalhe}`).includes(termo));
    ativo = 0;
    desenhar();
  });
  ul.addEventListener('mousedown', (e) => e.preventDefault());
  ul.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-indice]');
    if (li) escolher(Number(li.dataset.indice));
  });
  ul.addEventListener('mousemove', (e) => {
    const li = e.target.closest('li[data-indice]');
    if (li && Number(li.dataset.indice) !== ativo) { ativo = Number(li.dataset.indice); desenhar(); }
  });
  painel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); ativo = Math.min(ativo + 1, visiveis.length - 1); desenhar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ativo = Math.max(ativo - 1, 0); desenhar(); }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(ativo); }
    else if (e.key === 'Escape') { e.preventDefault(); fecharEscolha(); }
    else if (e.key === 'Tab') { fecharEscolha(false); }
  });

  // no celular: folha que sobe de baixo, sem abrir o teclado de cara
  if (ehCelular()) {
    painel.classList.add('folha');
    botao.setAttribute('aria-expanded', 'true');
    desenhar();
    ul.focus();
    return;
  }
  // no computador: logo abaixo da lacuna, sem sair da tela
  const r = botao.getBoundingClientRect();
  const largura = Math.min(Math.max(r.width, 340), window.innerWidth - 16);
  painel.style.width = `${largura}px`;
  painel.style.left = `${Math.min(Math.max(r.left, 8), window.innerWidth - largura - 8) + window.scrollX}px`;
  painel.style.top = `${r.bottom + window.scrollY + 8}px`;

  botao.setAttribute('aria-expanded', 'true');
  desenhar();
  (busca || ul).focus();
}

function fecharEscolha(devolverFoco = true) {
  if (!painel) return;
  const botao = $(`#frase .escolha[data-nome="${painel.dataset.nome}"]`);
  painel.remove();
  painel = null;
  if (botao) {
    botao.setAttribute('aria-expanded', 'false');
    if (devolverFoco) botao.focus();
  }
}

document.addEventListener('mousedown', (e) => {
  if (painel && !painel.contains(e.target) && !e.target.closest('.escolha')) fecharEscolha(false);
});
window.addEventListener('resize', () => fecharEscolha(false));

function componentesDaGrade(estrutura) {
  if (estrutura) return opcoes.componentes[estrutura] || [];
  const todas = new Map();
  Object.values(opcoes.componentes).flat().forEach((c) => todas.set(c.codigo, c));
  return [...todas.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
}

// Cabeçalho: optativas e atividades complementares da grade em uso (1 crédito = 15 h na UFRN)
function atualizarCabecalho(estrutura) {
  const det = (opcoes.detalhes || {})[estrutura || [...opcoes.estruturas].sort().reverse()[0]];
  if (!det) return;
  $('#nomeCurso').textContent = `${det.curso}, ${det.instituicao}`;
  $('#cargas').innerHTML = `
    <button type="button" class="carga carga-link" data-ir="grade" data-ancora="resultado" title="Ver a grade completa">
      <b>${det.creditos_obrigatorios} créditos</b> obrigatórios <i>${det.creditos_obrigatorios * 15} h</i></button>
    <button type="button" class="carga carga-link" data-ir="grade" data-ancora="secao-optativas" title="Ver as optativas da grade">
      <b>${det.credito_optativas} créditos</b> optativos <i>${det.credito_optativas * 15} h</i></button>
    <button type="button" class="carga carga-link" data-ir="complementares" title="Ver o que conta como hora complementar">
      <b>${det.horas_complementares} h</b> complementares</button>
    <span class="carga-grade">${esc(nomeGrade(det.codigo))}</span>`;
}

function atualizarDependentes() {
  const campos = consultaAtual().campos;
  const campoEstrutura = campos.find((f) => f.tipo === 'estrutura');
  if (campoEstrutura) {
    const maisNova = [...opcoes.estruturas].sort().reverse()[0] || '';
    const comecaNaMaisNova = campoEstrutura.obrigatorio || tipoAtual === 'libera';
    definirOpcoes('estrutura', opcoesDoCampo(campoEstrutura), comecaNaMaisNova ? maisNova : '');
  }
  const estrutura = $('#frase input[name="estrutura"]')?.value || '';
  atualizarCabecalho(estrutura);

  for (const campo of campos) {
    if (campo.tipo === 'componente') {
      definirOpcoes(campo.nome, opcoesDoCampo(campo, estrutura), tipoAtual === 'libera' ? 'TAD0009' : 'TAD0156');
    }
    if (campo.tipo === 'filtro') definirOpcoes(campo.nome, opcoesDoCampo(campo), 'todos');
  }

  const caixa = $('#etiquetas');
  if (caixa) desenharTrilha(caixa, estrutura);
}

// ---------------------------------------------------------------------
// Importar o histórico do SIGAA (PDF), lido aqui no navegador
// ---------------------------------------------------------------------
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';
const APROVADO = ['APR', 'APRN', 'TRANS', 'DISP', 'INCORP', 'CUMP'];
const SITUACOES = 'APRN|APR|TRANS|DISP|INCORP|CUMP|REPMF|REPNF|REPF|REPN|REP|MATR|TRANC|CANC|REC';
let historico = null;      // resultado da última importação
let trilhaAtual = null;    // funções da linha do tempo em uso

function carregarPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = `${PDFJS}/pdf.min.js`;
    s.onload = () => {
      const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.js`;
      window.pdfjsLib = lib;
      ok(lib);
    };
    s.onerror = () => falha(new Error('Não foi possível carregar o leitor de PDF. Verifique a internet.'));
    document.head.appendChild(s);
  });
}

// junta os pedaços de texto do PDF em linhas, pela posição vertical
function agruparLinhas(itens) {
  const ordenados = itens.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas = [];
  for (const it of ordenados) {
    const linha = linhas.find((l) => Math.abs(l.y - it.y) < 3.5);
    if (linha) linha.itens.push(it); else linhas.push({ y: it.y, itens: [it] });
  }
  return linhas.map((l) => l.itens.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).join(' ').replace(/\s+/g, ' '));
}

function analisarHistorico(linhas) {
  const texto = linhas.join('\n');
  const curriculo = texto.match(/Curr[ií]culo:?\s*\d+\s*-\s*(\d{4})/i);
  const nome = texto.match(/Nome:\s*([A-ZÀ-Ü][A-ZÀ-Ü ]+?)(?:\s+Matr|\s+Data|\s*$)/m);
  const registros = {};
  // uma linha de disciplina tem o código e termina com a situação (APR, MATR, REP...)
  const reLinha = new RegExp(`\\b([A-Z]{3}\\d{4})\\b.*\\b(${SITUACOES})\\s*$`);
  for (const l of linhas) {
    const m = l.match(reLinha);
    if (!m) continue;
    const periodo = (l.match(/^(\d{4}\.\d)\b/) || [])[1] || null;
    (registros[m[1]] ||= []).push({ situacao: m[2], periodo });
  }
  const aprovados = [], matriculados = [];
  for (const [codigo, regs] of Object.entries(registros)) {
    if (regs.some((r) => APROVADO.includes(r.situacao))) aprovados.push(codigo);
    else if (regs.some((r) => r.situacao === 'MATR')) matriculados.push(codigo);
  }
  const periodoMatr = Object.values(registros).flat().filter((r) => r.situacao === 'MATR')
    .map((r) => r.periodo).filter(Boolean).sort().pop() || null;
  return {
    ehTads: /AN[ÁA]LISE E DESENVOLVIMENTO DE SISTEMAS/i.test(texto),
    anoCurriculo: curriculo ? curriculo[1] : null,
    primeiroNome: nome ? bonito(nome[1].trim().split(' ')[0]) : null,
    aprovados, matriculados, periodoMatr,
  };
}

async function importarHistorico(arquivo) {
  const aviso = $('#avisoHistorico');
  aviso.className = 'historico-aviso';
  aviso.textContent = 'Lendo o histórico…';
  try {
    if (!/\.pdf$/i.test(arquivo.name)) throw new Error('Envie o arquivo em PDF, do jeito que o SIGAA gera.');
    const lib = await carregarPdfJs();
    const pdf = await lib.getDocument({ data: await arquivo.arrayBuffer() }).promise;
    let linhas = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const conteudo = await (await pdf.getPage(p)).getTextContent();
      linhas = linhas.concat(agruparLinhas(conteudo.items.map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] }))));
    }
    const r = analisarHistorico(linhas);
    if (r.aprovados.length + r.matriculados.length === 0) {
      throw new Error('Não encontrei disciplinas nesse PDF. Confira se é o histórico escolar emitido pelo SIGAA.');
    }
    const estrutura = opcoes.estruturas.find((e) => anoDa(e) === r.anoCurriculo);
    historico = { ...r, estrutura, contarMatriculadas: false };
    if (estrutura && $('#frase input[name="estrutura"]').value !== estrutura) aplicarEscolha('estrutura', estrutura);
    else aplicarHistorico();
  } catch (e) {
    historico = null;
    aviso.className = 'historico-aviso erro';
    aviso.textContent = e.message || 'Não consegui ler esse arquivo.';
  }
}

// marca na linha do tempo o que o histórico diz que foi concluído
function aplicarHistorico() {
  if (!historico || !trilhaAtual) return;
  const estrutura = $('#frase input[name="estrutura"]')?.value;
  const naGrade = new Set([...(opcoes.componentes[estrutura] || []), ...((opcoes.optativas || {})[estrutura] || [])].map((c) => c.codigo));
  const concluidas = [...historico.aprovados, ...(historico.contarMatriculadas ? historico.matriculados : [])];
  trilhaAtual.marcar(concluidas.filter((c) => naGrade.has(c)));

  const aprovadasNaGrade = historico.aprovados.filter((c) => naGrade.has(c)).length;
  const matrNaGrade = historico.matriculados.filter((c) => naGrade.has(c));
  const fora = [...historico.aprovados, ...historico.matriculados].filter((c) => !naGrade.has(c)).length;
  const aviso = $('#avisoHistorico');
  aviso.className = 'historico-aviso ok';
  aviso.innerHTML = `
    <span>Histórico${historico.primeiroNome ? ` de <strong>${esc(historico.primeiroNome)}</strong>` : ''} importado:
      <strong>${plural(aprovadasNaGrade, 'disciplina aprovada', 'disciplinas aprovadas')}</strong> da grade ${esc(nomeGrade(estrutura))}${
      matrNaGrade.length ? ` e <strong>${plural(matrNaGrade.length, 'matrícula', 'matrículas')}</strong>${historico.periodoMatr ? ` em ${historico.periodoMatr}` : ''}` : ''}.${
      fora ? ` ${plural(fora, 'componente fora da grade foi ignorado', 'componentes fora da grade foram ignorados')}.` : ''}${
      !historico.ehTads ? ' Atenção: esse histórico não parece ser do TADS.' : ''}${
      historico.anoCurriculo && !historico.estrutura ? ` O currículo ${historico.anoCurriculo} não está cadastrado; usei a grade escolhida.` : ''}</span>
    ${matrNaGrade.length ? `<label class="historico-opcao"><input type="checkbox" id="contarMatr" ${historico.contarMatriculadas ? 'checked' : ''}>
      Contar as matriculadas como concluídas, para planejar o próximo semestre</label>` : ''}`;
  $('#contarMatr')?.addEventListener('change', (e) => { historico.contarMatriculadas = e.target.checked; aplicarHistorico(); });
}

// resposta de "O que posso cursar", calculada aqui mesmo, sem consultar os bancos
function mostrarDisponiveis(estrutura, feitas) {
  const dados = (opcoes.componentes[estrutura] || [])
    .filter((c) => !feitas.has(c.codigo) && prerequisitosNaGrade(estrutura, c.codigo).every((g) => g.some((a) => feitas.has(a))))
    .map((c) => ({ codigo: c.codigo, nome: c.nome, creditos: Number(c.creditos) || 0 }));
  const html = feitas.size === 0
    ? '<p class="resumo">Marque as disciplinas que você já concluiu, ou importe o seu histórico, e a resposta aparece aqui.</p>'
    : desenharResposta('disponiveis', dados, { estrutura, concluidas: [...feitas] });
  $('#resultado').innerHTML = `<section class="resposta-visual" aria-label="Resposta">${html}</section>`;
}

// ---------------------------------------------------------------------
// "O que posso cursar": disciplinas em etapas, pela ordem dos pré-requisitos
// ---------------------------------------------------------------------
function etapasDaGrade(estrutura) {
  const lista = opcoes.componentes[estrutura] || [];
  const naGrade = new Set(lista.map((c) => c.codigo));
  const memo = {};
  const etapa = (codigo, caminho = new Set()) => {
    if (memo[codigo]) return memo[codigo];
    if (caminho.has(codigo)) return 1;
    const grupos = prerequisitosNaGrade(estrutura, codigo);
    // com alternativas (OU), vale a mais cedo; com várias exigências (E), vale a mais tardia
    const e = grupos.length === 0 ? 1 : 1 + Math.max(...grupos.map((g) =>
      Math.min(...g.map((alt) => (naGrade.has(alt) ? etapa(alt, new Set([...caminho, codigo])) : 0)))));
    return (memo[codigo] = e);
  };
  return lista.map((c) => ({ ...c, etapa: etapa(c.codigo) }));
}

function htmlOptativasTrilha(estrutura) {
  const lista = (opcoes.optativas || {})[estrutura] || [];
  if (!lista.length) return '';
  return `
    <section class="etapa etapa-opt">
      <div class="etapa-marco" aria-hidden="true"><span>+</span></div>
      <div class="etapa-corpo">
        <h4>Optativas <small id="horasOptativas"></small></h4>
        <div class="etapa-itens">
          ${lista.map((c) => `
            <label class="etiqueta etiqueta-opt" data-codigo="${c.codigo}" data-horas="${horasDe(c.creditos)}">
              <input type="checkbox" name="concluidas" value="${c.codigo}">
              <span><code>${c.codigo}</code><b>${esc(bonito(c.nome))}</b><em class="estado"></em></span>
            </label>`).join('')}
        </div>
      </div>
    </section>`;
}

function desenharTrilha(caixa, estrutura) {
  const porPeriodo = (opcoes.componentes[estrutura] || []).every((c) => c.periodo);
  const itens = porPeriodo
    ? (opcoes.componentes[estrutura] || []).map((c) => ({ ...c, etapa: Number(c.periodo) }))
    : etapasDaGrade(estrutura);
  const total = Math.max(1, ...itens.map((c) => c.etapa));
  const creditosDa = (n) => itens.filter((c) => c.etapa === n).reduce((s, c) => s + (Number(c.creditos) || 0), 0);
  const titulo = (n) => (porPeriodo ? `${n}º período` : `Etapa ${n}`);
  const legenda = (n) => (porPeriodo ? plural(creditosDa(n), 'crédito', 'créditos')
    : n === 1 ? 'Não exigem nada antes' : `Dependem da etapa ${n - 1}`);

  caixa.className = 'trilha';
  caixa.innerHTML = Array.from({ length: total }, (_, i) => i + 1).map((n) => `
    <section class="etapa">
      <div class="etapa-marco" aria-hidden="true"><span>${n}</span></div>
      <div class="etapa-corpo">
        <h4>${titulo(n)} <small>${legenda(n)}</small></h4>
        <div class="etapa-itens">
          ${itens.filter((c) => c.etapa === n).sort((a, b) => a.codigo.localeCompare(b.codigo)).map((c) => `
            <label class="etiqueta" data-codigo="${c.codigo}">
              <input type="checkbox" name="concluidas" value="${c.codigo}">
              <span><code>${c.codigo}</code><b>${esc(bonito(c.nome))}</b><em class="estado"></em></span>
            </label>`).join('')}
        </div>
      </div>
    </section>`).join('') + htmlOptativasTrilha(estrutura);

  const marcadas = () => new Set([...caixa.querySelectorAll('input:checked')].map((i) => i.value));
  const satisfeita = (codigo, feitas) =>
    prerequisitosNaGrade(estrutura, codigo).every((g) => g.some((alt) => feitas.has(alt)));
  const caixaDe = (codigo) => caixa.querySelector(`input[value="${codigo}"]`);

  // marcar uma disciplina marca o que ela exige (quando não há alternativa)
  const marcarExigidas = (codigo) => {
    prerequisitosNaGrade(estrutura, codigo).forEach((g) => {
      const feitas = marcadas();
      if (g.some((alt) => feitas.has(alt))) return;
      const exigida = caixaDe(g[0]);
      if (g.length === 1 && exigida && !exigida.checked) { exigida.checked = true; marcarExigidas(g[0]); }
    });
  };
  // desmarcar uma disciplina desmarca o que deixou de ser possível
  const desmarcarDependentes = () => {
    let mudou = true;
    while (mudou) {
      mudou = false;
      const feitas = marcadas();
      feitas.forEach((c) => {
        if (!satisfeita(c, feitas)) { caixaDe(c).checked = false; mudou = true; }
      });
    }
  };

  const atualizar = () => {
    const feitas = marcadas();
    caixa.querySelectorAll('.etiqueta:not(.etiqueta-opt)').forEach((el) => {
      const c = el.dataset.codigo;
      const grupos = prerequisitosNaGrade(estrutura, c);
      const feita = feitas.has(c);
      const livre = satisfeita(c, feitas);
      el.classList.toggle('concluida', feita);
      el.classList.toggle('liberada', !feita && livre);
      el.classList.toggle('bloqueada', !feita && !livre);
      const faltam = grupos.filter((g) => !g.some((alt) => feitas.has(alt)))
        .map((g) => g.map((alt) => bonito(nomeDe(alt))).join(' ou '));
      el.querySelector('.estado').textContent = feita ? 'Concluída' : !livre ? 'Bloqueada' : 'Liberada';
      el.title = !feita && !livre ? `Falta: ${faltam.join('; ')}` : '';
    });
    // optativas: sem pré-requisitos cadastrados, só contam as horas
    let horasOpt = 0;
    caixa.querySelectorAll('.etiqueta-opt').forEach((el) => {
      const feita = feitas.has(el.dataset.codigo);
      const livre = satisfeita(el.dataset.codigo, feitas);
      el.classList.toggle('concluida', feita);
      el.classList.toggle('bloqueada', !feita && !livre);
      el.querySelector('.estado').textContent = feita ? 'Concluída' : !livre ? 'Bloqueada' : '';
      el.title = !feita && !livre ? `Requer: ${textoRequisitos((((opcoes.optativas || {})[estrutura] || []).find((o) => o.codigo === el.dataset.codigo) || {}).prerequisitos)}` : '';
      if (feita) horasOpt += Number(el.dataset.horas);
    });
    const minimoOpt = ((opcoes.detalhes || {})[estrutura]?.credito_optativas || 0) * 15;
    const marcadorOpt = caixa.querySelector('#horasOptativas');
    if (marcadorOpt) {
      marcadorOpt.textContent = minimoOpt ? `${horasOpt} de ${minimoOpt} h${horasOpt >= minimoOpt ? ' ✓' : ''}` : `${horasOpt} h`;
      marcadorOpt.classList.toggle('completo', minimoOpt > 0 && horasOpt >= minimoOpt);
    }
    const n = feitas.size;
    $('#qtdConcluidas').textContent = n === 0 ? 'Nenhuma marcada' : n === 1 ? '1 disciplina marcada' : `${n} disciplinas marcadas`;
    mostrarDisponiveis(estrutura, feitas);
  };

  caixa.onchange = (e) => {
    if (e.target.checked) marcarExigidas(e.target.value);
    else desmarcarDependentes();
    atualizar();
  };
  $('#limparConcluidas').onclick = () => {
    caixa.querySelectorAll('input').forEach((i) => (i.checked = false));
    historico = null;
    $('#avisoHistorico').className = 'historico-aviso';
    $('#avisoHistorico').textContent = '';
    atualizar();
  };
  trilhaAtual = {
    marcar(codigos) {
      const lista = new Set(codigos);
      caixa.querySelectorAll('input').forEach((i) => (i.checked = lista.has(i.value)));
      atualizar();
    },
  };
  atualizar();
  aplicarHistorico();
}

function lerParametros() {
  const p = {};
  for (const campo of consultaAtual().campos) {
    if (campo.tipo === 'concluidas') {
      p.concluidas = [...document.querySelectorAll('#etiquetas input:checked')].map((i) => i.value);
    } else {
      p[campo.nome] = $(`#frase [name="${campo.nome}"]`)?.value ?? '';
    }
  }
  return p;
}

// ---------------------------------------------------------------------
// Execução e resposta
// ---------------------------------------------------------------------
// agenda a consulta (com espera curta enquanto a pessoa digita)
let espera = null;
let pedido = 0;
function agendar(ms) {
  clearTimeout(espera);
  espera = setTimeout(executar, ms);
}

async function executar() {
  if (!consultaAtual() || consultaAtual().id === 'disponiveis') return;
  const meu = ++pedido;
  ultimoContexto = lerParametros();
  $('#erroForm').textContent = '';
  $('#resultado').classList.add('carregando');
  try {
    const resposta = await fetch('/api/consulta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: tipoAtual, parametros: ultimoContexto }),
    });
    const corpo = await resposta.json();
    if (meu !== pedido) return;            // chegou uma resposta mais nova
    if (!resposta.ok) { $('#erroForm').textContent = corpo.erro; return; }
    mostrar(corpo.dados);
  } catch {
    if (meu === pedido) $('#erroForm').textContent = 'O servidor não respondeu. Tente de novo em alguns segundos.';
  } finally {
    if (meu === pedido) $('#resultado').classList.remove('carregando');
  }
}

function mostrar(dados) {
  fecharDetalhe();
  cadeiasNaTela = [];
  mapasNaTela = [];
  $('#resultado').innerHTML = `<section class="resposta-visual" aria-label="Resposta">
    ${desenharResposta(tipoAtual, dados, ultimoContexto)}</section>`;
  prepararLigacoes();
  prepararMapas();
  if (ancoraPendente) {
    const alvo = document.getElementById(ancoraPendente);
    ancoraPendente = null;
    if (alvo?.tagName === 'DETAILS') alvo.open = true;
    alvo?.scrollIntoView({ behavior: semAnimacao() ? 'auto' : 'smooth', block: 'start' });
  }
}

// ---------------------------------------------------------------------
// Cadeia completa de pré-requisitos (expande até a base)
// ---------------------------------------------------------------------
function prerequisitosNaGrade(estrutura, codigo) {
  const c = [...(opcoes.componentes[estrutura] || []), ...((opcoes.optativas || {})[estrutura] || [])]
    .find((x) => x.codigo === codigo);
  return lerGrupos(c?.prerequisitos);
}

function montarCadeia(alvo, estrutura, gruposDiretos) {
  const nos = new Map();
  const arestas = new Map();
  const ligar = (de, para, nivel) => arestas.set(`${de}>${para}`, { de, para, nivel });
  const visitar = (codigo, nivel, elemento, caminho) => {
    const grupos = codigo === alvo ? gruposDiretos : prerequisitosNaGrade(estrutura, codigo);
    grupos.forEach((g, gi) => {
      if (g.length === 1) {
        const c = g[0];
        if (caminho.has(c)) return;
        const id = `n-${c}`;
        const no = nos.get(id) || { id, tipo: 'disc', codigo: c, nivel: 0 };
        no.nivel = Math.max(no.nivel, nivel + 1);
        nos.set(id, no);
        ligar(id, elemento, nivel + 1);
        visitar(c, nivel + 1, id, new Set([...caminho, c]));
      } else {
        const id = `g-${codigo}-${gi}`;
        const no = nos.get(id) || { id, tipo: 'grupo', codigos: g, nivel: 0 };
        no.nivel = Math.max(no.nivel, nivel + 1);
        nos.set(id, no);
        ligar(id, elemento, nivel + 1);
        g.forEach((alt) => { if (!caminho.has(alt)) visitar(alt, nivel + 1, `${id}-${alt}`, new Set([...caminho, alt])); });
      }
    });
  };
  visitar(alvo, 0, 'alvo', new Set([alvo]));
  const lista = [...nos.values()];
  const codigos = new Set(lista.flatMap((n) => (n.tipo === 'disc' ? [n.codigo] : n.codigos)));
  const niveis = Math.max(0, ...lista.map((n) => n.nivel));
  // o pulso sai da disciplina escolhida (direita) e vai até a base (esquerda), nível a nível
  const listaArestas = [...arestas.values()].map((a) => ({ ...a, ordem: a.nivel - 1 }));
  return { nos: lista, arestas: listaArestas, niveis, total: codigos.size, inverso: true };
}

function htmlNo(codigo, estrutura, id, classe = '') {
  return `<button type="button" class="no ${classe}" data-no="${id}" data-ver-prereq="${esc(codigo)}" data-estrutura="${esc(estrutura)}"
      title="Ver os pré-requisitos de ${esc(bonito(nomeDe(codigo)))}">
      <code class="chip-cod">${esc(codigo)}</code><span class="no-nome">${esc(bonito(nomeDe(codigo)))}</span></button>`;
}

function desenharCadeia(ctx, dados) {
  const alvo = ctx.codigo;
  const nomeAlvo = bonito(nomeDe(alvo));
  const diretos = dados.map((l) => l.exigencia.split(' OU '));
  const cadeia = montarCadeia(alvo, ctx.estrutura, diretos);
  const idCadeia = registrarCadeia(cadeia);

  const obrig = diretos.filter((g) => g.length === 1).length;
  const partes = [];
  if (obrig) partes.push(`<strong>${plural(obrig, 'disciplina obrigatória', 'disciplinas obrigatórias')}</strong>`);
  diretos.filter((g) => g.length > 1).forEach((g) => partes.push(`<strong>uma entre ${g.length} alternativas</strong>`));

  let resumo;
  if (diretos.length === 0) {
    resumo = `<strong>${esc(nomeAlvo)}</strong> não tem pré-requisito na grade ${nomeGrade(ctx.estrutura)}. Dá para cursar a qualquer momento.`;
  } else {
    resumo = `Para fazer <strong>${esc(nomeAlvo)}</strong> na grade ${nomeGrade(ctx.estrutura)}, você precisa ter cursado ${partes.join(' e ')}.`;
    resumo += cadeia.niveis > 1
      ? ` Contando os pré-requisitos dos pré-requisitos, a cadeia envolve <strong>${plural(cadeia.total, 'disciplina', 'disciplinas')}</strong> em <strong>${cadeia.niveis} etapas</strong>.`
      : ' Nenhuma delas exige outra disciplina antes.';
  }

  const colunas = [];
  for (let n = cadeia.niveis; n >= 1; n--) {
    const doNivel = cadeia.nos.filter((x) => x.nivel === n)
      .sort((a, b) => (a.codigo || a.codigos[0]).localeCompare(b.codigo || b.codigos[0]));
    const rotulo = n === 1 ? 'Exigidas diretamente' : n === cadeia.niveis ? 'Base da cadeia' : 'Antes disso';
    colunas.push(`<div class="coluna"><span class="coluna-rotulo">${rotulo}</span><div class="coluna-nos">
      ${doNivel.map((x) => x.tipo === 'disc'
        ? htmlNo(x.codigo, ctx.estrutura, x.id)
        : `<div class="no-grupo" data-no="${x.id}"><span class="no-grupo-rotulo">Basta uma</span>
            ${x.codigos.map((c) => htmlNo(c, ctx.estrutura, `${x.id}-${c}`, 'no-mini')).join('<span class="ou">ou</span>')}</div>`
      ).join('')}</div></div>`);
  }
  colunas.push(`<div class="coluna coluna-alvo"><span class="coluna-rotulo">Sua escolha</span><div class="coluna-nos">
    <div class="no no-alvo" data-no="alvo"><code class="chip-cod">${esc(alvo)}</code><span class="no-nome">${esc(nomeAlvo)}</span></div>
  </div></div>`);

  return `<p class="resumo">${resumo}</p>
    <div class="cadeia"><div class="cadeia-palco cadeia-requer" data-cadeia="${idCadeia}">
      <svg class="ligacoes" aria-hidden="true"></svg>
      ${diretos.length ? colunas.join('') : colunas[colunas.length - 1]}
    </div></div>
    ${diretos.length ? '<p class="dica-clique">Toque numa disciplina para ver a cadeia dela.</p>' : ''}`;
}

// ---------------------------------------------------------------------
// "Grade completa": mapa por período, com fios entre as disciplinas.
// Passar o mouse enche de azul os fios do que a disciplina libera;
// clicar segue o fluxo pelos níveis seguintes.
// ---------------------------------------------------------------------
let mapasNaTela = [];

function desenharGradeFluxo(ctx, dados) {
  const comReq = dados.filter((l) => l.prerequisitos !== '—').length;
  const filtro = { com: 'com pré-requisito', sem: 'sem pré-requisito' }[ctx.filtro] || '';
  if (dados.length === 0) return '<p class="resumo">Nenhuma disciplina com esse filtro.</p>';

  const semPeriodo = dados.some((l) => !l.periodo);
  const periodos = [...new Set(dados.map((l) => l.periodo || 0))].sort((a, b) => a - b);
  const colunas = Math.max(...periodos.map((p) => dados.filter((l) => (l.periodo || 0) === p).length));
  const mostradas = new Set(dados.map((l) => l.codigo));
  const arestas = [];
  dados.forEach((l) => lerGrupos(l.prerequisitos).forEach((g) => g.forEach((alt) => {
    if (mostradas.has(alt)) arestas.push({ de: alt, para: l.codigo, alt: g.length > 1 });
  })));
  const id = mapasNaTela.push({ arestas }) - 1;

  const resumo = `A grade ${nomeGrade(ctx.estrutura)} tem <strong>${plural(dados.length, `disciplina ${filtro}`.trim(), `disciplinas ${filtro}`.trim())}</strong>`
    + (semPeriodo ? '' : ` em <strong>${plural(periodos.length, 'período', 'períodos')}</strong>`)
    + `, somando <strong>${plural(somaCreditos(dados), 'crédito', 'créditos')}</strong>`
    + (ctx.filtro === 'todos' ? `. ${comReq} delas exigem alguma disciplina antes.` : '.');

  const linhas = periodos.map((p) => {
    const doPeriodo = dados.filter((l) => (l.periodo || 0) === p).sort((a, b) => a.codigo.localeCompare(b.codigo));
    return `<div class="mapa-periodo" data-periodo="${p}">
      <div class="mapa-rotulo">${p ? `<b>${p}º</b><span>período</span>` : '<span>sem período</span>'}<small>${plural(somaCreditos(doPeriodo), 'crédito', 'créditos')}</small></div>
      <div class="mapa-linha">${doPeriodo.map((l) => `
        <button type="button" class="mapa-disc" data-cod="${esc(l.codigo)}" title="${esc(bonito(l.nome))}">
          <code class="chip-cod">${esc(l.codigo)}</code>
          <span class="mapa-nome">${esc(bonito(l.nome))}</span>
          <span class="mapa-cred">${horasDe(l.creditos)} h · até ${limiteFaltas(l.creditos)} faltas</span>
        </button>`).join('')}</div>
    </div>`;
  }).join('');

  return `<p class="resumo">${resumo}</p>
    ${semPeriodo ? '<p class="aviso-fonte">Os períodos ainda não estão no banco. Rode o script de períodos para organizar a grade por semestre.</p>' : ''}
    <ul class="dica-mapa" aria-label="Como usar o mapa">
      <li><span class="dica-ponto azul"></span><b>1 clique</b> o que libera</li>
      <li><span class="dica-ponto verde"></span><b>2 cliques</b> pré-requisitos</li>
      <li><b>3 cliques</b> solta</li>
    </ul>
    <div class="mapa-rolagem"><div class="mapa" data-mapa="${id}" data-estrutura="${esc(ctx.estrutura)}" style="--colunas:${colunas}">
      <svg class="mapa-fios" aria-hidden="true"><g class="fios-base"></g><g class="fios-ativos"></g></svg>
      ${linhas}
    </div></div>
    ${(ctx.filtro || 'todos') === 'todos' ? htmlOptativas(ctx.estrutura) : ''}`;
}

// optativas criadas depois do PPC: o pré-requisito delas não está no banco
const OPTATIVAS_FORA_DO_PPC = new Set([
  'CCA0405', 'CCA0406', 'CCA0407', 'CCA0408', 'TAD0066', 'TAD0067',
  'TAD0068', 'TAD0069', 'TAD0070', 'TAD0072', 'TAD0473',
]);

// 'TAD0103 E (TAD0009 OU TAD0102)' -> 'Banco de Dados e Programação… ou Algoritmos…'
function textoRequisitos(texto) {
  return lerGrupos(texto).map((g) => g.map((c) => bonito(nomeDe(c))).join(' ou ')).join(' e ');
}

// optativas da grade: barra fechada embaixo do mapa; ao abrir, lista simples
// em dois grupos (do curso e de outros departamentos)
function htmlOptativas(estrutura) {
  const lista = (opcoes.optativas || {})[estrutura] || [];
  if (!lista.length) return '';
  const det = (opcoes.detalhes || {})[estrutura];
  const minimo = det ? det.credito_optativas * 15 : null;
  const grupos = [
    ['Do curso', lista.filter((o) => o.codigo.startsWith('TAD'))],
    ['De outros departamentos', lista.filter((o) => !o.codigo.startsWith('TAD'))],
  ].filter(([, itens]) => itens.length);
  const semInformacao = lista.some((o) => OPTATIVAS_FORA_DO_PPC.has(o.codigo));
  return `
    <details class="optativas" id="secao-optativas">
      <summary>
        <span class="opt-titulo">Optativas</span>
        <span class="opt-meta">${minimo ? `${minimo} h exigidas · ` : ''}${plural(lista.length, 'opção', 'opções')}</span>
        <svg class="comp-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </summary>
      <div class="opt-corpo">
        <p class="opt-nota">Pré-requisitos conforme o PPC do curso.${semInformacao ? ' <span class="opt-asterisco">*</span> Criada depois do PPC: confira o pré-requisito no SIGAA.' : ''}</p>
        ${grupos.map(([titulo, itens]) => `
          <h4 class="opt-grupo">${titulo}</h4>
          <ul class="opt-lista">${itens.map((o) => {
            const req = textoRequisitos(o.prerequisitos);
            const asterisco = OPTATIVAS_FORA_DO_PPC.has(o.codigo) ? ' <span class="opt-asterisco" title="Criada depois do PPC: confira o pré-requisito no SIGAA">*</span>' : '';
            return `<li><span class="opt-nome">${esc(bonito(o.nome))}${asterisco}${req ? `<small class="opt-req">requer ${esc(req)}</small>` : ''}</span><span class="opt-horas">${horasDe(o.creditos)} h</span></li>`;
          }).join('')}</ul>`).join('')}
      </div>
    </details>`;
}

// caminho com cantos arredondados passando pelos pontos dados
function caminhoArredondado(pontos, raio = 9) {
  let d = `M ${pontos[0][0]} ${pontos[0][1]}`;
  for (let i = 1; i < pontos.length - 1; i++) {
    const [ax, ay] = pontos[i - 1]; const [bx, by] = pontos[i]; const [cx, cy] = pontos[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay); const l2 = Math.hypot(cx - bx, cy - by);
    if (l1 < 0.5 || l2 < 0.5) continue;
    const r = Math.min(raio, l1 / 2, l2 / 2);
    const p1 = [bx - ((bx - ax) / l1) * r, by - ((by - ay) / l1) * r];
    const p2 = [bx + ((cx - bx) / l2) * r, by + ((cy - by) / l2) * r];
    d += ` L ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Q ${bx.toFixed(1)} ${by.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const ultimo = pontos[pontos.length - 1];
  return `${d} L ${ultimo[0].toFixed(1)} ${ultimo[1].toFixed(1)}`;
}

// desenha os fios pelos corredores entre os cartões, como no diagrama da grade
function desenharFios(mapa) {
  // um mapa que já saiu da tela não é redesenhado (os dados agora são de outro mapa)
  if (!mapa.isConnected) { mapa._observador?.disconnect(); return; }
  const dadosMapa = mapasNaTela[Number(mapa.dataset.mapa)];
  if (!dadosMapa) return;
  // mede o mapa sem o SVG: com o tamanho antigo, ele mesmo segurava o mapa
  // largo depois de girar a tela ou encolher a janela
  const svg = mapa.querySelector('.mapa-fios');
  const larguraAntes = svg.getAttribute('width');
  const alturaAntes = svg.getAttribute('height');
  svg.setAttribute('width', 0);
  svg.setAttribute('height', 0);
  const largura = mapa.scrollWidth;
  const altura = mapa.scrollHeight;
  // só redesenha quando o tamanho muda de verdade
  const chave = `${mapa.clientWidth}x${largura}x${altura}`;
  if (mapa._chave === chave) {
    svg.setAttribute('width', larguraAntes);
    svg.setAttribute('height', alturaAntes);
    return;
  }
  mapa._chave = chave;
  const base = mapa.getBoundingClientRect();
  svg.setAttribute('width', largura);
  svg.setAttribute('height', altura);
  const rel = (r) => ({ l: r.left - base.left, r: r.right - base.left, t: r.top - base.top, b: r.bottom - base.top, w: r.width });
  const linhas = [...mapa.querySelectorAll('.mapa-periodo')].map((el) => rel(el.getBoundingClientRect()));
  const cartao = {};
  mapa.querySelectorAll('.mapa-disc').forEach((el) => {
    const linha = [...mapa.querySelectorAll('.mapa-periodo')].indexOf(el.closest('.mapa-periodo'));
    cartao[el.dataset.cod] = { ...rel(el.getBoundingClientRect()), linha };
  });
  const estiloLinha = getComputedStyle(mapa.querySelector('.mapa-linha'));
  const vaoColuna = parseFloat(estiloLinha.columnGap) || 24;
  const vaoLinha = parseFloat(estiloLinha.rowGap) || 12;
  // centro de cada período (no celular, os fios descem pelo corredor entre as duas colunas)
  const centros = [...mapa.querySelectorAll('.mapa-linha')].map((el) => {
    const r = el.getBoundingClientRect();
    return (r.left + r.right) / 2 - base.left;
  });
  const celular = ehCelular();
  const corredor = (i) => (linhas[i].b + linhas[i + 1].t) / 2;   // espaço entre o período i e o seguinte

  // espalha os pontos de saída e de chegada em cada cartão
  const saidas = {}; const chegadas = {};
  dadosMapa.arestas.forEach((a) => { (saidas[a.de] ||= []).push(a); (chegadas[a.para] ||= []).push(a); });
  Object.values(saidas).forEach((l) => l.sort((x, y) => cartao[x.para].l - cartao[y.para].l));
  Object.values(chegadas).forEach((l) => l.sort((x, y) => cartao[x.de].l - cartao[y.de].l));

  const fios = dadosMapa.arestas.map((a, n) => {
    const s = cartao[a.de]; const t = cartao[a.para];
    if (!s || !t || t.linha <= s.linha) return '';
    const iS = saidas[a.de].indexOf(a); const iT = chegadas[a.para].indexOf(a);
    const sx = s.l + (s.w * (iS + 1)) / (saidas[a.de].length + 1);
    const tx = t.l + (t.w * (iT + 1)) / (chegadas[a.para].length + 1);
    const desvio = ((n % 5) - 2) * 3;                    // evita fios exatamente sobrepostos
    const y1 = corredor(s.linha) + desvio;
    let pontos;
    if (celular) {
      // celular: sai por baixo do cartão, anda pelo vão até o corredor central,
      // desce por ele (sem passar por trás de outros cartões) e entra por cima do destino
      const d2 = ((n % 5) - 2) * 2;
      const corredorS = centros[s.linha] + d2;
      const corredorT = centros[t.linha] + d2;
      const yS = s.b + vaoLinha / 2;
      const yT = t.t - vaoLinha / 2;
      pontos = [[sx, s.b], [sx, yS], [corredorS, yS], [corredorS, y1], [corredorT, y1], [corredorT, yT], [tx, yT], [tx, t.t]];
    } else if (t.linha === s.linha + 1) {
      pontos = [[sx, s.b], [sx, y1], [tx, y1], [tx, t.t]];
    } else {
      const y2 = corredor(t.linha - 1) + desvio;
      const cx = Math.max(t.l - vaoColuna / 2 + desvio, 3);   // desce pelo vão à esquerda do cartão de destino
      pontos = [[sx, s.b], [sx, y1], [cx, y1], [cx, y2], [tx, y2], [tx, t.t]];
    }
    a.d = caminhoArredondado(pontos);
    a.dInverso = caminhoArredondado([...pontos].reverse());   // para o fluxo de pré-requisitos
    return `<path class="fio ${a.alt ? 'alt' : ''}" d="${a.d}"/>`;
  }).join('');
  svg.querySelector('.fios-base').innerHTML = fios;
  // se havia um fluxo aceso, refaz com os fios nas posições novas
  if (mapa._fonte) ativarFluxo(mapa, mapa._fonte, mapa._cascata, true, mapa._sentido);
}

function limparFluxo(mapa) {
  (mapa._timers || []).forEach(clearTimeout);
  mapa._timers = [];
  mapa._fonte = null;
  mapa.classList.remove('focando', 'modo-requer');
  mapa.querySelector('.fios-ativos').innerHTML = '';
  mapa.querySelectorAll('.fonte-ativa, .alcancado, .emissor').forEach((el) => {
    el.classList.remove('fonte-ativa', 'alcancado', 'emissor');
    el.style.removeProperty('--tom');
  });
}

// enche os fios de azul a partir da disciplina; com "cascata", segue nível a nível
// sentido "libera": azul, da disciplina para o que ela libera (para baixo)
// sentido "requer": verde, da disciplina para os pré-requisitos dela (para cima)
function ativarFluxo(mapa, codigo, cascata, refazer = false, sentido = 'libera') {
  const dadosMapa = mapasNaTela[Number(mapa.dataset.mapa)];
  if (!dadosMapa) return;
  if (!refazer && mapa._fonte === codigo && !cascata) return;
  if (!refazer && mapa._fonte === codigo && cascata && mapa._cascata) return;
  limparFluxo(mapa);
  mapa._fonte = codigo;
  mapa._cascata = cascata;
  mapa._sentido = sentido;
  const inverso = sentido === 'requer';
  mapa.classList.add('focando');
  if (inverso) mapa.classList.add('modo-requer');
  mapa.querySelector(`.mapa-disc[data-cod="${codigo}"]`)?.classList.add('fonte-ativa');

  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = reduzir ? 0 : 650;
  const TONS = 6;
  const ativos = mapa.querySelector('.fios-ativos');
  const cartaoDe = (c) => mapa.querySelector(`.mapa-disc[data-cod="${c}"]`);
  // cada disciplina que solta fios ganha o próximo tom de azul da sequência
  let proximoTom = 0;
  const tomDe = {};
  const paleta = inverso ? 'verde' : 'tom';
  const tomPara = (c) => (tomDe[c] ??= `var(--${paleta}-${(proximoTom++ % TONS) + 1})`);
  // no sentido inverso, o fio sai da disciplina que exige e chega no pré-requisito
  const origem = (a) => (inverso ? a.para : a.de);
  const destino = (a) => (inverso ? a.de : a.para);
  const caminho = (a) => (inverso ? a.dInverso : a.d);

  const visitados = new Set([codigo]);
  let fronteira = [codigo];
  let nivel = 0;
  while (fronteira.length) {
    const arestas = dadosMapa.arestas
      .filter((a) => fronteira.includes(origem(a)) && a.d)
      .sort((x, y) => fronteira.indexOf(origem(x)) - fronteira.indexOf(origem(y)));
    if (!arestas.length) break;
    const atraso = nivel * DUR;
    // o cartão que solta fios passa a ter a borda na cor dos fios dele
    [...new Set(arestas.map(origem))].forEach((emissor) => {
      const tom = tomPara(emissor);
      if (emissor !== codigo) {
        mapa._timers.push(setTimeout(() => {
          const el = cartaoDe(emissor);
          if (el) { el.style.setProperty('--tom', tom); el.classList.add('emissor'); }
        }, atraso));
      }
    });
    arestas.forEach((a) => {
      const tom = tomPara(origem(a));
      // o brilho é um halo (traço largo e translúcido) por baixo do fio:
      // bem mais leve que filter: drop-shadow, que travava a animação no celular
      ['fio-carga halo', 'fio-carga'].forEach((classe) => {
        const carga = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        carga.setAttribute('d', caminho(a));
        carga.setAttribute('pathLength', '100');
        carga.setAttribute('class', `${classe} ${a.alt ? 'alt' : ''}`);
        carga.style.setProperty('--tom', tom);
        carga.style.animationDelay = `${atraso}ms`;
        ativos.appendChild(carga);
      });
      mapa._timers.push(setTimeout(() => {
        const alvo = cartaoDe(destino(a));
        if (alvo) {
          if (!alvo.classList.contains('alcancado') && !alvo.classList.contains('emissor')) alvo.style.setProperty('--tom', tom);
          alvo.classList.add('alcancado');
        }
        if (reduzir) return;
        ['fio-pulso halo', 'fio-pulso'].forEach((classe) => {
          const pulso = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pulso.setAttribute('d', caminho(a));
          pulso.setAttribute('pathLength', '100');
          pulso.setAttribute('class', classe);
          pulso.style.setProperty('--tom', tom);
          ativos.appendChild(pulso);
        });
      }, atraso + DUR));
    });
    if (!cascata) break;
    fronteira = [...new Set(arestas.map(destino))].filter((c) => !visitados.has(c));
    fronteira.forEach((c) => visitados.add(c));
    nivel++;
  }
}

function prepararMapas() {
  document.querySelectorAll('.mapa[data-mapa]').forEach((mapa) => {
    const desenhar = () => desenharFios(mapa);
    requestAnimationFrame(desenhar);
    document.fonts?.ready.then(desenhar);
    mapa._observador = new ResizeObserver(desenhar);
    mapa._observador.observe(mapa);
    // sem nada fixado, o hover mostra o que a disciplina libera
    const aoPassar = (e) => {
      if (mapa._fixo) return;
      const disc = e.target.closest('.mapa-disc');
      if (disc) ativarFluxo(mapa, disc.dataset.cod, false);
    };
    mapa.addEventListener('pointerover', aoPassar);
    mapa.addEventListener('focusin', aoPassar);
    // clique fixa o fluxo completo; clique em outra troca; clique na mesma solta
    mapa.addEventListener('click', (e) => {
      const disc = e.target.closest('.mapa-disc');
      if (!disc) {
        if (!mapa._fixo) limparFluxo(mapa);
        return;
      }
      const cod = disc.dataset.cod;
      const anterior = mapa.querySelector('.mapa-disc.fixado');
      anterior?.classList.remove('fixado');
      anterior?.removeAttribute('aria-pressed');
      anterior?.removeAttribute('data-selo');
      // mesma disciplina: do azul vai para o verde; do verde, solta
      if (mapa._fixo === cod && mapa._sentido === 'requer') {
        soltarMapa(mapa);
        return;
      }
      const sentido = mapa._fixo === cod ? 'requer' : 'libera';
      mapa._fixo = cod;
      disc.classList.add('fixado');
      disc.setAttribute('aria-pressed', 'true');
      disc.dataset.selo = sentido === 'requer' ? 'Pré-requisitos' : 'O que libera';
      ativarFluxo(mapa, cod, true, true, sentido);
      abrirDetalhe(mapa, cod, sentido);
    });
  });
}

// solta o fluxo fixado e fecha o painel de detalhes
function soltarMapa(mapa) {
  const fixado = mapa.querySelector('.mapa-disc.fixado');
  fixado?.classList.remove('fixado');
  fixado?.removeAttribute('aria-pressed');
  fixado?.removeAttribute('data-selo');
  mapa._fixo = null;
  limparFluxo(mapa);
  fecharDetalhe();
}

// ---------------------------------------------------------------------
// Painel de detalhes da disciplina (grade completa)
// ---------------------------------------------------------------------
let mapaDoDetalhe = null;

function chipsDetalhe(lista, vazio) {
  if (!lista.length) return `<p class="detalhe-vazio">${vazio}</p>`;
  return `<div class="detalhe-chips">${lista.map((g) => (g.length > 1
    ? `<div class="detalhe-ou"><span>Basta uma destas</span>${g.map((c) => chipDisc(c)).join('')}</div>`
    : chipDisc(g[0]))).join('')}</div>`;
}
function chipDisc(codigo) {
  return `<button type="button" class="detalhe-chip" data-ir="${esc(codigo)}">
    <code>${esc(codigo)}</code><span>${esc(bonito(nomeDe(codigo)))}</span></button>`;
}

function abrirDetalhe(mapa, codigo, sentido) {
  const estrutura = mapa.dataset.estrutura;
  const disc = (opcoes.componentes[estrutura] || []).find((c) => c.codigo === codigo);
  if (!disc) return;
  mapaDoDetalhe = mapa;
  const creditos = Number(disc.creditos) || 0;
  const ementa = (opcoes.ementas || {})[codigo];
  const requisitos = prerequisitosNaGrade(estrutura, codigo);
  const libera = dependentesNaGrade(estrutura, codigo).map((d) => [d.codigo]);
  const painel = $('#detalhe');
  painel.innerHTML = `
    <div class="detalhe-topo">
      <div>
        <p class="detalhe-meta"><code class="chip-cod">${esc(codigo)}</code>
          ${disc.periodo ? `${disc.periodo}º período · ` : ''}${esc(nomeGrade(estrutura))}</p>
        <h2 id="detalheTitulo">${esc(bonito(disc.nome))}</h2>
      </div>
      <button type="button" class="detalhe-fechar" aria-label="Fechar detalhes">×</button>
    </div>
    <dl class="detalhe-numeros">
      <div><dt>Créditos</dt><dd>${creditos}</dd></div>
      <div><dt>Carga horária</dt><dd>${horasDe(creditos)} h</dd></div>
      <div class="destaque"><dt>Limite de faltas</dt><dd>${limiteFaltas(creditos)}</dd></div>
    </dl>
    <div class="detalhe-linha-curta">
      <p class="detalhe-resumo"><b>${creditos}</b> créditos · <b>${horasDe(creditos)} h</b> · até <b>${limiteFaltas(creditos)}</b> faltas</p>
      <button type="button" class="detalhe-expandir" aria-expanded="false">Ver mais</button>
    </div>
    <p class="detalhe-nota">Máximo de faltas para não reprovar por frequência: a UFRN exige 75% de presença,
      com aulas de 50 minutos. Atividades de orientação, como o TCC, podem seguir regras próprias.</p>
    <section class="${sentido === 'requer' ? 'ativo-requer' : ''}">
      <h3>Pré-requisitos</h3>
      ${chipsDetalhe(requisitos, 'Nenhum. Pode ser cursada a qualquer momento.')}
    </section>
    <section class="${sentido === 'libera' ? 'ativo-libera' : ''}">
      <h3>Libera</h3>
      ${chipsDetalhe(libera, 'Nenhuma disciplina depende desta.')}
    </section>
    <section>
      <h3>Ementa</h3>
      ${ementa
        ? `${htmlEmenta(ementa)}<p class="detalhe-fonte">Fonte: Projeto Pedagógico do Curso (PPC) do TADS.</p>`
        : '<p class="detalhe-vazio">Ementa não disponível. Esta disciplina é da estrutura antiga e não consta no PPC atual.</p>'}
    </section>`;
  painel.hidden = false;
  painel.scrollTop = 0;
  painel.classList.add('recolhido');       // no celular, começa compacto
  document.body.classList.add('com-detalhe');
  if (ehCelular()) {
    const card = mapa.querySelector(`.mapa-disc[data-cod="${codigo}"]`);
    card?.scrollIntoView({ block: 'start', behavior: semAnimacao() ? 'auto' : 'smooth' });
  }
}

// A ementa do PPC é uma lista de tópicos separados por ";" ou por frases.
// Cada tópico vira um badge.
function topicosDaEmenta(texto) {
  return texto
    .split(/;\s*/)
    .flatMap((parte) => parte.split(/\.\s+(?=[A-ZÀ-Ü0-9])/))
    .map((t) => t.trim().replace(/[.;:\s]+$/, ''))
    .filter(Boolean);
}
function htmlEmenta(texto) {
  const topicos = topicosDaEmenta(texto);
  return `<p class="detalhe-contagem">${plural(topicos.length, 'tópico', 'tópicos')}</p>
    <ul class="detalhe-topicos">${topicos.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
}

function fecharDetalhe() {
  const painel = $('#detalhe');
  if (painel) painel.hidden = true;
  document.body.classList.remove('com-detalhe');
  mapaDoDetalhe = null;
}

function prepararDetalhe() {
  const painel = $('#detalhe');
  painel.addEventListener('click', (e) => {
    const expandir = e.target.closest('.detalhe-expandir');
    if (expandir) {
      const recolher = !painel.classList.contains('recolhido');
      painel.classList.toggle('recolhido', recolher);
      expandir.setAttribute('aria-expanded', String(!recolher));
      expandir.textContent = recolher ? 'Ver mais' : 'Recolher';
      painel.scrollTop = 0;
      return;
    }
    if (e.target.closest('.detalhe-fechar')) {
      if (mapaDoDetalhe) soltarMapa(mapaDoDetalhe); else fecharDetalhe();
      return;
    }
    const ir = e.target.closest('[data-ir]');
    const card = ir && mapaDoDetalhe?.querySelector(`.mapa-disc[data-cod="${ir.dataset.ir}"]`);
    if (card) {
      card.scrollIntoView({ block: ehCelular() ? 'start' : 'center', behavior: semAnimacao() ? 'auto' : 'smooth' });
      if (mapaDoDetalhe._fixo === ir.dataset.ir) return;
      card.click();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !painel.hidden) {
      if (mapaDoDetalhe) soltarMapa(mapaDoDetalhe); else fecharDetalhe();
    }
  });
}

// ---------------------------------------------------------------------
// "O que libera": fluxo para a frente, a partir da disciplina escolhida
// ---------------------------------------------------------------------
function dependentesNaGrade(estrutura, codigo) {
  return (opcoes.componentes[estrutura] || []).flatMap((c) => {
    const grupo = lerGrupos(c.prerequisitos).find((g) => g.includes(codigo));
    return grupo ? [{ codigo: c.codigo, alt: grupo.length > 1 }] : [];
  });
}

function montarLiberacao(fonte, estrutura, diretos) {
  const nos = new Map();
  const arestas = new Map();
  const visitar = (codigo, nivel, elemento, caminho) => {
    const deps = codigo === fonte ? diretos : dependentesNaGrade(estrutura, codigo);
    deps.forEach(({ codigo: c, alt }) => {
      if (caminho.has(c)) return;
      const id = `n-${c}`;
      const no = nos.get(id) || { id, codigo: c, nivel: 0, entradas: [] };
      no.nivel = Math.max(no.nivel, nivel + 1);
      no.entradas.push(alt);
      nos.set(id, no);
      arestas.set(`${elemento}>${id}`, { de: elemento, para: id, nivel: nivel + 1, alt });
      visitar(c, nivel + 1, id, new Set([...caminho, c]));
    });
  };
  visitar(fonte, 0, 'fonte', new Set([fonte]));
  const lista = [...nos.values()];
  // o pulso sai da disciplina escolhida e avança nível a nível
  const listaArestas = [...arestas.values()].map((a) => ({ ...a, ordem: nos.get(a.de)?.nivel ?? 0 }));
  return { nos: lista, arestas: listaArestas, niveis: Math.max(0, ...lista.map((n) => n.nivel)) };
}

function desenharLiberacao(ctx, dados) {
  const fonte = ctx.codigo;
  const nomeFonte = bonito(nomeDe(fonte));
  if (dados.length === 0) {
    return `<p class="resumo">Nenhuma disciplina depende de <strong>${esc(nomeFonte)}</strong> ${gradeNaFrase(ctx.estrutura)}.</p>`;
  }
  const porGrade = {};
  dados.forEach((l) => (porGrade[l.estrutura] ||= []).push({ codigo: l.codigo, alt: l.condicao !== 'Obrigatória' }));
  const grades = Object.keys(porGrade).sort().reverse();

  let totalGeral = 0;
  const blocos = grades.map((g) => {
    const cadeia = montarLiberacao(fonte, g, porGrade[g]);
    totalGeral = Math.max(totalGeral, cadeia.nos.length);
    const idCadeia = registrarCadeia(cadeia);
    const colunas = [`<div class="coluna"><span class="coluna-rotulo">Ao concluir</span><div class="coluna-nos">
      <div class="no no-fonte" data-no="fonte"><code class="chip-cod">${esc(fonte)}</code><span class="no-nome">${esc(nomeFonte)}</span></div>
    </div></div>`];
    for (let n = 1; n <= cadeia.niveis; n++) {
      const rotulo = n === 1 ? 'Libera diretamente' : n === cadeia.niveis ? 'Fim da cadeia' : 'Depois disso';
      const doNivel = cadeia.nos.filter((x) => x.nivel === n).sort((a, b) => a.codigo.localeCompare(b.codigo));
      colunas.push(`<div class="coluna"><span class="coluna-rotulo">${rotulo}</span><div class="coluna-nos">
        ${doNivel.map((x) => {
          const soOpcao = x.entradas.every(Boolean);
          return htmlNo(x.codigo, g, x.id).replace('</span></button>',
            `</span>${soOpcao ? '<span class="selo selo-alt">uma das opções</span>' : ''}</button>`);
        }).join('')}
      </div></div>`);
    }
    const diretas = porGrade[g].length;
    return `<div class="bloco-grade">
      <h3>${esc(nomeGrade(g))} <small>${plural(diretas, 'liberada diretamente', 'liberadas diretamente')}, ${plural(cadeia.nos.length, 'na cadeia toda', 'na cadeia toda')}</small></h3>
      <div class="cadeia"><div class="cadeia-palco fluxo-azul" data-cadeia="${idCadeia}">
        <svg class="ligacoes" aria-hidden="true"></svg>${colunas.join('')}
      </div></div>
    </div>`;
  }).join('');

  const diretasTotal = new Set(dados.map((l) => l.codigo)).size;
  return `<p class="resumo">Ao concluir <strong>${esc(nomeFonte)}</strong>, você libera <strong>${plural(diretasTotal, 'disciplina', 'disciplinas')}</strong> diretamente ${gradeNaFrase(ctx.estrutura)}.
      ${totalGeral > diretasTotal ? ' Seguindo a cadeia, ela abre caminho para ainda mais disciplinas depois delas.' : ''}</p>
    ${blocos}
    <p class="dica-clique">Linhas tracejadas indicam que a disciplina é uma das alternativas aceitas. Toque numa disciplina para ver a cadeia dela.</p>`;
}

// Linhas entre as disciplinas, com um pulso de luz correndo pelo fluxo
let cadeiasNaTela = [];
let observador = null;
function registrarCadeia(cadeia) {
  cadeiasNaTela.push(cadeia);
  return cadeiasNaTela.length - 1;
}
function prepararLigacoes() {
  if (observador) observador.disconnect();
  const palcos = [...document.querySelectorAll('.cadeia-palco[data-cadeia]')];
  if (palcos.length === 0) return;
  const desenhar = () => palcos.forEach((p) => desenharLigacoes(p, cadeiasNaTela[Number(p.dataset.cadeia)]));
  requestAnimationFrame(desenhar);
  document.fonts?.ready.then(desenhar);
  observador = new ResizeObserver(desenhar);
  palcos.forEach((p) => observador.observe(p));
}

function desenharLigacoes(palco, cadeia) {
  const svg = palco.querySelector('.ligacoes');
  if (!svg) return;
  const base = palco.getBoundingClientRect();
  // mede sem o SVG, para o tamanho antigo não segurar o palco largo
  svg.setAttribute('width', 0);
  svg.setAttribute('height', 0);
  const largura = palco.scrollWidth;
  const altura = palco.scrollHeight;
  svg.setAttribute('width', largura);
  svg.setAttribute('height', altura);
  svg.setAttribute('viewBox', `0 0 ${largura} ${altura}`);
  const ponto = (id) => palco.querySelector(`[data-no="${id}"]`)?.getBoundingClientRect();

  // no celular as colunas viram linhas empilhadas, e as ligações ficam verticais
  const vertical = getComputedStyle(palco).flexDirection.startsWith('column');
  const caminhos = cadeia.arestas.map((a) => {
    const r1 = ponto(a.de);
    const r2 = ponto(a.para);
    if (!r1 || !r2) return '';
    let x1, y1, x2, y2, c1, c2;
    if (vertical) {
      x1 = r1.left + r1.width / 2 - base.left;
      x2 = r2.left + r2.width / 2 - base.left;
      const deCima = r1.top < r2.top;
      y1 = (deCima ? r1.bottom : r1.top) - base.top;
      y2 = (deCima ? r2.top : r2.bottom) - base.top;
      const k = (y2 - y1) / 2;
      c1 = [x1, y1 + k];
      c2 = [x2, y2 - k];
    } else {
      x1 = r1.right - base.left + palco.scrollLeft;
      y1 = r1.top + r1.height / 2 - base.top;
      x2 = r2.left - base.left + palco.scrollLeft;
      y2 = r2.top + r2.height / 2 - base.top;
      const curva = Math.max((x2 - x1) * 0.5, 24);
      c1 = [x1 + curva, y1];
      c2 = [x2 - curva, y2];
    }
    // na cadeia de pré-requisitos o caminho começa na disciplina escolhida, para o pulso sair dela
    const d = cadeia.inverso
      ? `M ${x2} ${y2} C ${c2[0]} ${c2[1]}, ${c1[0]} ${c1[1]}, ${x1} ${y1}`
      : `M ${x1} ${y1} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${x2} ${y2}`;
    const atraso = ((a.ordem ?? 0) * 0.45).toFixed(2);
    return `<path class="lig-base ${a.alt ? 'alt' : ''}" d="${d}"/>`
      + `<path class="lig-pulso halo" d="${d}" pathLength="100" style="animation-delay:${atraso}s"/>`
      + `<path class="lig-pulso" d="${d}" pathLength="100" style="animation-delay:${atraso}s"/>`;
  }).join('');
  svg.innerHTML = caminhos;
}

// ---------------------------------------------------------------------
// A resposta desenhada para o aluno, uma forma para cada pergunta
// ---------------------------------------------------------------------
function nomeDe(codigo) {
  for (const lista of [...Object.values(opcoes.componentes), ...Object.values(opcoes.optativas || {})]) {
    const c = lista.find((x) => x.codigo === codigo);
    if (c) return c.nome;
  }
  return codigo;
}
// Carga horária e limite de faltas (UFRN: 1 crédito = 15 h; aulas de 50 min;
// presença mínima de 75%). 60 h = 72 aulas, 25% = 18 faltas -> horas x 0,3.
const horasDe = (creditos) => (Number(creditos) || 0) * 15;
const limiteFaltas = (creditos) => Math.floor(horasDe(creditos) * 0.3);

// celular: abaixo desta largura a página usa o layout de toque
const ehCelular = () => matchMedia('(max-width: 720px)').matches;
const semAnimacao = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const somaCreditos = (dados) => dados.reduce((s, l) => s + (Number(l.creditos) || 0), 0);
const gradeNaFrase = (e) => (e ? `na grade ${nomeGrade(e)}` : 'em todas as grades');

// cartão de disciplina; clicável quando dá para ver os pré-requisitos dela
function cartao({ codigo, nome, estrutura = '', extra = '', clicavel = true, classe = '' }) {
  const conteudo = `<code class="chip-cod">${esc(codigo)}</code>
    <span class="disc-nome">${esc(bonito(nome || nomeDe(codigo)))}</span>${extra}`;
  return clicavel
    ? `<button type="button" class="disc ${classe}" data-ver-prereq="${esc(codigo)}" data-estrutura="${esc(estrutura)}"
        title="Ver os pré-requisitos desta disciplina">${conteudo}</button>`
    : `<div class="disc ${classe}">${conteudo}</div>`;
}

// 'TAD0102 E (TAD0009 OU TAD0103)' -> [['TAD0102'], ['TAD0009','TAD0103']]
const lerGrupos = (texto) => (!texto || texto === '—') ? []
  : texto.split(' E ').map((g) => g.replace(/[()]/g, '').split(' OU '));

function chipsPrerequisitos(texto) {
  const grupos = lerGrupos(texto);
  if (grupos.length === 0) return '<span class="disc-livre">Sem pré-requisito</span>';
  return `<span class="disc-req"><span class="disc-req-rotulo">Precisa de</span>${grupos.map((g) =>
    g.length > 1
      ? `<span class="chip-ou">${g.map((c) => `<code title="${esc(bonito(nomeDe(c)))}">${c}</code>`).join('<i>ou</i>')}</span>`
      : `<code class="chip-req" title="${esc(bonito(nomeDe(g[0])))}">${g[0]}</code>`).join('')}</span>`;
}

function desenharResposta(tipo, dados, ctx) {
  switch (tipo) {
    case 'prerequisitos':
      return desenharCadeia(ctx, dados);

    case 'libera':
      return desenharLiberacao(ctx, dados);

    case 'buscar': {
      if (dados.length === 0) return '<p class="resumo">Nenhuma disciplina com esse código ou nome. Tente um trecho menor, como "banco" ou "TAD01".</p>';
      return `<p class="resumo"><strong>${plural(dados.length, 'disciplina encontrada', 'disciplinas encontradas')}</strong> ${gradeNaFrase(ctx.estrutura)}.</p>
        <div class="grade-cartoes">${dados.map((l) => {
          const grades = l.estruturas.split(', ');
          const optativaEm = new Set((l.optativa_em || '').split(', ').filter(Boolean));
          // obrigatória em alguma grade: o clique mostra os pré-requisitos dela
          const obrigatoriaEm = grades.filter((g) => !optativaEm.has(g) && (!ctx.estrutura || g === ctx.estrutura));
          return cartao({
            codigo: l.codigo, nome: l.nome, estrutura: obrigatoriaEm[obrigatoriaEm.length - 1] || '',
            clicavel: obrigatoriaEm.length > 0,
            extra: `<span class="disc-rodape"><span class="disc-cred">${plural(l.creditos, 'crédito', 'créditos')}</span>
              ${grades.map((g) => `<span class="selo selo-grade">${esc(nomeGrade(g))}${optativaEm.has(g) ? ' · optativa' : ''}</span>`).join('')}</span>`,
          });
        }).join('')}</div>`;
    }

    case 'grade':
      return desenharGradeFluxo(ctx, dados);

    case 'disponiveis': {
      const marcadas = ctx.concluidas?.length || 0;
      if (dados.length === 0) return '<p class="resumo">Nenhuma disciplina nova fica liberada com essas marcadas.</p>';
      return `<p class="resumo">Com ${plural(marcadas, 'disciplina concluída', 'disciplinas concluídas')}, você já pode cursar <strong>${plural(dados.length, 'disciplina', 'disciplinas')}</strong> da grade ${nomeGrade(ctx.estrutura)}, somando <strong>${plural(somaCreditos(dados), 'crédito', 'créditos')}</strong>.</p>
        <div class="grade-cartoes">${dados.map((l) => cartao({
          codigo: l.codigo, nome: l.nome, estrutura: ctx.estrutura,
          extra: `<span class="disc-cred">${plural(l.creditos, 'crédito', 'créditos')}</span>`,
        })).join('')}</div>`;
    }
    default:
      return '';
  }
}

// Clicar numa disciplina abre a pergunta de pré-requisitos dela
async function verPrerequisitos(codigo, estrutura) {
  fecharEscolha(false);
  tipoAtual = 'prerequisitos';
  document.querySelectorAll('.tipo').forEach((b) => b.setAttribute('aria-selected', b.dataset.tipo === tipoAtual));
  montarFrase();
  if (estrutura && opcoes.estruturas.includes(estrutura)) aplicarEscolha('estrutura', estrutura);
  if ((escolhas.codigo || []).some((o) => o.valor === codigo)) aplicarEscolha('codigo', codigo, false);
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  executar();
}

iniciar();
