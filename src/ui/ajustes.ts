import { apagarTudo, exportar, importar } from '../core/save';
import type { SaveData } from '../core/types';
import { abreviar, duracao } from './formatar';
import { botao, definirTexto, h } from './dom';

export interface AjustesRefs {
  raiz: HTMLElement;
  atualizar: (save: SaveData) => void;
}

export interface CallbacksAjustes {
  aoImportar: (save: SaveData) => void;
  aoApagar: () => void;
  aoInstalar: () => void;
}

/**
 * Ajustes: save, export/import e instalação do PWA.
 *
 * EXPORT/IMPORT EXISTE PORQUE NAO HÁ BACKEND. Sem servidor, o save vive no
 * localStorage de um aparelho so. Trocar de celular = perder a partida, salvo
 * export manual (ou um futuro "login com GitHub + Gist").
 */
export function criarAjustes(cb: CallbacksAjustes): AjustesRefs {
  const elResumo = h('pre', { class: 'ajustes-resumo' });
  const areaExport = h('textarea', {
    class: 'ajustes-area',
    readonly: true,
    rows: 4,
    'aria-label': 'Save exportado',
  });
  const areaImport = h('textarea', {
    class: 'ajustes-area',
    rows: 4,
    placeholder: 'Cole aqui o save exportado',
    'aria-label': 'Cole o save para importar',
  });

  const aviso = h('p', { class: 'ajustes-aviso', role: 'status' });

  const botaoExport = botao('Exportar save', () => {
    const texto = exportar(ultimoSave);
    areaExport.value = texto;
    areaExport.select();
    // `execCommand` esta deprecated mas e o unico caminho que funciona em
    // WebView/TWA sem permissao de clipboard. O fallback manual fica abaixo.
    areaExport.setSelectionRange(0, texto.length);
    try {
      if (!navigator.clipboard) throw new Error('sem clipboard');
      void navigator.clipboard.writeText(texto.replace(/\n/g, ''));
      mostrarAviso('Save copiado.');
    } catch {
      mostrarAviso('Selecione e copie o texto acima manualmente.');
    }
  });

  const botaoImport = botao('Importar save', () => {
    const texto = areaImport.value.trim();
    if (!texto) {
      mostrarAviso('Cole um save antes de importar.');
      return;
    }
    const carregado = importar(texto);
    if (!carregado) {
      mostrarAviso('Save invalido. Nada foi alterado.');
      return;
    }
    cb.aoImportar(carregado);
    mostrarAviso('Save importado.');
  });

  const botaoApagar = botao('Apagar tudo', () => {
    const ok = window.confirm('Isto apaga o progresso deste aparelho. Continuar?');
    if (!ok) return;
    apagarTudo();
    cb.aoApagar();
    mostrarAviso('Progresso apagado.');
  });

  const botaoInstalar = botao('Instalar como app', cb.aoInstalar, { class: 'btn btn--primario' });

  const raiz = h('section', { class: 'tela tela--ajustes', 'aria-label': 'Ajustes' }, [
    h('article', { class: 'painel' }, [
      h('h3', { class: 'painel-titulo' }, ['Progresso']),
      elResumo,
      h('div', { class: 'ajustes-botoes' }, [botaoExport, botaoImport, botaoApagar]),
      areaExport,
      areaImport,
      aviso,
    ]),

    h('article', { class: 'painel' }, [
      h('h3', { class: 'painel-titulo' }, ['Instalar']),
      h('p', { class: 'painel-desc' }, [
        'Adiciona um icone na tela inicial e abre em tela cheia, como um app nativo.',
      ]),
      botaoInstalar,
    ]),

    h('article', { class: 'painel' }, [
      h('h3', { class: 'painel-titulo' }, ['Sobre']),
      h('p', { class: 'painel-desc' }, [
        'Idle RPG de cartas dark fantasy. Roda offline, salva no proprio aparelho e nao usa servidor.',
      ]),
    ]),
  ]);

  let ultimoSave: SaveData;
  let avisoTimer = 0;

  function mostrarAviso(texto: string): void {
    definirTexto(aviso, texto);
    window.clearTimeout(avisoTimer);
    avisoTimer = window.setTimeout(() => definirTexto(aviso, ''), 4_000);
  }

  return {
    raiz,
    atualizar(save) {
      ultimoSave = save;
      definirTexto(
        elResumo,
        [
          `Nivel ${save.nivel}  ·  ${save.moedasDeArenacao} arenacao  ·  ${save.coroas} coroas`,
          `Ouro atual: ${abreviar(save.ouro)}`,
          `Ouro total: ${abreviar(save.ouroTotalGanho)}`,
          `Abates: ${abreviar(save.inimigosDerrotados)}  ·  Estagio ${save.estagioDesbloqueado}`,
          `Cartas: ${Object.keys(save.cartas).length}  ·  Criado ha ${duracao(Date.now() - save.criadoEm)}`,
          `Salvo em: ${new Date(save.ultimoSalvoEm).toLocaleString('pt-BR')}`,
        ].join('\n'),
      );
    },
  };
}