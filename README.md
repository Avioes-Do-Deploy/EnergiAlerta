# EnergiAlerta

> *Sua energia sob controle. Seu desperdício em alerta*

---

Painel web que transforma consumo de energia (kWh) em impacto financeiro (R$) e ambiental (tCO₂e), detecta desperdícios e anomalias por comparação com o histórico da própria unidade e sugere ações concretas de economia. Voltado para pequenos comércios, escolas e instituições públicas.

## Problema

Pequenas empresas e instituições respondem por parcela significativa do consumo de energia elétrica no Brasil, mas não têm visibilidade sobre o próprio desperdício. Recebem a conta de luz sem entender onde o dinheiro e as emissões se perdem. Sem referências, sem contexto e sem tradução dos dados técnicos, não conseguem priorizar nenhuma ação de eficiência energética.

As soluções existentes no mercado se dividem em dois extremos: plataformas corporativas caras e complexas (IBM Envizi, Schneider EcoStruxure) ou calculadoras superficiais de carbono que não consideram bandeira tarifária, horário de ponta nem o histórico real da unidade.

## Solução

O EnergiAlerta ocupa o espaço intermediário: uma ferramenta acessível, visual e acionável que:

- Converte consumo (kWh) em **custo estimado (R$)** considerando tarifa Grupo B (TE + TUSD) e bandeira tarifária;
- Converte consumo em **emissões (tCO₂e)** usando fator do SIN parametrizável e versionado com memória de cálculo auditável;
- **Detecta anomalias** por comparação da unidade com seu próprio histórico (baseline com sazonalidade) e por regras de faturamento (horário de ponta, bandeiras);
- **Sugere 1 ação concreta** por tipo de anomalia, com economia potencial estimada em R$ e tCO₂e;
- **Traduz o impacto ambiental** em equivalências compreensíveis (árvores equivalentes, km de carro a gasolina);
- Classifica unidades por **segmento** (comércio, ensino, instituição pública) para calibrar baselines e limiares.

## Diferencial

- **Dupla conversão simultânea (R$ + tCO₂e):** une impacto financeiro e ambiental no mesmo painel, conectando sustentabilidade a resultado prático;
- **Comparação da unidade com ela mesma:** evita diagnósticos injustos ao considerar o contexto operacional de cada perfil (escola tem pico em horário de aula, comércio em fins de semana);
- **Tropicalização:** considera regras brasileiras de faturamento (bandeiras verde/amarela/vermelha, horário de ponta, tarifas TE/TUSD);
- **Equivalências ambientais:** traduz tCO₂e em árvores e km de carro, tornando o impacto palpável;
- **Motor 100% determinístico:** sem IA/LLM — regras, estatística e templates, com memória de cálculo auditável (fonte e data de vigência do fator de emissão);
- **Acessibilidade:** pensado para quem não tem estrutura ESG avançada — onboarding ≤ 5 min, linguagem simples.

## Fluxo

```
Ingestão (seed / upload CSV / cadastro manual)
        │
        ▼
   Normalização e validação
        │
        ▼
   Cálculo de custo (kWh → R$)        ← tarifa Grupo B + bandeira
   Cálculo de emissão (kWh → tCO₂e)  ← fator SIN versionado
        │
        ▼
   Detecção de anomalias
   (baseline + regras de faturamento)
        │
        ▼
   Persistência (Prisma/SQLite)
        │
        ▼
   Dashboard (React + Recharts)
   ├── Visão consolidada (kWh / R$ / tCO₂e + variação mensal)
   ├── Série histórica com sazonalidade
   ├── Alertas com severidade e explicação legível
   ├── Recomendação + economia potencial por alerta
   └── Equivalências ambientais
```

**Fluxo do usuário:** Login → Visão geral → Seleção de unidade → Diagnóstico/Alertas → Ação sugerida.

## Tecnologias

| Camada | Stack |
|---|---|
| **Backend** | Fastify 5 · Prisma 7 · SQLite · JWT · Zod (validação) · `csv-parse` (upload) |
| **Frontend** | React (Vite) · Recharts (gráficos) |
| **Motor de cálculo** | Determinístico — módulos `billing`, `emission`, `detection`, `recommendations` |
| **Banco de dados** | SQLite via Prisma (modelos: `units`, `consumption_readings`, `tariff_tables`, `anomalies`, `emission_factors`) |
| **Seed/Demo** | Dataset sintético: ~200 unidades, 3 segmentos, 12 meses, anomalias injetadas e rotuladas |
| **Auth** | JWT (já existente no boilerplate) |

---

*Projeto desenvolvido para o Hackathon SEMCOMP 2026 — tema "Sustentabilidade Tecnológica".*