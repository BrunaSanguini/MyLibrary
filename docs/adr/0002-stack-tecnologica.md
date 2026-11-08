# ADR-0002: Stack tecnológica e ferramentas

- **Status:** Aceito
- **Data:** 2026-11-08

## Contexto

O ADR-0001 definiu um monólito modular Spring Boot que serve uma SPA Angular em um único executável local, inicializado pelo My Collection. Esta decisão fixa as linhas de versão e as ferramentas, priorizando suporte longo, padrões da comunidade e baixa complexidade. As versões exatas (patch) ficam no `pom.xml` e no `package.json` e são atualizadas pelo Renovate.

## Decisão

### Back-end
- **Java 25 LTS**, distribuição Eclipse Temurin.
- **Spring Boot 4.1.x** (Spring Framework 7.0). Migração para a 4.2 após o GA, quando springdoc-openapi e Spring Modulith tiverem versões compatíveis.
- **Maven 3.9.x** com Maven Wrapper (`mvnw`) e `spring-boot-starter-parent`.
- **Starters:** `webmvc`, `data-jpa`, `validation`, `actuator`, `flyway` e `restclient`, mais os starters de teste por tecnologia.
- **Banco:** H2 2.4.x com versão fixada; Flyway via `spring-boot-starter-flyway`.
- **OpenAPI:** springdoc-openapi 3.x.
- **Fronteiras de módulos:** Spring Modulith, verificadas por teste (`ApplicationModules.verify()`).
- **DTOs:** Java `record`, com mapeamento manual (MapStruct só se o volume justificar). **Sem Lombok.**
- **Null-safety:** JSpecify (`@NullMarked` por pacote) + NullAway/Error Prone em profile de CI.
- **Testes:** JUnit 6, Mockito, AssertJ, slices `@DataJpaTest`/`@WebMvcTest`, `MockRestServiceServer` e WireMock para o cliente da Open Library.
- **Qualidade:** Spotless com palantir-java-format, JaCoCo com gate de cobertura e SonarQube Cloud.

### Front-end
- **Angular 22.x**, TypeScript 6.0, **Node.js 26 LTS**, npm.
- Componentes standalone, zoneless, OnPush (padrão), signals e Signal Forms; `httpResource` para leitura e `HttpClient` para mutações; control flow nativo.
- **Componentes:** sem biblioteca de UI pronta. `@angular/aria` (headless) cobre a acessibilidade de menus, tabs, listbox, combobox e diálogos.
- **Fontes embutidas** via `@fontsource-variable` (Cormorant Garamond e Mulish), sem CDN.
- **Testes:** Vitest (unitários) e Playwright (E2E).
- **Qualidade:** angular-eslint (flat config), Prettier, Stylelint e Husky + lint-staged + commitlint (Conventional Commits).

### Build
- O **frontend-maven-plugin** instala Node/npm em versão fixa, roda `npm ci` e `npm run build` e copia o build para `target/classes/static` (nunca para `src/`).
- Profile `-Pskip-frontend` para desenvolver só o back-end.
- Fallback do SPA: um controller encaminha rotas fora de `/api` e `/actuator` para `index.html`. Um 404 em `/api/**` continua saindo como Problem Details.

### Empacotamento
- `jpackage --type app-image` com runtime gerado por jlink a partir do Temurin 25: launcher `.exe` com runtime embutido, sem exigir Java instalado.
- CDS/AOT cache do JDK 25 para reduzir o tempo de inicialização, mantido apenas se a medição mostrar ganho.

### Manutenção
- **Renovate** para atualizações agrupadas (Angular, Spring Boot, bibliotecas de teste). Dependabot apenas para alertas de segurança.

## Consequências

**Positivas**
- Stack atual e com suporte longo (Java 25 LTS; Angular 22 com suporte até 2028).
- Build reproduzível: `./mvnw package` gera o artefato completo sem depender de Node instalado globalmente.
- Código explícito (records, mapeamento manual, sem Lombok), com checagem automática de formato, nulidade, cobertura e fronteiras de módulos.

**Negativas / riscos**
- O build Maven fica mais lento por incluir o front.
- A linha 2.x do springdoc não roda no Boot 4, e a compatibilidade da 3.x com a 4.2 precisa ser confirmada antes da migração.
- Sem `spring-boot-starter-flyway`, as migrations não rodam e nenhum erro aparece.
- O upgrade do H2 (2.4 → 2.5 no Boot 4.2) exige backup e teste de abertura do banco.
- O Temurin não publica JDK 25 para Windows ARM64.

## Alternativas consideradas
- **Gradle:** descartado; mais complexidade sem ganho para um projeto de módulo único.
- **Lombok e MapStruct desde o início:** descartados; records e mapeamento manual bastam para o volume atual.
- **Karma/Jasmine e Cypress:** descartados; Vitest é o padrão do Angular CLI e o Playwright tem paralelização gratuita.
- **Bibliotecas de UI (Angular Material, PrimeNG):** descartadas; o design é próprio e o `@angular/aria` cobre a acessibilidade.
- **pnpm:** descartado; npm basta para um único app.
- **Copiar o build do Angular por script/CI:** descartado; o build local deixaria de ser reproduzível.
- **Jar + JRE instalado:** descartado; depende da versão de Java da máquina.
- **GraalVM Native Image:** descartado por ora; build pesado no Windows e incompatibilidades com Hibernate, H2 e bibliotecas. Reavaliar se a inicialização passar de 5–8 s.
