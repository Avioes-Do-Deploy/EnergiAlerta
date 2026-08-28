import { describe, expect, it } from 'vitest'
import {
  calcularFaturamento,
  calcularFaturamentoBranca,
  classificarPeriodoBranca,
} from './billing.module.js'

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

// ADR-0001: tarifa branca — janela de ponta padrão ANEEL 17:30–20:30 (configurável);
// fora de ponta (menor tarifa) = todo horário fora da janela, incluindo o intermediário
// (a tabela de tarifas do MVP tem apenas as faixas ponta e fora ponta).
describe('classificarPeriodoBranca — período de fora de ponta (menor tarifa)', () => {
  const dia = (h: number, m: number) => new Date(2026, 1, 10, h, m, 0, 0)

  it('madrugada e manhã são fora de ponta', () => {
    expect(classificarPeriodoBranca(dia(0, 30))).toBe('fora_ponta')
    expect(classificarPeriodoBranca(dia(12, 0))).toBe('fora_ponta')
  })

  it('início da janela de ponta é inclusivo (17:30)', () => {
    expect(classificarPeriodoBranca(dia(17, 29))).toBe('fora_ponta')
    expect(classificarPeriodoBranca(dia(17, 30))).toBe('ponta')
  })

  it('dentro da janela é ponta; fim da janela é exclusivo (20:30)', () => {
    expect(classificarPeriodoBranca(dia(19, 0))).toBe('ponta')
    expect(classificarPeriodoBranca(dia(20, 29))).toBe('ponta')
    expect(classificarPeriodoBranca(dia(20, 30))).toBe('fora_ponta')
  })

  it('noite após a janela é fora de ponta', () => {
    expect(classificarPeriodoBranca(dia(21, 0))).toBe('fora_ponta')
    expect(classificarPeriodoBranca(dia(23, 59))).toBe('fora_ponta')
  })

  it('aceita janela customizada por distribuidora', () => {
    const janela = { inicio: '18:00', fim: '21:00' }
    expect(classificarPeriodoBranca(dia(17, 59), janela)).toBe('fora_ponta')
    expect(classificarPeriodoBranca(dia(18, 0), janela)).toBe('ponta')
    expect(classificarPeriodoBranca(dia(21, 0), janela)).toBe('fora_ponta')
  })
})

describe('calcularFaturamentoBranca — inclui fora de ponta no valor final', () => {
  const tarifa = {
    bandeiraPrecoMwh: 0,
    tePrecoPontaKwh: 0.45,
    tusdPrecoPontaKwh: 0.25,
    tePrecoForaPontaKwh: 0.28,
    tusdPrecoForaPontaKwh: 0.18,
  }
  const dia = (h: number) => new Date(2026, 1, 10, h, 0, 0, 0)

  it('leitura fora de ponta usa a menor tarifa (0,46 R$/kWh)', () => {
    const res = calcularFaturamentoBranca({
      leituras: [{ periodo: dia(12), leituraKwh: 1000 }],
      tarifa,
    })
    expect(res.kwh).toBe(1000)
    expect(res.custoEnergia).toBeCloseTo(460, 2)
    expect(res.custoTotal).toBeCloseTo(460, 2)
  })

  it('leituras mistas: ponta na tarifa cheia, fora de ponta na menor tarifa', () => {
    const res = calcularFaturamentoBranca({
      leituras: [
        { periodo: dia(19), leituraKwh: 200 },
        { periodo: dia(12), leituraKwh: 800 },
      ],
      tarifa,
    })
    expect(res.kwh).toBe(1000)
    expect(res.custoEnergia).toBeCloseTo(200 * 0.7 + 800 * 0.46, 2)
    expect(res.custoTotal).toBeCloseTo(508, 2)
  })

  it('aplica a bandeira sobre o total de kWh', () => {
    const res = calcularFaturamentoBranca({
      leituras: [{ periodo: dia(12), leituraKwh: 1000 }],
      tarifa: { ...tarifa, bandeiraPrecoMwh: 18.8 },
    })
    expect(res.custoBandeira).toBeCloseTo(18.8, 2)
    expect(res.custoTotal).toBeCloseTo(478.8, 2)
  })

  it('memória de cálculo expõe a janela de ponta aplicada', () => {
    const res = calcularFaturamentoBranca({
      leituras: [{ periodo: dia(12), leituraKwh: 100 }],
      tarifa,
    })
    expect(res.formula).toContain('17:30')
    expect(res.formula).toContain('20:30')
  })
})