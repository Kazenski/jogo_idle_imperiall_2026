import { BALANCE, custoDoLote, maximoCompravel } from './balance';
import { derivar } from './estado';
import { CARTAS_POR_ID } from '../data/cartas';
import { inimigoDoEstagio } from '../data/inimigos';
import type { EstadoDerivado, SaveData } from './types';

export interface EventoCombate {
  tipo: ' abate' | 'dano' | 'nivel' | 'estagio';
  valor: number;
  texto?: string;
}

/**
 * Estado do combate em andamento. E o unico lugar que guarda "quanto de vida
 * o inimigo atual tem" — o save so persiste o estagio e o contador de abates,
 * porque a vida volta cheia a cada entrada.
 */
export interface EstadoCombate {
  estagio: number;
  hpInimigo: number;
  hpMax: number;
  ouroPorAbate: number;
  nomeInimigo: string;
  spriteInimigo: string;
  /** Fractionario acumulado entre ticks para nao perder precisao em dt pequeno. */
  danoPendente: number;
}

export function criarCombate(save: SaveData): EstadoCombate {
  const estagio = Math.max(1, save.estagioDesbloqueado);
  const { def, hp, ouro } = inimigoDoEstagio(estagio);
  return {
    estagio,
    hpInimigo: hp,
    hpMax: hp,
    ouroPorAbate: ouro,
    nomeInimigo: def.nome,
    spriteInimigo: def.sprite,
    danoPendente: 0,
  };
}

/** Reinicia o alvo do combate para o estagio informado. */
export function mirarEstagio(combate: EstadoCombate, estagio: number): void {
  const { def, hp, ouro } = inimigoDoEstagio(estagio);
  combate.estagio = estagio;
  combate.hpMax = hp;
  combate.hpInimigo = hp;
  combate.ouroPorAbate = ouro;
  combate.nomeInimigo = def.nome;
  combate.spriteInimigo = def.sprite;
  combate.danoPendente = 0;
}

export interface ResultadoTick {
  ouroGanho: number;
  xpGanho: number;
  abates: number;
  subiuDeNivel: boolean;
}

/**
 * Avanca o combate em `dt` segundos e retorna o que aconteceu.
 *
 * Toda a matematica de producao acontece AQUI, uma vez por tick. A UI so le o
 * resultado. Isso evita a classe classica de bug de idle game onde cada tela
 * recalcula o ganho e os numeros divergem.
 */
export function tickCombate(
  save: SaveData,
  combate: EstadoCombate,
  dtSegundos: number,
  stats: EstadoDerivado = derivar(save),
): ResultadoTick {
  let ouroGanho = 0;
  let xpGanho = 0;
  let abates = 0;

  // --- Passe de ouro por segundo (independe do combate) -------------------
  ouroGanho += stats.cps * dtSegundos;

  // --- Passe de dano --------------------------------------------------------
  if (combate.hpInimigo > 0 && stats.dps > 0) {
    combate.danoPendente += stats.dps * dtSegundos;
    while (combate.danoPendente >= combate.hpInimigo && combate.hpInimigo > 0) {
      combate.danoPendente -= combate.hpInimigo;
      combate.hpInimigo = 0;
      abates++;
    }

    while (combate.hpInimigo <= 0) {
      // Abate
      const premio = combate.ouroPorAbate;
      ouroGanho += premio;
      xpGanho += 1 + combate.estagio * 0.35;
      save.inimigosDerrotados += 1;

      // Avanca estagio
      const proximo = combate.estagio + 1;
      mirarEstagio(combate, proximo);
      if (proximo > save.estagioDesbloqueado) {
        save.estagioDesbloqueado = proximo;
      }
      // Limite de seguranca: se dps for absurdo, nao trava o loop.
      if (abates > 10_000) break;
    }
  }

  // --- Credito -------------------------------------------------------------
  if (ouroGanho > 0) {
    save.ouro += ouroGanho;
    save.ouroTotalGanho += ouroGanho;
  }

  let subiuDeNivel = false;
  if (xpGanho > 0) {
    save.xp += xpGanho;
    subiuDeNivel = subirNivel(save);
  }

  return { ouroGanho, xpGanho, abates, subiuDeNivel };
}

function subirNivel(save: SaveData): boolean {
  let subiu = false;
  // Um tick pode render varios niveis (ex.: DPS alto apos voltar de offline).
  for (let guard = 0; guard < 200; guard++) {
    const alvo = BALANCE.xpParaNivel(save.nivel);
    if (save.xp < alvo) break;
    save.xp -= alvo;
    save.nivel += 1;
    subiu = true;
  }
  return subiu;
}

/** Resultado de uma compra na loja. */
export interface ResultadoCompra {
  ok: boolean;
  motivo?: 'ouro-insuficiente' | 'carta-bloqueada' | 'quantidade-zero';
  quantidade: number;
  custo: number;
  ganhoCps: number;
}

/**
 * Compra `quantidade` unidades de uma carta.
 * Mutaciono `save` quando a compra e valida.
 */
export function comprarCarta(
  save: SaveData,
  cardId: string,
  selecao: SaveData['prefs']['quantidadeCompra'],
  stats: EstadoDerivado = derivar(save),
): ResultadoCompra {
  const def = CARTAS_POR_ID[cardId];
  if (!def) return { ok: false, motivo: 'carta-bloqueada', quantidade: 0, custo: 0, ganhoCps: 0 };

  const nivelAtual = save.cartas[cardId] ?? 0;
  const quantidade =
    selecao === 'max'
      ? maximoCompravel(save.ouro, def.custoBase, def.custoCrescimento, nivelAtual + 1)
      : selecao;

  if (quantidade <= 0) {
    return { ok: false, motivo: 'quantidade-zero', quantidade: 0, custo: 0, ganhoCps: 0 };
  }

  const custo = custoDoLote(quantidade, def.custoBase, def.custoCrescimento, nivelAtual + 1);
  if (custo > save.ouro) {
    return { ok: false, motivo: 'ouro-insuficiente', quantidade, custo, ganhoCps: 0 };
  }

  const cpsAntes = stats.cpsPorCarta[cardId] ?? 0;
  save.ouro -= custo;
  save.cartas[cardId] = nivelAtual + quantidade;

  const statsDepois = derivar(save);
  const ganhoCps = (statsDepois.cpsPorCarta[cardId] ?? 0) - cpsAntes;

  return { ok: true, quantidade, custo, ganhoCps };
}

/** Previa (sem mutar) para a UI mostrar "custo do lote / ganho do lote". */
export function previaCompra(
  save: SaveData,
  cardId: string,
  selecao: SaveData['prefs']['quantidadeCompra'],
  stats: EstadoDerivado = derivar(save),
): { quantidade: number; custo: number; ganhoCps: number; ganhoDps: number; acessivel: boolean } {
  const def = CARTAS_POR_ID[cardId];
  if (!def) return { quantidade: 0, custo: 0, ganhoCps: 0, ganhoDps: 0, acessivel: false };

  const nivelAtual = save.cartas[cardId] ?? 0;
  const quantidade =
    selecao === 'max'
      ? maximoCompravel(save.ouro, def.custoBase, def.custoCrescimento, nivelAtual + 1)
      : selecao;

  if (quantidade <= 0) {
    return { quantidade: 0, custo: 0, ganhoCps: 0, ganhoDps: 0, acessivel: false };
  }

  const custo = custoDoLote(quantidade, def.custoBase, def.custoCrescimento, nivelAtual + 1);
  const acessivel = custo <= save.ouro;

  const mult = stats.multiplicador;
  const antesFator = (nivelAtual * (nivelAtual + 1)) / 2;
  const depoisFator = ((nivelAtual + quantidade) * (nivelAtual + quantidade + 1)) / 2;
  const ganhoCps = def.cpsBase * (depoisFator - antesFator) * mult;
  const ganhoDps = def.dpsBase * (depoisFator - antesFator);

  return { quantidade, custo, ganhoCps, ganhoDps, acessivel };
}