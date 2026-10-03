/**
 * Gera os icones PNG do PWA a partir de uma grade pixel-art, sem dependencia
 * externa. Rodar com `npm run icones` sempre que a arte mudar.
 *
 *   node scripts/gerar-icones.mjs
 *
 * Os arquivos gerados sao versionados no git: sao pequenos e o PWA precisa
 * deles no primeiro acesso, antes do service worker assumir.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = resolve(RAIZ, 'public/icons');

/** Mesma paleta de `src/art/sprites.ts`. */
const PALETA = {
  K: [0x12, 0x14, 0x1c],
  O: [0xc0, 0x8a, 0x3e],
  Y: [0xff, 0xe2, 0x7a],
  B: [0x8a, 0x6a, 0x3a],
  T: [0x9f, 0xb0, 0xcc],
  E: [0x4f, 0x8f, 0x52],
};

/** Coroa 16x16 sobre fundo escuro. */
const GRADE = [
  '................',
  '................',
  '..K..........K..',
  '..KY........YK..',
  '..KYKKKKKKKKYK..',
  '..KYKOYYYOOKYK..',
  '..KYKOOOOOOOYK..',
  '..KYKOYYYOOKYK..',
  '..KYKOOOOOOOYK..',
  '..KKYKOOOOOYKK..',
  '...KYKOOOOKYK...',
  '...KYYKOOKYYK...',
  '....KKKKKKKK....',
  '..TTTTTTTTTTTT..',
  '..BBBBBBBBBBBB..',
  '................',
];

const FUNDO = [0x12, 0x15, 0x1d];

function pixel(x, y) {
  const ch = GRADE[y]?.[x] ?? '.';
  return ch === '.' ? null : (PALETA[ch] ?? FUNDO);
}

// ---------------------------------------------------------------------------
// PNG minimo, escrito a mao (8-bit RGBA, sem filtro). Evita bring-in de
// `sharp`/`canvas` so para gerar tres arquivos.
// ---------------------------------------------------------------------------

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(tipo, dados) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([len, corpo, crc]);
}

function png(largura, altura, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Cada linha: filtro 0 + pixels.
  const passo = largura * 4;
  const bruto = Buffer.alloc((passo + 1) * altura);
  for (let y = 0; y < altura; y++) {
    bruto[y * (passo + 1)] = 0;
    rgba.copy(bruto, y * (passo + 1) + 1, y * passo, (y + 1) * passo);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(bruto, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function gerar(tamanho, { maskable = false } = {}) {
  const rgba = Buffer.alloc(tamanho * tamanho * 4);

  // Mascable: o Android recorta as bordas, entao a arte ocupa so 60% central.
  const escala = maskable ? Math.floor(tamanho * 0.6) : tamanho;
  const origem = Math.floor((tamanho - escala) / 2);
  const passo = escala / 16;

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const gx = Math.floor((x - origem) / passo);
      const gy = Math.floor((y - origem) / passo);
      const dentro = maskable ? gx >= 0 && gx < 16 && gy >= 0 && gy < 16 : true;
      const cor = dentro ? pixel(gx, gy) : null;

      const i = (y * tamanho + x) * 4;
      if (cor) {
        rgba[i] = cor[0];
        rgba[i + 1] = cor[1];
        rgba[i + 2] = cor[2];
        rgba[i + 3] = 255;
      } else {
        rgba[i] = FUNDO[0];
        rgba[i + 1] = FUNDO[1];
        rgba[i + 2] = FUNDO[2];
        rgba[i + 3] = 255;
      }
    }
  }
  return png(tamanho, tamanho, rgba);
}

mkdirSync(SAIDA, { recursive: true });

const alvos = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
];

for (const [nome, tamanho, opts] of alvos) {
  const dados = gerar(tamanho, opts);
  writeFileSync(resolve(SAIDA, nome), dados);
  console.log(`${nome}  ${tamanho}x${tamanho}  ${(dados.length / 1024).toFixed(1)} KB`);
}