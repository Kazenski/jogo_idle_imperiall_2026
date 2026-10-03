import { previaCompra } from '../core/combate';
import { cartasDisponiveis } from '../core/estado';
import { COR_RARIDADE, NOME_RARIDADE, ROTULO_SPRITE, spriteDataUri } from '../art/sprites';
import type { CardDef, EstadoDerivado, SaveData } from '../core/types';
import { abreviar } from './formatar';
import { botao, definirTexto, grupoQuantidade, h } from './dom';
import type { SelecaoQuantidade } from './dom';

export interface LojaRefs {
  raiz: HTMLElement;
  definirQuantidade: (q: SelecaoQuantidade) => void;
  atualizar: (save: SaveData, stats: EstadoDerivado) => void;
}

interface LinhaCarta {
  def: CardDef;
  elemento: HTMLElement;
  elNivel: HTMLElement;
  elCps: HTMLElement;
  elDps: HTMLElement;
  elPreco: HTMLElement;
  elGanho: HTMLElement;
  botaoComprar: HTMLButtonElement;
 aufenvel: HTMLElement;
}

/**
 * Loja — a tela que mais importa num idle game.
 *
 * DECISAO DE UX: cada linha mostra sempre `custo do lote -> ganho do lote`.
 * Mostrar so "custa X" obriga o jogador a fazer conta mental para saber se
 * comprar 10 vale a pena; mostrar "custa X -> +Y/s" e o que fecha a compra.
 */
export function criarLoja(
  aoComprar: (cardId: string) => void,
  aoMudarQuantidade: (q: SelecaoQuantidade) => void,
): LojaRefs {
  let quantidade: SelecaoQuantidade = 1;

  const lista = h('div', { class: 'loja-lista' });
  const grupo = grupoQuantidade(quantidade, (q) => {
    quantidade = q;
    aoMudarQuantidade(q);
  });
  const contador = h('span', { class: 'loja-contador' });

  const raiz = h('section', { class: 'tela tela--loja', 'aria-label': 'Loja' }, [
    h('div', { class: 'loja-topo' }, [grupo, contador]),
    lista,
  ]);

  const linhas = new Map<string, LinhaCarta>();

  /** Cria as linhas novas e mantem a lista ordenada por custo. */
  function garantirLinhas(save: SaveData): void {
    const disponiveis = cartasDisponiveis(save);
    const ids = new Set(disponiveis.map((c) => c.id));

    // Remove as que bloquearam de novo (ex.: um reset de nivel).
    for (const [id, linha] of linhas) {
      if (ids.has(id)) continue;
      linha.elemento.remove();
      linhas.delete(id);
    }

    for (const def of disponiveis) {
      if (linhas.has(def.id)) continue;
      const linha = criarLinha(def, aoComprar);
      linhas.set(def.id, linha);
      lista.append(linha.elemento);
    }

    // Barato -> caro. `append` em ordem ja reordena o DOM existente.
    for (const linha of [...linhas.values()].sort((a, b) => a.def.custoBase - b.def.custoBase)) {
      lista.append(linha.elemento);
    }
  }

  return {
    raiz,
    definirQuantidade(q) {
      quantidade = q;
      for (const b of grupo.querySelectorAll<HTMLButtonElement>('.qtd-btn')) {
        b.setAttribute('aria-pressed', String(b.dataset.qtd === String(q)));
      }
    },
    atualizar(save, stats) {
      garantirLinhas(save);
      let visiveis = 0;

      for (const linha of linhas.values()) {
        const nivel = save.cartas[linha.def.id] ?? 0;
        const previa = previaCompra(save, linha.def.id, quantidade, stats);

        definirTexto(linha.elNivel, nivel > 0 ? `Nv. ${nivel}` : '—');
        definirTexto(
          linha.elCps,
          `+${abreviar(stats.cpsPorCarta[linha.def.id] ?? 0)}/s`,
        );
        definirTexto(
          linha.elDps,
          `${abreviar(stats.dpsPorCarta[linha.def.id] ?? 0)} dano/s`,
        );

        if (previa.quantidade <= 0) {
          definirTexto(linha.elPreco, 'Sem ouro');
          definirTexto(linha.elGanho, '');
          linha.botaoComprar.disabled = true;
          linha.botaoComprar.textContent = 'Max';
          linha.aufenvel.dataset.estado = 'bloqueado';
        } else {
          definirTexto(linha.elPreco, `${abreviar(previa.custo)} ouro`);
          definirTexto(
            linha.elGanho,
            `x${previa.quantidade}  +${abreviar(previa.ganhoCps)}/s  +${abreviar(previa.ganhoDps)} dano/s`,
          );
          linha.botaoComprar.disabled = !previa.acessivel;
          linha.botaoComprar.textContent = `Comprar ${previa.quantidade}`;
          linha.aufenvel.dataset.estado = previa.acessivel ? 'ok' : 'caro';
        }
        visiveis++;
      }

      definirTexto(contador, `${visiveis} cartas`);
    },
  };
}

function criarLinha(def: CardDef, aoComprar: (cardId: string) => void): LinhaCarta {
  const elNivel = h('span', { class: 'linha-nivel' });
  const elCps = h('span', { class: 'linha-cps' });
  const elDps = h('span', { class: 'linha-dps' });
  const elPreco = h('span', { class: 'linha-preco' });
  const elGanho = h('span', { class: 'linha-ganho' });

  const botaoComprar = botao('Comprar', () => aoComprar(def.id), { class: 'linha-comprar' });

  const aufenvel = h(
    'article',
    {
      class: 'linha-carta',
      dataset: { estado: 'caro', id: def.id },
    },
    [
      h('div', {
        class: 'linha-sprite',
        style: `border-color:${COR_RARIDADE[def.raridade]}`,
      }, [
        h('img', {
          src: spriteDataUri(def.sprite, 4),
          alt: ROTULO_SPRITE[def.sprite],
          width: 64,
          height: 64,
          loading: 'lazy',
        }),
      ]),
      h('div', { class: 'linha-info' }, [
        h('div', { class: 'linha-topo' }, [
          h('span', { class: 'linha-nome' }, [def.nome]),
          h('span', {
            class: 'linha-raridade',
            style: `color:${COR_RARIDADE[def.raridade]}`,
          }, [NOME_RARIDADE[def.raridade]]),
          elNivel,
        ]),
        h('div', { class: 'linha-stats' }, [elCps, elDps]),
        h('p', { class: 'linha-desc' }, [def.descricao]),
        h('div', { class: 'linha-compra' }, [elPreco, botaoComprar]),
        elGanho,
      ]),
    ],
  );

  return {
    def,
    elemento: aufenvel,
    elNivel,
    elCps,
    elDps,
    elPreco,
    elGanho,
    botaoComprar,
    aufenvel,
  };
}