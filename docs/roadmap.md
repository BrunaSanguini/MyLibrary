# Roadmap

Plano de implementação do MVP da Minha Livraria, dividido em sete marcos. Cada marco é uma versão publicada pelo release-please, cada item é uma issue, e cada issue é resolvida por um pull request.

Acompanhe o progresso pelos [milestones](https://github.com/BrunaSanguini/MyLibrary/milestones) do GitHub.

## Como cada item é entregue

1. A issue define objetivo, escopo, critérios de aceite e o título do PR.
2. O trabalho acontece numa branch própria (`<tipo>/<descricao>`).
3. O PR fecha a issue (`Closes #N`) e cumpre a [Definition of Done](testes-e-qualidade.md#definition-of-done).
4. O back-end é verificado pelo CI; o front-end também roda lint, testes e build antes do push.
5. Revisão do bot e squash merge com o título do PR.

## Marcos

### [Marco 0 — Fundação](https://github.com/BrunaSanguini/MyLibrary/milestone/1) · v0.1.0

O app abre: esqueleto do back e do front, front embutido no jar, CI completo e primeira release.

| Issue | Entrega | PR |
|---|---|---|
| [#8](https://github.com/BrunaSanguini/MyLibrary/issues/8) | Esqueleto do back-end e CI do back | `build(backend): cria esqueleto do back-end` |
| [#9](https://github.com/BrunaSanguini/MyLibrary/issues/9) | Esqueleto do front-end e CI do front | `build(frontend): cria esqueleto do front-end` |
| [#10](https://github.com/BrunaSanguini/MyLibrary/issues/10) | Front-end embutido no jar e hooks de Git | `build: integra o front-end ao jar e adiciona hooks de git` |
| [#11](https://github.com/BrunaSanguini/MyLibrary/issues/11) | E2E de fumaça, SonarQube Cloud e automerge do Renovate | `ci: adiciona e2e, sonarqube cloud e automerge do renovate` |
| [#12](https://github.com/BrunaSanguini/MyLibrary/issues/12) | Release automatizada e pacote para Windows | `ci: adiciona release automatizada e pacote para windows` |

### [Marco 1 — Acervo](https://github.com/BrunaSanguini/MyLibrary/milestone/2) · v0.2.0

Cadastro manual do acervo, imagens, Estante, busca, página do livro e Catálogos.

| Issue | Entrega | PR |
|---|---|---|
| [#13](https://github.com/BrunaSanguini/MyLibrary/issues/13) | Armazenamento de imagens | `feat(images): adiciona armazenamento de imagens` |
| [#14](https://github.com/BrunaSanguini/MyLibrary/issues/14) | Autores, editoras, séries e gêneros | `feat(books): adiciona autores, editoras, séries e gêneros` |
| [#15](https://github.com/BrunaSanguini/MyLibrary/issues/15) | Cadastro de livros | `feat(books): adiciona cadastro de livros` |
| [#16](https://github.com/BrunaSanguini/MyLibrary/issues/16) | Consulta da Estante: cards, filtros e busca | `feat(shelf): adiciona consulta da estante` |
| [#17](https://github.com/BrunaSanguini/MyLibrary/issues/17) | Componentes base da interface (shared/ui) | `feat(frontend): adiciona componentes base da interface` |
| [#18](https://github.com/BrunaSanguini/MyLibrary/issues/18) | Estante, busca e menu de gêneros | `feat(frontend): adiciona estante, busca e menu de gêneros` |
| [#19](https://github.com/BrunaSanguini/MyLibrary/issues/19) | Página do livro e formulário de cadastro | `feat(frontend): adiciona página do livro e formulário de cadastro` |
| [#20](https://github.com/BrunaSanguini/MyLibrary/issues/20) | Catálogos, páginas de agrupamento e dados de exemplo | `feat(frontend): adiciona catálogos e páginas de agrupamento` |

### [Marco 2 — Open Library](https://github.com/BrunaSanguini/MyLibrary/milestone/3) · v0.3.0

Importação de livros da Open Library.

| Issue | Entrega | PR |
|---|---|---|
| [#21](https://github.com/BrunaSanguini/MyLibrary/issues/21) | Cliente da Open Library | `feat(openlibrary): adiciona cliente da open library` |
| [#22](https://github.com/BrunaSanguini/MyLibrary/issues/22) | Importação de livros da Open Library | `feat(books): adiciona importação da open library` |
| [#23](https://github.com/BrunaSanguini/MyLibrary/issues/23) | Tela de importação | `feat(frontend): adiciona tela de importação` |

### [Marco 3 — Leitura](https://github.com/BrunaSanguini/MyLibrary/milestone/4) · v0.4.0

Leituras, sessões, resenha e nota. **A partir daqui, o app já serve para o acervo real.**

| Issue | Entrega | PR |
|---|---|---|
| [#24](https://github.com/BrunaSanguini/MyLibrary/issues/24) | Leituras e sessões | `feat(reading): adiciona leituras e sessões` |
| [#25](https://github.com/BrunaSanguini/MyLibrary/issues/25) | Resenha e nota | `feat(reading): adiciona resenha e nota` |
| [#26](https://github.com/BrunaSanguini/MyLibrary/issues/26) | Status, progresso e nota na Estante e livros relacionados | `feat(shelf): adiciona status, progresso, nota e relacionados` |
| [#27](https://github.com/BrunaSanguini/MyLibrary/issues/27) | Ficha de leitura e resenha na página do livro | `feat(frontend): adiciona ficha de leitura e resenha` |
| [#28](https://github.com/BrunaSanguini/MyLibrary/issues/28) | Registrar leitura | `feat(frontend): adiciona registro de leitura` |

### [Marco 4 — Listas e metas](https://github.com/BrunaSanguini/MyLibrary/milestone/5) · v0.5.0

Listas de livros e metas de leitura com progresso.

| Issue | Entrega | PR |
|---|---|---|
| [#29](https://github.com/BrunaSanguini/MyLibrary/issues/29) | Listas de livros | `feat(lists): adiciona listas de livros` |
| [#30](https://github.com/BrunaSanguini/MyLibrary/issues/30) | Metas de leitura | `feat(goals): adiciona metas de leitura` |
| [#31](https://github.com/BrunaSanguini/MyLibrary/issues/31) | Listas e metas na interface | `feat(frontend): adiciona listas e metas` |

### [Marco 5 — Home e Perfil](https://github.com/BrunaSanguini/MyLibrary/milestone/6) · v0.6.0

Estatísticas, perfil com avatar e tema, Home completa e página de Perfil.

| Issue | Entrega | PR |
|---|---|---|
| [#32](https://github.com/BrunaSanguini/MyLibrary/issues/32) | Estatísticas de leitura | `feat(reading): adiciona estatísticas de leitura` |
| [#33](https://github.com/BrunaSanguini/MyLibrary/issues/33) | Perfil, avatar e tema | `feat(profile): adiciona perfil, avatar e tema` |
| [#34](https://github.com/BrunaSanguini/MyLibrary/issues/34) | Home completa | `feat(frontend): adiciona home completa` |
| [#35](https://github.com/BrunaSanguini/MyLibrary/issues/35) | Página de Perfil | `feat(frontend): adiciona página de perfil` |

### [Marco 6 — Entrega](https://github.com/BrunaSanguini/MyLibrary/milestone/7) · v1.0.0

Tempo de inicialização, integração com o My Collection e README final.

| Issue | Entrega | PR |
|---|---|---|
| [#36](https://github.com/BrunaSanguini/MyLibrary/issues/36) | Tempo de inicialização | `perf(build): reduz o tempo de inicialização` |
| [#37](https://github.com/BrunaSanguini/MyLibrary/issues/37) | Integração com o My Collection | `feat(backend): integra com o my collection` |
| [#38](https://github.com/BrunaSanguini/MyLibrary/issues/38) | README final e versão 1.0 | `docs: finaliza readme para a versão 1.0` |

## Depois do MVP

Ideias registradas nos ADRs para depois da v1.0.0, sem compromisso de data:

- Nota por critérios ligados ao gênero (ADR-0003).
- Metas por gênero e por série (ADR-0003).
- Exportação e importação do acervo em JSON, legível fora do app. O risco de formato do H2 apontado no ADR-0001 já fica coberto no Marco 0 pelo backup em SQL (`SCRIPT TO`) antes de cada migration.
- Testes de mutação e regressão visual (ADR-0007).
