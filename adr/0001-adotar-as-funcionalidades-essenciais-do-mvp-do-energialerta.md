---
status: proposed
date: 2026-08-28
decision-makers: Equipe EnergiAlerta (hackathon SEMCOMP 2026)
consulted: PRD.md, IDEIAS.md
informed: Banca avaliadora (demo)
---

# Adotar as funcionalidades essenciais do MVP do EnergiAlerta

## Context and Problem Statement

O hackathon SEMCOMP 2026 tem o tema "Sustentabilidade Tecnológica": entregar uma solução que
combata o desperdício de energia ou recursos, incentive matrizes limpas e ajude a sociedade a
atingir metas de descarbonização. O [PRD](../PRD.md) já define o conceito **EnergiAlerta** — um
painel web que transforma consumo de energia (kWh) em impacto financeiro (R$) e ambiental (tCO₂e)
para pequenos comércios, escolas e instituições.

Antes de codificar em 6h, precisamos travar o escopo do MVP: **quais funcionalidades entram, quais
ficam de fora e como resolver as decisões técnicas-chave** (fator de emissão, detecção de anomalia,
ingestão de dados). Este ADR converte a lista de funcionalidades essenciais em uma especificação
executável para os agentes — sem perguntas de follow-up.

## Decision Drivers

* Tempo: 6h de desenvolvimento — simplicidade e viabilidade acima de tudo
* Critérios da banca: adequação ao tema, criatividade, viabilidade do produto, experiência do usuário
* KPIs do PRD: C1 (≤ 2s por tela), C2 (recall/precisão ≥ 0,8 em anomalias), C3 (erro ≤ R$ 0,01 e
  0,001 tCO₂e por fatura), C4 (≥ 3 segmentos), C5 (onboarding ≤ 5 min)
* Stack existente: Fastify 5 + Prisma 7/SQLite + JWT (backend), React/Vite + Recharts (frontend)
* Motor determinístico (sem IA/LLM no MVP), foco em baixa tensão (Grupo B)
* Transparência: memória de cálculo auditável (fonte e data de vigência do fator de emissão)

## Considered Options

* MVP completo com as 9 funcionalidades essenciais (escolhido)
* MVP reduzido (sem ingestão/upload e sem equivalências) — alinhado ao roadmap original do PRD (upload na v1.1)
* MVP ampliado com benchmarking entre unidades (previsto como v2.0 no PRD)

### Decisões internas (opções consideradas e resolvidas)

* **Ingestão**: cadastro manual + upload CSV (escolhido) vs. só manual vs. só CSV
* **Fator de emissão**: SIN parametrizável + memória de cálculo (escolhido) vs. fixo hardcoded vs. por região/ano
* **Equivalências ambientais**: árvores equivalentes + km de carro a gasolina (escolhido) vs. smartphones/casas
* **Detecção de anomalia**: baseline (média móvel com sazonalidade) + regras de bandeira/horário de ponta, com limiares por segmento (definido no PRD)

## Decision Outcome

Chosen option: **"MVP completo com as 9 funcionalidades essenciais"**, porque fecha a narrativa
completa para a banca (kWh → R$ → tCO₂e → alerta → recomendação → equivalência), atende os KPIs
C1–C5 e cabe em 6h com dados simulados e templates determinísticos.

### Non-Goals (MVP)

* ❌ Sem integração com medidores inteligentes ou APIs de distribuidora (ex.: Neoenergia Coelba).
* ❌ Sem cálculo de Grupo A (demanda contratada, fator de potência) — foco em baixa tensão (Grupo B).
* ❌ Sem machine learning/LLM — detecção e recomendações 100% determinísticas (templates).
* ❌ Sem benchmarking/ranking entre unidades no MVP (fica para v2.0).
* ❌ Sem automação de compra/instalação de equipamentos ou orçamentos de fornecedores.
* ❌ Sem cobrança/pagamentos (o produto é visibilidade e gestão, não fintech).
* ❌ Sem app nativo (web responsiva é suficiente).

### As 9 funcionalidades (escopo do MVP)

1. **Ingestão de consumo em kWh** — cadastro manual de leituras + upload CSV (validação por linha,
   preview e deduplicação de períodos já importados).
2. **Conversão automática para custo estimado (R$)** — tarifa Grupo B (TE + TUSD) + bandeira
   tarifária, com memória de cálculo auditável.
3. **Conversão para emissões (tCO₂e)** — fator do SIN (default ~0,07–0,1 tCO₂/MWh, fonte MME),
   parametrizável e versionado com data de vigência.
4. **Dashboard visual com histórico** — gráficos diário/mensal (Recharts) e cartões consolidados
   com variação mês a mês (% e valor).
5. **Comparação com a média da própria unidade** — baseline por janela dia/hora com sazonalidade.
6. **Alertas simples de anomalia** — desvio ≥ limiar por N janelas consecutivas; severidade
   baixa/média/alta; explicação legível; ações de marcar como *resolvido* ou *falso positivo*.
7. **Classificação por segmento** — comércio, ensino ou instituição pública (calibra baseline e
   limiares por perfil).
8. **Recomendações práticas de economia** — 1 ação concreta por tipo de anomalia, com economia
   potencial estimada em R$ e tCO₂e.
9. **Equivalências ambientais de fácil compreensão** — árvores equivalentes (captura de CO₂) e km
   de carro a gasolina, com valores de referência documentados.

### Consequences

* Good, porque a demo conta a história completa (impacto financeiro + ambiental + ação) — forte
  para os critérios de tema, criatividade e UX.
* Good, porque o fator SIN parametrizável com memória de cálculo dá credibilidade técnica (C3).
* Good, porque o upload CSV permite importar o dataset simulado de uma vez na demo.
* Bad, porque aumenta a superfície a construir em 6h (ingestão e equivalências são novos vs. PRD) —
  mitigado por seed de dados e templates simples.
* Bad, porque exige manter tabelas tarifárias e fator de emissão versionados com vigência.
* Neutral, porque o motor permanece determinístico (sem IA), reduzindo risco de demo.

## Implementation Plan

* **Affected paths**:
  - `backend/prisma/schema.prisma` — novos modelos: `units` (nome, segmento enum `COMERCIO|ENSINO|INSTITUICAO`, area_m2, horario_funcionamento, faixa_consumo, user_id), `consumption_readings` (unit_id, periodo, leitura_kwh, bandeira), `tariff_tables` (vigencia, te, tusd, bandeiras verde/amarela/vermelha), `anomalies` (unit_id, tipo, severidade, desvio, janela_inicio/fim, status), `emission_factors` (fator_tco2_mwh, fonte, data_vigencia)
  - `backend/src/modules/` — `billing.module.ts` (kWh → R$), `emission.module.ts` (kWh → tCO₂e + equivalências), `detection.module.ts` (baseline + regras), `recommendations.ts` (templates por tipo de anomalia)
  - `backend/src/routes/v1/units/index.ts` — `GET /api/units`, `POST /api/units`, `GET /api/units/:id/series`, `GET /api/units/:id/anomalies`, `GET /api/units/:id/impact`
  - `backend/src/routes/v1/import/index.ts` — `POST /api/import` (CSV)
  - `backend/src/seed/` — dataset simulado: ~200 unidades, 3 segmentos, 12 meses, anomalias injetadas e rotuladas (viabiliza C2)
  - `frontend/src/pages/` — `Dashboard.tsx`, `Unidade.tsx`, `Alertas.tsx`; `frontend/src/components/` — cartões de impacto, gráficos (Recharts), equivalências (árvores/km)
  - `adr/README.md` — índice (já criado)
* **Dependencies**: adicionar `csv-parse@^5` no backend (parse do upload); `recharts@^2` no frontend (já previsto no PRD). Sem novas dependências de infraestrutura.
* **Patterns to follow**: rotas Fastify autoload em `backend/src/routes/` (ver `auth/login`); plugins em `backend/src/plugins/` (ver `db.ts`, `jwt.ts`); validação com Zod gerado pelo prisma-zod-generator; auth JWT existente em `backend/src/middlewares/auth.ts`; erros via `backend/src/errors/app.error.ts`.
* **Patterns to avoid**: não calcular tarifa/emissão no frontend (ficar nos módulos backend); não aceitar CSV sem validação/normalização/dedup; não implementar Grupo A (demanda contratada, fator de potência); não usar IA/LLM no MVP; não gravar fórmulas soltas nos componentes.
* **Configuration**: `EMISSION_FACTOR_TCO2_MWH` (default ~0.09, valor do SIN com fonte e data de vigência); tabelas tarifárias versionadas com vigência; limiares de anomalia por segmento em config (não "chutados").
* **Migration steps**:
  1. Schema Prisma + `prisma migrate dev`
  2. Módulos de cálculo (billing, emission, detection) com testes de golden case (5 cenários: tarifa simples, branca com ponta, bandeiras verde/amarela/vermelha)
  3. Rotas de units + impact + anomalies
  4. Seed com dataset simulado rotulado
  5. Frontend: dashboard → unidade → alertas → equivalências
  6. Upload CSV (`POST /api/import`) com feedback por linha e dedup
  7. Smoke test do fluxo login → visão geral → unidade → alerta (C1/C5)

### Verification

- [ ] `npm test` no backend: golden cases de faturamento conferem com erro ≤ R$ 0,01 e ≤ 0,001 tCO₂e (C3)
- [ ] Benchmark sintético (200 unidades): recall e precisão ≥ 0,8 nas anomalias injetadas (C2)
- [ ] As 9 funcionalidades do escopo estão implementadas e acessíveis na demo (checklist da seção Decision Outcome)
- [ ] Painel exibe fator do SIN com fonte e data de vigência (memória de cálculo auditável)
- [ ] Equivalências (árvores e km de carro) aparecem com a fórmula e os valores de referência documentados
- [ ] Upload CSV importa com feedback de sucesso/erro por linha e deduplica períodos repetidos
- [ ] Smoke test do fluxo principal concluído em ≤ 5 min por usuário da banca, telas ≤ 2s (C1/C5)
- [ ] `grep` não encontra fórmulas de tarifa/emissão fora de `backend/src/modules/`

## Pros and Cons of the Options

### MVP completo com as 9 funcionalidades

* Good, porque narrativa completa e diferenciada para a banca.
* Good, porque cobre todos os KPIs C1–C5.
* Bad, porque mais superfície em 6h (mitigado por seed e templates).
* Neutral, porque ingestão e equivalências são implementações simples (parse de CSV + fórmulas).

### MVP reduzido (sem ingestão/equivalências)

* Good, porque menos risco de não terminar.
* Bad, porque perde o "upload de conta de luz" e as equivalências — pontos de criatividade/UX.
* Bad, porque exige digitar leituras manualmente na demo (mais atrito).

### MVP ampliado com benchmarking entre unidades

* Good, porque comparação entre pares é atrativa.
* Bad, porque exige dados multi-unidade consistentes e mais telas — inviável em 6h.
* Bad, porque o PRD já o classificou como v2.0.

## More Information

* Relacionado: [PRD.md](../PRD.md) (EnergiAlerta), [IDEIAS.md](../IDEIAS.md)
* Follow-up: criar seed dataset sintético rotulado (~200 unidades)
* Follow-up: definir limiares de anomalia por segmento com teste (não chutados)
* Revisit trigger: se a demo ficar sem tempo para o upload CSV, reduzir para cadastro manual e registrar o corte aqui
* Referências no código: adicionar comentário `// ADR-0001` nos módulos de cálculo e na rota de import