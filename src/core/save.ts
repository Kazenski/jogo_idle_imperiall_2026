import { BALANCE } from './balance';
import { VERSAO_ATUAL, saveNovo } from './estado';
import { tickCombate } from './combate';
import type { EstadoCombate } from './combate';
import type { SaveData, Tabs } from './types';
import { CARTAS_POR_ID } from '../data/cartas';

const CHAVE = 'imperiall-idle:save:v1';
const CHAVE_PREFS = 'imperiall-idle:prefs:v1';

/**
 * Migracoes de schema.
 *
 * REGRA: nunca edite um bloco `versao: N` existente. Adicione um novo bloco.
 * Sem isso, quemAtualizar o jogo com o save antigo perde a partida.
 *
 * Cada migracao recebe o objeto cru e devolve o objeto na versao seguinte.
 */
type Migracao = (bruto: Record<string, unknown>) => Record<string, unknown>;

const MIGRACOES: Record<number, Migracao> = {
  // 0 -> 1: saves pre-esquema (soardedados manualmente) ganham os campos novos.
  0: (bruto) => ({
    ...bruto,
    versao: 1,
    prefs: { aba: 'combate', quantidadeCompra: 1, redutorAnimacoes: false },
  }),
};

function migrar(bruto: Record<string, unknown>): SaveData {
  let dados: Record<string, unknown> = bruto;
  let versao = typeof dados.versao === 'number' ? dados.versao : 0;

  while (versao < VERSAO_ATUAL) {
    const passo = MIGRACOES[versao];
    if (!passo) break; // sem migracao definida: assume que o save ja serve
    dados = passo(dados);
    versao = typeof dados.versao === 'number' ? dados.versao : versao + 1;
  }

  const base = saveNovo();

  // Merge defensivo campo a campo: cada propriedade e validada, nunca
  // espalhada com `...`. Um save corrompido (ou de versao futura) nao pode
  // conseguir injetar `NaN` no ouro e travar o loop de render.
  const d = dados;
  return {
    versao: VERSAO_ATUAL,
    criadoEm: num(d.criadoEm, base.criadoEm),
    ultimoSalvoEm: num(d.ultimoSalvoEm, Date.now()),

    ouro: Math.max(0, num(d.ouro)),
    ouroTotalGanho: Math.max(0, num(d.ouroTotalGanho)),

    nivel: Math.max(1, Math.floor(num(d.nivel, 1))),
    xp: Math.max(0, num(d.xp)),
    moedasDeArenacao: Math.max(0, Math.floor(num(d.moedasDeArenacao))),

    coroas: Math.max(0, Math.floor(num(d.coroas))),
    coroasGanhasNoTotal: Math.max(0, Math.floor(num(d.coroasGanhasNoTotal))),
    ultimoPrestagioEm: Math.max(0, num(d.ultimoPrestagioEm)),

    cartas: sanitizeCartas(d.cartas),
    inimigosDerrotados: Math.max(0, Math.floor(num(d.inimigosDerrotados))),
    estagioDesbloqueado: Math.max(1, Math.floor(num(d.estagioDesbloqueado, 1))),

    prefs: { ...base.prefs, ...sanitizePrefs(d.prefs) },
  };
}

function sanitizePrefs(bruto: unknown): Partial<SaveData['prefs']> {
  if (!bruto || typeof bruto !== 'object') return {};
  const p = bruto as Record<string, unknown>;
  const abas: Tabs[] = ['combate', 'cartas', 'loja', 'prestigio', 'ajustes'];
  const qtds = [1, 10, 50, 100, 'max'];

  const aba = abas.includes(p.aba as Tabs) ? (p.aba as Tabs) : undefined;
  const qtd = qtds.includes(p.quantidadeCompra as number)
    ? (p.quantidadeCompra as SaveData['prefs']['quantidadeCompra'])
    : undefined;

  return {
    ...(aba ? { aba } : {}),
    ...(qtd ? { quantidadeCompra: qtd } : {}),
    redutorAnimacoes: p.redutorAnimacoes === true,
  };
}

/**
 * Descarta ids de carta que sairam do conteudo e normaliza os niveis.
 *
 * Salvamento de estado em localStorage e entrada nao confiavel: o jogador pode
 * ter editado à mao, um save antigo pode ter trazido um bug, e `nivel` negativo
 * quebraria `custoDaUnidade` (elevado a fracao negativa). Sanitizar aqui mantem
 * o resto do jogo livre de `if (nivel > 0)` espalhado pelo codigo.
 */
function sanitizeCartas(brutas: unknown): Record<string, number> {
  const saida: Record<string, number> = {};
  if (!brutas || typeof brutas !== 'object') return saida;
  for (const [id, nivel] of Object.entries(brutas as Record<string, unknown>)) {
    if (!CARTAS_POR_ID[id]) continue;
    if (typeof nivel !== 'number' || !Number.isFinite(nivel)) continue;
    const n = Math.floor(nivel);
    if (n > 0) saida[id] = n;
  }
  return saida;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function carregar(): SaveData {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return saveNovo();
    return migrar(JSON.parse(cru) as Record<string, unknown>);
  } catch (erro) {
    console.warn('[save] falha ao carregar, iniciando novo:', erro);
    return saveNovo();
  }
}

export function salvar(save: SaveData): void {
  try {
    save.ultimoSalvoEm = Date.now();
    localStorage.setItem(CHAVE, JSON.stringify(save));
  } catch (erro) {
    // Cota estourada / modo privado. O jogo continua, so nao persiste.
    console.warn('[save] falha ao gravar:', erro);
  }
}

/** So as preferencias — trocadas a cada mudanca de UI, sem tocar no resto. */
export function salvarPrefs(save: SaveData): void {
  try {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify(save.prefs));
  } catch {
    /* ignora */
  }
}

export function carregarPrefs(): Partial<SaveData['prefs']> | null {
  try {
    const cru = localStorage.getItem(CHAVE_PREFS);
    return cru ? (JSON.parse(cru) as Partial<SaveData['prefs']>) : null;
  } catch {
    return null;
  }
}

export function apagarTudo(): void {
  try {
    localStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE_PREFS);
  } catch {
    /* ignora */
  }
}

/** Serializa o save para texto (export/import manual, ou colar no Discord). */
export function exportar(save: SaveData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(save))))
    .replace(/(.{80})/g, '$1\n');
}

export function importar(texto: string): SaveData | null {
  try {
    const limpo = texto.replace(/\s+/g, '');
    const json = decodeURIComponent(escape(atob(limpo)));
    return migrar(JSON.parse(json) as Record<string, unknown>);
  } catch (erro) {
    console.warn('[save] import invalido:', erro);
    return null;
  }
}

export interface ResultadoOffline {
  /** Tempo real que o jogador estuvo fora (ms). */
 awayMs: number;
  /** Tempo efetivamente creditado (ms). */
  creditadoMs: number;
  ouro: number;
  xp: number;
  abates: number;
  subiuDeNivel: boolean;
}

/**
 * Credita o progresso acumulado enquanto o app estava fechado.
 *
 * Modelo: reproduz o loop de combate com dt grande. E a mesma funcao que o
 * jogo usa online, entao nao existe divergencia entre "o que eu ganhei
 * offline" e "o que eu teria ganhado ficando olhando".
 */
export function aplicarOffline(save: SaveData, combate: EstadoCombate): ResultadoOffline | null {
  const awayMs = Date.now() - save.ultimoSalvoEm;
  if (!Number.isFinite(awayMs) || awayMs < 60_000) return null; // ignora < 1 min

  const totalMs = Math.min(awayMs, BALANCE.offlineTetoMs);
  const cheio = Math.min(totalMs, BALANCE.offlineMinutosFull * 60_000);
  const excedente = totalMs - cheio;

  // 12h de slices de 1s: barato (12k iteracoes) e estavel numericamente.
  const SLICE_MS = 1_000;
  let ouro = 0;
  let xp = 0;
  let abates = 0;
  let subiu = false;

  const rodar = (ms: number) => {
    const passos = Math.max(1, Math.round(ms / SLICE_MS));
    const dt = ms / 1000 / passos;
    for (let i = 0; i < passos; i++) {
      const r = tickCombate(save, combate, dt);
      ouro += r.ouroGanho;
      xp += r.xpGanho;
      abates += r.abates;
      subiu = subiu || r.subiuDeNivel;
    }
  };

  rodar(cheio);
  if (excedente > 0) {
    const passos = Math.max(1, Math.round(excedente / SLICE_MS));
    const dt = (excedente / 1000 / passos) * BALANCE.offlineFracaoExcedente;
    for (let i = 0; i < passos; i++) {
      const r = tickCombate(save, combate, dt);
      ouro += r.ouroGanho;
      xp += r.xpGanho;
      abates += r.abates;
      subiu = subiu || r.subiuDeNivel;
    }
  }

  return {
    awayMs,
    creditadoMs: totalMs,
    ouro,
    xp,
    abates,
    subiuDeNivel: subiu,
  };
}

export type { Tabs };