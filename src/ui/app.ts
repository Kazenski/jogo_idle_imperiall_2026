import { BALANCE } from '../core/balance';
import { comprarCarta, criarCombate, tickCombate } from '../core/combate';
import { custoArenacao, derivar } from '../core/estado';
import { forjar } from '../core/forja';
import { fazerPrestigio, previaPrestigio } from '../core/prestigio';
import { aplicarOffline, carregar, carregarPrefs, salvar, salvarPrefs } from '../core/save';
import { criarJogo } from '../scenes/BattleScene';
import type { BattleScene } from '../scenes/BattleScene';
import { saveNovo } from '../core/estado';
import type { SaveData, Tabs } from '../core/types';
import { abreviar, duracao } from './formatar';
import { botao, h } from './dom';
import type { SelecaoQuantidade } from './dom';
import { criarHud } from './hud';
import { criarPainelCombate } from './combate';
import { criarLoja } from './loja';
import { criarColecao } from './colecao';
import { criarPrestigio } from './prestigio';
import { criarAjustes } from './ajustes';

const ABAS: { id: Tabs; rotulo: string; icone: string }[] = [
  { id: 'combate', rotulo: 'Combate', icone: '⚔' },
  { id: 'loja', rotulo: 'Loja', icone: '🪙' },
  { id: 'cartas', rotulo: 'Cartas', icone: '🃏' },
  { id: 'prestigio', rotulo: 'Renarquiciar', icone: '👑' },
  { id: 'ajustes', rotulo: 'Ajustes', icone: '⚙' },
];

/**
 * Orquestrador do jogo.
 *
 * O LOOP (10x/seg) e deliberadamente burro: `tickCombate` aplica a matematica,
 * a UI recebe os numeros. Nenhum componente recalcula producao — ver o
 * comentario em `core/estado.ts`.
 *
 * A UI so re-renderiza por campo (`definirTexto`), nunca por innerHTML, para
 * nao destruir o scroll da lista de cartas a cada tick.
 */
export function iniciarJogo(host: HTMLElement): void {
  let save: SaveData = carregar();

  const prefs = carregarPrefs();
  if (prefs) save.prefs = { ...save.prefs, ...prefs };

  const combate = criarCombate(save);

  // --- Estrutura -----------------------------------------------------------
  // O palco e IRMAO do painel, nao filho dele. Assim, no desktop ele vira a
  // coluna esquerda de verdade (grid area) em vez de ficar espremido dentro
  // do painel lateral.
  const palco = h('div', { class: 'palco', id: 'palco' });
  const painel = h('main', { class: 'painel-telas' });
  const hud = criarHud();

  const botoesAbas: HTMLButtonElement[] = [];

  // --- Loja ----------------------------------------------------------------
  const loja = criarLoja(
    (cardId) => {
      const stats = derivar(save);
      const r = comprarCarta(save, cardId, save.prefs.quantidadeCompra, stats);
      if (r.ok) {
        loja.definirQuantidade(save.prefs.quantidadeCompra);
        marcarSucesso(cardId);
        hud.atualizar(save, derivar(save), 0);
      } else if (r.motivo === 'ouro-insuficiente') {
        avisar('Ouro insuficiente.');
      }
    },
    (q) => {
      save.prefs.quantidadeCompra = q as SelecaoQuantidade;
      salvarPrefs(save);
    },
  );
  loja.definirQuantidade(save.prefs.quantidadeCompra as SelecaoQuantidade);

  const painelCombate = criarPainelCombate();
  const colecao = criarColecao((cardId) => {
    const r = forjar(save, cardId);
    if (!r.ok) {
      if (r.motivo === 'ouro-insuficiente') avisar('Ouro insuficiente para forjar.');
      return;
    }
    salvar(save);
    renderTelas(derivar(save));
    hud.atualizar(save, derivar(save), 0);
    avisar(
      r.sucesso
        ? `Forjado +${r.nivelNovo}! (+${BALANCE.forjaBonusPorNivel * 100}% de producao)`
        : 'A forja falhou — nivel mantido.',
    );
  });

  const prestigio = criarPrestigio({
    aoComprarArenacao() {
      const custo = custoArenacao(save);
      if (save.ouro < custo) return;
      save.ouro -= custo;
      save.moedasDeArenacao += 1;
      salvar(save);
      renderTelas(derivar(save));
    },
    aoFazerPrestigio() {
      const previa = previaPrestigio(save);
      if (!previa.disponivel) return;
      const ok = window.confirm(
        `Renarquiciar e ganhar ${previa.coroasGanhas} coroa(s)?\n\n` +
          'Isto zera ouro, cartas, nivel e arenacao.',
      );
      if (!ok) return;
      const ganhas = fazerPrestigio(save);
      reiniciarCombate();
      loja.definirQuantidade(save.prefs.quantidadeCompra);
      salvar(save);
      // Re-renderiza: as telas so se atualizam no tick do loop, e o reset
      // mudou todos os numeros de uma vez.
      renderTelas(derivar(save));
      hud.atualizar(save, derivar(save), 0);
      avisar(`+${ganhas} coroa(s). Nova run comecou.`);
    },
    aoReduzirAnimacoes(v) {
      save.prefs.redutorAnimacoes = v;
      salvarPrefs(save);
      cena?.definirCombate(combate, v);
    },
  });

  const ajustes = criarAjustes({
    aoImportar(novo) {
      save = novo;
      reiniciarCombate();
      loja.definirQuantidade(save.prefs.quantidadeCompra);
      salvar(save);
      renderTelas(derivar(save));
      hud.atualizar(save, derivar(save), 0);
    },
    aoApagar() {
      save = saveNovo();
      reiniciarCombate();
      loja.definirQuantidade(save.prefs.quantidadeCompra as SelecaoQuantidade);
      salvar(save);
      renderTelas(derivar(save));
      hud.atualizar(save, derivar(save), 0);
    },
    aoInstalar() {
      instalarPwa();
    },
  });

  // O palco e um elemento unico, irmao do painel. Quem decide se ele aparece e
  // o CSS: no celular ele so aparece na aba "combate" (via `[data-aba]` no
  // host), no desktop ele e sempre a coluna esquerda.
  const telas: Record<Tabs, HTMLElement | null> = {
    // No celular o palco ocupa esse lugar e o painel e escondido por CSS;
    // no tablet ele vira a coluna direita com os numeros do combate.
    combate: painelCombate.raiz,
    loja: loja.raiz,
    cartas: colecao.raiz,
    prestigio: prestigio.raiz,
    ajustes: ajustes.raiz,
  };

  for (const aba of ABAS) {
    const tela = telas[aba.id];
    if (tela) painel.append(tela);
  }

  const nav = h('nav', { class: 'nav', role: 'tablist', 'aria-label': 'Telas do jogo' });
  ABAS.forEach((aba) => {
    const b = botao('', () => trocarAba(aba.id), { class: 'nav-btn' });
    b.setAttribute('role', 'tab');
    b.innerHTML = `<span class="nav-icone" aria-hidden="true">${aba.icone}</span><span class="nav-rotulo">${aba.rotulo}</span>`;
    botoesAbas.push(b);
    nav.append(b);
  });

  const aviso = h('div', { class: 'aviso', role: 'status', 'aria-live': 'polite' });

  host.append(hud.raiz, palco, painel, nav, aviso);

  // CRITICO: o palco precisa estar VISIVEL quando o Phaser cria o framebuffer.
  // Medir 0x0 (porque `data-aba` ainda nao estava definido) faz o WebGL falhar
  // com "Incomplete Attachment" e nao ha recuperacao. Por isso forcamos a aba
  // combate na montagem e so depois aplicamos a aba salva.
  host.dataset.aba = 'combate';

  // --- Progresso offline ---------------------------------------------------
  const offline = aplicarOffline(save, combate);
  if (offline && offline.ouro > 0) {
    mostrarModalOffline(offline);
  }

  // --- Phaser --------------------------------------------------------------
  // `criarJogo` entrega a cena sincronamente, antes do boot do Phaser terminar.
  let cena: BattleScene | null = null;
  const jogo = criarJogo(palco);
  cena = jogo.cena;
  cena.definirCombate(combate, save.prefs.redutorAnimacoes);

  // --- Abas ----------------------------------------------------------------
  let abaAtual: Tabs = save.prefs.aba;
  // Precisa vir depois de `cena` existir: trocarAba re-injeta o estado nela.

  function trocarAba(id: Tabs): void {
    abaAtual = id;
    save.prefs.aba = id;
    salvarPrefs(save);

    // O host carrega a aba atual; o CSS usa isso para mostrar/esconder o palco.
    host.dataset.aba = id;

    ABAS.forEach((aba, i) => {
      const ativa = aba.id === id;
      botoesAbas[i]?.setAttribute('aria-selected', String(ativa));
      const tela = telas[aba.id];
      if (tela) tela.hidden = !ativa;
    });

    if (cena) cena.definirCombate(combate, save.prefs.redutorAnimacoes);

    // Ao voltar para a aba Combate, o palco sai de `display: none`. O canvas
    // ficou com o tamanho anterior (ou 0x0 se nunca teve area), entao
    // reaplicamos a medida. Sem isso a tela volta preta.
    if (id === 'combate') jogo.redimensionar();

    // Render na hora da troca. `renderTelas` so desenha a aba ativa, entao
    // esperar o proximo tick mostraria uma lista vazia por ate 100ms — e
    // nada renderiza se o `requestAnimationFrame` estiver pausado.
    renderTelas(derivar(save));
  }

  trocarAba(abaAtual);

  // Primeira renderizacao imediata. Sem isto, a tela salva so apareceria no
  // primeiro tick do loop — e se o rAF estiver pausado (aba em fundo,
  // economia de energia no celular), ficaria permanentemente em branco.
  hud.atualizar(save, derivar(save), 0);
  renderTelas(derivar(save));

  // --- Loop ----------------------------------------------------------------
  let ultimoTick = performance.now();
  let acumuladorRender = 0;
  let hpAnterior = combate.hpInimigo;
  const INTERVALO_RENDER = 100; // ms — 10 fps na UI, tick a 60fps

  function reiniciarCombate(): void {
    const novo = criarCombate(save);
    combate.estagio = novo.estagio;
    combate.hpInimigo = novo.hpInimigo;
    combate.hpMax = novo.hpMax;
    combate.ouroPorAbate = novo.ouroPorAbate;
    combate.nomeInimigo = novo.nomeInimigo;
    combate.spriteInimigo = novo.spriteInimigo;
    combate.danoPendente = 0;
    cena?.definirCombate(combate, save.prefs.redutorAnimacoes);
  }

  function laco(agora: number): void {
    const dtSeg = Math.min(0.5, (agora - ultimoTick) / 1000);
    ultimoTick = agora;

    const stats = derivar(save);
    const resultado = tickCombate(save, combate, dtSeg, stats);

    // Feedback visual de dano/abate, derivado do delta de HP do alvo.
    if (combate.hpInimigo < hpAnterior && combate.hpMax > 0) {
      const fracao = (hpAnterior - combate.hpInimigo) / combate.hpMax;
      cena?.registrarDano(fracao);
    }
    if (resultado.abates > 0) {
      cena?.registrarAbate();
    }
    hpAnterior = combate.hpInimigo;

    acumuladorRender += dtSeg * 1000;
    if (acumuladorRender >= INTERVALO_RENDER) {
      acumuladorRender = 0;
      const novasStats = derivar(save);
      hud.atualizar(save, novasStats, INTERVALO_RENDER / 1000);
      renderTelas(novasStats);
    }

    requestAnimationFrame(laco);
  }
  requestAnimationFrame(laco);

  function renderTelas(stats: ReturnType<typeof derivar>): void {
    switch (abaAtual) {
      case 'combate':
        painelCombate.atualizar(save, stats, combate);
        break;
      case 'loja':
        loja.atualizar(save, stats);
        break;
      case 'cartas':
        colecao.atualizar(save, stats);
        break;
      case 'prestigio':
        prestigio.atualizar(save, stats);
        break;
      case 'ajustes':
        ajustes.atualizar(save);
        break;
    }
  }

  // --- Autosave ------------------------------------------------------------
  // Em `visibilitychange` e no `pagehide` alem do intervalo: fechar a aba nao
  // pode custar progresso. Sem isso o jogador perde ate 5s + todo o offline.
  window.setInterval(() => salvar(save), BALANCE.autosaveMs);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      salvar(save);
      return;
    }

    // VOLTOU PARA A ABA. O navegador pausa `requestAnimationFrame` em aba de
    // fundo, entao o loop nao rodou nada nesse intervalo — sem creditar aqui,
    // o jogador perde todo o tempo spent looking elsewhere. Como o autosave ja
    // rodou ao esconder, o intervalo lost esta certo e `aplicarOffline`
    // devolve exatamente o que faltou.
    const perdido = aplicarOffline(save, combate);
    if (perdido && perdido.ouro > 0) {
      ultimoTick = performance.now(); // evita um dt gigante no proximo frame
      hpAnterior = combate.hpInimigo;
      salvar(save);
      avisar(`+${abreviar(perdido.ouro)} ouro enquanto voce estava fora.`);
    }
  });

  window.addEventListener('pagehide', () => salvar(save));

  // --- Feedback de compra --------------------------------------------------
  function marcarSucesso(cardId: string): void {
    const linha = loja.raiz.querySelector<HTMLElement>(`[data-id="${cardId}"]`);
    if (!linha) return;
    linha.classList.remove('linha-carta--comprou');
    // forcando reflow para o CSS re-disparar a animacao
    void linha.offsetWidth;
    linha.classList.add('linha-carta--comprou');
    window.setTimeout(() => linha.classList.remove('linha-carta--comprou'), 400);
  }

  let timerAviso = 0;
  function avisar(texto: string): void {
    aviso.textContent = texto;
    aviso.classList.add('aviso--visivel');
    window.clearTimeout(timerAviso);
    timerAviso = window.setTimeout(() => aviso.classList.remove('aviso--visivel'), 2_200);
  }

  function mostrarModalOffline(r: NonNullable<ReturnType<typeof aplicarOffline>>): void {
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
      h('div', { class: 'modal-card' }, [
        h('h2', { class: 'modal-titulo' }, ['Bem-vindo de volta']),
        h('p', { class: 'modal-texto' }, [
          `Voce ficou ${duracao(r.awayMs)} fora. O progresso rendeu:`,
        ]),
        h('ul', { class: 'modal-lista' }, [
          h('li', {}, [`${abreviar(r.ouro)} ouro`]),
          r.abates > 0 ? h('li', {}, [`${abreviar(r.abates)} abates`]) : null,
          r.xp > 0 ? h('li', {}, [`${abreviar(r.xp)} xp`]) : null,
        ].filter(Boolean) as HTMLElement[]),
        botao('Continuar', () => box.remove(), { class: 'btn btn--primario' }),
      ]),
    ]);
    document.body.append(box);
  }
}

/**
 * Instalacao do PWA.
 *
 * O evento `beforeinstallprompt` so existe no Chrome/Edge/Android. No iOS nao
 * ha API: o caminho e "Compartilhar > Adicionar a Tela de Inicio". Por isso o
 * botao tambem explica o caminho manual quando nao ha prompt disponivel.
 */
let promptInstalacao: Event & { prompt: () => Promise<void> } | null = null;

window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  promptInstalacao = ev as Event & { prompt: () => Promise<void> };
});

export function instalarPwa(): void {
  if (promptInstalacao) {
    void promptInstalacao.prompt();
    promptInstalacao = null;
    return;
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  window.alert(
    ios
      ? 'No iPhone/iPad: toque em Compartilhar e depois em "Adicionar a Tela de Inicio".'
      : 'Abra o menu do navegador e escolha "Instalar app" ou "Adicionar na tela inicial".',
  );
}