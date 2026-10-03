/**
 * Testes do nucleo de balanceamento e progresso offline.
 *
 *   npm test
 *
 * Roda em Node puro (type-stripping nativo do Node 22), sem framework.
 * O que importa testar aqui e o `core/`: sao as regras que dao feel ao jogo.
 * Se `custoDoLote` estiver errado, o jogador ve "Comprar 10" cobrando o preco
 * de 1 — bug que so aparece em tela.
 */

import assert from 'node:assert/strict';

import { BALANCE, custoDaUnidade, custoDoLote, maximoCompravel } from '../src/core/balance.ts';
import { comprarCarta, criarCombate, tickCombate, previaCompra } from '../src/core/combate.ts';
import { derivar, saveNovo, cartasDisponiveis } from '../src/core/estado.ts';
import { aplicarOffline } from '../src/core/save.ts';
import { fazerPrestigio, previaPrestigio } from '../src/core/prestigio.ts';
import { abreviar, duracao } from '../src/ui/formatar.ts';
import { CARTAS_POR_ID } from '../src/data/cartas.ts';
import { inimigoDoEstagio } from '../src/data/inimigos.ts';

let passou = 0;
const falhas: string[] = [];

function teste(nome: string, fn: () => void): void {
  try {
    fn();
    passou++;
    console.log(`  ok  ${nome}`);
  } catch (erro) {
    falhas.push(nome);
    console.log(`FALHA ${nome}\n      ${(erro as Error).message}`);
  }
}

function grupo(nome: string): void {
  console.log(`\n${nome}`);
}

// ---------------------------------------------------------------------------
grupo('Curva de custo');

teste('custo da 1a unidade e o custoBase', () => {
  assert.equal(custoDaUnidade(10, 1.15, 1), 10);
});

teste('custo cresce exponencialmente com o nivel', () => {
  assert.ok(custoDaUnidade(10, 1.15, 5) > custoDaUnidade(10, 1.15, 4));
  assert.ok(Math.abs(custoDaUnidade(10, 1.15, 11) - 10 * 1.15 ** 10) < 1e-9);
});

teste('custoDoLote de 1 unidade == custo unitario', () => {
  assert.equal(custoDoLote(1, 10, 1.15, 1), 10);
  assert.equal(custoDoLote(1, 10, 1.15, 7), custoDaUnidade(10, 1.15, 7));
});

teste('custoDoLote de 10 == soma dos 10 proximos', () => {
  const soma = Array.from({ length: 10 }, (_, i) => custoDaUnidade(10, 1.15, 4 + i)).reduce(
    (a, b) => a + b,
    0,
  );
  assert.ok(Math.abs(custoDoLote(10, 10, 1.15, 4) - soma) < 1e-6);
});

teste('custoDoLote com crescimento 1 e multiplicacao simples', () => {
  assert.equal(custoDoLote(5, 10, 1, 1), 50);
});

teste('custoDoLote de 0 unidades e zero', () => {
  assert.equal(custoDoLote(0, 10, 1.15, 1), 0);
});

// ---------------------------------------------------------------------------
grupo('Compra no limite do ouro (o bug do "Max")');

teste('maximoCompravel nunca cobra mais do que o ouro', () => {
  const ouro = 1000;
  const k = maximoCompravel(ouro, 10, 1.15, 1);
  assert.ok(custoDoLote(k, 10, 1.15, 1) <= ouro, `lote de ${k} custa mais que ${ouro}`);
});

teste('maximoCompravel + 1 ja ultrapassa o ouro', () => {
  const ouro = 1000;
  const k = maximoCompravel(ouro, 10, 1.15, 1);
  assert.ok(custoDoLote(k + 1, 10, 1.15, 1) > ouro);
});

teste('maximoCompravel devolve 0 sem ouro para a proxima unidade', () => {
  assert.equal(maximoCompravel(5, 10, 1.15, 1), 0);
});

teste('Max com ouro suficiente compra o lote inteiro e esvazia o caixa', () => {
  const save = saveNovo();
  save.ouro = 5000;
  const r = comprarCarta(save, 'espada-ferro', 'max');
  assert.equal(r.ok, true);
  assert.ok(save.ouro < custoDaUnidade(10, 1.15, r.quantidade + 1));
  assert.equal(save.cartas['espada-ferro'], r.quantidade);
});

teste('x10 sem ouro suficiente e recusado e nao cobra nada', () => {
  const save = saveNovo();
  save.ouro = 20; // so da para 1 unidade
  const r = comprarCarta(save, 'espada-ferro', 10);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'ouro-insuficiente');
  assert.equal(save.ouro, 20, 'ouro nao pode ser debitado numa compra recusada');
  assert.equal(save.cartas['espada-ferro'], undefined);
});

teste('previaCompra bate com o que a compra realmente cobra', () => {
  const save = saveNovo();
  save.ouro = 9999;
  const stats = derivar(save);
  const previa = previaCompra(save, 'espada-ferro', 10, stats);
  const r = comprarCarta(save, 'espada-ferro', 10, stats);
  assert.equal(r.custo, previa.custo);
  assert.equal(r.quantidade, previa.quantidade);
});

// ---------------------------------------------------------------------------
grupo('Progressao de producao');

teste('cps dobra quando a carta vai de 1 para 2 unidades', () => {
  const save = saveNovo();
  save.cartas = { 'espada-ferro': 1 };
  const um = derivar(save).cpsPorCarta['espada-ferro']!;
  save.cartas = { 'espada-ferro': 2 };
  const dois = derivar(save).cpsPorCarta['espada-ferro']!;
  // Fator triangular: 1 -> 1, 2 -> 3. Nao e linear em 2x.
  assert.ok(dois > um * 2.9 && dois < um * 3.1);
});

teste('nivel do heroi multiplica a producao', () => {
  const save = saveNovo();
  save.cartas = { 'espada-ferro': 5 };
  const antes = derivar(save).cps;
  save.nivel = 20;
  assert.ok(derivar(save).cps > antes);
});

teste('ouro nunca fica negativo apos uma compra valida', () => {
  const save = saveNovo();
  save.ouro = 1234;
  comprarCarta(save, 'escudo-madeira', 'max');
  assert.ok(save.ouro >= 0, `ouro virou ${save.ouro}`);
});

teste('save novo nao tem carta comprada', () => {
  assert.deepEqual(saveNovo().cartas, {});
});

// ---------------------------------------------------------------------------
grupo('Progresso offline');

teste('sessao de menos de 1 minuto nao credita nada', () => {
  const save = saveNovo();
  save.ultimoSalvoEm = Date.now() - 30_000;
  const combate = criarCombate(save);
  assert.equal(aplicarOffline(save, combate), null);
});

teste('credita ouro proporcional ao tempo fora', () => {
  const save = saveNovo();
  save.cartas = { 'espada-ferro': 20 };
  save.ultimoSalvoEm = Date.now() - 60 * 60 * 1000; // 1h

  const cpsInicial = derivar(save).cps;
  const combate = criarCombate(save);
  const r = aplicarOffline(save, combate);

  assert.ok(r, 'deveria ter retours');
  assert.ok(r!.ouro > 0);

  // O ganho offline NAO pode ser 1x o cps: durante a hora o jogador sobe de
  // nivel, o que multiplica o cps, e ainda recolhe o premio de cada abate.
  // Referencia: entre 1x e 6x de (cps_inicial * tempo). Fora disso e bug.
  const ideal = cpsInicial * 3600;
  assert.ok(
    r!.ouro >= ideal * 0.9,
    `ganho offline abaixo do esperado: ${r!.ouro} vs ${ideal}`,
  );
  assert.ok(
    r!.ouro <= ideal * 6,
    `ganho offline desproporcional: ${r!.ouro} (${(r!.ouro / ideal).toFixed(1)}x de ${ideal})`,
  );
});

teste('o tempo offline e limitado (nada de 3 meses de ouro)', () => {
  const save = saveNovo();
  save.cartas = { 'espada-ferro': 50 };
  save.ultimoSalvoEm = Date.now() - 30 * 24 * 3600 * 1000; // 30 dias

  const combate = criarCombate(save);
  const r = aplicarOffline(save, combate);

  assert.ok(r);
  assert.ok(r!.creditadoMs <= BALANCE.offlineTetoMs, 'excedeu o teto de 12h');
});

teste('offline credita ouro E avanca nivel', () => {
  const save = saveNovo();
  save.cartas = { 'espada-ferro': 10 };
  save.ultimoSalvoEm = Date.now() - 3 * 3600 * 1000;
  const combate = criarCombate(save);
  const r = aplicarOffline(save, combate);
  assert.ok(r!.xp > 0);
  assert.ok(save.nivel > 1, `nivel ficou em ${save.nivel}`);
});

// ---------------------------------------------------------------------------
grupo('Combate');

teste('tick credita ouro proporcional ao tempo', () => {
  const save = saveNovo();
  save.cartas = { 'espada-ferro': 10 };
  const combate = criarCombate(save);
  const antes = save.ouro;
  const r = tickCombate(save, combate, 1);
  const esperado = derivar(save).cps;
  assert.ok(r.ouroGanho > 0);
  assert.ok(Math.abs(save.ouro - antes - r.ouroGanho) < 1e-6);
  assert.ok(esperado > 0);
});

teste('dano suficiente derruba o alvo e avanca o estagio', () => {
  const save = saveNovo();
  save.cartas = { 'espada-ferro': 200 };
  const combate = criarCombate(save);
  const r = tickCombate(save, combate, 5);
  assert.ok(r.abates > 0, 'nenhum abate com dps alto');
  assert.ok(combate.estagio > 1, `estagio ficou em ${combate.estagio}`);
  assert.ok(combate.hpInimigo > 0, 'alvo ficou com hp <= 0');
});

teste('hp do alvo nunca passa de zero entre ticks', () => {
  const save = saveNovo();
  save.cartas = { 'espada-ferro': 500 };
  const combate = criarCombate(save);
  for (let i = 0; i < 50; i++) {
    tickCombate(save, combate, 0.1);
    assert.ok(combate.hpInimigo > 0, `hp <= 0 no tick ${i}`);
    assert.ok(combate.hpInimigo <= combate.hpMax);
  }
});

teste('inimigo escala com o estagio (HP sobe, monotonico)', () => {
  const baixo = inimigoDoEstagio(1);
  const alto = inimigoDoEstagio(30);
  assert.ok(alto.hp > baixo.hp);
  assert.ok(alto.ouro > baixo.ouro);
});

teste('combate nao entra em loop infinito com dps absurdo', () => {
  const save = saveNovo();
  save.cartas = { 'espada-ferro': 100_000 };
  const combate = criarCombate(save);
  const antes = Date.now();
  tickCombate(save, combate, 1);
  assert.ok(Date.now() - antes < 1000, 'tick travado');
});

// ---------------------------------------------------------------------------
grupo('Prestigio');

teste('prestigio exige ouro total minimo', () => {
  const save = saveNovo();
  assert.equal(previaPrestigio(save).disponivel, false);
});

teste('prestigio concede coroas proporcionais', () => {
  const save = saveNovo();
  save.ouroTotalGanho = 100_000;
  const previa = previaPrestigio(save);
  assert.equal(previa.disponivel, true);
  assert.ok(previa.coroasGanhas > 0);
});

teste('prestigio zera a run mas preserva as coroas', () => {
  const save = saveNovo();
  save.ouro = 50_000;
  save.ouroTotalGanho = 100_000;
  save.nivel = 15;
  save.cartas = { 'espada-ferro': 10 };

  const ganhas = fazerPrestigio(save);

  assert.ok(ganhas > 0);
  assert.equal(save.coroas, ganhas);
  assert.equal(save.ouro, 0);
  assert.equal(save.nivel, 1);
  assert.deepEqual(save.cartas, {});
  assert.equal(save.coroasGanhasNoTotal, ganhas);
});

teste('cada coroa aumenta a producao permanentemente', () => {
  const save = saveNovo();
  save.ouroTotalGanho = 100_000;
  fazerPrestigio(save);
  const comCoroa = derivar(save).cps;
  save.coroas = 0;
  assert.ok(comCoroa > derivar(save).cps);
});

teste('prestigio sem ouro total nao faz nada', () => {
  const save = saveNovo();
  assert.equal(fazerPrestigio(save), 0);
});

// ---------------------------------------------------------------------------
grupo('Desbloqueio de conteudo');

teste('no inicio so as cartas de nivel 0 estao visiveis', () => {
  const save = saveNovo();
  const ids = cartasDisponiveis(save).map((c) => c.id);
  assert.deepEqual(ids, ['espada-ferro', 'escudo-madeira']);
});

teste('cartas de era ficam bloqueadas sem coroa', () => {
  const save = saveNovo();
  save.nivel = 999;
  const ids = cartasDisponiveis(save).map((c) => c.id);
  const dragao = CARTAS_POR_ID['dragao-anciao']!;
  assert.ok(!ids.includes(dragao.id), 'dragao lendario nao deveria aparecer sem coroa');
});

teste('coroa suficiente desbloqueia a carta de era', () => {
  const save = saveNovo();
  save.nivel = 999;
  save.coroas = 6;
  const ids = cartasDisponiveis(save).map((c) => c.id);
  assert.ok(ids.includes('dragao-anciao'));
});

teste('toda carta do conteudo tem numeros coerentes', () => {
  for (const def of Object.values(CARTAS_POR_ID)) {
    assert.ok(def.custoBase > 0, `${def.id}: custoBase <= 0`);
    assert.ok(def.custoCrescimento > 1, `${def.id}: crescimento <= 1 trava a progressao`);
    assert.ok(def.cpsBase > 0, `${def.id}: cpsBase <= 0`);
    assert.ok(def.dpsBase > 0, `${def.id}: dpsBase <= 0`);
  }
});

teste('cartas mais caras rendem mais que as mais baratas', () => {
  const ordenadas = Object.values(CARTAS_POR_ID).sort((a, b) => a.custoBase - b.custoBase);
  for (let i = 1; i < ordenadas.length; i++) {
    assert.ok(
      ordenadas[i]!.cpsBase > ordenadas[i - 1]!.cpsBase,
      `${ordenadas[i]!.id} e mais cara que ${ordenadas[i - 1]!.id} mas rende menos`,
    );
  }
});

// ---------------------------------------------------------------------------
grupo('Formatacao');

teste('abrevia milhares, milhoes e bilhoes', () => {
  assert.equal(abreviar(999), '999');
  assert.equal(abreviar(1000), '1.00K');
  assert.equal(abreviar(1_234_567), '1.23M');
  assert.equal(abreviar(2.5e9), '2.50B');
  assert.equal(abreviar(1e12), '1.00T');
});

teste('mostra decimal em producao fracionaria (o bug do "0/s")', () => {
  assert.equal(abreviar(0.1), '0.1');
  assert.equal(abreviar(0.25), '0.25');
  assert.equal(abreviar(1.5), '1.5');
  assert.equal(abreviar(0), '0');
});

teste('formatar nunca devolve NaN nem Infinity', () => {
  assert.equal(abreviar(NaN), '0');
  assert.equal(abreviar(Infinity), '0');
  assert.ok(!abreviar(1e300).includes('Infinity'));
});

teste('duracao em dias, horas, minutos e segundos', () => {
  assert.equal(duracao(0), '0s');
  assert.equal(duracao(45_000), '45s');
  assert.equal(duracao(90_000), '1min 30s');
  assert.equal(duracao(3 * 3_600_000 + 14 * 60_000), '3h 14min');
  assert.equal(duracao(2 * 86_400_000), '2d 0h');
});

// ---------------------------------------------------------------------------
console.log(`\n${passou} passaram, ${falhas.length} falharam`);
if (falhas.length > 0) {
  console.log('\nFalhas:');
  for (const f of falhas) console.log(`  - ${f}`);
  process.exit(1);
}