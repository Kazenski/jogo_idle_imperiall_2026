import { BALANCE } from './balance';
import { CARTAS_POR_ID } from '../data/cartas';
import type { SaveData } from './types';

/**
 * Forja (+N) — a camada de aprimoramento estilo MU.
 *
 * Regras:
 *   - Cada carta pode ser forjada ate `BALANCE.forjaTeto` (+15).
 *   - Cada nivel de forja da +`forjaBonusPorNivel` (10%) de cps e
 *     dps para ESSA carta (multiplicativo com os bonus globais).
 *   - +1 a +3 sao garantidos; de +4 em diante a chance cai.
 *   - Falha mantem o nivel (fail-safe). A variante hardcore do MU
 *     (destroi o item) e so trocar o `sucesso` por queda de nivel.
 *
 * A RNG e injetavel (`rolar`) para os testes rodarem
 * deterministicos — mesma ideia que o resto do `core/`.
 */

/** Chance de sucesso ao forjar do nivel `atual` para `atual + 1`. */
export function chanceDeSucesso(atual: number): number {
  if (atual < BALANCE.forjaSemRiscoAte) return 1;
  const queda = BALANCE.forjaChanceDecaimento * (atual - BALANCE.forjaSemRiscoAte);
  const chance = BALANCE.forjaChanceBase - queda;
  // Arredonda em centesimos: a subtracao em ponto flutuante devolve
  // coisas como 0.2400000000000001, que vaza na UI como "24.000...%".
  return Math.max(BALANCE.forjaChanceMin, Math.round(chance * 100) / 100);
}

/** Custo em ouro de uma tentativa no nivel de forja `atual`. */
export function custoForja(custoBase: number, atual: number): number {
  return custoBase * BALANCE.forjaCustoFator * Math.pow(BALANCE.forjaCustoCrescimento, atual);
}

/** Multiplicador de cps/dps de uma carta forjada a nivel `nivel`. */
export function multiplicadorForja(nivel: number): number {
  return 1 + nivel * BALANCE.forjaBonusPorNivel;
}

export interface ResultadoForja {
  ok: boolean;
  motivo?: 'inexistente' | 'nao-adquirida' | 'no-teto' | 'ouro-insuficiente';
  sucesso: boolean;
  custo: number;
  chance: number;
  nivelAnterior: number;
  nivelNovo: number;
}

/** Tenta forjar uma carta. Muta o save (desconta ouro, sobe nivel). */
export function forjar(
  save: SaveData,
  cardId: string,
  rolar: () => number = Math.random,
): ResultadoForja {
  const def = CARTAS_POR_ID[cardId];
  const nivelAnterior = save.forjas[cardId] ?? 0;
  const custo = def ? custoForja(def.custoBase, nivelAnterior) : 0;
  const chance = chanceDeSucesso(nivelAnterior);

  const falha = (motivo: NonNullable<ResultadoForja['motivo']>): ResultadoForja => ({
    ok: false,
    motivo,
    sucesso: false,
    custo,
    chance,
    nivelAnterior,
    nivelNovo: nivelAnterior,
  });

  if (!def) return falha('inexistente');
  if ((save.cartas[cardId] ?? 0) <= 0) return falha('nao-adquirida');
  if (nivelAnterior >= BALANCE.forjaTeto) return falha('no-teto');
  if (save.ouro < custo) return falha('ouro-insuficiente');

  save.ouro -= custo;
  const sucesso = rolar() < chance;
  const nivelNovo = sucesso ? nivelAnterior + 1 : nivelAnterior;
  if (sucesso) save.forjas[cardId] = nivelNovo;

  return { ok: true, sucesso, custo, chance, nivelAnterior, nivelNovo };
}

/** Preview para a UI: quanto custa, qual a chance, se e possivel. */
export function previaForja(save: SaveData, cardId: string) {
  const def = CARTAS_POR_ID[cardId];
  const nivelAtual = save.forjas[cardId] ?? 0;
  const adquirida = (save.cartas[cardId] ?? 0) > 0;
  const noTeto = nivelAtual >= BALANCE.forjaTeto;
  const custo = def ? custoForja(def.custoBase, nivelAtual) : 0;
  const chance = chanceDeSucesso(nivelAtual);
  return {
    nivelAtual,
    custo,
    chance,
    noTeto,
    adquirida,
    acessivel: !!def && adquirida && !noTeto && save.ouro >= custo,
  };
}
