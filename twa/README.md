# Imperiall Idle — empacotando como APK Android (Bubblewrap / TWA)

Este diretorio guardaria o projeto Android gerado pelo Bubblewrap. **Ele nao esta
versionado no git** (veja o `.gitignore` na raiz): o Bubblewrap contem uma chave
de assinatura e um keystore.

## Como funciona

O APK nao contem o jogo. Ele contem uma WebView em tela cheia apontando para a
URL do GitHub Pages. Consequencia pratica: **quando voce faz push na `main`, o
APK instalado ja serve a versao nova** — sem rebuild, sem passar por review.

Trade-off: o APK precisa de internet para carregar o jogo. Como o jogo tem
service worker com precache, depois da primeira visita ele abre offline.

## Pre-requisitos

- Node 20+
- JDK 17 (o Bubblewrap usa a JDK para assinar o APK; Java puro, sem Android Studio)
- O jogo **publicado** no GitHub Pages

```powershell
node --version
java -version   # deve ser 17
```

## Passo 1 — apontar o Bubblewrap para o site publicado

Rode daqui, com a URL do Pages pronta:

```powershell
npx @bubblewrap/cli@latest init `
  --manifest https://kazenski.github.io/jogo_idle_imperiall_2026/manifest.webmanifest
```

O `init` e interativo: ele pergunta pelo package id, nome e icone. Sugestoes:

| Campo | Valor |
|---|---|
| App name | Imperiall Idle |
| Package / applicationId | `com.imperiall.idle` |
| Signing key | deixar gerar (ele cria `~/.android/debug.keystore`) |

## Passo 2 — buildar o APK

```powershell
npx @bubblewrap/cli@latest build
```

Saida em `twa/`. Para instalar no celular por USB:

```powershell
adb install -r twa\app-release-signed.apk
```

Sem `adb` no PATH? Ative **Opcoes do desenvolvedor > Depuracao USB** e baixe o
platform-tools, ou instale o APK copiando para o aparelho e abrindo com o
gerenciador de arquivos (Android vai pedir permissao de "instalar de fonte
desconhecida").

## Passo 3 — distributir

Opcoes, do mais simples ao mais chato:

1. **Link direto do GitHub Releases.** Faca push da `twa/` numa branch, suba o
   APK como asset de release, e mande o link no grupo do RPG. O Android instala
   direto do navegador.
2. **Play Store.** Exige conta de desenvolvedor ($25 uma vez),填报 de ficha e
   revisao. Faz sentido so se voce quiser descoberta organica.

## Manter o manifesto do PWA em dia

O TWA valida o manifesto. Se voce mudar o manifesto do jogo, rode `npm run twa:update`:

```powershell
npx @bubblewrap/cli@latest update
```

## Se voce migrar para Capacitor depois

Capacitor embute o `dist/` no APK (100% offline, haptics, notificacoes), mas
a cada mudanca no web vira um novo APK. Cenario tipico: comece com TWA para
validar o jogo, migre para Capacitor so quando precisar de offline real ou de
API nativa.

Requisitos: Android SDK (via Android Studio) e JDK 17. nesta maquina ja ha
JDK 25 instalado, que o Gradle do Android ainda nao suporta bem — instale o
JDK 17 ao lado se for por esse caminho.