import { BALANCE } from '../core/balance';
import { custoArenacao } from '../core/estado';
import { previaPrestigio } from '../core/prestigio';
import type { EstadoDerivado, SaveData } from '../core/types';
import { abreviar, duracao, porcentagem } from './formatar';
import { botao, definirTexto, h } from './dom';

export interface PrestigioRefs {
  raiz: HTMLElement;
  atualizar: (save: SaveData, stats: EstadoDerivado) => void;
}

export interface CallbacksPrestigio {
  aoComprarArenacao: () => void;
  aoFazerPrestigio: () => void;
  aoReduzirAnimacoes: (v: boolean) => void;
}

/**
 * Prestigio + Arenacao.
 *
 * Sao as duas camadas de reset. A Arenacao e o "reset pequeno" (mantem cartas,
 * compra uma moeda permanente que so multiplica). O Prestigio e o "reset grande"
 * (zera a run, ganha coroas permanentes). Sem os dois, o idle vira so clicar.
 */
export function criarPrestigio(cb: CallbacksPrestigio): PrestigioRefs {
  const elArenacaoQtd = h('span', { class: 'prestigio-valor' });
  const elArenacaoCusto = h('span', { class: 'prestigio-custo' });
  const botaoArenacao = botao('Comprar Arenacao', cb.aoComprarArenacao, {
    class: 'btn btn--primario',
  });

  const elArenacaoMult = h('p', { class: 'prestigio-nota' });

  const elCorAtual = h('span', { class: 'prestigio-valor' });
  const elCorGanho = h('span', { class: 'prestigio-valor prestigio-valor--ganho' });
  const elCorBonus = h('span', { class: 'prestigio-custo' });
  const elAntes = h('span', { class: 'prestigio-custo' });
  const elDepois = h('span', { class: 'prestigio-valor' });
  const botaoPrestigio = botao('Renarquiciar', cb.aoFazerPrestigio, {
    class: 'btn btn--perigo',
  });

  const checkAnimacoes = h('input', { type: 'checkbox', id: 'pref-anim' });
  checkAnimacoes.addEventListener('change', () => cb.aoReduzirAnimacoes(checkAnimacoes.checked));

  const raiz = h('section', { class: 'tela tela--prestigio', 'aria-label': 'Prestigio' }, [
    h('div', { class: 'prestigio-grade' }, [
      h('article', { class: 'painel' }, [
        h('h3', { class: 'painel-titulo' }, ['Arenacao']),
        h('p', { class: 'painel-desc' }, [
          'Cada moeda soma +2% de ouro e de dano, para sempre. Nao reseta as cartas.',
        ]),
        h('div', { class: 'prestigio-linha' }, ['Moedas', elArenacaoQtd]),
        h('div', { class: 'prestigio-linha' }, ['Custo', elArenacaoCusto]),
        h('div', { class: 'prestigio-linha' }, ['Multiplicador', elArenacaoMult]),
        botaoArenacao,
      ]),

      h('article', { class: 'painel painel--destaque' }, [
        h('h3', { class: 'painel-titulo' }, ['Renarquiciar']),
        h('p', { class: 'painel-desc' }, [
          'Zera ouro, cartas, nivel e arenacao. Cada coroa soma +2% permanente e abre cartas de era superior.',
        ]),
        h('div', { class: 'prestigio-linha' }, ['Coroas atuais', elCorAtual]),
        h('div', { class: 'prestigio-linha' }, ['Voce ganha', elCorGanho]),
        h('div', { class: 'prestigio-linha' }, ['Bonus permanente', elCorBonus]),
        h('div', { class: 'prestigio-divisor' }),
        h('div', { class: 'prestigio-linha' }, ['Ouro/s agora', elAntes]),
        h('div', { class: 'prestigio-linha' }, ['Ouro/s depois', elDepois]),
        botaoPrestigio,
        h('p', { class: 'prestigio-aviso' }, [
          'Isto apaga o progresso da run. Nao da para desfazer.',
        ]),
      ]),
    ]),

    h('article', { class: 'painel' }, [
      h('h3', { class: 'painel-titulo' }, ['Acessibilidade']),
      h('label', { class: 'check' }, [checkAnimacoes, ' Reduzir animacoes']),
      h('p', { class: 'painel-desc' }, [
        'Desliga os efeitos visuais da cena de combate. Util em aparelhos fracos ou para fotossensibilidade.',
      ]),
    ]),
  ]);

  return {
    raiz,
    atualizar(save, stats) {
      definirTexto(elArenacaoQtd, String(save.moedasDeArenacao));
      const custo = custoArenacao(save);
      definirTexto(elArenacaoCusto, `${abreviar(custo)} ouro`);
      botaoArenacao.disabled = save.ouro < custo;
      definirTexto(
        elArenacaoMult,
        `+${porcentagem(save.moedasDeArenacao * BALANCE.cpsPorArenacao, 0)} em ouro e dano`,
      );

      const previa = previaPrestigio(save);
      definirTexto(elCorAtual, String(save.coroas));
      definirTexto(
        elCorGanho,
        previa.disponivel ? `+${previa.coroasGanhas}` : `precisa de ${abreviar(1000)} ouro total`,
      );
      definirTexto(elCorBonus, `+${porcentagem(previa.ganhoMultiplicador, 0)} permanente`);
      definirTexto(elAntes, `${abreviar(previa.antesCps)}/s`);
      definirTexto(elDepois, `${abreviar(previa.cpsDepois)}/s`);

      botaoPrestigio.disabled = !previa.disponivel;

      if (checkAnimacoes.checked !== save.prefs.redutorAnimacoes) {
        checkAnimacoes.checked = save.prefs.redutorAnimacoes;
      }

      // Diagnostico util para depurar balanceamento durante o playtest.
      raiz.dataset.dps = String(Math.round(stats.dps));
      raiz.dataset.tempo = duracao(Date.now() - save.criadoEm);
    },
  };
}