# Range Combos

App desktop (Electron) que identifica **ranges de poker** e a **quantidade de combos** a partir
de prints, usando a API de visão da Anthropic.

Cada **frequência** é uma ação nomeada do range (Raise, Call, 3bet all in...). Você dá um nome,
cola o print (Ctrl+V / ⌘V) e adiciona quantas precisar. Para o **fold**, basta informar a % — o
app infere quais mãos foldam. Ao clicar em **Calcular**, ele reconstrói o grid 13×13 de cada ação,
o **range mesclado** (cores proporcionais por mão) e o total de combos, e permite copiar cada range
no formato **HRC**.

### Inferência do fold

Você normalmente não tem o grid de fold. O app infere a distribuição ancorando o **peso cheio**
(100%, sem fold) de cada categoria nas mãos mais fortes que não foldam: **AA/KK** (pares),
**AKs** (suited) e **AKo** (offsuit). Cada mão folda só a diferença até o cheio da sua categoria
(`fold = cheio − jogado`), preservando o play mínimo que aparece nos grids. Assim mãos fortes não
foldam (AK ≈ 0%), mãos "OK" foldam uma parte (ex.: QTo ~65%) e o lixo folda quase tudo mas mantém
seu call/raise mínimo (32o nunca é 100%).

O campo de % no card de Fold é **opcional**: em branco, usa as âncoras direto; preenchido, calibra
uma escala global por bisseção para o fold total bater essa porcentagem. O fold inferido é exibido
junto com os resultados.

## Pré-requisitos

- Node.js 22+
- Uma chave de API da Anthropic (https://console.anthropic.com/settings/keys)

Cada usuário usa a própria chave. Ela fica salva **apenas no computador local** (via
`electron-store`) e nunca é embutida no app. Cada identificação consome tokens da sua conta.

## Desenvolvimento

```bash
npm install
npm run dev
```

Na primeira execução, abra **Configurações** e cole sua chave de API. Use **Testar** para validar.

## Como funciona

- **Renderer (React)**: captura as imagens coladas e mostra a UI/preview.
- **Main (Node)**: guarda a chave e faz as chamadas à Anthropic (`claude-opus-4-8`, visão +
  structured outputs). A chave nunca é exposta ao renderer.
- O modelo extrai as 169 mãos com seus valores; o **total de combos é somado no app**.
  Os números são lidos **como exibidos** no print (a semântica depende do solver).

## Build local

```bash
npm run build       # transpila main/preload/renderer para out/
npm run build:mac   # gera dmg/zip (macOS)
npm run build:win   # gera instalador nsis (Windows)
```

Os artefatos vão para `dist/`.

## Distribuição e auto-update (GitHub)

1. Edite `electron-builder.yml` e troque `owner` pelo seu usuário/organização do GitHub
   (o `repo` é `range-combos`).
2. A cada release, **suba a versão** em `package.json` (ex.: `0.1.0` → `0.1.1`).
3. Faça push na branch **`main`**. O workflow `.github/workflows/release.yml` builda macOS e
   Windows e publica um Release no GitHub com os instaladores e os metadados de update
   (`latest.yml` / `latest-mac.yml`).
4. O app verifica atualizações automaticamente ao abrir (`electron-updater`).

> Configure o repositório em **dois lugares** (devem bater): `owner`/`repo` em
> `electron-builder.yml` e `GITHUB_OWNER`/`GITHUB_REPO` em `src/shared/config.ts`.

### Comportamento do update por sistema

O app verifica updates ao abrir e há um botão **"Verificar atualizações"** na barra de topo.

- **Windows** (electron-updater): ao detectar nova versão, mostra um aviso **perguntando se
  deseja baixar**. Você clica em **Baixar** → barra de progresso → botão **Reiniciar e
  atualizar** (instala e reabre). Funciona sem assinatura (o instalador exibe um aviso do
  SmartScreen).
- **macOS**: como não está assinado, a verificação é feita via API do GitHub (sem depender de
  assinatura). Ao detectar nova versão, mostra o aviso e o botão **Baixar** abre a página de
  releases para baixar o `.dmg` manualmente.

### Assinatura de código (decidir depois)

A estrutura já está pronta; a assinatura está **desativada** por enquanto. Para ativar o
auto-update completo no macOS (download + instalação automáticos), é preciso assinar +
notarizar (conta Apple Developer, US$99/ano): configure os secrets `CSC_LINK`,
`CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, remova
`identity: null`/`notarize: false` em `electron-builder.yml`, descomente os envs no workflow e
troque a verificação do macOS pelo fluxo do electron-updater. Para assinar o Windows, defina
`CSC_LINK` e `CSC_KEY_PASSWORD` nos secrets.

## Estrutura

```
src/
  main/        # processo principal: janela, IPC, store, chamadas Anthropic, auto-update
  preload/     # bridge segura (contextBridge) -> window.api
  renderer/    # UI React (frequências, slots de colar, preview do grid, settings)
  shared/      # tipos compartilhados
```
