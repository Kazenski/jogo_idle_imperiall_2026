import type { Rarity, SpriteKey } from '../core/types';

/**
 * ============================================================================
 * ARTE PROCEDURAL (PLACEHOLDER)
 * ============================================================================
 * Sprites em pixel-art desenhados como grade ASCII e rasterizados num canvas em
 * runtime. Sao placeholders 100% deterministicos (sem RNG, sem download), entao:
 *
 *   - o jogo abre offline, sem esperar nenhum asset de rede;
 *   - a GitHub Pages serve um HTML/CSS/JS minusculo;
 *   - trocar por arte real depois e so mexer neste arquivo.
 *
 * COMO TROCAR POR ARTE REAL (sem tocar no resto do jogo):
 *   1. colocar os PNGs em `public/sprites/<chave>.png`
 *   2. preencher `CAMINHO_SPRITE` abaixo
 *   3. nada mais muda — o resto do codigo usa as mesmas chaves.
 * ============================================================================
 */

/** Se um PNG existir para a chave, ele substitui o desenho procedural. */
const CAMINHO_SPRITE: Partial<Record<SpriteKey, string>> = {
  // espada: 'sprites/espada.png',
  // escudo: 'sprites/escudo.png',
};

export const LADO = 16;

/**
 * Paleta. Cada caractere = 1 pixel. SOMENTE chaves de 1 caractere.
 * Para re-tematizar o jogo inteiro, mexa so aqui.
 */
const PALETA: Record<string, string> = {
  K: '#12141c', // contorno
  T: '#9fb0cc', // aco
  P: '#e8f1ff', // aco brilhante
  S: '#a8b3cc', // cinza claro
  G: '#6b7594', // cinza
  I: '#5c6b8a', // ferro
  W: '#eef2fb', // branco
  C: '#bfe9f5', // vidro
  N: '#6b4423', // madeira escura
  M: '#9c6b38', // madeira
  L: '#c99a5b', // madeira clara
  B: '#8a6a3a', // latao
  O: '#c08a3e', // ouro
  Y: '#ffe27a', // ouro claro
  A: '#f2c14e', // amarelo
  '2': '#fff6d5', // nucleo quente (espirito)
  H: '#e0ac69', // pele
  E: '#4f8f52', // verde
  F: '#2f5c34', // verde escuro
  R: '#8f2436', // vermelho escuro
  V: '#f5795c', // vermelho claro
};

const DOT = '.';

/** Normaliza uma linha para exatamente LADO caracteres. */
function linha(bruta: string): string {
  return bruta.padEnd(LADO, DOT).slice(0, LADO);
}

// ---------------------------------------------------------------------------
// Grades 16x16. Hand-pixel verificadas: todas as linhas tem 16 caracteres.
// ---------------------------------------------------------------------------
const SPRITES: Record<SpriteKey, string[]> = {
  espada: [
    '................',
    '...........TT...',
    '..........TTPP..',
    '.........TTPP...',
    '........TTPP....',
    '.......TTPP.....',
    '......TTPP......',
    '.....TTPP.......',
    '....TTPP........',
    '...TTPP.........',
    '..OOOO..........',
    '.OYYOO..........',
    '..NNN...........',
    '..NNN...........',
    '..NNN...........',
    '..KKK...........',
  ],
  escudo: [
    '................',
    '....KKKKKKKK....',
    '...KSSSSSSSK....',
    '..KSBBBOOSSSK...',
    '..KSSOYYOOSSK...',
    '..KSSSBBOBSSK...',
    '..KSSSSOOSSSK...',
    '..KSSSSOOSSSK...',
    '..KSSSSSSSSSK...',
    '..KKSSSSSSSSK...',
    '...KSSSSSSSSK...',
    '....KSSSSSSK....',
    '.....KSSSSK.....',
    '......KSSK......',
    '.......KK.......',
    '................',
  ],
  arco: [
    '................',
    '.........MMM....',
    '........MLLM....',
    '.......MLLM.....',
    '......MLLM......',
    '.....MLLM.......',
    '....MLLM........',
    '...MLLM.........',
    '..MLLM..........',
    '..MLM...........',
    '..MKM...........',
    '..M.N...........',
    '..M.N...........',
    '...K............',
    '................',
    '................',
  ],
  elmo: [
    '................',
    '................',
    '....KKKKKKKK....',
    '...KIIIBBBBIK...',
    '..KIITTTTTTTIK..',
    '..KITTKKKTTIK...',
    '..KTTKWWWKWTTK..',
    '..KTTKWWWKWTTK..',
    '..KITTKKKTTIK...',
    '..KIITTTTTTTIK..',
    '..KIIIBBBBBIK...',
    '...KIIBBBBIK....',
    '....KKKKKKKK....',
    '......KBBK......',
    '.....KBBBBK.....',
    '................',
  ],
  pocao: [
    '................',
    '......KKKK......',
    '......KWWK......',
    '......KWWK......',
    '......KWWK......',
    '.....KKWWKK.....',
    '....KCCCCCCK....',
    '...KCTTTTTTCK...',
    '..KCTAAAAAACK...',
    '..KCTAAAAAACK...',
    '..KCTAAAAAACK...',
    '...KCCTTTTTCK...',
    '....KCCTTTCK....',
    '.....KKCCCKK....',
    '.......KKK......',
    '................',
  ],
  coroa: [
    '................',
    '................',
    '..K..........K..',
    '..KY........YK..',
    '..KYKKKKKKKKYK..',
    '..KYKOYYYOOKYK..',
    '..KYKOOOOOOOYK..',
    '..KYKOYYYOOKYK..',
    '..KYKOOOOOOOYK..',
    '..KYKOOOOOOOYK..',
    '..KKYKOOOOOYKK..',
    '...KYKOOOOKYK...',
    '...KYYKOOKYYK...',
    '....KKKKKKKK....',
    '................',
    '................',
  ],
  martelo: [
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '..KTTTTTTTTTTK..',
    '..KTPPPPPPTTTK..',
    '..KTTTTTTTTTTK..',
    '..KKKKKKKKKKKK..',
    '.......GN.......',
    '......GNN.......',
    '......GNN.......',
    '......GNN.......',
    '.....GGNN.......',
    '.....GNNN.......',
    '....GGNNN.......',
    '...KGGNNN.......',
    '...KK..NN.......',
  ],
  capa: [
    '................',
    '......KRRK......',
    '.....KRVRRK.....',
    '....KRVVRVRK....',
    '...KRVVEVVVRK...',
    '..KRVVEVVVVRK...',
    '..KRVEEEEEVRK...',
    '.KRVEEEEEVVRK...',
    '.KRVEEEEEEVVRK..',
    '.KRVEEEEEEVVVRK.',
    'KRVEEEEEEEEVVRK.',
    'KRVEEEEEEEEEVRK.',
    'KRVVVVVVVVVVRRK.',
    'KRRRRRRRRRRRRRK.',
    'KKKKKKKKKKKKKKK.',
    '................',
  ],
  bau: [
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '..KNNNNNNNNNNK..',
    '..KNMMMMMMMMNK..',
    '..KNMNNNNNNMNK..',
    '..KNMNMMMMNMNK..',
    '..KNMMNOONMMNK..',
    '..KNMMNOONMMNK..',
    '..KNMNNNNNNMNK..',
    '..KNMMMMMMMMNK..',
    '..KNMNNNNNNMNK..',
    '..KNMMMMMMMMNK..',
    '..KNNNNNNNNNNK..',
    '..KKKKKKKKKKKK..',
    '................',
  ],
  golem: [
    '................',
    '................',
    '...KKK....KKK...',
    '..KGGGK..KGGGK..',
    '..KGGGK..KGGGK..',
    '..KGGGGKKGGGGK..',
    '..KGGRRGGRRGGK..',
    '..KGGRRGGRRGGK..',
    '..KGGGGGGGGGGK..',
    '..KGGKKGGKKGGK..',
    '.KGGGK.KGGK.GGK.',
    '.KGGGKKGGGKKGGK.',
    '.KGGGGGGGGGGGGK.',
    '.KGGGGGGGGGGGGK.',
    '..KKKKKKKKKKKK..',
    '................',
  ],
  dragao: [
    '.........KK.....',
    '........KEEK....',
    '.......KEKEKKK..',
    '.KKKKKKKOOOOOOK.',
    'KREEEEEOOOEEEEOK',
    'KREEEEOOOOOOOEOK',
    'KROOOOOMMMMMOOOK',
    'KROOOMMMMMMMOOOK',
    '.KOHMMMMMMMMOHOK',
    '.KOHMMMMMMMHHHHK',
    '..KOHHMMMMMHHHHK',
    '..K.RHHMMMHHH.RK',
    '...KKHHHHHHHHKK.',
    '....KK..HHHHKK..',
    '........KKKK....',
    '................',
  ],
  espirito: [
    '................',
    '.......KK.......',
    '......KAAK......',
    '.....KAO2OAK....',
    '....KAO22L2AK...',
    '....KAO2L2LAK...',
    '...KAOO22LLOAK..',
    '...KAOO22LLOAK..',
    '..KAOOO22LOOAK..',
    '..KAOOO22LOOAK..',
    '.KAOOO22LLOOAK..',
    '.KAOOO22LLOOAK..',
    '.KAOOO22LLOOAK..',
    '..KAAA2222AAK...',
    '...KKK2222KKK...',
    '......KKKKK.....',
  ],
  gato: [
    '................',
    '................',
    '..K..........K..',
    '..KK........KK..',
    '..KFK......KFK..',
    '..KFKKKKKKKKFK..',
    '..KFKWWWWWWKFK..',
    '..KFKWKWWKWKFK..',
    '..KFKWWWWWWKFK..',
    '..KFKWWKKWWKFK..',
    '..KFFKKKKKKKFK..',
    '..KFFFKKKKFFFK..',
    '...KFFK..KFFK...',
    '....KKK..KKK....',
    '................',
    '................',
  ],
  ogro: [
    '................',
    '................',
    '....KKKKKKKK....',
    '...KHHHHHHHHK...',
    '...KHWWKKWWHK...',
    '...KHHHHHHHHK...',
    '....KHHHHHHK....',
    '..KKKKHHHHKKKK..',
    '.KHHHHHHHHHHHHK.',
    '.KHHHHHHHHHHHHK.',
    '.KHHEHHHHHHEHHK.',
    '.KHHHHHHHHHHHHK.',
    '..KHHHHHHHHHHK..',
    '..KHHHK..KHHHK..',
    '....KKK....KKK..',
    '................',
  ],
  goblin: [
    '................',
    '................',
    '.....KKKKKK.....',
    '....KEHHHHHHEK..',
    '....KEHWKKWHEK..',
    '....KEHHHHHHEK..',
    '....KHHHHHHHHK..',
    '.....KHHHHHK....',
    '...KKKKHHHHKKKK.',
    '.KEHHHHHHHHHHEK.',
    '..KHHHHHHHHHHK..',
    '...KHHHHHHHHHK..',
    '....KHHK..KHHK..',
    '....KKK....KKK..',
    '................',
    '................',
  ],
  sereia: [
    '................',
    '.......KK.......',
    '......KBBK......',
    '.....KBBBBBK....',
    '.....KWWWWWK....',
    '.....KWWKWWK....',
    '......KWWWK.....',
    '....KKHHHHKK....',
    '..KKHHHHHHHHKK..',
    '.KHHHHHHHHHHHHK.',
    '.KHHHHHHLLHHHK..',
    '..KHHHHLLHHHHK..',
    '..KHHHHLLHHHHK..',
    '...KHHHLLHHHK...',
    '....KKKKKKKK....',
    '................',
  ],
  morcego: [
    '................',
    '................',
    '.KK..........KK.',
    'KWWK........KWWK',
    'KWLVK......KVWK.',
    '.KWLVVKKKKVVWK..',
    '..KLVVVVVVVVLK..',
    '..KLVVVVVVVVLK..',
    '..KLVVKKKKVVLK..',
    '..KLVK.WW.KVLK..',
    '..KLK..WW..KLK..',
    '...KK..WW..KK...',
    '......KKKK......',
    '.......KK.......',
    '................',
    '................',
  ],
};

/** Bordas por raridade, aplicadas no frame da cartinha. */
export const COR_RARIDADE: Record<Rarity, string> = {
  comum: '#6b7594',
  incomum: '#57a95c',
  raro: '#4a86e8',
  epico: '#a45ce0',
  lendario: '#f2a53e',
};

export const NOME_RARIDADE: Record<Rarity, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Epico',
  lendario: 'Lendario',
};

/** Rasteriza um sprite procedural num canvas, nitido (sem interpolacao). */
export function spriteParaCanvas(chave: SpriteKey, escala = 1): HTMLCanvasElement {
  const grade = SPRITES[chave] ?? SPRITES.espada!;
  const canvas = document.createElement('canvas');
  canvas.width = LADO * escala;
  canvas.height = LADO * escala;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < LADO; y++) {
    const atual = linha(grade[y] ?? '');
    for (let x = 0; x < LADO; x++) {
      const ch = atual[x] ?? DOT;
      if (ch === DOT) continue;
      const cor = PALETA[ch];
      if (!cor) continue;
      ctx.fillStyle = cor;
      ctx.fillRect(x * escala, y * escala, escala, escala);
    }
  }
  return canvas;
}

const cacheDataUri = new Map<string, string>();

/** URL de dados (data URI) do sprite — usado nos <img> da UI DOM. */
export function spriteDataUri(chave: SpriteKey, escala = 4): string {
  const id = `${chave}@${escala}`;
  const emCache = cacheDataUri.get(id);
  if (emCache) return emCache;

  const caminho = CAMINHO_SPRITE[chave];
  const uri = caminho ?? spriteParaCanvas(chave, escala).toDataURL();
  cacheDataUri.set(id, uri);
  return uri;
}

/** Nome legivel de um sprite, para acessibilidade (aria-label / alt). */
export const ROTULO_SPRITE: Record<SpriteKey, string> = {
  espada: 'Espada',
  escudo: 'Escudo',
  arco: 'Arco',
  elmo: 'Elmo',
  pocao: 'Pocao',
  coroa: 'Coroa',
  martelo: 'Martelo',
  capa: 'Capa',
  bau: 'Bau do tesouro',
  golem: 'Golem de pedra',
  dragao: 'Dragao',
  espirito: 'Espirito',
  gato: 'Gato',
  ogro: 'Ogro',
  goblin: 'Goblin',
  sereia: 'Sereia',
  morcego: 'Morcego',
};

/** Converte a chave de sprite vinda do conteudo, com fallback seguro. */
export function spriteDeInimigo(chave: string): SpriteKey {
  return (chave in SPRITES ? chave : 'ogro') as SpriteKey;
}