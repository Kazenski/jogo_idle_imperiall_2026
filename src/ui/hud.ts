import { progressoXp, xpParaProximoNivel } from '../core/estado';
import type { EstadoDerivado, SaveData } from '../core/types';
import { abreviar, duracao } from './formatar';
import { definirLargura, definirTexto, h } from './dom';

export interface HudRefs {
  raiz: HTMLElement;
  atualizar: (save: SaveData, stats: EstadoDerivado, dtSegundos: number) => void;
}

/**
 * Barra superior: ouro, cps, nivel, xp, coroas.
 *
 * OTIMIZACAO IMPORTANTE: o HUD atualiza por campo, e nao por innerHTML.
 * Recriar a arvore a cada tick (10x/seg) num celular derruba a taxa de quadros
 * e faz o scroll da lista de cartas engasgar.
 */
export function criarHud(): HudRefs {
  const elOuro = h('span', { class: 'hud-valor' });
  const elCps = h('span', { class: 'hud-sub' });
  const elOuroBloco = h('div', { class: 'hud-bloco' }, [
    h('span', { class: 'hud-rotulo' }, ['Ouro']),
    elOuro,
    elCps,
  ]);

  const elNivel = h('span', { class: 'hud-valor' });
  const elXpTexto = h('span', { class: 'hud-sub' });
  const barraXp = h('div', { class: 'barra barra--xp' });
  const preenchimentoXp = h('div', { class: 'barra-preenchimento' });
  barraXp.append(preenchimentoXp);
  const elNivelBloco = h('div', { class: 'hud-bloco' }, [
    h('span', { class: 'hud-rotulo' }, ['Nivel']),
    elNivel,
    elXpTexto,
    barraXp,
  ]);

  const elCoroas = h('span', { class: 'hud-valor hud-valor--coroa' });
  const elArenacao = h('span', { class: 'hud-sub' });
  const elCoroaBloco = h('div', { class: 'hud-bloco' }, [
    h('span', { class: 'hud-rotulo' }, ['Coroas']),
    elCoroas,
    elArenacao,
  ]);

  // Contador de estagio/abates fica do lado, menor.
  const elMundo = h('span', { class: 'hud-sub' });
  const elMundoBloco = h('div', { class: 'hud-bloco hud-bloco--compacto' }, [
    h('span', { class: 'hud-rotulo' }, ['Mundo']),
    elMundo,
  ]);

  const raiz = h('header', { class: 'hud' }, [elOuroBloco, elNivelBloco, elCoroaBloco, elMundoBloco]);

  // `null` = ainda nao houve render. O primeiro quadro mostra o valor exato:
  // interpolar a partir de 0 dejaria a tela em "0" ate o proximo tick.
  let ouroMostrado: number | null = null;

  return {
    raiz,
    atualizar(save, stats, dtSegundos) {
      if (ouroMostrado === null) {
        ouroMostrado = save.ouro;
      } else if (Math.abs(save.ouro - ouroMostrado) > save.ouro * 0.2 + 100) {
        // Salto grande (prestigio, progresso offline, import): encosta no
        // valor real em vez de deslizar por varios segundos.
        ouroMostrado = save.ouro;
      } else {
        // Suaviza o numero: interpolar direto causa "pulo" visual sempre que
        // um abate credita um premio grande de uma vez.
        ouroMostrado += (save.ouro - ouroMostrado) * Math.min(1, dtSegundos * 8);
        if (Math.abs(save.ouro - ouroMostrado) < 0.5) ouroMostrado = save.ouro;
      }

      definirTexto(elOuro, abreviar(ouroMostrado));
      definirTexto(elCps, `${abreviar(stats.cps)}/s`);
      definirTexto(elNivel, String(save.nivel));

      const alvo = xpParaProximoNivel(save.nivel);
      definirTexto(elXpTexto, `${abreviar(save.xp)}/${abreviar(alvo)} xp`);
      definirLargura(preenchimentoXp, progressoXp(save));

      definirTexto(elCoroas, String(save.coroas));
      definirTexto(
        elArenacao,
        `x${stats.multiplicador.toFixed(2)} · ${save.moedasDeArenacao} arenacao`,
      );
      definirTexto(
        elMundo,
        `Est. ${save.estagioDesbloqueado} · ${abreviar(save.inimigosDerrotados)} abates`,
      );
      elOuroBloco.title = `Tempo de jogo: ${duracao(Date.now() - save.criadoEm)}`;
    },
  };
}