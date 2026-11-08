# ADR-0004: Arquitetura do back-end

- **Status:** Aceito
- **Data:** 2026-11-08

## Contexto

Os ADRs 0001 a 0003 definiram o monólito modular, a stack e o modelo de dados. Falta definir como o código do back-end é organizado por dentro: módulos e camadas, validação, tratamento de erros, integração com a Open Library, segurança de um servidor local, configuração e ciclo de vida.

Os exemplos de código estão em [`docs/arquitetura-back-end.md`](../arquitetura-back-end.md).

## Decisão

1. **Módulos com fronteiras verificadas.**
   - O pacote base de cada módulo é a API pública dele; os subpacotes são internos.
   - O `shared` é um módulo aberto.
   - Dependências permitidas: `books` → `images`, `openlibrary`; `reading` e `lists` → `books`; `goals` → `reading`; `profile` → `images`.
   - Um teste do Spring Modulith (`ApplicationModules.verify()`) falha o build em caso de violação ou ciclo.
2. **Comunicação síncrona pela API pública.** Eventos só quando o módulo de origem não deve conhecer quem reage. No MVP, o único caso é o descarte de imagens depois do commit.
3. **Três camadas por módulo:** `web` (controllers), `application` (serviços, consultas, DTOs e mappers) e `domain` (entidades, repositórios e exceções). Os DTOs ficam em `application`, e não em `web`, para que o mapeamento aconteça dentro da transação com `open-in-view` desligado.
4. **Escrita pelas entidades, leitura por consultas.** As entidades protegem as invariantes, sem setters para campos com regra. Telas de listagem e estatísticas usam projeções em record via JPQL ou `JdbcClient`.
5. **Convenções de código:**
   - Injeção por construtor.
   - `public` só quando necessário.
   - `@NullMarked` em cada pacote.
   - `Clock` injetado para regras que dependem da data.
6. **Validação em três níveis:** formato no DTO (Bean Validation, com `@Isbn13`, `@Isbn10` e `@HalfPoint` próprias), regra de negócio na entidade ou no serviço, integridade no banco.
7. **Erros em Problem Details (RFC 9457).**
   - Exceções de domínio numa hierarquia selada (`NotFoundException` 404, `ConflictException` 409, `BusinessRuleException` 422), cada uma com um `code` estável.
   - Um único `@RestControllerAdvice` converte tudo.
   - Mensagens em português no `messages.properties`, catálogo de erros em `docs/erros.md` e stack trace nunca na resposta.
8. **Cliente da Open Library:**
   - Interface declarativa `@HttpExchange` registrada com `@ImportHttpServices`.
   - Camada anticorrupção: os DTOs externos ficam internos ao módulo.
   - Timeouts de 3 s e 10 s.
   - `@Retryable` nativo do Spring 7.
   - Limitador de taxa próprio (3 req/s com contato, 1 req/s sem).
   - Capas sempre pelo ID da capa.
9. **Caffeine entra na stack** como cache em memória das respostas da Open Library (1 hora), complementando o ADR-0002.
10. **Importação em dois passos** (pré-visualização e confirmação). A capa é baixada fora da transação, e autores e editora são reaproveitados pelo nome normalizado. A série é preenchida à mão.
11. **Contato da Open Library fora do repositório.** O `User-Agent` leva o contato configurado em `app.open-library.contact`, que fica vazio no repositório e é preenchido no arquivo local `%USERPROFILE%\.minha-livraria\config.yml`, carregado via `spring.config.import`.
12. **Segurança local sem Spring Security.**
    - Filtro de `Host` (só `127.0.0.1` e `localhost`).
    - Header `X-Requested-By` obrigatório em requisições que alteram dados.
    - Token do My Collection, comparado em tempo constante, para o shutdown.
    - Upload limitado a 5 MB, com o tipo validado pelos bytes.
13. **Configuração:**
    - `application.yml` com perfil `dev`; sem perfil, o app roda como produção.
    - Propriedades tipadas e validadas (`@ConfigurationProperties` em records).
14. **Ciclo de vida:**
    - No startup: cria as pastas e faz backup com `BACKUP TO` do H2 quando há migration pendente. Depois aplica a migration, sobe a readiness e roda a reconciliação de imagens em segundo plano.
    - Encerramento gracioso pelo `/actuator/shutdown`.
    - Logs em arquivo rotativo. O Actuator expõe só `health`, `info` e `shutdown`.

## Consequências

**Positivas**
- As fronteiras entre módulos são verificadas automaticamente, não só por convenção.
- Sem `LazyInitializationException` e sem N+1 acidental: o mapeamento acontece na transação, e cada tela busca o que precisa.
- O front recebe erros num formato padronizado, com `code` para decidir o comportamento e mensagem pronta para exibir.
- Mudanças na API da Open Library ficam isoladas no módulo `openlibrary`.
- A API local fica protegida contra sites abertos no navegador, sem o peso do Spring Security.
- Nenhum dado pessoal fica versionado no repositório público.

**Negativas / riscos**
- A separação em três camadas por módulo gera mais arquivos do que um CRUD simples.
- Consultas com SQL no `JdbcClient` não são verificadas pelo Hibernate; precisam de testes de integração.
- Os filtros de segurança são código próprio e precisam de testes dedicados.
- O limitador de taxa e o cache vivem em memória: reiniciar o app zera os dois.

## Alternativas consideradas

- **Arquitetura hexagonal (portas e adaptadores):** descartada; a cerimônia de interfaces e adaptadores não se paga num app local com uma integração externa.
- **DTOs na camada `web`:** descartado; exigiria mapear fora da transação ou criar um segundo conjunto de objetos de saída.
- **Eventos para toda comunicação entre módulos:** descartado; chamadas síncronas são mais simples de seguir quando a reação faz parte do mesmo caso de uso.
- **Spring Security:** descartado; não há usuários, e três filtros resolvem as ameaças de um servidor local.
- **`RestTemplate` e `WebClient`:** descartados; o `RestTemplate` está sendo descontinuado, e o `WebClient` traz programação reativa sem necessidade.
- **Spring Retry, Resilience4j e Bucket4j:** descartados; o Spring 7 já tem `@Retryable`, e o limite de taxa da Open Library é simples o bastante para um limitador próprio.
- **Contato da Open Library no `application.yml` versionado:** descartado; exporia um e-mail pessoal num repositório público.
