import type { EnemyDef } from '../core/types';

/**
 * ============================================================================
 * CONTEUDO — INIMIGOS
 * ============================================================================
 * Tema: bestiario dark fantasy estilo MU.
 * `estagio` = em qual estagio da progressao o inimigo aparece pela 1a vez.
 * Estagios posteriores reaproveitam a MESMA definicao escalada por
 * `hpCrescimento` / `ouroCrescimento`, entao a lista nao precisa ser infinita.
 *
 * Regra: nomes/racas sao livres, mas os numeros devem subir de forma
 * monotonica (hpBase, ouroBase, estagio, eraRequerida) senao o jogador
 * ganha uma parede.
 * ============================================================================
 */
export interface InimigoDef extends EnemyDef {
  estagio: number;
}

export const INIMIGOS: InimigoDef[] = [
  {
    estagio: 1,
    nome: 'Goblin da Estrada',
    sprite: 'goblin',
    hpBase: 32,
    hpCrescimento: 1.135,
    ouroBase: 9,
    ouroCrescimento: 1.112,
    eraRequerida: 0,
    niveisRequeridos: 0,
  },
  {
    estagio: 4,
    nome: 'Lobo Cinzento',
    sprite: 'morcego' as never,
    hpBase: 34,
    hpCrescimento: 1.135,
    ouroBase: 10,
    ouroCrescimento: 1.112,
    eraRequerida: 0,
    niveisRequeridos: 4,
  },
  {
    estagio: 9,
    nome: 'Ogro do Vale',
    sprite: 'ogro',
    hpBase: 36,
    hpCrescimento: 1.135,
    ouroBase: 11,
    ouroCrescimento: 1.112,
    eraRequerida: 0,
    niveisRequeridos: 9,
  },
  {
    estagio: 16,
    nome: 'Naide da Correnteza',
    sprite: 'sereia',
    hpBase: 38,
    hpCrescimento: 1.135,
    ouroBase: 12,
    ouroCrescimento: 1.112,
    eraRequerida: 0,
    niveisRequeridos: 16,
  },
  {
    estagio: 26,
    nome: 'Morcego da Caverna',
    sprite: 'morcego',
    hpBase: 40,
    hpCrescimento: 1.135,
    ouroBase: 14,
    ouroCrescimento: 1.112,
    eraRequerida: 1,
    niveisRequeridos: 26,
  },
  {
    estagio: 40,
    nome: 'Golem de Ebono',
    sprite: 'golem',
    hpBase: 42,
    hpCrescimento: 1.135,
    ouroBase: 16,
    ouroCrescimento: 1.112,
    eraRequerida: 2,
    niveisRequeridos: 40,
  },
  {
    estagio: 58,
    nome: 'Espirito do Veu',
    sprite: 'espirito',
    hpBase: 44,
    hpCrescimento: 1.135,
    ouroBase: 18,
    ouroCrescimento: 1.112,
    eraRequerida: 4,
    niveisRequeridos: 58,
  },
  {
    estagio: 68,
    nome: 'Succuba do Veu',
    sprite: 'espirito',
    hpBase: 45,
    hpCrescimento: 1.135,
    ouroBase: 19,
    ouroCrescimento: 1.112,
    eraRequerida: 5,
    niveisRequeridos: 68,
  },
  {
    estagio: 80,
    nome: 'Dragao do Crepusculo',
    sprite: 'dragao',
    hpBase: 46,
    hpCrescimento: 1.135,
    ouroBase: 22,
    ouroCrescimento: 1.112,
    eraRequerida: 6,
    niveisRequeridos: 80,
  },
  {
    estagio: 100,
    nome: 'Cavaleiro do Crepusculo',
    sprite: 'golem',
    hpBase: 48,
    hpCrescimento: 1.135,
    ouroBase: 24,
    ouroCrescimento: 1.112,
    eraRequerida: 7,
    niveisRequeridos: 100,
  },
];

/** Inimigo que ocupa um dado estagio (1-based), escalando a partir da def base. */
export function inimigoDoEstagio(estagio: number): {
  def: InimigoDef;
  hp: number;
  ouro: number;
} {
  const desbloqueados = INIMIGOS.filter((i) => i.estagio <= estagio);
  const def = desbloqueados[desbloqueados.length - 1] ?? INIMIGOS[0]!;
  const escala = estagio - def.estagio;
  return {
    def,
    hp: def.hpBase * Math.pow(def.hpCrescimento, escala),
    ouro: def.ouroBase * Math.pow(def.ouroCrescimento, escala),
  };
}

/** Maior estagio que o heroi de nivel `nivel` com `coroas` coroa alcancou. */
export function estagioMaximo(nivel: number, coroas: number): number {
  let estagio = 1;
  for (const def of INIMIGOS) {
    const atende =
      nivel >= def.niveisRequeridos && coroas >= def.eraRequerida ? true : false;
    if (atende) estagio = Math.max(estagio, def.estagio);
  }
  // Alem do ultimo inimigo nomeado, o mundo continua escalando por nivel.
  return Math.max(estagio, Math.floor(1 + nivel / 3));
}
