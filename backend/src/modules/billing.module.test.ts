import { describe, expect, it } from 'vitest'
import { calcularFaturamento } from './billing.module.js'

// Valores de referência (hand-coded, independentes da implementação):
// te=0,30 | tusd=0,20 → 0,50 R$/kWh na tarifa simples
// bandeiras ANEEL 2025 (R$/MWh): verde=0 | amarela=18,80 | vermelha p2=94,92
// tarifa branca: ponta=0,70 (0,45+0,25) | fora ponta=0,46 (0,28+0,18)

describe('calcularFaturamento — golden cases (erro ≤ R$ 0,01)', () => {
  const tarifaSimples = {
    tePrecoKwh: 0.3,
    tusdPrecoKwh: 0.2,
    bandeiraPrecoMwh: 0,
  }

  it('tarifa simples + bandeira verde = só energia', () => {
    const res = calcularFaturamento({ modalidade: 'simples', kwh: 1000, tarifa: tarifaSimples })
    expect(res.custoEnergia).toBeCloseTo(500, 2)
    expect(res.custoBandeira).toBeCloseTo(0, 2)
    expect(res.custoTotal).toBeCloseTo(500, 2)
  })

  it('tarifa simples + bandeira amarela (18,80 R$/MWh)', () => {
    const res = calcularFaturamento({
      modalidade: 'simples',
      kwh: 1000,
      tarifa: { ...tarifaSimples, bandeiraPrecoMwh: 18.8 },
    })
    expect(res.custoEnergia).toBeCloseTo(500, 2)
    expect(res.custoBandeira).toBeCloseTo(18.8, 2)
    expect(res.custoTotal).toBeCloseTo(518.8, 2)
  })

  it('tarifa simples + bandeira vermelha patamar 2 (94,92 R$/MWh)', () => {
    const res = calcularFaturamento({
      modalidade: 'simples',
      kwh: 1000,
      tarifa: { ...tarifaSimples, bandeiraPrecoMwh: 94.92 },
    })
    expect(res.custoTotal).toBeCloseTo(594.92, 2)
  })

  it('tarifa branca fora ponta (bandeira verde)', () => {
    const res = calcularFaturamento({
      modalidade: 'branca',
      kwhPonta: 0,
      kwhForaPonta: 1000,
      tarifa: {
        bandeiraPrecoMwh: 0,
        tePrecoPontaKwh: 0.45,
        tusdPrecoPontaKwh: 0.25,
        tePrecoForaPontaKwh: 0.28,
        tusdPrecoForaPontaKwh: 0.18,
      },
    })
    expect(res.custoEnergia).toBeCloseTo(460, 2)
    expect(res.custoTotal).toBeCloseTo(460, 2)
  })

  it('tarifa branca ponta+fora ponta com bandeira amarela', () => {
    const res = calcularFaturamento({
      modalidade: 'branca',
      kwhPonta: 200,
      kwhForaPonta: 800,
      tarifa: {
        bandeiraPrecoMwh: 18.8,
        tePrecoPontaKwh: 0.45,
        tusdPrecoPontaKwh: 0.25,
        tePrecoForaPontaKwh: 0.28,
        tusdPrecoForaPontaKwh: 0.18,
      },
    })
    expect(res.custoEnergia).toBeCloseTo(508, 2)
    expect(res.custoBandeira).toBeCloseTo(18.8, 2)
    expect(res.custoTotal).toBeCloseTo(526.8, 2)
  })

  it('expõe a memória de cálculo (formula legível)', () => {
    const res = calcularFaturamento({
      modalidade: 'simples',
      kwh: 1000,
      tarifa: { ...tarifaSimples, bandeiraPrecoMwh: 18.8 },
    })
    expect(typeof res.formula).toBe('string')
    expect(res.formula.length).toBeGreaterThan(10)
  })
})