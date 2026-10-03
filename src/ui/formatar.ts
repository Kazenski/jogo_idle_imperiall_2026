/**
 * Formatacao de numeros no estilo "idle".
 *
 * Regra: numeros grandes viram 1.23K / 4.56M / 7.89B / 1.01T. Sem abreviacao
 * abaixo de 1000 (mostra inteiro), para o jogador ler o preco exato de uma
 * carta barata sem fazer conta de cabeca.
 */

const SUFIXOS = [
  { limite: 1e12, sufixo: 'T' },
  { limite: 1e9, sufixo: 'B' },
  { limite: 1e6, sufixo: 'M' },
  { limite: 1e3, sufixo: 'K' },
] as const;

/**
 * Abrevia com 2 casas decimais significantes. `1234567 -> 1.23M`.
 *
 * DETALHE IMPORTANTE: abaixo de 10 mostramos decimais (`0.1/s` e nao `0/s`).
 * No inicio do jogo todo valor de producao e fracionario — uma espada rende
 * 0.1/s. Arredondar para inteiro faz o jogador ver "0/s" na loja inteira e
 * achar que o jogo travou.
 */
export function abreviar(valor: number): string {
  if (!Number.isFinite(valor)) return '0';
  const abs = Math.abs(valor);

  if (abs < 10) {
    // 0.1 -> "0.1"  /  0.01 -> "0.01"  /  2.5 -> "2.5"
    if (abs === 0) return '0';
    if (abs < 0.01) return valor.toExponential(1).replace('e-', 'e-');
    return String(Number(valor.toFixed(2)));
  }

  if (abs < 1000) return String(Math.floor(valor));

  for (const { limite, sufixo } of SUFIXOS) {
    if (abs >= limite) {
      const escala = valor / limite;
      const texto = escala.toFixed(escala < 10 ? 2 : escala < 100 ? 1 : 0);
      return `${texto}${sufixo}`;
    }
  }
  return String(Math.floor(valor));
}

/** Igual `abreviar`, mas sempre com o sufixo de tempo por segundo. */
export function porSegundo(valor: number): string {
  return `${abreviar(valor)}/s`;
}

/** Multiplicador em porcentagem, ex.: 1.34 -> 134%. */
export function porcentagem(fracao: number, casas = 0): string {
  return `${(fracao * 100).toFixed(casas)}%`;
}

/** Duracao legivel: `2h 14min`, `3d 8h`, `45s`. */
export function duracao(ms: number): string {
  const totalSeg = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSeg / 86_400);
  const h = Math.floor((totalSeg % 86_400) / 3_600);
  const m = Math.floor((totalSeg % 3_600) / 60);
  const s = totalSeg % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

/** `+12,3%` com sinal explicito. */
export function comSinal(valor: number, sufixo = ''): string {
  const sinal = valor >= 0 ? '+' : '-';
  return `${sinal}${abreviar(Math.abs(valor))}${sufixo}`;
}