/**
 * Tipos centrais do jogo. Tudo aqui é dado puro e serializável:
 * o save do jogador é um `SaveData` e nada mais.
 */

export type Rarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

export const RARITY_ORDER: Rarity[] = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

/** Ordem de exibição e índice de "força" da raridade. */
export const RARITY_POWER: Record<Rarity, number> = {
  comum: 0,
  incomum: 1,
  raro: 2,
  epico: 3,
  lendario: 4,
};

export type SpriteKey =
  | 'espada'
  | 'escudo'
  | 'arco'
  | 'elmo'
  | 'pocao'
  | 'coroa'
  | 'martelo'
  | 'capa'
  | 'bau'
  | 'golem'
  | 'dragao'
  | 'espirito'
  | 'gato'
  | 'ogro'
  | 'goblin'
  | 'sereia'
  | 'morcego';

export interface CardDef {
  id: string;
  nome: string;
  descricao: string;
  raridade: Rarity;
  sprite: SpriteKey;
  /** Custo do ouro para comprar a 1a unidade. */
  custoBase: number;
  /** Fator exponencial aplicado ao custo a cada nivel. */
  custoCrescimento: number;
  /** Ouro por segundo gerado por UMA unidade deste nivel base. */
  cpsBase: number;
  /** Dano por segundo de UMA unidade deste nivel base. */
  dpsBase: number;
  /** Era minima de Coroa necessaria para aparecer na loja. */
  eraRequerida: number;
  /** Nivel do heroi necessario para a carta aparecer na loja. */
  niveisRequeridos: number;
}

/** Um nivel de inimigo reaproveitado em escala infinita. */
export interface EnemyDef {
  nome: string;
  sprite: SpriteKey;
  hpBase: number;
  hpCrescimento: number;
  /** Moeda dropada por abate. */
  ouroBase: number;
  ouroCrescimento: number;
  eraRequerida: number;
  niveisRequeridos: number;
}

export type Tabs = 'combate' | 'cartas' | 'loja' | 'prestigio' | 'ajustes';

/** Contagem de unidades por carta. O indice do array = nivel - 1. */
export type CardLevels = Record<string, number>;

export interface SaveData {
  /** Versao do schema; usada por `migrate()` para migrar saves antigos. */
  versao: number;
  criadoEm: number;
  ultimoSalvoEm: number;

  ouro: number;
  ouroTotalGanho: number;

  nivel: number;
  xp: number;
  moedasDeArenacao: number;

  /** Coroa de prestagio acumulada. Zera cartas e ouro, da multiplicador permanente. */
  coroas: number;
  coroasGanhasNoTotal: number;
  /** Tempo (ms de Date.now) em que o jogador fez o ultimo prestagio. */
  ultimoPrestagioEm: number;

  cartas: CardLevels;
  /** Nivel de forja (+N) por carta. Ausente = +0. */
  forjas: Record<string, number>;
  inimigosDerrotados: number;
  /** Maior nivel de inimigo ja alcancado. */
  estagioDesbloqueado: number;

  /** Preferencias de UI. */
  prefs: {
    aba: Tabs;
    quantidadeCompra: 1 | 10 | 50 | 100 | 'max';
    redutorAnimacoes: boolean;
  };
}

export interface EstadoDerivado {
  cps: number;
  dps: number;
  multiplicador: number;
  multiplicadorCoroas: number;
  multiplicadorArenacao: number;
  poderMao: number;
  cpsPorCarta: Record<string, number>;
  dpsPorCarta: Record<string, number>;
  custoProximaCarta: Record<string, number>;
}