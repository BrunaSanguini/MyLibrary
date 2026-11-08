# Decisões de arquitetura (ADRs)

Cada ADR (Architecture Decision Record) registra uma decisão de arquitetura: o contexto, o que foi decidido, as consequências e as alternativas descartadas.

## Índice

| ADR | Título | Status | Data |
|---|---|---|---|
| [0001](0001-arquitetura-macro.md) | Arquitetura macro | Aceito | 2026-11-08 |
| [0002](0002-stack-tecnologica.md) | Stack tecnológica e ferramentas | Aceito | 2026-11-08 |
| [0003](0003-modelo-de-dominio-e-banco.md) | Modelo de domínio e banco de dados | Aceito | 2026-11-08 |
| [0004](0004-arquitetura-do-back-end.md) | Arquitetura do back-end | Aceito | 2026-11-08 |

## Como registrar uma decisão

1. Copie o [template](0000-template.md) para `NNNN-titulo-em-kebab-case.md`, usando o próximo número.
2. Preencha as seções e adicione a linha no índice acima.
3. Abra um PR com o título `docs(adr): registra <decisão>`.

**Um ADR aceito não é reescrito.** Para mudar uma decisão, crie um novo ADR e altere o status do antigo para `Substituído por ADR-NNNN`.
