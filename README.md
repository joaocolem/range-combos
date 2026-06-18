# Range Combos

App desktop (Electron) que identifica **ranges de poker** e a **quantidade de combos** a partir
de prints, usando a API de visão da Anthropic.

Você cola os prints (Ctrl+V / ⌘V), organiza em **frequências** (slot Raise + slot Call),
clica em **OK** e o app reconstrói o grid 13×13 com os valores lidos e o total de combos por ação.

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

### Assinatura de código (decidir depois)

A estrutura já está pronta; a assinatura está **desativada** por enquanto.

- **Windows**: o auto-update já funciona sem assinatura (o instalador exibe um aviso do
  SmartScreen). Para assinar, defina `CSC_LINK` e `CSC_KEY_PASSWORD` nos secrets do CI.
- **macOS**: o auto-update **só funciona após assinar + notarizar** (requer conta Apple
  Developer, US$99/ano). Até lá, no macOS a atualização é manual (baixar o novo `.dmg`).
  Para ativar: configure os secrets `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`,
  `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, remova `identity: null`/`notarize: false`
  em `electron-builder.yml` e descomente os envs no workflow.

## Estrutura

```
src/
  main/        # processo principal: janela, IPC, store, chamadas Anthropic, auto-update
  preload/     # bridge segura (contextBridge) -> window.api
  renderer/    # UI React (frequências, slots de colar, preview do grid, settings)
  shared/      # tipos compartilhados
```
