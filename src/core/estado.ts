import { BALANCE } from './balance';
import { CARTAS_POR_ID } from '../data/cartas';
import type { CardDef, EstadoDerivado, SaveData } from './types';

export const VERSAO_ATUAL = 1;

/**
 * Save novo. Todo save novo nasce daqui — se voce adicionar um campo
 * obrigatorio, some aqui E escreva uma migration em `save.ts`.
 */
export function saveNovo(): SaveData {
  const agora = Date.now();
  return {
    versao: VERSAO_ATUAL,
    criadoEm: agora,
    ultimoSalvoEm: agora,

    ouro: 0,
    ouroTotalGanho: 0,

    nivel: 1,
    xp: 0,
    moedasDeArenacao: 0,

    coroas: 0,
    coroasGanhasNoTotal: 0,
    ultimoPrestagioEm: 0,

    cartas: {},
    inimigosDerrotados: 0,
    estagioDesbloqueado: 1,

    prefs: {
      aba: 'combate',
      quantidadeCompra: 1,
      redutorAnimacoes: false,
    },
  };
}

/**
 * Derivacao de todos os stats atuais a partir do save.
 *
 * IMPORTANTE: esta funcao e a unica fonte de verdade de "quanto eu ganho".
 * A UI nunca recalcula producao por conta propria, senao o numero exibido
 * sai do numero que o save aplica e o jogador fica confuso.
 */
export function derivar(save: SaveData): EstadoDerivado {
  const multiplicadorCoroas = 1 + save.coroas * BALANCE.ganhoPorCoral;
  const multiplicadorArenacao = 1 + save.moedasDeArenacao * BALANCE.cpsPorArenacao;
  const bonusHeroi = save.nivel * BALANCE.cpsPorNivel;
  const multiplicador = multiplicadorCoroas * multiplicadorArenacao * (1 + bonusHeroi);

  const cpsPorCarta: Record<string, number> = {};
  const dpsPorCarta: Record<string, number> = {};
  const custoProximaCarta: Record<string, number> = {};
  let cps = BALANCE.cpsBaseHeroi * multiplicador;
  let dps = 0;

  for (const [id, nivel] of Object.entries(save.cartas)) {
    const def = CARTAS_POR_ID[id];
    if (!def || nivel <= 0) continue;

    // Unidade de nivel N produz N vezes a base. Crescimento linear.
    const fatorUnidade = (nivel * (nivel + 1)) / 2;
    cpsPorCarta[id] = def.cpsBase * fatorUnidade * multiplicador;
    dpsPorCarta[id] = def.dpsBase * fatorUnidade;

    cps += cpsPorCarta[id];
    dps += dpsPorCarta[id];

    custoProximaCarta[id] = def.custoBase * Math.pow(def.custoCrescimento, nivel);
  }

  dps *= multiplicadorCoroas * (1 + save.moedasDeArenacao * BALANCE.dpsPorArenacao);
  dps *= 1 + save.nivel * BALANCE.dpsPorNivel;

  return {
    cps,
    dps,
    multiplicador,
    multiplicadorCoroas,
    multiplicadorArenacao,
    poderMao: BALANCE.hpPorNivel * save.nivel,
    cpsPorCarta,
    dpsPorCarta,
    custoProximaCarta,
  };
}

/** XP necessario para o proximo nivel. */
export function xpParaProximoNivel(nivel: number): number {
  return BALANCE.xpParaNivel(nivel);
}

/** Custo da proxima moeda de Arenacao. */
export function custoArenacao(save: SaveData): number {
  return Math.floor(
    BALANCE.custoArenacaoBase * Math.pow(BALANCE.custoArenacaoCrescimento, save.moedasDeArenacao),
  );
}

/** Cartas visiveis na loja: ja desbloqueadas por nivel/era. */
export function cartasDisponiveis(save: SaveData): CardDef[] {
  return Object.values(CARTAS_POR_ID)
    .filter((c) => save.nivel >= c.niveisRequeridos && save.coroas >= c.eraRequerida)
    .sort((a, b) => a.custoBase - b.custoBase);
}

/** Progresso doLevels 0..1 para barras de XP. */
export function progressoXp(save: SaveData): number {
  const alvo = xpParaProximoNivel(save.nivel);
  if (alvo <= 0) return 0;
  return Math.min(1, save.xp / alvo);
}