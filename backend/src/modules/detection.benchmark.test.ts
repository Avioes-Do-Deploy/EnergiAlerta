import { describe, expect, it } from 'vitest'
import { gerarSerie, type AnomaliaInjetada } from '../seed/generator.js'
import { detectarAnomalias, type AnomaliaDetectada } from '../modules/detection.module.js'

function overlap(a: { inicio: string; fim: string }, b: { inicio: string; fim: string }) {
  return a.inicio <= b.fim && b.inicio <= a.fim
}

function janela(d: AnomaliaDetectada) {
  return { inicio: d.janelaInicio, fim: d.janelaFim }
}

describe('benchmark C2 — detecção de anomalias (200 unidades sintéticas)', () => {
  it('recall e precisão ≥ 0,8 nas anomalias injetadas', () => {
    const segmentos = ['COMERCIO', 'ENSINO', 'INSTITUICAO'] as const
    let recallHits = 0
    let totalInjetadas = 0
    let detectadasMatch = 0
    let totalDetectadas = 0

    for (let i = 0; i < 200; i++) {
      const segmento = segmentos[i % 3]
      const { leituras, injetadas } = gerarSerie({ seed: 1000 + i, segmento })
      const detectadas = detectarAnomalias(leituras, segmento)

      for (const inj of injetadas) {
        totalInjetadas++
        if (detectadas.some((d) => d.tipo === inj.tipo && overlap(janela(d), inj))) recallHits++
      }
      for (const det of detectadas) {
        totalDetectadas++
        if (injetadas.some((inj) => inj.tipo === det.tipo && overlap(janela(det), inj))) detectadasMatch++
      }
    }

    const recall = recallHits / totalInjetadas
    const precision = totalDetectadas === 0 ? 1 : detectadasMatch / totalDetectadas

    console.log(`C2: recall=${recall.toFixed(3)} (${recallHits}/${totalInjetadas}) precisão=${precision.toFixed(3)} (${detectadasMatch}/${totalDetectadas})`)
    expect(recall).toBeGreaterThanOrEqual(0.8)
    expect(precision).toBeGreaterThanOrEqual(0.8)
  })
})