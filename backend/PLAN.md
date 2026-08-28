# PLAN — Implementação do Backend EnergiAlerta

> Escopo: **somente `backend/`** (dev backend da equipe). Baseado em `PRD.md` e `adr/0001-adotar-as-funcionalidades-essenciais-do-mvp-do-energialerta.md`.
> Duração: hackathon SEMCOMP 2026 (~6h de desenvolvimento). Prioridade: simplicidade e viabilidade.

---

## Workflow de iteração (importante)

- **Nenhum commit automático.** Ao final de cada iteração (fase ou sub-passo relevante), o agente:
  1. produz um **relatório** explicando o que foi feito (com evidências: testes rodados, arquivos alterados);
  2. dá uma **orientação de commit** ao usuário (comando `git add`/`git commit` sugerido);
  3. **pede permissão para continuar** — só avança após o usuário confirmar (e commitar, se quiser).
- O usuário decide quando commitar; o agente não roda `git commit` em hipótese alguma.

---

## Contexto analisado (estado atual)

- **Backend:** Fastify 5 (ESM, autoload de `plugins/` e `routes/`), Prisma 7 + adapter `better-sqlite3` (SQLite), auth JWT já funcional (`signup`/`login` com bcrypt + zod), `AppError` + error handler, middlewares `auth.ts`/`error-handler.ts`, DTOs zod em `src/modules/dto/`. `src/generated/` é gitignored (prisma + zod gerados).
- **Frontend:** ainda é boilerplate vazio → **o backend define o contrato REST** (listado abaixo).
- **Dependências já instaladas pelo usuário** (não reinstalar): `csv-parse@^7.0.2`, `@fastify/multipart@^10.1.1` (deps), `vitest@^4.1.11` (devDep). `backend/node_modules` existe localmente.
- **Pontos de atenção restantes:** os scripts do `package.json` usam `pnpm` (indisponível no ambiente) → trocar para `npx`/`npm`; não há script de `test`/`seed` → adicionar.

## Decisões assumidas (defaults, alinhadas ao ADR-0001)

- **Escopo:** apenas `backend/`. Sem tocar em `frontend/`, `.env` (só `.env.example`) nem diretórios gitignored.
- **Granularidade de leitura:** diária (kWh/dia); baseline por dia da semana com janela móvel (sazonalidade semanal) — simplificação documentada do "dia/hora" do ADR.
- **Testes:** `vitest` (ESM+TS); seed via `tsx`; testes de rota com `app.inject()` (sem supertest).
- **Upload CSV:** `@fastify/multipart` + `csv-parse@^7`.
- **Fator SIN:** default ~0,09 tCO₂/MWh (fonte MME, com vigência) versionado na tabela `emission_factors`; env opcional `EMISSION_FACTOR_TCO2_MWH`.
- **Demo:** 3 usuários (personas Marcos/Célia/Carlos) + ~200 unidades; gerador sintético rotulado compartilhado entre seed e benchmark C2.
- **Marcação:** comentário `// ADR-0001` nos módulos de cálculo e na rota de import.
- **Código limpo:** não escrever comentários óbvios (nada que repita o que o código já diz). O código deve ser simples o suficiente para ser lido e compreendido diretamente pelo desenvolvedor. Comentários só para contexto não-óbvio (fonte/vigência de valores, referência a decisão, motivo de um quirk).

## Contrato REST (para o frontend)

`POST /api/auth/signup` · `POST /api/auth/login` (existentes) · `GET /api/units` · `POST /api/units` · `GET /api/units/:id` · `GET /api/units/:id/series` · `GET /api/units/:id/anomalies` · `PATCH /api/anomalies/:id` (status `RESOLVIDA`/`FALSO_POSITIVO`) · `GET /api/units/:id/impact` (kWh, R$, tCO₂e, variação, equivalências, memória de cálculo) · `POST /api/import` (CSV, multipart, com preview/dedup). Todas autenticadas (JWT) e autorizadas por dono (`unit.user_id === req.user.id`).

---

## Fases

### 1. Fundação: scripts npm, schema Prisma e infra de teste

- Atualizar `backend/package.json`: scripts npm (`test` = `vitest run`, `test:watch`, `seed` = `tsx src/seed/seed.ts`, `db:migrate`, `db:generate`), substituir `pnpm prisma` por `npx prisma` nos scripts existentes.
- Estender `backend/prisma/schema.prisma`: enums `Segment` (`COMERCIO|ENSINO|INSTITUICAO`), `Bandeira`, `AnomalyType`, `AnomalySeverity`, `AnomalyStatus` + models `units`, `consumption_readings`, `tariff_tables`, `emission_factors`, `anomalies` (com `rotulo_injetado` p/ benchmark) + back-relation em `users`.
- Rodar `npx prisma migrate dev --name energialerta-mvp` e `npx prisma generate` (saída em `src/generated/`, gitignored).
- Estender `backend/src/types/fastify.d.ts`: payload JWT `{ id, email }` (`declare module '@fastify/jwt'`) e `config` com `EMISSION_FACTOR_TCO2_MWH?`.
- Atualizar `backend/.env.example` e o schema de env em `backend/src/app.ts` (novo env opcional).
- Criar `vitest.config.ts` + teste smoke → `npm test` verde.
- **Fim da iteração → relatório + orientação de commit + pedido de permissão.**

### 2. Módulos de cálculo: tarifa (R$) e emissão (tCO₂e) com golden cases (C3)

- Criar `backend/src/config/reference.ts`: constantes documentadas (equivalências: árvore kgCO₂/ano, km de carro kgCO₂/km; fator SIN default com fonte/vigência).
- Escrever teste golden de faturamento (5 cenários: tarifa simples verde/amarela/vermelha + branca fora ponta/ponta) → rodar e ver falhar.
- Implementar `backend/src/modules/billing.module.ts` (`// ADR-0001`): `custo = kWh × (TE+TUSD) + bandeira`, com memória de cálculo auditável → teste passa (erro ≤ R$ 0,01).
- Escrever teste golden de emissão + equivalências → ver falhar.
- Implementar `backend/src/modules/emission.module.ts` (`// ADR-0001`): `tCO₂e = kWh × fator/1000` + equivalências (árvores/km) → teste passa (erro ≤ 0,001 tCO₂e).
- **Fim da iteração → relatório + orientação de commit + pedido de permissão.**

### 3. Detecção de anomalias + recomendações (C2)

- Criar `backend/src/config/detection.ts`: limiares por segmento (desvio %, N janelas consecutivas, faixas de severidade) — valores calibrados pelo benchmark, não "chutados".
- Criar `backend/src/seed/generator.ts`: séries diárias de 12 meses com sazonalidade, ruído e anomalias injetadas rotuladas (compartilhado com seed e benchmark).
- Escrever `detection.benchmark.test.ts` (200 unidades sintéticas, recall/precisão ≥ 0,8) → ver falhar.
- Implementar `backend/src/modules/detection.module.ts` (`// ADR-0001`): baseline por dia da semana (janela móvel) + regras `BASELINE_SPIKE` / `SUSTAINED_HIGH` / `TARIFF_WASTE`, severidade e explicação legível → benchmark passa (calibrar limiares se necessário).
- Implementar `backend/src/modules/recommendations.ts`: template por tipo de anomalia (1 ação concreta + economia potencial R$/tCO₂e).
- Teste unitário das recomendações (ação presente, economia ≥ 0).
- **Fim da iteração → relatório + orientação de commit + pedido de permissão.**

### 4. API de unidades autenticada (CRUD + series + impact + anomalies)

- Criar `backend/src/modules/dto/units.dto.ts`: schemas zod (`createUnit`, `updateAnomalyStatus`, etc.).
- Implementar `backend/src/modules/units.module.ts`: list/create/get com autorização por dono; `impact` (billing + emission + equivalências + variação mês a mês); `series` (leituras + baseline + bandeira); `anomalies` (com impacto e recomendação); `PATCH` de status.
- Criar `backend/src/routes/v1/units/index.ts` (com `authMiddleware`): `GET /api/units`, `POST /api/units`, `GET /api/units/:id`, `GET /api/units/:id/series`, `GET /api/units/:id/anomalies`, `GET /api/units/:id/impact`, `PATCH /api/anomalies/:id`.
- Testes de integração com `app.inject()`: 401 sem token; criar unidade; series; impact com memória de cálculo; atualizar status de anomalia.
- **Fim da iteração → relatório + orientação de commit + pedido de permissão.**

### 5. Seed do dataset demo (~200 unidades, 3 segmentos, 12 meses, anomalias rotuladas)

- Criar `backend/src/seed/seed.ts`: usuários demo (personas), ~200 unidades (comércio/ensino/instituição), leituras diárias de 12 meses via `generator.ts`, anomalias injetadas rotuladas, tabela tarifária (verde/amarela/vermelha) e fator de emissão com vigência.
- Rodar `npm run seed`; verificar contagens por modelo e que o login demo + endpoints retornam dados.
- **Fim da iteração → relatório + orientação de commit + pedido de permissão.**

### 6. Import CSV (`POST /api/import`) + verificação final

- Criar `backend/src/modules/dto/import.dto.ts` e `backend/src/modules/import.module.ts` (`// ADR-0001`): parse com `csv-parse`, validação por linha (erros reportados por linha), preview antes de persistir, dedup por `(unit_id, periodo)` e reprocessamento de detecção.
- Criar `backend/src/routes/v1/import/index.ts` (auth + multipart): `POST /api/import`.
- Testes `app.inject()`: CSV válido; linha inválida reportada; período duplicado ignorado.
- Verificação final: `npm test` completo (C2/C3 verdes), seed limpo, smoke manual do fluxo (login → units → series → impact → anomalies → import) e `grep` confirmando que fórmulas de tarifa/emissão só existem em `src/modules/`.
- **Fim da iteração → relatório + orientação de commit + pedido de permissão.**

---

## Riscos e mitigação

- **Tempo apertado** — cortar `TARIFF_WASTE`/`SUSTAINED_HIGH` e manter `BASELINE_SPIKE` (revisit trigger do ADR).
- **Quirk do `prisma-zod-generator`** (`aggregateusers`) não afeta os DTOs manuais.

## Verificação (critérios de aceite)

- [ ] `npm test` no backend: golden cases de faturamento conferem com erro ≤ R$ 0,01 e ≤ 0,001 tCO₂e (C3)
- [ ] Benchmark sintético (200 unidades): recall e precisão ≥ 0,8 nas anomalias injetadas (C2)
- [ ] As 9 funcionalidades do escopo implementadas e acessíveis na demo (checklist do ADR)
- [ ] Painel exibe fator do SIN com fonte e data de vigência (memória de cálculo auditável)
- [ ] Equivalências (árvores e km de carro) com fórmula e valores de referência documentados
- [ ] Upload CSV importa com feedback de sucesso/erro por linha e deduplica períodos repetidos
- [ ] Smoke test do fluxo principal concluído em ≤ 5 min por usuário da banca, telas ≤ 2s (C1/C5)
- [ ] `grep` não encontra fórmulas de tarifa/emissão fora de `backend/src/modules/`
- [ ] Nenhum commit automático realizado pelo agente (todos os commits feitos pelo usuário)