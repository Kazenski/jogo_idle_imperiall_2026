# Imperiall Idle

Idle RPG de cartas ambientado no [Imperiall RPG](https://imperiallworld.com/).
Roda no navegador (PWA, instalável) e pode virar APK Android via TWA.

**Jogue em:** <https://kazenski.github.io/jogo_idle_imperiall_2026/>

---

## O que o jogo é

Você compra **cartas** (itens, armas, criaturas do lore). Cada carta produz ouro
por segundo. Cards resolvidos alimentam o **hero**, que enfrenta inimigos em
estágios crescentes. Duas camadas de reset dão a curva de progressão longa:

- **Arenação** — moeda permanente. Zera a run, mantém as cartas.
- **Renarquiciar (prestígio)** — zera tudo, concede **Coroas** (+% permanente).

## Decisões de arquitetura

O ponto que mais importa: **`src/core/` não tem uma linha de DOM**. Toda a
matemática do jogo (produção, dano, custo, offline, prestígio) roda em funções
puras que recebem e devolvem o save. Isso é o que permite simular 12 horas de
jogo offline em 12 mil iterações sem renderizar nada.

```
src/
  core/       ← lógica pura, testável em Node
  data/       ← conteúdo (cartas, inimigos) — é aqui que entra o lore
  art/        ← sprites pixel-art procedurais (placeholders)
  scenes/     ← Phaser: só a cena de combate
  ui/         ← DOM/CSS: HUD, loja, coleção, prestígio, ajustes
testes/       ← testes do núcleo (npm test)
scripts/      ← gerador de ícones
```

Consequências práticas:

- `derivar(save)` é a **única** fonte de verdade de "quanto eu ganho". Se a UI
  recalcular produção por conta própria, os números divergem do save e o
  jogador percebe.
- A cena do Phaser não decide abates nem mexe em ouro. Ela recebe um estado e
  desenha. Trocar Phaser por Canvas 2D não toca em regra de jogo.
- `aplicarOffline()` reusa o mesmo `tickCombate` do jogo online, então não
  existe divergência entre "o que rendeu offline" e "o que teria rendido
  ficando olhando".

### Performance

O loop roda a 60 fps mas a UI re-renderiza a 10 fps, e **por campo**
(`definirTexto` só escreve se o valor mudou, `tela[hidden]` em vez de
remover/criar). Recriar a árvore de DOM a cada tick destrói o scroll da lista de
cartas e derruba a taxa de quadros num celular médio.

## Rodando

```powershell
npm install
npm run dev        # http://localhost:5173/jogo_idle_imperiall_2026/
npm test           # 39 testes do núcleo
npm run build      # gera dist/ com service worker
npm run preview    # serve dist/ (localhost:4173)
```

## Publicação

GitHub Actions faz o deploy em todo push na `main`
(`.github/workflows/pages.yml`): build → checagem do `base` → Pages.

O `base` do Vite está fixado em `/jogo_idle_imperiall_2026/` porque este é um
*project site*. O workflow falha se o prefixo divergir — assim um 404 silencioso
vira erro de build.

### Antes do primeiro deploy

O Pages precisa ser ligado uma vez, pelo navegador:

1. <https://github.com/Kazenski/jogo_idle_imperiall_2026/settings/pages>
2. Em **Build and deployment → Source**, escolha **GitHub Actions**
3. Salve

Depois disso, todo push na `main` publica sozinho. Enquanto o Pages não estiver
ligado o build continua verde e o workflow imprime um aviso com o link.

## APK Android

Ver [`twa/README.md`](twa/README.md). Resumo: o APK embrulha a URL do Pages
numa WebView, então **publicar no GitHub já atualiza o APK instalado**. Requer
Node 20+ e JDK 17, sem Android Studio.

## Trocando os placeholders por arte real

Os sprites são grades ASCII em `src/art/sprites.ts`, rasterizadas em canvas
(sem download, sem RNG — o jogo abre offline). Para entrar com PNGs próprios,
preencha `CAMINHO_SPRITE` naquele arquivo e nada mais muda: o resto do código
usa as mesmas chaves.

A paleta é um objeto de 21 cores. Trocar a paleta inteira re-tematiza o jogo.

## Trocando o lore

Dois arquivos, ambos só dados:

- `src/data/cartas.ts` — nome, descrição, raridade, sprite e os 4 números de
  balanceamento de cada carta.
- `src/data/inimigos.ts` — inimigos, escalonamento e estágios.

Regras para não quebrar a curva:

- `cpsBase / custoBase` deve **cair** conforme a carta sobe de tier. A primeira
  compra tem que levar segundos; a última, horas.
- `custoCrescimento` entre 1.15 (início) e 1.25 (fim de jogo). Valores > 1.30
  criam uma parede que o jogador não percebe que é intencional.
- Cartas mais caras **precisam** render mais que as baratas. Há teste cobrindo
  isso (`cartas mais caras rendem mais que as mais baratas`).
- Cartas de era alta exigem `eraRequerida > 0` (Coroas do prestígio), senão
  viram conteúdo alcançável sem renarquiciar.

`npm test` valida essas invariantes depois de qualquer edição.

## Save

`localStorage`, com `versao` e cadeia de migrações. **Ao adicionar um campo
obrigatório:** acrescente o default em `saveNovo()` *e* um passo novo em
`MIGRACOES`. Nunca edite um bloco `versao: N` já publicado.

Como não há backend, o save é **por aparelho**. Quem troca de celular precisa
exportar/importar manualmente (aba Ajustes). Um futuro "login com GitHub +
Gist" resolveria isso sem mudar o formato do save.

## Estado atual

- 13 cartas, 8 inimigos, 4 camadas de progressão (nível do herói, cartas,
  Arenação, prestígio)
- Offline até 12 h (100% até 8 h, depois 25%)
- PWA instalável, Service Worker com precache, funciona offline
- Layout mobile (aba única) e tablet/desktop (palco + painel lateral)
- Sem analytics, sem servidor, sem conta

## Licença

Código do jogo: use como quiser. O lore e o material do Imperiall RPG pertencem
aos seus autores — confirme antes de distribuir.