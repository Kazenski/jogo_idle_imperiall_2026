import { CARTAS_POR_ID } from '../data/cartas';
import { COR_RARIDADE, NOME_RARIDADE, ROTULO_SPRITE, spriteDataUri } from '../art/sprites';
import type { EstadoDerivado, SaveData } from '../core/types';
import { abreviar, porcentagem } from './formatar';
import { definirTexto, h } from './dom';

export interface ColecaoRefs {
  raiz: HTMLElement;
  atualizar: (save: SaveData, stats: EstadoDerivado) => void;
}

interface Cartao {
  elemento: HTMLElement;
  elNivel: HTMLElement;
  elCps: HTMLElement;
  elShare: HTMLElement;
}

/**
 * Colecao — o "album de cartinhas" (como na referencia 2).
 *
 * Mostra todas as cartas do conteudo, inclusive as ainda bloqueadas, para o
 * jogador ver o que falta. Cartas bloqueadas ficam esmaecidas e mostram o
 * requisito.
 */
export function criarColecao(): ColecaoRefs {
  const grade = h('div', { class: 'colecao-grade' });
  const raiz = h('section', { class: 'tela tela--colecao', 'aria-label': 'Colecao' }, [
    h('div', { class: 'colecao-topo' }, [h('h2', { class: 'tela-titulo' }, ['Colecao'])]),
    grade,
  ]);

  const cartoes = new Map<string, Cartao>();

  function garantirCartoes(): void {
    for (const def of Object.values(CARTAS_POR_ID)) {
      if (cartoes.has(def.id)) continue;

      const elNivel = h('span', { class: 'cartao-nivel' });
      const elCps = h('span', { class: 'cartao-cps' });
      const elShare = h('span', { class: 'cartao-share' });

      const elemento = h(
        'article',
        { class: 'cartao', dataset: { id: def.id, estado: 'bloqueado' } },
        [
          h('div', {
            class: 'cartao-moldura',
            style: `border-color:${COR_RARIDADE[def.raridade]}`,
          }, [
            h('img', {
              src: spriteDataUri(def.sprite, 5),
              alt: ROTULO_SPRITE[def.sprite],
              width: 80,
              height: 80,
              loading: 'lazy',
            }),
            h('span', {
              class: 'cartao-raridade',
              style: `background:${COR_RARIDADE[def.raridade]}`,
            }, [NOME_RARIDADE[def.raridade]]),
          ]),
          h('h3', { class: 'cartao-nome' }, [def.nome]),
          elNivel,
          elCps,
          elShare,
          h('p', { class: 'cartao-desc' }, [def.descricao]),
        ],
      );

      grade.append(elemento);
      cartoes.set(def.id, { elemento, elNivel, elCps, elShare });
    }
  }

  return {
    raiz,
    atualizar(save, stats) {
      garantirCartoes();

      for (const def of Object.values(CARTAS_POR_ID)) {
        const cartao = cartoes.get(def.id)!;
        const nivel = save.cartas[def.id] ?? 0;
        const desbloqueada =
          nivel > 0 || (save.nivel >= def.niveisRequeridos && save.coroas >= def.eraRequerida);

        cartao.elemento.dataset.estado = desbloqueada ? 'ativa' : 'bloqueado';
        cartao.elemento.setAttribute(
          'aria-label',
          `${def.nome}, ${NOME_RARIDADE[def.raridade]}, ${nivel > 0 ? `nivel ${nivel}` : 'nao adquirida'}`,
        );

        definirTexto(cartao.elNivel, nivel > 0 ? `Nv. ${nivel}` : 'Nao adquirida');

        const cpsDaCarta = stats.cpsPorCarta[def.id] ?? 0;
        const dpsDaCarta = stats.dpsPorCarta[def.id] ?? 0;
        definirTexto(
          cartao.elCps,
          cpsDaCarta > 0 ? `${abreviar(cpsDaCarta)}/s · ${abreviar(dpsDaCarta)} dano/s` : '—',
        );

        if (!desbloqueada) {
          const requisitos: string[] = [];
          if (save.nivel < def.niveisRequeridos) {
            requisitos.push(`Nv. ${def.niveisRequeridos} do heroi`);
          }
          if (save.coroas < def.eraRequerida) {
            requisitos.push(`${def.eraRequerida} coroas`);
          }
          definirTexto(cartao.elShare, `Requer ${requisitos.join(' e ')}`);
        } else if (stats.cps > 0) {
          definirTexto(cartao.elShare, `${porcentagem(cpsDaCarta / stats.cps, 1)} do total`);
        } else {
          definirTexto(cartao.elShare, '0% do total');
        }
      }
    },
  };
}