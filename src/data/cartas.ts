import type { CardDef } from '../core/types';

/**
 * ============================================================================
 * CONTEUDO — CARTAS
 * ============================================================================
 * Este e o arquivo que voce substitui pelo lore real do Imperiall RPG.
 *
 * COMO PREENCHER (nada aqui e codigo, e so dado):
 *   id          slug unico e estavel. Nunca mude depois de publicar, ou os
 *               saves dos jogadores perdem a contagem daquela carta.
 *   custoBase   ouro para a 1a unidade. Espaco entre 10 e 1e9.
 *   custoCrescimento  quanto o custo multiplica a cada nivel.
 *                      1.15 = suave (inicio)  /  1.25 = agressivo (fim de jogo)
 *   cpsBase     ouro/segundo de UMA unidade no nivel 1.
 *   dpsBase     dano/segundo de UMA unidade no nivel 1.
 *   niveisRequeridos  nivel do heroi para a carta aparecer na loja.
 *   eraRequerida      Coroa minima para aparecer (so pra cartas de prestige).
 *
 * REGRA DE BALANCEAMENTO: a razao cpsBase/custoBase deve cair conforme a carta
 * sobe de tier — o primeiro purchase deve levar segundos, o ultimo, horas.
 * ============================================================================
 */
export const CARTAS: CardDef[] = [
  {
    id: 'espada-ferro',
    nome: 'Espada de Ferro',
    descricao: 'Aco simples do arsenal de infantaria. Confiavel e barata.',
    raridade: 'comum',
    sprite: 'espada',
    custoBase: 10,
    custoCrescimento: 1.15,
    cpsBase: 0.1,
    dpsBase: 1.5,
    eraRequerida: 0,
    niveisRequeridos: 0,
  },
  {
    id: 'escudo-madeira',
    nome: 'Escudo de Madeira',
    descricao: 'Tacos reforçados com couro. Segura o primeiro golpe sempre.',
    raridade: 'comum',
    sprite: 'escudo',
    custoBase: 15,
    custoCrescimento: 1.15,
    cpsBase: 0.12,
    dpsBase: 0.8,
    eraRequerida: 0,
    niveisRequeridos: 0,
  },
  {
    id: 'arco-cacador',
    nome: 'Arco do Cacador',
    descricao: 'Feito de teixo branco. Nao erra a distancia que foi calibrado.',
    raridade: 'incomum',
    sprite: 'arco',
    custoBase: 110,
    custoCrescimento: 1.16,
    cpsBase: 0.9,
    dpsBase: 4.2,
    eraRequerida: 0,
    niveisRequeridos: 5,
  },
  {
    id: 'pocao-vida',
    nome: 'Pocao de Vida',
    descricao: 'Cozida na hora pela curandeira da vila. Amarga, mas cura.',
    raridade: 'incomum',
    sprite: 'pocao',
    custoBase: 260,
    custoCrescimento: 1.16,
    cpsBase: 2.1,
    dpsBase: 2.6,
    eraRequerida: 0,
    niveisRequeridos: 8,
  },
  {
    id: 'elmo-imperial',
    nome: 'Elmo Imperial',
    descricao: 'Bronze da fundicao da capital. O brasão ja foi lido em mil bandeiras.',
    raridade: 'raro',
    sprite: 'elmo',
    custoBase: 1_600,
    custoCrescimento: 1.17,
    cpsBase: 12,
    dpsBase: 14,
    eraRequerida: 0,
    niveisRequeridos: 12,
  },
  {
    id: 'capa-vento',
    nome: 'Capa do Vento',
    descricao: 'Tecida com fio de prata. Some quando o inimigo pisca.',
    raridade: 'raro',
    sprite: 'capa',
    custoBase: 4_200,
    custoCrescimento: 1.17,
    cpsBase: 31,
    dpsBase: 22,
    eraRequerida: 0,
    niveisRequeridos: 18,
  },
  {
    id: 'martelo-runa',
    nome: 'Martelo de Runa',
    descricao: 'Gravado com o alfabeto anterior ao reino. Vibra na hora do golpe.',
    raridade: 'epico',
    sprite: 'martelo',
    custoBase: 26_000,
    custoCrescimento: 1.18,
    cpsBase: 205,
    dpsBase: 165,
    eraRequerida: 0,
    niveisRequeridos: 24,
  },
  {
    id: 'coroa-ferro',
    nome: 'Coroa de Ferro',
    descricao: 'Nenhum rei usou. Todo rei tentou.',
    raridade: 'epico',
    sprite: 'coroa',
    custoBase: 62_000,
    custoCrescimento: 1.18,
    cpsBase: 490,
    dpsBase: 310,
    eraRequerida: 0,
    niveisRequeridos: 30,
  },
  {
    id: 'bau-barbaro',
    nome: 'Bau do Barba-Coisa',
    descricao: 'Contentor de um avô que nao contou aonde esteve. Ainda rende.',
    raridade: 'epico',
    sprite: 'bau',
    custoBase: 310_000,
    custoCrescimento: 1.19,
    cpsBase: 2_450,
    dpsBase: 1_850,
    eraRequerida: 1,
    niveisRequeridos: 36,
  },
  {
    id: 'golem-pedra',
    nome: 'Golem de Pedra',
    descricao: 'Reativado por ordem do Regente. Nao discute, nao negocia.',
    raridade: 'epico',
    sprite: 'golem',
    custoBase: 2_100_000,
    custoCrescimento: 1.2,
    cpsBase: 16_500,
    dpsBase: 13_200,
    eraRequerida: 2,
    niveisRequeridos: 44,
  },
  {
    id: 'gato-sorte',
    nome: 'Gato de Sorte',
    descricao: 'Dorme em cima do tesouro. Leave-lo e perder a sorte.',
    raridade: 'epico',
    sprite: 'gato',
    custoBase: 11_000_000,
    custoCrescimento: 1.2,
    cpsBase: 92_000,
    dpsBase: 56_000,
    eraRequerida: 3,
    niveisRequeridos: 52,
  },
  {
    id: 'espirito-chama',
    nome: 'Espirito da Chama',
    descricao: 'Sairam da fornalha do reino. Servem a alguem, e esse alguem sou eu.',
    raridade: 'lendario',
    sprite: 'espirito',
    custoBase: 62_000_000,
    custoCrescimento: 1.21,
    cpsBase: 560_000,
    dpsBase: 425_000,
    eraRequerida: 4,
    niveisRequeridos: 62,
  },
  {
    id: 'dragao-anciao',
    nome: 'Dragao Anciao',
    descricao: 'A unica criatura que o conselho do reino ainda tema em voz baixa.',
    raridade: 'lendario',
    sprite: 'dragao',
    custoBase: 520_000_000,
    custoCrescimento: 1.22,
    cpsBase: 3_600_000,
    dpsBase: 3_100_000,
    eraRequerida: 6,
    niveisRequeridos: 74,
  },
];

export const CARTAS_POR_ID: Record<string, CardDef> = Object.fromEntries(
  CARTAS.map((c) => [c.id, c]),
);