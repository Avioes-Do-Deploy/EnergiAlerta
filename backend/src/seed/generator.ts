// Gerador sintético de séries diárias (12 meses) com anomalias injetadas rotuladas.
// Compartilhado entre o seed (Fase 5) e o benchmark C2. Determinístico por seed.
import { DETECTION } from '../config/detection.js'

export type Segmento = 'COMERCIO' | 'ENSINO' | 'INSTITUICAO'
export type TipoAnomalia = 'BASELINE_SPIKE' | 'SUSTAINED_HIGH' | 'TARIFF_WASTE'
export type Bandeira = 'VERDE' | 'AMARELA' | 'VERMELHA_1' | 'VERMELHA_2'

export interface Leitura {
  periodo: string
  leituraKwh: number
  bandeira: Bandeira
}

export interface AnomaliaInjetada {
  tipo: TipoAnomalia
  inicio: string
  fim: string
}

export interface SerieGerada {
  leituras: Leitura[]
  injetadas: AnomaliaInjetada[]
}

const BASE_KWH: Record<Segmento, number> = { COMERCIO: 120, ENSINO: 80, INSTITUICAO: 150 }

const SEMANA: Record<Segmento, number[]> = {
  // domingo..sábado
  COMERCIO: [0.45, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8],
  ENSINO: [0.2, 1.0, 1.0, 1.0, 1.0, 1.0, 0.35],
  INSTITUICAO: [0.85, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9],
}

// Ruído proporcional ao desvio esperado por segmento (mais ruído em comércio).
const RUIDO: Record<Segmento, number> = { COMERCIO: 0.1, ENSINO: 0.08, INSTITUICAO: 0.07 }

// Bandeira por mês (índice 0 = jan) — períodos de bandeira cara ao fim do ano.
const BANDEIRA_MES: Bandeira[] = [
  'VERDE',
  'VERDE',
  'VERDE',
  'VERDE',
  'VERDE',
  'AMARELA',
  'AMARELA',
  'VERDE',
  'VERMELHA_1',
  'VERMELHA_2',
  'VERMELHA_2',
  'AMARELA',
]

const ANOMALIA_RANGES: Record<TipoAnomalia, { dias: [number, number]; desvio: [number, number] }> = {
  BASELINE_SPIKE: { dias: [1, 1], desvio: [0.6, 1.5] },
  SUSTAINED_HIGH: { dias: [3, 5], desvio: [0.3, 0.6] },
  // Desperdício estrutural é um sinal prolongado e bem acima do ruído.
  TARIFF_WASTE: { dias: [7, 15], desvio: [0.25, 0.5] },
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function entre(rand: () => number, min: number, max: number) {
  return min + rand() * (max - min)
}

function dataStr(base: Date, dia: number) {
  const d = new Date(base)
  d.setUTCDate(base.getUTCDate() + dia)
  return d.toISOString().slice(0, 10)
}

export function gerarSerie({ seed, segmento, dias = 365 }: { seed: number; segmento: Segmento; dias?: number }): SerieGerada {
  const rand = mulberry32(seed)
  const base = BASE_KWH[segmento]
  const semana = SEMANA[segmento]
  const ruido = RUIDO[segmento]
  const inicio = new Date('2025-01-01T00:00:00Z')

  const multiplicador = new Array<number>(dias)
  for (let d = 0; d < dias; d++) {
    const dow = (inicio.getUTCDay() + d) % 7
    const sazonal = 1 + 0.12 * Math.sin((2 * Math.PI * (d + 30)) / 365)
    multiplicador[d] = semana[dow] * sazonal * (1 + (rand() * 2 - 1) * ruido)
  }

  const limiares = DETECTION.bySegment[segmento]
  const tipos: TipoAnomalia[] = ['BASELINE_SPIKE', 'SUSTAINED_HIGH', 'TARIFF_WASTE']
  const injetadas: AnomaliaInjetada[] = []
  const qtd = 1 + Math.floor(rand() * 3) // 1 a 3 anomalias
  const janelaMinima = Math.max(limiares.sustainedHigh.minDays, limiares.tariffWaste.minDays)
  let cursor = 60 // começa depois do warmup

  for (let i = 0; i < qtd; i++) {
    const tipo = tipos[Math.floor(rand() * tipos.length)]
    const [dMin, dMax] = ANOMALIA_RANGES[tipo].dias
    const [vMin, vMax] = ANOMALIA_RANGES[tipo].desvio
    const duracao = Math.floor(entre(rand, dMin, dMax + 1))
    const desvio = entre(rand, vMin, vMax)
    const start = cursor + Math.floor(rand() * 25)
    if (start + duracao >= dias - 10) break
    for (let d = start; d < start + duracao; d++) {
      multiplicador[d] *= 1 + desvio
    }
    injetadas.push({ tipo, inicio: dataStr(inicio, start), fim: dataStr(inicio, start + duracao - 1) })
    cursor = start + duracao + 30
  }

  const leituras: Leitura[] = []
  for (let d = 0; d < dias; d++) {
    const periodo = dataStr(inicio, d)
    const mes = new Date(periodo + 'T00:00:00Z').getUTCMonth()
    leituras.push({ periodo, leituraKwh: Math.round(base * multiplicador[d] * 100) / 100, bandeira: BANDEIRA_MES[mes] })
  }

  return { leituras, injetadas }
}