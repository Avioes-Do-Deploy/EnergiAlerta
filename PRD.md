# PRD — Painel de Inteligência Energética

> Nome: **EnergiAlerta** (definitivo)
> Status: rascunho · Hackathon SEMCOMP 2026 · 6h de desenvolvimento

---

## 1. Executive Summary

### Problem Statement

Pequenas empresas e instituições (comércios, escolas, ONGs, equipamentos públicos) respondem por
parcela significativa do consumo de energia elétrica e do impacto ambiental associado, mas não têm
visibilidade sobre o próprio desperdício: recebem a conta de luz sem entender **onde** o dinheiro e
as emissões se perdem, e sem referências não conseguem priorizar nenhuma ação de eficiência.

### Proposed Solution

Um painel web que transforma consumo de energia (kWh) em **impacto financeiro (R$)** e **impacto
ambiental (tCO₂e)**, detectando desperdícios e anomalias por comparação com o histórico da própria
unidade e por regras de faturamento (bandeira tarifária e horário de ponta). Multi-segmento, com
perfis calibrados para comércio, ensino e instituições, para que cada unidade seja comparada
consigo mesma, no seu contexto.

### Success Criteria (KPIs mensuráveis)

- **C1 — Performance da demo:** a navegação principal (visão geral → unidade → alerta) responde à
  interação em **≤ 2s por tela** (medido via Lighthouse/Web Vitals no caminho principal).
- **C2 — Precisão da detecção:** o motor identifica **≥ 80% das anomalias injetadas** no dataset
  simulado (precisão e recall ≥ 0,8 em benchmark com 200 unidades sintéticas).
- **C3 — Confiabilidade do cálculo:** 100% dos casos de teste de referência de faturamento
  (Grupo B + bandeira) conferem com **erro máximo de R$ 0,01 e 0,001 tCO₂e por fatura**.
- **C4 — Abrangência de perfis:** a demo apresenta **≥ 3 segmentos** (comércio, ensino,
  instituição pública) com baseline e alertas calibrados por perfil.
- **C5 — Usabilidade:** um usuário da banca conclui sozinho o fluxo login → diagnóstico de uma
  unidade em **≤ 5 minutos**, sem ajuda.

---

## 2. User Experience & Functionality

### User Personas

| Persona | Perfil | Dor central |
| --- | --- | --- |
| *Seu Marcos* | Dono de restaurante/padaria (MEI/ME), 40–60 anos, pouco tempo | "Estou pagando caro? Onde está indo o dinheiro?" |
| *Dona Célia* | Gestora administrativa de escola/creche comunitária | Precisa cortar custo e prestar contas à comunidade |
| *Carlos* | Analista de instituição pública/ONG com várias unidades | Quer consolidar o impacto das unidades e priorizar onde intervir |
| *Avaliador* | Banca do hackathon | Avalia aderência ao tema, viabilidade e UX |

### User Stories & Acceptance Criteria

- **US1 — Visão consolidada.** Como gestor de uma unidade, quero ver consumo (kWh), custo (R$) e
  emissões (tCO₂e) no mesmo painel, para entender o impacto de uma só vez.
  - AC: cartões consolidados com variação mês a mês (% e valor); período e unidade claramente
    exibidos; "memória de cálculo" acessível para auditar valores.
- **US2 — Série histórica.** Como gestor, quero ver o histórico de consumo para identificar
  tendências e sazonalidade.
  - AC: gráfico diário/mensal; sobreposição com o mesmo período do ano anterior; bandeira tarifária
    marcada no eixo temporal.
- **US3 — Alertas de anomalia.** Como gestor, quero receber alertas quando houver pico atípico ou
  desperdício tarifário.
  - AC: alerta com severidade (baixa/média/alta); explicação legível ("consumo 40% acima da média
    do horário por 3 dias seguidos"); link para o gráfico; ação de marcar como *resolvido* ou
    *falso positivo*.
- **US4 — Impacto e ação de cada anomalia.** Como gestor, quero ver o custo (R$) e a emissão
  (tCO₂e) atribuíveis a cada alerta **e uma ação concreta sugerida**, para priorizar e agir.
  - AC: cada alerta exibe impacto estimado (ex.: quanto custou o pico; quanto custa manter o
    ar-condicionado em bandeira vermelha no horário de ponta).
  - AC: cada alerta sugere **1 ação concreta** (template por tipo de anomalia) com economia
    potencial estimada em R$ e tCO₂e (ex.: "desligar o ar-condicionado entre 18h e 21h durante a
    bandeira vermelha economiza ~R$ X e ~Y tCO₂e/mês").
- **US5 — Cadastro de unidade.** Como usuário, quero cadastrar uma unidade informando segmento,
  área e perfil de uso, para calibrar baseline e regras.
  - AC: formulário com segmento, área útil (m²), horário de funcionamento e faixa de consumo;
    validação de campos obrigatórios.
- **US6 — Ingestão de dados (pós-MVP).** Como usuário, quero enviar a conta de luz (PDF/CSV) ou
  preencher leituras manualmente, para manter o painel atualizado sem hardware.
  - AC: upload com feedback de sucesso/erro por linha; preview antes de salvar; deduplicação de
    períodos já importados.

### Non-Goals (MVP)

- ❌ Sem integração com medidores inteligentes ou APIs de distribuidora (ex.: Neoenergia Coelba).
- ❌ Sem cálculo de Grupo A (demanda contratada, fator de potência) — foco em baixa tensão (Grupo B).
- ❌ Sem machine learning não supervisionado — detecção por regras e estatística.
- ❌ Sem benchmarking/ranking entre unidades no MVP (fica para v2.0).
- ❌ Sem automação de compra/instalação de equipamentos ou orçamentos de fornecedores.
- ❌ Sem cobrança/pagamentos (o produto é visibilidade e gestão, não fintech).
- ❌ Sem app nativo (web responsiva é suficiente).

---

## 3. AI System Requirements (se aplicável)

**Não aplicável ao MVP.** O motor de detecção é **determinístico**: regras de faturamento (bandeira,
horário de ponta) + estatística de baseline (média móvel por janela dia/hora com sazonalidade).
As **ações sugeridas** por alerta (US4) também são templates determinísticos por tipo de anomalia —
sem LLM no MVP.

Evolução opcional (v2.0) — só entra com estratégia de avaliação definida:

- **Sugestão de ações por LLM:** cada alerta gera recomendação em linguagem natural. Avaliação:
  benchmark com 50 alertas rotulados, pass rate ≥ 90% de recomendações "plausíveis e específicas",
  revisão humana antes de exibir em produção.
- **Detecção não supervisionada:** identificar padrões sem rótulos. Avaliação: precisão/recall no
  mesmo benchmark sintético (mantém C2 como linha de base); fallback offline para regras.

---

## 4. Technical Specifications

### Architecture Overview

```
React (Vite) SPA ──► API Fastify ──► Prisma (SQLite)
      │                   │                  │
      │             Motor de cálculo         └─ Unit · ConsumptionReading · TariffTable ·
      │             (tarifa → R$)                   Anomaly · EmissionFactor
      └── gráficos            │
      (Recharts)        Motor ambiental (kWh → tCO₂e) + Motor de detecção (baseline + regras)
```

- **Seed/demo:** dataset simulado com ~200 unidades de 3 segmentos, séries temporais de 12 meses e
  anomalias injetadas com rótulos conhecidos (viabiliza C2).
- **Fluxo de dados:** leitura (seed hoje; upload CSV/leitura manual na v1.1) → normalização →
  cálculo de custo e emissão → detecção → persistência → consultas do dashboard.

### Integration Points

- **API REST:** `GET /api/units` · `GET /api/units/:id` · `POST /api/units` · `GET /api/units/:id/series` ·
  `GET /api/units/:id/anomalies` · `GET /api/units/:id/impact` · `POST /api/import` (v1.1).
- **Auth:** módulo de autenticação JWT já existente no boilerplate; autorização por instituição.
- **Tabelas tarifárias:** versionadas e parametrizáveis (bandeira, modalidade, tarifas TE/TUSD, ICMS).

### Fórmulas de cálculo (contrato de negócio)

- `Custo_fatura = Consumo_kWh × (TE + TUSD) + Adicional_bandeira` (Grupo B, monômia).
- `Emissão_tCO2e = Consumo_kWh × Fator_SIN` — fator do SIN publicado pelo MME, com data de vigência
  (ex.: ~0,07–0,1 tCO₂/MWh nos últimos anos; parametrizável e versionado).
- `Desvio_baseline = (Consumo_janela − Baseline)/Baseline` — alerta se desvio ≥ limiar por N janelas
  consecutivas (limiares por segmento, definidos e testados — não "chutados").

### Security & Privacy

- Dados de consumo são sensíveis para o negócio: todas as rotas autenticadas; autorização por
  unidade/instituição; princípio do menor privilégio.
- LGPD: coleta mínima de dados pessoais (apenas gestor + CNPJ/CPF tratados como confidenciais);
  política de retenção; sem venda de dados a terceiros.
- Fator de emissão e tabelas tarifárias: leitura pública permitida, escrita restrita a admin.

### Testing

- **Motor de cálculo:** testes de golden case (5 cenários: tarifa simples, tarifa branca com ponta,
  bandeiras verde/amarela/vermelha) → garante C3.
- **Detecção:** dataset sintético com anomalias rótuladas; métricas precisão/recall → garante C2.
- **API:** testes de integração (supertest) para os endpoints CRUD e de cálculo.
- **UI:** smoke test do fluxo crítico (login → visão geral → unidade → alerta) → garante C1/C5.

---

## 5. Risks & Roadmap

### Phased Rollout

| Fase | Escopo |
| --- | --- |
| **MVP (hackathon, 8h)** | Painel (kWh → R$ → tCO₂e), alertas por baseline + regras de faturamento, cada alerta com ação sugerida e economia potencial, multi-segmento, dados simulados, auth simples |
| **v1.1** | Upload CSV/PDF de conta, leitura manual, relatório exportável (PDF), multi-usuário por instituição |
| **v2.0** | Benchmarking entre pares, ML de anomalias, integração com API de distribuidora, recomendações acionáveis, gamificação |

### Technical Risks & Mitigações

1. **Tarifas mudam (ICMS, bandeiras, reajustes):** manter tabelas parametrizadas e versionadas com
   data de vigência; tratar ausência de tabela como dado inválido, não como zero.
2. **Dados simulados podem soar "fake" para a banca:** dataset realista (consumos plausíveis por
   segmento/área) + narrativa explícita do caminho para dados reais (US6).
3. **8h é curto:** pipeline de build/test mínimo definido antes do código; cortar o que não estiver
   no caminho crítico (prioridade: cálculo → detecção → painel).
4. **Fator de emissão desatualizado:** usar fonte oficial com data de vigência e exibir a fonte no
   painel (transparência com a banca).
5. **"Anomalia" ambígua:** limiares definidos e testados (ver Desvio_baseline), com explicação
   legível em cada alerta (US3).

### Anexo — Modelo de negócio (rascunho, reforça viabilidade)

- SaaS por assinatura por unidade (R$/mês), com tier gratuito para MEIs (1 unidade) e planos pagos
  para múltiplas unidades/instituições.
- Diferenciais de receita: relatórios para prestação de contas (escolas/ONGs), selo/impacto
  ambiental para comunicação dos clientes, parcerias com eficientizadores de energia.