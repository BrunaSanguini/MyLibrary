# ADR-0001: Arquitetura macro da Minha Livraria

- **Status:** Aceito
- **Data:** 2026-11-08

## Contexto

A Minha Livraria é uma biblioteca pessoal para desktop, de usuário único, executada 100% localmente, sem servidor remoto. O acervo inclui imagens (capas e avatar), os dados básicos dos livros vêm da Open Library API e o app é inicializado pelo hub My Collection. O projeto também serve como portfólio e segue padrões de mercado.

## Decisão

1. **Monólito modular.** Um único back-end Spring Boot, organizado internamente por módulos de negócio (livros, listas, metas, perfil).
2. **Executável único.** Em produção, o Spring Boot serve a API REST em `/api/v1/**` e o build do Angular como arquivos estáticos. Rotas do front sem arquivo correspondente são encaminhadas para `index.html`.
3. **Desenvolvimento com dois processos.** `ng serve` (porta 4200) com proxy de `/api` para o back-end, sem necessidade de CORS.
4. **REST + JSON.** API versionada em `/api/v1`, contrato documentado em OpenAPI e erros no padrão RFC 9457 (Problem Details).
5. **Persistência.** H2 em modo arquivo, com schema versionado pelo Flyway.
6. **Imagens em disco.** Capas e avatar ficam em disco; o banco armazena apenas a referência.
7. **Pasta de dados.** Padrão `%USERPROFILE%\.minha-livraria\` (subpastas `data\` e `images\`), configurável.
8. **Open Library somente via back-end.** O back-end centraliza timeout, retry e cache, converte o formato externo para o modelo interno e baixa a capa para o disco no cadastro.
9. **Rede.** Servidor ouvindo apenas em `127.0.0.1`, sem autenticação (usuário único local).
10. **Integração com o My Collection.**
    - O hub executa o launcher do app (empacotamento definido no ADR-0002).
    - Porta padrão dedicada `8471`, que o hub pode sobrescrever com `--server.port` quando estiver ocupada.
    - O hub consulta `GET /actuator/health/readiness` com backoff e só abre a interface quando o status for `UP`.
    - O hub encerra o app via `POST /actuator/shutdown` (desligamento gracioso). O endpoint exige um token aleatório por sessão, gerado pelo hub e repassado ao app por variável de ambiente.
    - Encerramento forçado (`taskkill /F`) só como último recurso, após timeout.
    - Uma instância por vez: o hub verifica a readiness antes de iniciar, e o lock de arquivo do H2 impede duas instâncias no mesmo banco.

## Consequências

**Positivas**
- Distribuição e inicialização simples: um executável, um processo, uma porta.
- O acervo funciona offline; a internet só é necessária para buscar dados na Open Library.
- Backup simples: copiar a pasta `.minha-livraria`.
- Mudanças na API da Open Library não afetam o front-end.

**Negativas / riscos**
- O build precisa integrar front e back em um único artefato.
- Upgrades major do H2 podem mudar o formato do arquivo; backup/exportação entra cedo no roadmap.
- Encerrar o processo à força pode perder as alterações mais recentes do H2; o hub deve usar o shutdown gracioso.
- A integridade entre banco e disco (ex.: imagem órfã ao excluir um livro) é responsabilidade da aplicação.

## Alternativas consideradas

- **Microsserviços:** descartado; complexidade sem benefício para usuário único local.
- **Front e back como processos separados em produção:** descartado; dobra o que o My Collection precisa gerenciar.
- **Imagens como BLOB no banco:** descartado; aumenta o arquivo do H2 e dificulta backup e cache HTTP.
- **Chamar a Open Library direto do Angular:** descartado; espalha regras de integração no front e impede o cache local de capas.
