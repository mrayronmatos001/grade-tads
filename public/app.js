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
};

let consultas = [];
let opcoes = { estruturas: [], componentes: {} };
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
async function iniciar() {
  try {
    consultas = await (await fetch('/api/consultas')).json();
    const r = await fetch('/api/opcoes');
    if (!r.ok) throw new Error((await r.json()).erro);
    opcoes = await r.json();
  } catch (e) {
    $('#resultado').innerHTML = `<p class="vazio erro">${esc(e.message || 'Não foi possível carregar a grade.')} Tente recarregar a página em alguns segundos.</p>`;
    if (!consultas.length) return;
  }

  $('#tipos').innerHTML = consultas.map((c) => `
    <button type="button" class="tipo" role="tab" data-tipo="${c.id}" title="${esc(c.descricao)}"
      aria-selected="${c.id === tipoAtual}">${esc(ROTULOS_CURTOS[c.id] || c.titulo)}</button>`).join('');
  $('#tipos').addEventListener('click', (e) => {
    const botao = e.target.closest('.tipo');
    if (!botao) return;
    fecharEscolha(false);
    tipoAtual = botao.dataset.tipo;
    document.querySelectorAll('.tipo').forEach((b) => b.setAttribute('aria-selected', b === botao));
    montarFrase();
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

  // posição: logo abaixo da lacuna, sem sair da tela
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
    <span class="carga" title="Créditos de disciplinas optativas exigidos na grade ${esc(nomeGrade(det.codigo))}">
      <b>${det.credito_optativas} créditos</b> optativos <i>${det.credito_optativas * 15} h</i></span>
    <span class="carga" title="Horas de atividades complementares exigidas na grade ${esc(nomeGrade(det.codigo))}">
      <b>${det.horas_complementares} h</b> complementares</span>
    <span class="carga-grade">${esc(nomeGrade(det.codigo))}</span>`;
}

function atualizarDependentes() {
  const campos = consultaAtual().campos;
  const campoEstrutura = campos.find((f) => f.tipo === 'estrutura');
  if (campoEstrutura) {
    const maisNova = [...opcoes.estruturas].sort().reverse()[0] || '';
    definirOpcoes('estrutura', opcoesDoCampo(campoEstrutura), campoEstrutura.obrigatorio ? maisNova : '');
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
  const naGrade = new Set((opcoes.componentes[estrutura] || []).map((c) => c.codigo));
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
      fora ? ` ${plural(fora, 'componente fora da grade foi ignorado', 'componentes fora da grade foram ignorados')} (optativas).` : ''}${
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
    </section>`).join('');

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
    caixa.querySelectorAll('.etiqueta').forEach((el) => {
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
  cadeiasNaTela = [];
  mapasNaTela = [];
  $('#resultado').innerHTML = `<section class="resposta-visual" aria-label="Resposta">
    ${desenharResposta(tipoAtual, dados, ultimoContexto)}</section>`;
  prepararLigacoes();
  prepararMapas();
}

// ---------------------------------------------------------------------
// Cadeia completa de pré-requisitos (expande até a base)
// ---------------------------------------------------------------------
function prerequisitosNaGrade(estrutura, codigo) {
  const c = (opcoes.componentes[estrutura] || []).find((x) => x.codigo === codigo);
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
  const listaArestas = [...arestas.values()].map((a) => ({ ...a, ordem: niveis - a.nivel }));
  return { nos: lista, arestas: listaArestas, niveis, total: codigos.size };
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
    <div class="cadeia"><div class="cadeia-palco" data-cadeia="${idCadeia}">
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
          <span class="mapa-cred">${plural(l.creditos, 'crédito', 'créditos')}</span>
        </button>`).join('')}</div>
    </div>`;
  }).join('');

  return `<p class="resumo">${resumo}</p>
    ${semPeriodo ? '<p class="aviso-fonte">Os períodos ainda não estão no banco. Rode o script de períodos para organizar a grade por semestre.</p>' : ''}
    <div class="mapa-rolagem"><div class="mapa" data-mapa="${id}" style="--colunas:${colunas}">
      <svg class="mapa-fios" aria-hidden="true"><g class="fios-base"></g><g class="fios-ativos"></g></svg>
      ${linhas}
    </div></div>
    <p class="dica-clique">Passe o mouse sobre uma disciplina para ver o que ela libera. Clique para fixar o fluxo completo; clique de novo na mesma disciplina para soltar.</p>`;
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
  const dadosMapa = mapasNaTela[Number(mapa.dataset.mapa)];
  if (!dadosMapa) return;
  // só redesenha quando o tamanho muda de verdade
  const chave = `${mapa.clientWidth}x${mapa.scrollHeight}`;
  if (mapa._chave === chave) return;
  mapa._chave = chave;
  const svg = mapa.querySelector('.mapa-fios');
  const base = mapa.getBoundingClientRect();
  svg.setAttribute('width', mapa.scrollWidth);
  svg.setAttribute('height', mapa.scrollHeight);
  const rel = (r) => ({ l: r.left - base.left, r: r.right - base.left, t: r.top - base.top, b: r.bottom - base.top, w: r.width });
  const linhas = [...mapa.querySelectorAll('.mapa-periodo')].map((el) => rel(el.getBoundingClientRect()));
  const cartao = {};
  mapa.querySelectorAll('.mapa-disc').forEach((el) => {
    const linha = [...mapa.querySelectorAll('.mapa-periodo')].indexOf(el.closest('.mapa-periodo'));
    cartao[el.dataset.cod] = { ...rel(el.getBoundingClientRect()), linha };
  });
  const vaoColuna = parseFloat(getComputedStyle(mapa.querySelector('.mapa-linha')).columnGap) || 24;
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
    if (t.linha === s.linha + 1) {
      pontos = [[sx, s.b], [sx, y1], [tx, y1], [tx, t.t]];
    } else {
      const y2 = corredor(t.linha - 1) + desvio;
      const cx = t.l - vaoColuna / 2 + desvio;           // desce pelo vão à esquerda do cartão de destino
      pontos = [[sx, s.b], [sx, y1], [cx, y1], [cx, y2], [tx, y2], [tx, t.t]];
    }
    a.d = caminhoArredondado(pontos);
    return `<path class="fio ${a.alt ? 'alt' : ''}" d="${a.d}"/>`;
  }).join('');
  svg.querySelector('.fios-base').innerHTML = fios;
  // se havia um fluxo aceso, refaz com os fios nas posições novas
  if (mapa._fonte) ativarFluxo(mapa, mapa._fonte, mapa._cascata, true);
}

function limparFluxo(mapa) {
  (mapa._timers || []).forEach(clearTimeout);
  mapa._timers = [];
  mapa._fonte = null;
  mapa.classList.remove('focando');
  mapa.querySelector('.fios-ativos').innerHTML = '';
  mapa.querySelectorAll('.fonte-ativa, .alcancado, .emissor').forEach((el) => {
    el.classList.remove('fonte-ativa', 'alcancado', 'emissor');
    el.style.removeProperty('--tom');
  });
}

// enche os fios de azul a partir da disciplina; com "cascata", segue nível a nível
function ativarFluxo(mapa, codigo, cascata, refazer = false) {
  const dadosMapa = mapasNaTela[Number(mapa.dataset.mapa)];
  if (!dadosMapa) return;
  if (!refazer && mapa._fonte === codigo && !cascata) return;
  if (!refazer && mapa._fonte === codigo && cascata && mapa._cascata) return;
  limparFluxo(mapa);
  mapa._fonte = codigo;
  mapa._cascata = cascata;
  mapa.classList.add('focando');
  mapa.querySelector(`.mapa-disc[data-cod="${codigo}"]`)?.classList.add('fonte-ativa');

  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = reduzir ? 0 : 650;
  const TONS = 6;
  const ativos = mapa.querySelector('.fios-ativos');
  const cartaoDe = (c) => mapa.querySelector(`.mapa-disc[data-cod="${c}"]`);
  // cada disciplina que solta fios ganha o próximo tom de azul da sequência
  let proximoTom = 0;
  const tomDe = {};
  const tomPara = (c) => (tomDe[c] ??= `var(--tom-${(proximoTom++ % TONS) + 1})`);

  const visitados = new Set([codigo]);
  let fronteira = [codigo];
  let nivel = 0;
  while (fronteira.length) {
    const arestas = dadosMapa.arestas
      .filter((a) => fronteira.includes(a.de) && a.d)
      .sort((x, y) => fronteira.indexOf(x.de) - fronteira.indexOf(y.de));
    if (!arestas.length) break;
    const atraso = nivel * DUR;
    // o cartão que solta fios passa a ter a borda na cor dos fios dele
    [...new Set(arestas.map((a) => a.de))].forEach((emissor) => {
      const tom = tomPara(emissor);
      if (emissor !== codigo) {
        mapa._timers.push(setTimeout(() => {
          const el = cartaoDe(emissor);
          if (el) { el.style.setProperty('--tom', tom); el.classList.add('emissor'); }
        }, atraso));
      }
    });
    arestas.forEach((a) => {
      const tom = tomPara(a.de);
      const carga = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      carga.setAttribute('d', a.d);
      carga.setAttribute('pathLength', '100');
      carga.setAttribute('class', `fio-carga ${a.alt ? 'alt' : ''}`);
      carga.style.setProperty('--tom', tom);
      carga.style.animationDelay = `${atraso}ms`;
      ativos.appendChild(carga);
      mapa._timers.push(setTimeout(() => {
        const alvo = cartaoDe(a.para);
        if (alvo) {
          if (!alvo.classList.contains('alcancado') && !alvo.classList.contains('emissor')) alvo.style.setProperty('--tom', tom);
          alvo.classList.add('alcancado');
        }
        if (reduzir) return;
        const pulso = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pulso.setAttribute('d', a.d);
        pulso.setAttribute('pathLength', '100');
        pulso.setAttribute('class', 'fio-pulso');
        pulso.style.setProperty('--tom', tom);
        ativos.appendChild(pulso);
      }, atraso + DUR));
    });
    if (!cascata) break;
    fronteira = [...new Set(arestas.map((a) => a.para))].filter((c) => !visitados.has(c));
    fronteira.forEach((c) => visitados.add(c));
    nivel++;
  }
}

function prepararMapas() {
  document.querySelectorAll('.mapa[data-mapa]').forEach((mapa) => {
    const desenhar = () => desenharFios(mapa);
    requestAnimationFrame(desenhar);
    document.fonts?.ready.then(desenhar);
    new ResizeObserver(desenhar).observe(mapa);
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
      mapa.querySelector('.mapa-disc.fixado')?.classList.remove('fixado');
      mapa.querySelectorAll('.mapa-disc').forEach((d) => d.removeAttribute('aria-pressed'));
      if (mapa._fixo === cod) {
        mapa._fixo = null;
        limparFluxo(mapa);
        return;
      }
      mapa._fixo = cod;
      disc.classList.add('fixado');
      disc.setAttribute('aria-pressed', 'true');
      ativarFluxo(mapa, cod, true, true);
    });
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
  const largura = palco.scrollWidth;
  const altura = palco.scrollHeight;
  svg.setAttribute('width', largura);
  svg.setAttribute('height', altura);
  svg.setAttribute('viewBox', `0 0 ${largura} ${altura}`);
  const ponto = (id) => palco.querySelector(`[data-no="${id}"]`)?.getBoundingClientRect();

  const caminhos = cadeia.arestas.map((a) => {
    const r1 = ponto(a.de);
    const r2 = ponto(a.para);
    if (!r1 || !r2) return '';
    const x1 = r1.right - base.left + palco.scrollLeft;
    const y1 = r1.top + r1.height / 2 - base.top;
    const x2 = r2.left - base.left + palco.scrollLeft;
    const y2 = r2.top + r2.height / 2 - base.top;
    const curva = Math.max((x2 - x1) * 0.5, 24);
    const d = `M ${x1} ${y1} C ${x1 + curva} ${y1}, ${x2 - curva} ${y2}, ${x2} ${y2}`;
    const atraso = ((a.ordem ?? 0) * 0.45).toFixed(2);
    return `<path class="lig-base ${a.alt ? 'alt' : ''}" d="${d}"/><path class="lig-pulso" d="${d}" pathLength="100" style="animation-delay:${atraso}s"/>`;
  }).join('');
  svg.innerHTML = caminhos;
}

// ---------------------------------------------------------------------
// A resposta desenhada para o aluno, uma forma para cada pergunta
// ---------------------------------------------------------------------
function nomeDe(codigo) {
  for (const lista of Object.values(opcoes.componentes)) {
    const c = lista.find((x) => x.codigo === codigo);
    if (c) return c.nome;
  }
  return codigo;
}
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
          return cartao({
            codigo: l.codigo, nome: l.nome, estrutura: ctx.estrutura || grades[grades.length - 1],
            extra: `<span class="disc-rodape"><span class="disc-cred">${plural(l.creditos, 'crédito', 'créditos')}</span>
              ${grades.map((g) => `<span class="selo selo-grade">${esc(nomeGrade(g))}</span>`).join('')}</span>`,
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
