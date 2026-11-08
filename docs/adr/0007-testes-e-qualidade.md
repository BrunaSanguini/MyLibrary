# ADR-0007: Testes e qualidade

- **Status:** Aceito
- **Data:** 2026-11-08

## Contexto

O ADR-0002 escolheu as ferramentas de teste: JUnit 6, Mockito, AssertJ, Vitest e Playwright. Os ADRs 0004 a 0006 definiram uma arquitetura com módulos verificados, um módulo de consulta que lê tabelas de outros módulos, um contrato versionado e um front sem biblioteca de UI. Falta definir o que cada tipo de teste protege, onde os mocks são aceitos, como a acessibilidade é verificada e quais regras de qualidade bloqueiam um PR.

Os exemplos estão em [`docs/testes-e-qualidade.md`](../testes-e-qualidade.md).

## Decisão

1. **Princípios:**
   - Testar comportamento, não implementação.
   - Mocks só em três situações:
     - fronteiras externas (Open Library, `Clock`, sistema de arquivos quando necessário);
     - o serviço, num teste de slice da camada web;
     - a API pública de outro módulo, num teste de módulo.
   - Fora disso, nada é simulado: repositórios e consultas rodam contra o H2 real em memória, com as migrations do Flyway. Teste de regra de negócio nunca simula repositório.
   - Builders de dados de teste e nomes em inglês.
2. **Back-end:**
   - Testes de domínio sem Spring.
   - `@WebMvcTest` com `MockMvcTester` para o contrato HTTP e os filtros de segurança.
   - `@DataJpaTest`/`@JdbcTest` para JPQL, SQL e constraints.
   - `@ApplicationModuleTest` para os casos de uso de cada módulo.
   - Spring Modulith e ArchUnit para a estrutura.
   - Teste de snapshot do `openapi.json`.
   - Poucos testes com a aplicação inteira.
3. **Separação por sufixo:** `*Test` no Surefire, `*IT` no Failsafe.
4. **Open Library:**
   - Respostas reais gravadas como fixture e testadas com `MockRestServiceServer`.
   - Timeout, retry, 429 e limite de taxa testados com WireMock.
5. **Toda consulta do módulo `shelf` tem teste com SQL real**, porque ela depende do schema de outros módulos.
6. **Front-end:**
   - Vitest com jsdom para unidades.
   - Vitest em modo navegador (Chromium via Playwright) para os componentes de `shared/ui`, que usam `<dialog>` e Popover.
   - Testing Library e `@testing-library/jest-dom` em componentes e páginas.
   - `HttpTestingController` para simular a API.
7. **E2E com Playwright** no Chromium e no Firefox:
   - Contra o jar real, no perfil `e2e`.
   - Pasta de dados temporária e Open Library simulada por WireMock.
   - Cinco jornadas no MVP.
8. **Acessibilidade:** `@axe-core/playwright` em todas as páginas, nos dois temas, limitado às regras do WCAG 2.1 A e AA. Qualquer violação falha o teste, seja qual for a gravidade.
9. **Cobertura:** JaCoCo com mínimo de 80% de linhas em `domain` e `application`, quebrando o build.
10. **SonarQube Cloud** com o quality gate padrão ("Sonar way") em todo PR, incluindo 80% de cobertura no código novo.
11. **Análise estática:**
    - Java: Spotless e NullAway.
    - Front: `tsc` strict, ESLint, Prettier, Stylelint e budgets.
12. **Dados de exemplo** com livros de domínio público, carregados só nos perfis `dev` e `e2e` e só com o banco vazio.
13. **Definition of Done** no template de pull request.
14. **Vigência:** as regras automáticas (JaCoCo, Sonar, Spotless, NullAway, axe) só passam a bloquear PRs quando os pipelines de CI estiverem configurados. Até lá, o item de CI e Sonar do checklist fica desmarcado.

## Consequências

**Positivas**
- Os testes quebram quando o comportamento muda, não quando o código é reorganizado.
- Consultas SQL, constraints e migrations são testadas de verdade, sem divergência entre o banco do teste e o de produção (os dois são H2).
- A acessibilidade passa a ser verificada automaticamente em todas as páginas.
- Os dados de exemplo permitem demos e prints para o portfólio sem expor o acervo real.

**Negativas / riscos**
- O modo navegador do Vitest e os E2E são mais lentos que testes em jsdom.
- Os E2E dependem do jar construído e de um WireMock para a Open Library.
- As fixtures da Open Library podem ficar desatualizadas em relação à API real e precisam ser regravadas quando a integração apresentar problemas.
- O axe encontra só parte dos problemas de acessibilidade. O teste por teclado continua manual, como item da Definition of Done.

## Alternativas consideradas

- **Testcontainers:** descartado; o banco de produção é o próprio H2 embutido.
- **Testes de serviço com repositórios mockados:** descartados; testariam chamadas entre objetos em vez do resultado real.
- **Karma e Jasmine:** descartados; estão depreciados no Angular, e o Vitest é o padrão do CLI.
- **jsdom para todos os testes do front:** descartado; não implementa `<dialog>` nem Popover.
- **Cypress:** descartado no ADR-0002.
- **Meta de 100% de cobertura:** descartada; incentiva testes sem valor só para cobrir linhas.
- **Testes de mutação (PIT):** adiados; podem entrar depois do MVP para medir a qualidade dos testes.
- **Regressão visual por screenshots:** adiada; pode entrar depois que as telas estabilizarem.
