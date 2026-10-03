import Phaser from 'phaser';
import { LADO, spriteDeInimigo, spriteParaCanvas } from '../art/sprites';
import type { EstadoCombate } from '../core/combate';

const CHAVE_TEXTURA = 'sprite-inimigo';
const CHAVE_TEXTURA_HEROI = 'sprite-heroi';
const ESCALA = 3;
const LADO_PX = LADO * ESCALA;

/**
 * Cena de combate.
 *
 * REGRA DE ARQUITETURA: a cena e *burra*. Ela nao calcula dano, nao decide
 * abates, nao mexe em ouro. Ela so pede "meu alvo e este, minha vida e esta" e
 * desenha. Toda a matematica vive em `core/`, que roda independente do Phaser.
 *
 * Isso e o que permite rodar o mesmo `aplicarOffline()` sem Phaser e ter o
 * numero de progresso offline igual ao online.
 */
export class BattleScene extends Phaser.Scene {
  private inimigo!: Phaser.GameObjects.Image;
  private heroi!: Phaser.GameObjects.Image;
  private barraFundo!: Phaser.GameObjects.Rectangle;
  private barraHp!: Phaser.GameObjects.Rectangle;
  private rotuloInimigo!: Phaser.GameObjects.Text;
  private rotuloEstagio!: Phaser.GameObjects.Text;
  private flash!: Phaser.GameObjects.Rectangle;
  private numeroFlutuante!: Phaser.GameObjects.Text;
  private ceu!: Phaser.GameObjects.Graphics;
  private chao!: Phaser.GameObjects.Graphics;

  private combate: EstadoCombate | null = null;
  private tweenIdle: Phaser.Tweens.Tween | null = null;
  private tweenHit: Phaser.Tweens.Tween | null = null;
  private ultimoSpriteInimigo = '';
  private redutorAnimacoes = false;
  /** create() ja rodou e os game objects existem. */
  private pronta = false;

  constructor() {
    super('battle');
  }

  /**
   * Injeta o estado de combate. Chamado pelo jogo, nunca pelo Phaser.
   *
   * Pode rodar ANTES do create() (o jogo instancia a cena e ja tem o estado
   * pronto). Guardamos e pintamos depois, quando os game objects existirem.
   */
  definirCombate(combate: EstadoCombate, redutor: boolean): void {
    this.combate = combate;
    this.redutorAnimacoes = redutor;
    if (this.pronta) this.pintarAlvo();
  }

  /** Dano recebido pelo alvo no tick mais recente (para o feedback visual). */
  registrarDano(fracao: number): void {
    if (this.redutorAnimacoes || !this.pronta) return;
    if (!this.inimigo || fracao <= 0) return;

    this.tweenHit?.stop();
    this.inimigo.setTint(0xffffff);
    this.inimigo.setPosition(this.inimigo.x + 6, this.inimigo.y);
    this.tweenHit = this.tweens.add({
      targets: this.inimigo,
      x: this.inimigo.x - 6,
      duration: 90,
      ease: 'Sine.Out',
    });

    this.flash.setAlpha(0.5);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 140 });

    const texto = this.numeroFlutuante
      .setText(`-${Math.round(fracao * 100)}%`)
      .setPosition(this.inimigo.x, this.inimigo.y - LADO_PX / 2)
      .setAlpha(1);
    this.tweens.add({
      targets: texto,
      y: texto.y - 28,
      alpha: 0,
      duration: 620,
      onComplete: () => texto.setAlpha(0),
    });
  }

  /** Sinaliza abate para o feedback visual. */
  registrarAbate(): void {
    if (this.redutorAnimacoes || !this.pronta || !this.inimigo) return;
    this.tweens.add({
      targets: this.inimigo,
      alpha: 0,
      scale: 1.25,
      duration: 120,
      yoyo: true,
      onComplete: () => this.inimigo.setAlpha(1).setScale(1),
    });
  }

  preload(): void {
    this.registrarTexturaHeros();
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1b2a4a');

    // Simula o pixel-art original: chao em degraus + ceu.
    this.desenharCenario();

    this.heroi = this.add
      .image(width * 0.22, height * 0.62, CHAVE_TEXTURA_HEROI)
      .setScale(ESCALA * 0.9)
      .setOrigin(0.5, 1);

    this.inimigo = this.add
      .image(width * 0.74, height * 0.6, CHAVE_TEXTURA)
      .setOrigin(0.5, 1);

    // Barra de vida do alvo, em cima do inimigo.
    const larguraBarra = Math.min(220, width * 0.42);
    this.barraFundo = this.add
      .rectangle(width * 0.74, height * 0.6 - LADO_PX - 14, larguraBarra, 12, 0x1b1f2b)
      .setStrokeStyle(2, 0x0b0d12);
    this.barraHp = this.add
      .rectangle(width * 0.74, height * 0.6 - LADO_PX - 14, larguraBarra - 4, 8, 0xe0574a)
      .setOrigin(0, 0.5);

    this.rotuloInimigo = this.add
      .text(width * 0.74, height * 0.6 - LADO_PX - 30, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '15px',
        color: '#e6e9f2',
      })
      .setOrigin(0.5, 1);

    this.rotuloEstagio = this.add
      .text(width * 0.74, height * 0.6 - LADO_PX - 46, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#8b93a7',
      })
      .setOrigin(0.5, 1);

    this.flash = this.add
      .rectangle(width * 0.74, height * 0.6 - LADO_PX / 2, LADO_PX, LADO_PX, 0xffffff)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.numeroFlutuante = this.add
      .text(0, 0, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '16px',
        color: '#ffd964',
        stroke: '#12141c',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.iniciarIdle();

    this.pronta = true;
    if (this.combate) this.pintarAlvo();

    // Reajusta o layout quando a janela/orientacao muda.
    this.scale.on('resize', this.reposicionar, this);
  }

  update(): void {
    if (this.combate) this.pintarAlvo();
  }

  shutdown(): void {
    this.pronta = false;
    this.scale.off('resize', this.reposicionar, this);
    this.tweenIdle?.stop();
    this.tweenHit?.stop();
  }

  // -------------------------------------------------------------------------

  private iniciarIdle(): void {
    this.tweenIdle?.stop();
    if (this.redutorAnimacoes) return;
    this.tweenIdle = this.tweens.add({
      targets: this.heroi,
      y: this.heroi.y - 6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** Redesenha o alvo a partir do estado de combate. */
  private pintarAlvo(): void {
    const c = this.combate;
    if (!c || !this.inimigo) return;

    const sprite = spriteDeInimigo(c.spriteInimigo);
    if (sprite !== this.ultimoSpriteInimigo) {
      this.textures.remove(CHAVE_TEXTURA);
      const canvas = spriteParaCanvas(sprite, ESCALA);
      this.textures.addCanvas(CHAVE_TEXTURA, canvas);
      this.ultimoSpriteInimigo = sprite;
    }
    this.inimigo.setTexture(CHAVE_TEXTURA);

    const fracao = c.hpMax > 0 ? Math.max(0, c.hpInimigo / c.hpMax) : 0;
    this.barraHp.scaleX = Math.max(0.001, fracao);
    this.barraHp.x = this.barraFundo.x - (this.barraFundo.width - 4) / 2;
    this.rotuloInimigo.setText(c.nomeInimigo);
    this.rotuloEstagio.setText(`Estagio ${c.estagio}`);
  }

  private reposicionar(): void {
    const { width, height } = this.scale;
    const xHeroi = width * 0.22;
    const yHeroi = height * 0.62;
    const xInimigo = width * 0.74;
    const yInimigo = height * 0.6;

    this.heroi.setPosition(xHeroi, yHeroi);
    this.inimigo.setPosition(xInimigo, yInimigo);
    this.flash.setPosition(xInimigo, yInimigo - LADO_PX / 2);
    this.barraFundo.setPosition(xInimigo, yInimigo - LADO_PX - 14);
    this.barraHp.setPosition(xInimigo, yInimigo - LADO_PX - 14);
    this.rotuloInimigo.setPosition(xInimigo, yInimigo - LADO_PX - 30);
    this.rotuloEstagio.setPosition(xInimigo, yInimigo - LADO_PX - 46);

    this.tweenIdle?.stop();
    this.iniciarIdle();
  }

  /** Heroi: um guerreiro placeholder, gerado a partir de um sprite da arte. */
  private registrarTexturaHeros(): void {
    const canvas = this.heroiPlaceholder();
    this.textures.addCanvas(CHAVE_TEXTURA_HEROI, canvas);
  }

  /**
   * Monta o heroi 16x16 a partir de pecoes — assim da para trocar o heroi
   * trocando so este metodo, sem mexer nas grades de `art/sprites.ts`.
   */
  private heroiPlaceholder(): HTMLCanvasElement {
    const grade = [
      '.......KK.......',
      '......KTTK......',
      '.....KTTTTK.....',
      '.....KTTTTK.....',
      '.....KTWWKT.....',
      '......KTTK......',
      '.....KKTTKK.....',
      '..K.KTTTTTK.K...',
      '..K.KTPPPTK.K...',
      '..K.KTTTTTK.K...',
      '....KTTTTTK.....',
      '....KTTTTTK.....',
      '....KTTTTTK.....',
      '....KTKKKTK.....',
      '...KKKKKKKKK....',
      '...KKK....KKK...',
    ];
    const paleta: Record<string, string> = {
      K: '#12141c',
      T: '#5c6b8a',
      P: '#9fb0cc',
      W: '#e0ac69',
    };
    const canvas = document.createElement('canvas');
    canvas.width = LADO;
    canvas.height = LADO;
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < LADO; y++) {
      const linha = (grade[y] ?? '').padEnd(LADO, '.').slice(0, LADO);
      for (let x = 0; x < LADO; x++) {
        const ch = linha[x] ?? '.';
        if (ch === '.') continue;
        ctx.fillStyle = paleta[ch] ?? '#ff00ff';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  }

  /**
   * Cenario em degraus, no estilo do jogo de referencia.
   *
   * Redrawn a cada resize: o cenario e geometria absoluta (fillRect com
   * largura/altura fixas), entao se so fosse desenhado no create() ficaria
   * com uma faixa vazia quando a janela mudasse de tamanho.
   */
  private desenharCenario(): void {
    const { width, height } = this.scale;
    this.ceao?.destroy();
    this.chao?.destroy();

    const ceu = this.add.graphics();
    ceu.fillGradientStyle(0x1b2a4a, 0x1b2a4a, 0x243a63, 0x243a63, 1);
    ceu.fillRect(0, 0, width, height);
    this.ceao = ceu;

    const chao = this.add.graphics();
    const topo = Math.floor(height * 0.72);
    // Silhueta de colina em degraus.
    for (let i = 0; i < 5; i++) {
      const largura = width * (0.45 + i * 0.14);
      const altura = 26 + i * 16;
      chao.fillStyle(0x2f4f3d, 1);
      chao.fillRect(Math.round((width - largura) / 2), topo - i * 14, largura, altura);
    }
    chao.fillStyle(0x3b6b4f, 1);
    chao.fillRect(0, topo, width, height - topo);
    chao.fillStyle(0x46916a, 1);
    chao.fillRect(0, topo, width, 6);
    this.chao = chao;
  }
}

export interface JogoRefs {
  game: Phaser.Game;
  cena: BattleScene;
}

/**
 * Instancia o Phaser. So a battle scene e criada; as demais telas sao DOM.
 *
 * A cena e construida por nos e entregue de volta imediatamente, antes do boot
 * terminar. Isso e seguro porque `definirCombate` guarda o estado e so desenha
 * quando a cena ficar ativa — nao depende de evento de boot.
 */
export function criarJogo(pai: HTMLElement): JogoRefs {
  const cena = new BattleScene();

  // Dimensao inicial EXPLICITA. Confiar na medicao do parent no boot e fragil:
  // se o elemento estiver `display: none` ou ainda sem layout (fonte carregando),
  // o Phaser cria um framebuffer 0x0 e o WebGL morre com "Incomplete
  // Attachment". Passando um valor inicial valido o framebuffer sempre nasce
  // certo, e o RESIZE abaixo corrige o resto.
  const medir = () => {
    const r = pai.getBoundingClientRect();
    return {
      largura: Math.max(1, Math.round(r.width)),
      altura: Math.max(1, Math.round(r.height)),
    };
  };

  const inicial = medir();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: pai,
    width: inicial.largura,
    height: inicial.altura,
    transparent: true,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    banner: false,
    scene: [cena],
  });

  // `Scale.RESIZE` so reage a `window.resize`, mas o palco tambem muda de
  // tamanho quando a coluna do layout muda (ou quando volta de `display:none`),
  // sem evento de janela. O ResizeObserver cobre esse buraco.
  const observar = new ResizeObserver(() => {
    // O 