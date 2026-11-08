# ADR-0006: Arquitetura do front-end

- **Status:** Aceito
- **Data:** 2026-11-08

## Contexto

O ADR-0002 fixou Angular 22, sem biblioteca de UI pronta, com `@angular/aria` para acessibilidade. O ADR-0005 definiu o contrato da API e a geração de tipos a partir do OpenAPI. O design system da Minha Livraria define a identidade visual: tokens de cor para tema claro e escuro, Cormorant Garamond e Mulish, escala de espaçamento, componentes e regras de acessibilidade.

O app abre no navegador padrão do Windows, iniciado pelo My Collection.

Os exemplos de código estão em [`docs/arquitetura-front-end.md`](../arquitetura-front-end.md).

## Decisão

1. **Estrutura por funcionalidade**, seguindo o style guide oficial:
   - `core` (singletons), `shared/ui` (componentes visuais) e `features` (uma pasta por área).
   - Sem pastas por tipo de arquivo; cada componente na própria pasta.
2. **Fronteiras entre pastas:**
   - Aliases `@core`, `@shared` e `@features`.
   - Uma feature nunca importa outra; o ESLint garante com `no-restricted-imports`.
3. **Clientes da API centralizados em `core/api`**, um por recurso, porque várias telas consomem os mesmos recursos.
4. **Componentes:**
   - Standalone, zoneless, OnPush, `input()`/`output()`/`model()`, `computed()`, control flow nativo e `@defer`.
   - Páginas buscam e orquestram; componentes de `shared/ui` só recebem `input` e emitem `output`.
5. **Estado:**
   - `httpResource` para os dados do servidor e `HttpClient` para alterações.
   - Serviços com signals para o estado global (perfil, tema).
   - Filtros, ordenação e página na URL.
   - Sem NgRx.
6. **API tipada:**
   - Tipos gerados com `openapi-typescript` a partir de `docs/openapi.json` antes de `start`, `build` e `test`; o arquivo gerado fica fora do Git.
   - Os tipos mantêm o sufixo `Request`/`Response` do back.
7. **Interceptors:** `X-Requested-By` em toda alteração e conversão de erros em `ApiError`. Cada tela trata os códigos que conhece.
8. **Rotas em português**, por serem texto visível na barra do navegador. A API continua em inglês.
   - Carregamento sob demanda.
   - Título da aba por `TitleStrategy`.
   - View transitions e restauração de rolagem.
   - Guard de alterações não salvas.
9. **Formulários com Signal Forms**, com validação espelhando o back e erros do servidor mapeados para os campos ou para o topo do formulário.
10. **CSS puro**, com nesting nativo e custom properties, sem SCSS.
11. **Tokens do design system** em custom properties com prefixo `--ml-`.
    - Tema por `data-theme` no `<html>`.
    - O Stylelint barra cor fixa fora do `tokens.css`.
12. **Tema sem "piscar" ao abrir:** o último tema aplicado fica em `localStorage` e é aplicado por um script mínimo no `index.html`. O valor oficial continua no perfil.
13. **Sem biblioteca de UI nem de ícones:**
    - `<dialog>` e Popover API nativos.
    - `@angular/aria` para os padrões de teclado e ARIA.
    - Ícones em SVG local.
    - Fontes embutidas via `@fontsource-variable`.
14. **Navegadores:** 2 últimas versões do Chrome, do Edge e do Firefox, mais o Firefox ESR. View transitions degradam para navegação sem animação onde não há suporte.
15. **Qualidade:**
    - TypeScript `strict` + `noUncheckedIndexedAccess`, `strictTemplates` e budgets.
    - angular-eslint, Prettier e Stylelint.
    - Husky, lint-staged e commitlint num `package.json` de ferramentas na raiz. A formatação do Java fica no CI.
16. **Locale `pt-BR`** para datas e números, e textos direto nos templates.

## Consequências

**Positivas**
- O front deixa de compilar quando o contrato do back muda, e os dois nunca divergem em silêncio.
- Os componentes de UI são reaproveitáveis e testáveis sem mocks de serviço.
- A troca de tema é instantânea e não exige recompilação, porque as cores são custom properties.
- Nenhuma dependência de UI de terceiros para manter ou atualizar.
- Filtros na URL deixam o "voltar" do navegador e o recarregar funcionando na Estante.

**Negativas / riscos**
- Sem biblioteca de UI, componentes como paginação, abas e seletores são escritos à mão e precisam de testes de acessibilidade.
- O `httpResource` e os Signal Forms são APIs recentes; exemplos e respostas da comunidade ainda são poucos.
- O script de tema no `index.html` é inline. Se uma Content Security Policy for adotada, ele vai precisar de hash ou nonce.
- O Firefox ESR não tem view transitions.

## Alternativas consideradas

- **Pastas por tipo (`components/`, `services/`):** descartadas; o style guide oficial recomenda organizar por funcionalidade.
- **Clientes da API dentro de cada feature:** descartado; a Home teria que importar outras features.
- **NgRx ou outra biblioteca de estado:** descartada; o estado do servidor fica com o `httpResource`, e o estado global é pequeno.
- **SCSS:** descartado; variáveis, nesting e funções de cor já existem no CSS, e as custom properties ainda mudam em tempo de execução.
- **Angular Material, PrimeNG e afins:** descartados; o design é próprio, e o `@angular/aria` cobre a acessibilidade.
- **Angular CDK (overlay, dialog):** descartado; `<dialog>` e a Popover API já cobrem o que o app usa.
- **Biblioteca de ícones:** descartada; o design system define um conjunto próprio e pequeno.
- **Rotas em inglês:** descartadas; as rotas são visíveis para quem usa, e a interface é em português.
- **Formulários reativos clássicos (`FormGroup`):** descartados; os Signal Forms são o modelo estável do Angular 22 e se integram aos signals.
- **Tipos da API versionados no Git:** descartado; o arquivo é gerado, e versioná-lo permitiria divergir do `openapi.json`.
