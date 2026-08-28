// Referências documentadas usadas nos cálculos (ADR-0001).
export const REFERENCE = {
  // Fator médio de emissão do SIN (Sistema Interligado Nacional), em tCO₂/MWh.
  // Fonte: MME — fator médio da matriz elétrica brasileira.
  sinFactor: {
    tco2PerMwh: 0.09,
    fonte: 'MME (SIN)',
    vigencia: '2024-01-01',
  },
  // Equivalências de CO₂ usadas nas recomendações e no impacto (valores de
  // referência de calculadoras de pegada de carbono brasileiras).
  equivalences: {
    arvoreKgCo2PorAno: 48, // uma árvore absorve ~48 kg CO₂ por ano
    carroKgCo2PorKm: 0.12, // carro leve a gasolina: ~0,12 kg CO₂/km (~120 g/km)
  },
} as const