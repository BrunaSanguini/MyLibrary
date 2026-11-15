# Open Library simulada

Stubs do WireMock que fazem o papel da Open Library no E2E. O Playwright sobe o WireMock com esta pasta (`--root-dir`) e o perfil `e2e` do back-end aponta para ele, então nenhum teste usa a internet.

- `mappings/open-library.json`: as rotas. Buscar por `hobbit` devolve dois resultados; `sem conexao` derruba a conexão (503 na API) e `lenta` demora mais do que o app espera (504).
- `__files/`: os corpos das respostas. Edições, obra e autor são as mesmas respostas reais usadas nos testes do back-end (`backend/src/test/resources/openlibrary`).

O jar do WireMock vem do build do back-end (`backend/target/wiremock-standalone.jar`).
