/**
 * Helpers de DOM.
 *
 * `h()` aceita `aria-*`, `data-*` e `style` sem escape de tipo: escrever
 * `setAttribute` a mao em cada elemento deixa o template do dobro do tamanho.
 */

type Atributos =
  | string
  | number
  | boolean
  | null
  | undefined;

/** Props que o TS aceita em elementos, mais os atributos que exigem setAttribute. */
type PropsEl = {
  class?: string;
  style?: string;
  dataset?: Record<string, string>;
  id?: string;
  title?: string;
  role?: string;
  type?: string;
  rows?: number;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  value?: string;
  readonly?: boolean;
  checked?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  innerHTML?: string;
  textContent?: string;
} & {
  [chave: string]: Atributos | Record<string, string>;
};

/** Fecha um elemento. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: PropsEl = {},
  filhos: (Node | string | null)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  for (const [chave, valor] of Object.entries(props)) {
    if (valor == null || valor === false) continue;

    if (chave === 'dataset' && typeof valor === 'object') {
      Object.assign(el.dataset, valor as Record<string, string>);
    } else if (chave === 'style' && typeof valor === 'string') {
      el.setAttribute('style', valor);
    } else if (chave.startsWith('aria-') || chave.startsWith('data-')) {
      el.setAttribute(chave, String(valor));
    } else if (chave in el) {
      (el as unknown as Record<string, unknown>)[chave] = valor;
    } else {
      el.setAttribute(chave, valor === true ? '' : String(valor));
    }
  }

  for (const filho of filhos) {
    if (filho == null) continue;
    el.append(typeof filho === 'string' ? document.createTextNode(filho) : filho);
  }

  return el;
}

/** Botao com haptic no Android e protecao contra clique duplo rapido. */
export function botao(
  texto: string,
  aoClicar: () => void,
  opts: { class?: string; ariaLabel?: string; tipo?: 'button' | 'submit' } = {},
): HTMLButtonElement {
  const el = h('button', {
    type: opts.tipo ?? 'button',
    class: opts.class ?? 'btn',
    'aria-label': opts.ariaLabel,
  });
  el.textContent = texto;
  el.addEventListener('click', (ev) => {
    ev.preventDefault();
    if ('vibrate' in navigator) navigator.vibrate?.(12);
    aoClicar();
  });
  return el;
}

/**
 * Atualiza o texto so quando mudou.
 *
 * `textContent = x` em 200 elementos, 10x/segundo, mantem ~2000 nos de DOM por
 * segundo e derruba a taxa de quadros num celular medio. Esta checagem e o que
 * mantem o jogo fluido.
 */
export function definirTexto(el: HTMLElement, texto: string): void {
  if (el.textContent !== texto) el.textContent = texto;
}

export function definirLargura(el: HTMLElement, fracao: number): void {
  const pct = `${Math.max(0, Math.min(1, fracao)) * 100}%`;
  if (el.style.width !== pct) el.style.width = pct;
}

const TIPOS_QUANTIDADE = [1, 10, 50, 100, 'max'] as const;
export type SelecaoQuantidade = (typeof TIPOS_QUANTIDADE)[number];

/** Selector x1 / x10 / x50 / x100 / Max. */
export function grupoQuantidade(
  selecaoAtual: SelecaoQuantidade,
  aoMudar: (v: SelecaoQuantidade) => void,
): HTMLElement {
  const container = h('div', {
    class: 'qtd-grupo',
    role: 'group',
    'aria-label': 'Quantidade',
  });

  const botoes = TIPOS_QUANTIDADE.map((qtd) => {
    const b = botao(
      qtd === 'max' ? 'Max' : `x${qtd}`,
      () => {
        for (const outro of botoes) {
          outro.setAttribute('aria-pressed', String(outro === b));
        }
        aoMudar(qtd);
      },
      { class: 'qtd-btn' },
    );
    b.dataset.qtd = String(qtd);
    b.setAttribute('aria-pressed', String(qtd === selecaoAtual));
    container.append(b);
    return b;
  });

  return container;
}