import type { EstadoCombate } from '../core/combate';
import { cartasDisponiveis } from '../core/estado';
import type { EstadoDerivado, SaveData } from '../core/types';
import { CARTAS_POR_ID } from '../data/cartas';
import { abreviar, duracao, porcentagem } from './formatar';
import { COR_RARIDADE, spriteDataUri } from '../art/sprites';
import { definirTexto, h } from './dom';

export interface CombateRefs {
  raiz: HTMLElement;
  atualizar: (save: SaveData, stats: EstadoDerivado, combate: EstadoCombate) => void;
}

/**
 * Painel lateral da aba Combate.
 *
 * NO CELULAR esta tela nunca aparece: quem ocupa o lugar e o palco. Ela existe
 * para o layout de tablet/desktop, onde o palco e a coluna esquerda e sobra
 * espaco na direita — e um espaco desperdicado se ficar vazio.
 *
 * Serve para dar leitura numerica do combate: quem e o alvo, quanto tempo leva
 * para derrubar, e qual carta esta pagando melhor agora.
 */
export function criarPainelCombate(): CombateRefs {
  const elNome = h('span', { class: 'estat-valor' });
  const elHp = h('span', { class: 'estat-valor' });
  const elDano = h('span', { class: 'estat-valor' });
  const elDps = h('span', { class: 'estat-valor' });
  const elCps = h('span', { class: 'estat-valor' });
  const elMult = h('span', { class: 'estat-valor' });
  const elTempoAbate = h('span', { class: 'estat-valor' });
  const elTempoEstagio = h('span', { class: 'estat-valor' });
  const elTempoJogo = h('span', { class: 'estat-valor' });

  const elDicaSprite = h('img', { class: 'dica-sprite', alt: '', width: 48, height: 48 });
  const elDicaNome = h('h3', { class: 'dica-nome' });
  const elDicaTexto = h('p', { class: 'dica-texto' });

  function linha(rotulo: string, valor: HTMLElement): HTMLElement {
    return h('div', { class: 'estat' }, [h('span', { class: 'estat-rotulo' }, [rotulo]), valor]);
  }

  const raiz = h('section', { class: 'tela tela--combate', 'aria-label': 'Combate' }, [
    h('h2', { class: 'tela-titulo' }, ['Combate']),
    h('div', { class: 'painel' }, [
      h('h3', { class: 'painel-titulo' }, ['Alvo']),
      linha('Inimigo', elNome),
      linha('Vida atual', elHp),
      linha('Dano necessario', elDano),
      linha('Tempo por abate', elTempoAbate),
    ]),

    h('div', { class: 'painel' }, [
      h('h3', { class: 'painel-titulo' }, ['Sua producao']),
      linha('Dano por segundo', elDps),
      linha('Ouro por segundo', elCps),
      linha('Multiplicador', elMult),
      linha('Tempo ate estagio +1', elTempoEstagio),
      linha('Tempo de jogo', elTempoJogo),
    ]),

    h('article', { class: 'painel painel--dica' }, [
      h('div', { class: 'dica-sprite-caixa' }, [elDicaSprite]),
      h('div', {}, [elDicaNome, elDicaTexto]),
    ]),
  ]);

  return {
    raiz,
    atualizar(save, stats, combate) {
      definirTexto(elNome, `${combate.nomeInimigo} (est. ${combate.estagio})`);

      const hpAtual = Math.max(0, Math.ceil(combate.hpInimigo));
      const fracao = combate.hpMax > 0 ? hpAtual / combate.hpMax : 0;
      definirTexto(elHp, `${abreviar(hpAtual)} (${porcentagem(fracao, 1)})`);
      definirTexto(elDano, abreviar(combate.hpInimigo));

      const dps = Math.max(0, stats.dps);
      definirTexto(
        elTempoAbate,
        dps > 0 ? duracao((combate.hpInimigo / dps) * 1000) : '—',
      );

      definirTexto(elDps, `${abreviar(dps)}/s`);
      definirTexto(elCps, `${abreviar(stats.cps)}/s`);
      definirTexto(elMult, `x${stats.multiplicador.toFixed(2)}`);

      // Um estagio novo exige derrubar o alvo atual; o proximo tem um pouco
      // mais de HP, entao estimamos pela media dos dois.
      const hpProximo = combate.hpMax * 1.15;
      definirTexto(
        elTempoEstagio,
        dps > 0 ? duracao(((combate.hpInimigo + hpProximo) / dps) * 1000) : '—',
      );
      definirTexto(elTempoJogo, duracao(Date.now() - save.criadoEm));

      // Dica de compra: a carta que rende mais ouro por segundo POR OURO
      // GASTO entre as que o jogador pode pagar agora.
      //
      // A razao importa porque e ela que define a proxima compra otima. Um
      // jogador que so olha "quanto rende" e sugado para a carta cara; um
      // jogador que so olha "quanto custa" fica preso na barata. Comparando
      // ganho/custo entre as opcoes acessiveis, a resposta ja vem pronta.
      let melhor: { def: (typeof CARTAS_POR_ID)[string]; eficiencia: number } | null = null;

      for (const def of cartasDisponiveis(save)) {
        const nivel = save.cartas[def.id] ?? 0;
        const custo = def.custoBase * Math.pow(def.custoCrescimento, nivel);
        if (custo > save.ouro || custo <= 0) continue;

        // Ganho de cps da proxima unidade (fator triangular: unidade n+1 vale n+1).
        const ganho = def.cpsBase * (nivel + 1) * stats.multiplicador;
        const eficiencia = ganho / custo;

        if (!melhor || eficiencia > melhor.eficiencia) {
          melhor = { def, eficiencia };
        }
      }

      if (melhor) {
        elDicaSprite.src = spriteDataUri(melhor.def.sprite, 3);
        elDicaSprite.alt = '';
        elDicaSprite.style.borderColor = COR_RARIDADE[melhor.def.raridade];
        definirTexto(elDicaNome, `Vale mais a pena: ${melhor.def.nome}`);
        definirTexto(
          elDicaTexto,
          `${abreviar(1 / melhor.eficiencia)}s de ouro por +1/s. ` +
            'As outras acessiveis rendem menos por ouro gasto.',
        );
      } else {
        elDicaSprite.removeAttribute('src');
        definirTexto(elDicaNome, 'Sem compras acessiveis');
        definirTexto(
          elDicaTexto,
          'Nenhuma carta cabe no seu ouro agora. Espere a producao subir ou use x10/Max na Loja.',
        );
      }
    },
  };
}