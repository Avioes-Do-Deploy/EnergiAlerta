// Limiares de detecção (ADR-0001) — calibrados pelo benchmark C2, não chutados.
export type Severidade = 'BAIXA' | 'MEDIA' | 'ALTA'

export interface Limiares {
  spike: { minDev: number }
  sustainedHigh: { minDev: number; minDays: number }
  tariffWaste: { minDev: number; minDays: number }
}

export const DETECTION = {
  // Dias iniciais sem baseline suficiente (janela móvel ainda não preenchida).
  warmupDays: 28,
  // Janela móvel do baseline: semanas anteriores, mesmo dia da semana.
  baselineWindowWeeks: 4,
  bySegment: {
    // Comércio tem mais variação de movimento → limiar de pico mais alto.
    COMERCIO: {
      spike: { minDev: 0.55 },
      sustainedHigh: { minDev: 0.28, minDays: 3 },
      tariffWaste: { minDev: 0.15, minDays: 7 },
    },
    // Escola: semana cheia, fim de semana ocioso.
    ENSINO: {
      spike: { minDev: 0.5 },
      sustainedHigh: { minDev: 0.25, minDays: 3 },
      tariffWaste: { minDev: 0.12, minDays: 7 },
    },
    // Instituição: operação mais estável → limiar menor.
    INSTITUICAO: {
      spike: { minDev: 0.45 },
      sustainedHigh: { minDev: 0.22, minDays: 3 },
      tariffWaste: { minDev: 0.1, minDays: 7 },
    },
  } as Record<string, Limiares>,
  severity: [
    { minDev: 0.5, severity: 'ALTA' },
    { minDev: 0.25, severity: 'MEDIA' },
    { minDev: 0, severity: 'BAIXA' },
  ] as { minDev: number; severity: Severidade }[],
} as const

export function severidadePara(desvio: number): Severidade {
  for (const faixa of DETECTION.severity) {
    if (desvio >= faixa.minDev) return faixa.severity
  }
  return 'BAIXA'
}