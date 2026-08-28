import { describe, expect, it } from 'vitest'
import { calcularEmissao } from './emission.module.js'

// Valores de referência (hand-coded):
// fator SIN default = 0,09 tCO₂/MWh → tCO₂e = kWh × 0,09 ÷ 1000
// equivalências: árvore = 48 kg CO₂/ano | carro = 0,12 kg CO₂/km

describe('calcularEmissao — golden cases (erro ≤ 0,001 tCO₂e)', () => {
  it('1000 kWh → 0,09 tCO₂e, 1,875 árvores, 750 km de carro', () => {
    const res = calcularEmissao({ kwh: 1000 })
    expect(res.tco2e).toBeCloseTo(0.09, 3)
    expect(res.arvores).toBeCloseTo(1.875, 3)
    expect(res.kmCarro).toBeCloseTo(750, 3)
  })

  it('4500 kWh → 0,405 tCO₂e, 8,4375 árvores, 3375 km', () => {
    const res = calcularEmissao({ kwh: 4500 })
    expect(res.tco2e).toBeCloseTo(0.405, 3)
    expect(res.arvores).toBeCloseTo(8.4375, 3)
    expect(res.kmCarro).toBeCloseTo(3375, 3)
  })

  it('aceita fator customizado (0,10 tCO₂/MWh)', () => {
    const res = calcularEmissao({ kwh: 1000, fatorTco2Mwh: 0.1 })
    expect(res.tco2e).toBeCloseTo(0.1, 3)
  })

  it('expõe fator, fonte e vigência na memória de cálculo', () => {
    const res = calcularEmissao({ kwh: 1000 })
    expect(res.fatorTco2Mwh).toBeCloseTo(0.09, 3)
    expect(res.fonte).toBe('MME (SIN)')
    expect(res.vigencia).toBe('2024-01-01')
    expect(typeof res.formula).toBe('string')
  })
})