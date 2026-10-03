import { BALANCE } from './balance';
import { derivar } from './estado';
import type { SaveData } from './types';

/** Minimo de ouro total ganho para o prestagio valer a pena. */
export const PRESTIGIO_MINIMO = 1_000;

/** Coroas que o jogador ganharia se fizesse prestagio agora. */
export function coroasPorFazer(save: SaveData): number {
  return BALANCE.coroasPorPrestagio(save.ouroTotalGanho);
}

export interface PreviaPrestigio {
  disponivel: boolean;
  coroasGanhas: number;
  /** Ganho de multiplicador permanente, em fracao. */
  ganhoMultiplicador: number;
  antesCps: number;
  antesDps: number;
  cpsDepois: number;
  dpsDepois: number;
}

/**
 * Simula o prestigio sem aplicar, para a tela de confirmacao mostrar o
 * "de -> para" antes do jogador confirmar.
 */
export function previaPrestigio(save: SaveData): PreviaPrestigio {
  const coroasGanhas = coroasPorFazer(save);
  const disponivel = save.ouroTotalGanho >= PRESTIGIO_MINIMO && coroasGanhas > 0;

  const antes = derivar(save);
  const coroasDepois = save.coroas + coroasGanhas;

  // O reset zera cartas, ouro e nivel. O unico multiplicador que sobra sao as
  // coroas, entao o "depois" e so o cps base do heroi escalado por coroa.
  const multDepois =
    (1 + coroasDepois * BALANCE.ganhoPorCoral) *
    (1 + save.moedasDeArenacao * BALANCE.cpsPorArenacao);

  return {
    disponivel,
    coroasGanhas,
    ganhoMultiplicador: coroasGanhas * BALANCE.ganhoPorCoral,
    antesCps: antes.cps,
    antesDps: antes.dps,
    cpsDepois: BALANCE.cpsBaseHeroi * multDepois,
    dpsDepois: BALANCE.cpsBaseHeroi * multDepois * 0.5,
  };
}

/**
 * Aplica o prestigio. Zera o progresso da run e credita as coroas.
 * As coroas NAO se perdem no reset — elas *sao* a progressao permanente.
 */
export function fazerPrestigio(save: SaveData): number {
  const coroasGanhas = coroasPorFazer(save);
  if (coroasGanhas <= 0) return 0;

  save.coroas += coroasGanhas;
  save.coroasGanhasNoTotal += coroasGanhas;
  save.ultimoPrestagioEm = Date.now();

  save.cartas = {};
  save.ouro = 0;
  save.ouroTotalGanho = 0;
  save.nivel = 1;
  save.xp = 0;
  save.moedasDeArenacao = 0;
  save.inimigosDerrotados = 0;
  save.estagioDesbloqueado = 1;

  return coroasGanhas;
}