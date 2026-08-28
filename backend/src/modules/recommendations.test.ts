import { describe, expect, it } from 'vitest'
import { recomendacaoPara, type AnomaliaEntrada } from './recommendations.js'

const CTX = { precoKwh: 0.5, fatorTco2Mwh: 0.09 }

function anomalia(tipo: AnomaliaEntrada['tipo']): AnomaliaEntrada {
  return { tipo, desvio: 0.35, kwhExcedente: 100, janelaInicio: '2025-03-04', janelaFim: '2025-03-06' }
}

describe('recomendacaoPara', () => {
  it.each(['BASELINE_SPIKE', 'SUSTAINED_HIGH', 'TARIFF_WASTE'] as const)(
    '%s — ação presente e economia ≥ 0',
    (tipo) => {
      const rec = recomendacaoPara(anomalia(tipo), CTX)
      expect(rec.acao.length).toBeGreaterThan(20)
      expect(rec.acao).toContain('35%')
      expect(rec.economiaKwh).toBeGreaterThanOrEqual(0)
      expect(rec.economiaReais).toBeGreaterThanOrEqual(0)
      expect(rec.economiaTco2e).toBeGreaterThanOrEqual(0)
    },
  )

  it('golden: spike de 100 kWh excedentes = 100 kWh, R$ 50 e 0,009 tCO₂e', () => {
    const rec = recomendacaoPara(anomalia('BASELINE_SPIKE'), CTX)
    expect(rec.economiaKwh).toBeCloseTo(100, 2)
    expect(rec.economiaReais).toBeCloseTo(50, 2)
    expect(rec.economiaTco2e).toBeCloseTo(0.009, 3)
  })

  it('golden: desperdício de 100 kWh excedentes = 60 kWh recuperáveis (60%)', () => {
    const rec = recomendacaoPara(anomalia('TARIFF_WASTE'), CTX)
    expect(rec.economiaKwh).toBeCloseTo(60, 2)
    expect(rec.economiaReais).toBeCloseTo(30, 2)
    expect(rec.economiaTco2e).toBeCloseTo(0.0054, 4)
  })
})