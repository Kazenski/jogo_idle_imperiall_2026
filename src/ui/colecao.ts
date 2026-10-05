import { CARTAS_POR_ID } from '../data/cartas';
import { previaForja } from '../core/forja';
import { COR_RARIDADE, NOME_RARIDADE, ROTULO_SPRITE, spriteDataUri } from '../art/sprites';
import type { EstadoDerivado, SaveData } from '../core/types';
import { abreviar, porcentagem } from './formatar';
import { botao, definirTexto, h } from './dom';

export interface ColecaoRefs {
  raiz: HTMLElement;
  atualizar: (save: SaveData, stats: EstadoDerivado) => void;
}

interface Cartao {
  elemento: HTMLElement;
  elNivel: HTMLElement;
  elForja: HTMLElement;
  elCps: HTMLElement;
  elShare: HTMLElement;
  linhaForja: HTMLElement;
  elForjaInfo: HTMLElement;
  botaoForjar: HTMLButtonElement;
}

/**
 * Colecao — o "album de cartinhas" (como na referencia 2).
 *
 * Mostra todas as cartas do conteudo, inclusive as ainda bloqueadas, para o
 * jogador ver o que falta. Cartas bloqueadas ficam esmaecidas e mostram o
 * requisito. Cartas adquiridas ganham a forja (+N): selo, custo, chance e
 * botao — a unica forma de gastar ouro em algo que ja se tem.
 */
export function criarColecao(aoForjar: (cardId: string) => void): ColecaoRefs {
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
      const elForja = h('span', { class: 'cartao-forja' });
      const elCps = h('span', { class: 'cartao-cps' });
      const elShare = h('span', { class: 'cartao-share' });
      const elForjaInfo = h('span', { class: 'cartao-forja-info' });
      const botaoForjar = botao('Forjar', () => aoForjar(def.id), {
        class: 'cartao-forjar',
      });
      const linhaForja = h('div', { class: 'cartao-forja-row' }, [
        elForjaInfo,
        botaoForjar,
      ]);

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
          elForja,
          elCps,
          elShare,
          linhaForja,
          h('p', { class: 'cartao-desc' }, [def.descricao]),
        ],
      );

      grade.append(elemento);
      cartoes.set(def.id, {
        elemento,
        elNivel,
        elForja,
        elCps,
        elShare,
        linhaForja,
        elForjaInfo,
        botaoForjar,
      });
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

        const forja = save.forjas[def.id] ?? 0;
        cartao.elForja.hidden = forja <= 0;
        definirTexto(cartao.elForja, forja > 0 ? `+${forja}` : '');

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

        // Forja: so para cartas que o jogador ja tem.
        const previa = previaForja(save, def.id);
        cartao.linhaForja.hidden = !previa.adquirida;
        if (previa.adquirida) {
          if (previa.noTeto) {
            definirTexto(cartao.elForjaInfo, 'Forja MAX');
            cartao.botaoForjar.disabled = true;
            definirTexto(cartao.botaoForjar, 'MAX');
          } else {
            definirTexto(
              cartao.elForjaInfo,
              `${porcentagem(previa.chance)} · ${abreviar(previa.custo)} ouro`,
            );
            cartao.botaoForjar.disabled = !previa.acessivel;
            definirTexto(cartao.botaoForjar, `Forjar +${previa.nivelAtual + 1}`);
          }
        }
      }
    },
  };
}
