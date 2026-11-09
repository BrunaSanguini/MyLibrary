# CI/CD

Pipelines do GitHub Actions, release, atualização de dependências e configurações do repositório. As decisões e as alternativas descartadas estão no [ADR-0008](adr/0008-ci-cd.md).

## Visão geral

| Arquivo | Quando roda | Jobs | Situação |
|---|---|---|---|
| `.github/workflows/pr-checks.yml` | PR para a `main`: aberto, editado, atualizado ou reaberto | `pr-title`, `dependency-review` | ativo |
| `renovate.json` | segundas, antes das 9h | PRs de atualização de dependências | ativo |
| `.github/workflows/ci.yml` | PR para a `main` e push na `main` | `backend`, `frontend`, `e2e`, `sonar` | entra com o esqueleto do projeto |
| `.github/workflows/release.yml` | push na `main` | `release-please`, `package` | entra com o esqueleto do projeto |

O `ci.yml` e o `release.yml` dependem do `pom.xml` e do `package.json`, então entram no mesmo PR que cria o esqueleto do back e do front.

## Checks de PR

### `pr-title`

Valida o título do PR, que vira o commit na `main` no squash merge. O commitlint local não enxerga esse commit, por isso a validação acontece no PR.

- **Tipos e escopos:** os mesmos do [`CONTRIBUTING.md`](../CONTRIBUTING.md#commits). O escopo é opcional.
- **Descrição:** começa com letra minúscula (não com número ou símbolo), não termina com ponto e tem no máximo 72 caracteres.
- **Exceção:** os PRs automáticos do Renovate têm a descrição em inglês (`chore(deps): update angular monorepo to v22.3.0`). O formato continua válido.

### `dependency-review`

Compara as dependências do PR com as da `main` e falha se o PR introduzir uma dependência com vulnerabilidade **alta ou crítica**. Depende do **Dependency graph** ligado nas configurações do repositório.

## CI

| Job | Runner | O que faz |
|---|---|---|
| `backend` | Ubuntu | `./mvnw -B verify -Pskip-frontend -Pci`: Spotless check, NullAway, testes `*Test` e `*IT`, JaCoCo com gate de 80% e o snapshot do `openapi.json` |
| `frontend` | Ubuntu | `npm ci`, geração dos tipos da API, ESLint, Prettier check, Stylelint, build com budgets e Vitest (jsdom e modo navegador no Chromium) |
| `e2e` | Ubuntu | depois de `backend` e `frontend`: gera o jar completo, sobe o WireMock da Open Library e roda o Playwright no Chromium e no Firefox, com axe. Se falhar, publica relatório e traces como artefato |
| `sonar` | Ubuntu | depois de `backend` e `frontend`, quando algum deles rodou: envia código e cobertura (JaCoCo XML e lcov) ao SonarQube Cloud e espera o resultado do quality gate (`sonar.qualitygate.wait=true`). Gate reprovado falha o job |
| `ci` | Ubuntu | roda sempre, por último (`if: always()`). Falha se algum job anterior falhou ou foi cancelado; jobs pulados contam como aprovados |

- **Filtro por pasta:** um job `changes` decide o que rodar. Um PR que só altera `docs/` pula back, front, E2E e Sonar.
- **Um único check obrigatório para o CI:** a proteção da `main` exige só o job `ci`, que resume os demais. Assim, um PR só de documentação não fica preso esperando um check que nunca roda, como o quality gate do Sonar. O check externo do app do SonarQube Cloud fica informativo; quem bloqueia é o job `sonar`, através do `ci`.
- **Versões numa fonte só:**
  - Java vem de `.java-version` (`java-version-file` do `setup-java`).
  - Node vem de `.nvmrc` (`node-version-file` do `setup-node`).
  - O Renovate atualiza esses arquivos e o `nodeVersion` do `pom.xml`.
- **Cache:** Maven (`setup-java`) e npm (`setup-node`). Os navegadores do Playwright são instalados a cada execução, como a documentação do Playwright recomenda.
- **Meta:** CI de PR em menos de 10 minutos.

## Release

### release-please

O [release-please](https://github.com/googleapis/release-please) lê os commits da `main` e mantém um **PR de release** aberto, com:

- **Versão:** a próxima no SemVer (`feat` → minor, `fix` → patch). Antes da 1.0, breaking change sobe a minor (`bump-minor-pre-major`).
- **`CHANGELOG.md`:** com seções em português:

  | Tipo | Seção |
  |---|---|
  | `feat` | Funcionalidades |
  | `fix` | Correções |
  | `perf` | Desempenho |
  | `docs` | Documentação |

- **Versão nos arquivos:** atualizada no `backend/pom.xml` e no `frontend/package.json` (`extra-files`).
- **Título do PR de release:** `chore: release X.Y.Z` (`pull-request-title-pattern`). O padrão do release-please, `chore(main): release`, usa um escopo fora da lista e reprovaria no `pr-title`.

**Token próprio.** PRs criados com o `GITHUB_TOKEN` padrão não disparam outros workflows. O PR de release ficaria sem checks, e a proteção da `main` impediria o merge. Por isso, o release-please usa o secret `RELEASE_PLEASE_TOKEN`.

### Pacote para Windows

Quando o PR de release é aceito, o release-please cria a tag `vX.Y.Z` e o GitHub Release. O job `package`:

1. Roda num runner **Windows**, porque o `jpackage` gera o executável do sistema em que roda.
2. Faz o build completo (`./mvnw -B package`), com o front embutido.
3. Gera o runtime com `jlink` e o app-image com `jpackage --type app-image`.
4. Compacta em `minha-livraria-X.Y.Z-windows-x64.zip` e gera o checksum SHA-256.
5. Anexa os dois arquivos ao GitHub Release.

O executável não é assinado digitalmente. O Windows pode mostrar um aviso do SmartScreen na primeira execução.

Os passos 3 e 4 ficam em `scripts/package-windows.ps1`, que também roda localmente (no PowerShell, depois de `./mvnw package` em `backend/`):

```powershell
./scripts/package-windows.ps1 -Version 0.1.0
```

**Primeira versão.** A v0.1.0 foi fixada com `release-as`, porque os commits até ela eram só de `build`, `ci` e `docs`. A partir dela, as versões seguem os commits.

## Renovate

Configuração em [`renovate.json`](../renovate.json):

| Item | Regra |
|---|---|
| Agenda | segundas, antes das 9h (horário de São Paulo); manutenção do lockfile no dia 1º de cada mês |
| Commits e PRs | `chore(deps): ...`, compatíveis com o `pr-title` |
| Espera mínima | 3 dias após a publicação de uma versão antes de propor a atualização |
| npm | versões exatas, sem `^` ou `~` |
| Grupos | `angular` (Angular, angular-eslint, TypeScript), `spring boot`, `test libraries`, `github actions` |
| Actions | fixadas pelo SHA do commit, com a versão em comentário |
| Automerge | patch e minor de dependências de desenvolvimento e patch, minor e digest de Actions, só depois do check `ci` verde (auto-merge do GitHub). O resto, incluindo grupos que misturam dependências de produção, espera revisão |
| Node no `pom.xml` | atualizado por um gerenciador customizado |

O Dependabot fica só com os **alertas** de segurança, sem abrir PRs, para não duplicar o trabalho do Renovate.

## Segurança dos pipelines

- **Permissões:**
  - `permissions: contents: read` no nível do workflow.
  - Cada job pede só o que usa (`pull-requests: read` no `pr-title`).
  - Só o release recebe escrita.
- **Actions fixadas pelo SHA do commit**, com a versão em comentário (`# v6.1.2`). Uma tag pode ser movida para outro código; um SHA, não.
- **Sem `pull_request_target`.** Os workflows de PR rodam com `pull_request`, sem acesso a secrets de escrita.
- **Checkout sem credenciais persistidas** (`persist-credentials: false`).
- **`concurrency`:** um push novo no PR cancela a execução anterior.
- **Timeout** em todo job.

## Configuração do repositório

Passos feitos no GitHub por quem administra o repositório.

### Agora

1. **Settings → Advanced Security:**
   - **Dependency graph:** ligado. Sem ele, o `dependency-review` falha com "Dependency review is not supported on this repository".
   - **Dependabot alerts:** ligado.
   - **Dependabot security updates:** desligado (o Renovate cuida das atualizações).
   - **Secret scanning** e **Push protection:** ligados.
   - **Code scanning → CodeQL analysis → Set up → Default.**
2. **Depois que `pr-title` e `dependency-review` passarem pela primeira vez**, vá em **Settings → Rules → Rulesets → Proteção da main**:
   - marque **Require status checks to pass**;
   - adicione os dois checks.

   O GitHub só oferece checks que já rodaram.
3. **Renovate**, depois que o `renovate.json` estiver na `main`: instale o app em <https://github.com/apps/renovate>, escolhendo **Only select repositories** → MyLibrary. Instalado antes, ele abriria um PR próprio para criar outro arquivo de configuração.

### Com o esqueleto do projeto

4. **Settings → General → Pull Requests:** marque **Allow auto-merge**, usado pelo automerge do Renovate, que entra junto com o `ci.yml`.
5. **SonarQube Cloud:**
   - Entre em <https://sonarcloud.io> com o GitHub e importe o repositório.
   - Em **Analysis Method**, escolha **GitHub Actions** e desligue a **Automatic Analysis**.
   - Crie o secret `SONAR_TOKEN` com o token gerado.
6. **Token do release-please:**
   - Em **Settings (do perfil) → Developer settings → Personal access tokens → Fine-grained tokens**, gere um token com:
     - **Repository access:** só o MyLibrary.
     - **Permissions:** Contents e Pull requests em *Read and write*.
     - **Expiração:** 1 ano. Anote a data para renovar.
   - Crie o secret `RELEASE_PLEASE_TOKEN` com esse token.
7. **Check obrigatório do CI:** depois da primeira execução, adicione **só o `ci`**, o job que resume `backend`, `frontend`, `e2e` e `sonar`. Não adicione os jobs individuais nem o check do app do SonarQube Cloud: eles não rodam em PRs só de documentação e deixariam esses PRs presos.
