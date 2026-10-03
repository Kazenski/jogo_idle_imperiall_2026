/**
 * Tunagem de balanceamento em um lugar so.
 *
 * Curva idle canonica:
 *   - Producao por unidade cresce LINEARMENTE com o nivel.
 *   - Custo por unidade cresce EXPONENCIALMENTE.
 *   Quem da velocidade vem de multiplicadores globais (prestigio, arenacao).
 * Isso forca o jogador a voltar por camadas de reset em vez de só clicar.
 */

export const BALANCE = {
  /** Ouro por segundo que a base do heroi gera sozinho, independente de cartas. */
  cpsBaseHeroi: 1,

  /** Ganho de xp para subir de nivel. */
  xpParaNivel: (nivel: number) => Math.floor(25 * Math.pow(1.35, nivel - 1)),

  /** Bonus de cps por nivel do heroi (fracao). */
  cpsPorNivel: 0.02,

  /** Bonus de poder de ataque por nivel do heroi (fracao). */
  dpsPorNivel: 0.03,

  /** Quanto o heroi ganha de vida por nivel. */
  hpPorNivel: 12,

  /** Cada arenacao compra +fracao de cps e +fracao de poder, em todos os slots. */
  cpsPorArenacao: 0.02,
  dpsPorArenacao: 0.02,
  custoArenacaoBase: 15,
  custoArenacaoCrescimento: 1.6,

  /** Prestagio: coroas = raiz(vida falsa) do ouro total ganho. */
  coroasPorPrestagio: (ouroTotalGanho: number) => {
    if (ouroTotalGanho < 1_000) return 0;
    return Math.floor(Math.pow(ouroTotalGanho / 1_000, 0.5));
  },
  /** Cada coroa = +fracao permanente de producao e poder. */
  ganhoPorCoral: 0.02,

  /** Minutos de progresso offline renderizados a 100%... */
  offlineMinutosFull: 60 * 8,
  /** ...e o excedente cai para esta fracao (evita voltar com numero absurdo). */
  offlineFracaoExcedente: 0.25,
  /** Teto de progresso offline simulado (ms). 12h. */
  offlineTetoMs: 1000 * 60 * 60 * 12,

  /** Intervalo do tick de simulacao (ms). */
  tickMs: 100,
  /** De quanto em quanto tempo persistimos no localStorage (ms). */
  autosaveMs: 5_000,
} as const;

/**
 * Quanto uma carta custa a proxima unidade, dado o nivel atual.
 * Nivel 1 = custoBase.
 */
export function custoDaUnidade(custoBase: number, crescimento: number, nivel: number): number {
  return custoBase * Math.pow(crescimento, nivel - 1);
}

/**
 * Maior quantidade de unidades compravel com `ouro` disponivel.
 * Soma geometrica: base*g^n * (g^k - 1)/(g - 1) <= ouro
 * Resolvemos por iteracao com teto de seguranca — n valores Practical cabem
 * em ~10 iteracoes porque a serie explode.
 */
export function maximoCompravel(
  ouro: number,
  custoBase: number,
  crescimento: number,
  nivel: number,
  teto = 1_000_000,
): number {
  const primeiro = custoDaUnidade(custoBase, crescimento, nivel);
  if (primeiro > ouro) return 0;

  // Soma termo a termo. A i-esima unidade (i >= 1) custa
  // `custoDaUnidade(nivel + i - 1)` — o `-1` e essencial: sem ele a soma
  // comeca uma unidade adiantada e o "Max" devolve uma unidade A MAIS do que
  // o ouro paga. Foi exatamente o bug que travava o botao Max.
  let gasto = 0;
  let k = 0;

  while (k < teto) {
    const proximo = custoDaUnidade(custoBase, crescimento, nivel + k);
    if (gasto + proximo > ouro) break;
    gasto += proximo;
    k++;
  }
  return k;
}

/** Custo total de comprar `quantidade` unidades a partir do nivel `nivel`. */
export function custoDoLote(
  quantidade: number,
  custoBase: number,
  crescimento: number,
  nivel: number,
): number {
  if (quantidade <= 0) return 0;
  const primeiro = custoDaUnidade(custoBase, crescimento, nivel);
  if (crescimento === 1) return primeiro * quantidade;
  return (primeiro * (Math.pow(crescimento, quantidade) - 1)) / (crescimento - 1);
}