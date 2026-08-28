// ADR-0001: detecção por comparação com o baseline da própria unidade (janela
// móvel por dia da semana) + regras BASELINE_SPIKE / SUSTAINED_HIGH / TARIFF_WASTE.
import { DETECTION, severidadePara, type Severidade } from '../config/detection.js'
import type { Segmento, TipoAnomalia } from '../seed/generator.js'

export interface LeituraEntrada {
  periodo: string
  leituraKwh: number
}

export interface AnomaliaDetectada {
  tipo: TipoAnomalia
  severidade: Severidade
  desvio: number
  kwhExcedente: number
  janelaInicio: string
  janelaFim: string
  explicacao: string
}

function diaDaSemana(periodo: string) {
  return new Date(periodo + 'T00:00:00Z').getUTCDay()
}

function mediana(vals: number[]) {
  const sorted = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function explicar(tipo: TipoAnomalia, desvio: number, dias: number, inicio: string, fim: string, base: number) {
  const pct = (desvio * 100).toFixed(0)
  if (tipo === 'BASELINE_SPIKE') {
    return `Consumo ${pct}% acima do baseline em ${inicio} (baseline de ${base.toFixed(1)} kWh).`
  }
  if (tipo === 'SUSTAINED_HIGH') {
    return `Consumo ${pct}% acima do baseline por ${dias} dias seguidos (${inicio} a ${fim}).`
  }
  return `Consumo ${pct}% acima do baseline por ${dias} dias (${inicio} a ${fim}) — desperdício estrutural.`
}

export function detectarAnomalias(leituras: LeituraEntrada[], segmento: Segmento): AnomaliaDetectada[] {
  const limiares = DETECTION.bySegment[segmento]
  const ordenadas = [...leituras].sort((a, b) => a.periodo.localeCompare(b.periodo))
  const n = ordenadas.length
  const base = new Array<number>(n).fill(0)
  const dev = new Array<number>(n).fill(0)

  for (let i = 0; i < n; i++) {
    const dow = diaDaSemana(ordenadas[i].periodo)
    const janela: number[] = []
    // Janela móvel de 4 semanas (mesmo dia da semana), excluindo os últimos 14
    // dias para não contaminar o baseline com a própria anomalia em curso.
    for (let j = i - 14; j >= 0 && janela.length < 4; j--) {
      if (diaDaSemana(ordenadas[j].periodo) === dow) janela.push(ordenadas[j].leituraKwh)
    }
    if (janela.length < 2) continue
    base[i] = mediana(janela)
    if (base[i] > 0) dev[i] = (ordenadas[i].leituraKwh - base[i]) / base[i]
  }

  const usados = new Array<boolean>(n).fill(false)
  const anomalias: AnomaliaDetectada[] = []

  const adicionar = (inicio: number, fim: number, tipo: TipoAnomalia) => {
    let somaDev = 0
    let excedente = 0
    for (let k = inicio; k <= fim; k++) {
      somaDev += dev[k]
      excedente += ordenadas[k].leituraKwh - base[k]
      usados[k] = true
    }
    const desvio = somaDev / (fim - inicio + 1)
    anomalias.push({
      tipo,
      severidade: severidadePara(desvio),
      desvio,
      kwhExcedente: Math.round(excedente * 100) / 100,
      janelaInicio: ordenadas[inicio].periodo,
      janelaFim: ordenadas[fim].periodo,
      explicacao: explicar(tipo, desvio, fim - inicio + 1, ordenadas[inicio].periodo, ordenadas[fim].periodo, base[inicio]),
    })
  }

  // Sequências tolerantes a buracos: a janela cresce enquanto ≥ 70% dos dias
  // estiverem acima do limiar (sem 2 dias consecutivos abaixo), evitando que
  // ruído quebre o reconhecimento de uma anomalia prolongada.
  const runs = (minDev: number, minDays: number, tipo: TipoAnomalia) => {
    const flag = dev.map((d) => (d >= minDev ? 1 : 0))
    for (let i = 0; i < n; ) {
      if (usados[i] || flag[i] === 0) {
        i++
        continue
      }
      let j = i
      let ones = 1
      let zeros = 0
      while (j + 1 < n && !usados[j + 1]) {
        const len = j + 1 - i + 1
        const newOnes = ones + flag[j + 1]
        const newZeros = flag[j + 1] === 1 ? 0 : zeros + 1
        const buracosPermitidos = Math.max(1, Math.floor(0.3 * len))
        if (newZeros >= 2 || len - newOnes > buracosPermitidos) break
        j++
        ones = newOnes
        zeros = newZeros
      }
      if (j - i + 1 >= minDays) adicionar(i, j, tipo)
      i = Math.max(j + 1, i + 1)
    }
  }

  runs(limiares.tariffWaste.minDev, limiares.tariffWaste.minDays, 'TARIFF_WASTE')
  runs(limiares.sustainedHigh.minDev, limiares.sustainedHigh.minDays, 'SUSTAINED_HIGH')
  for (let i = 0; i < n; i++) {
    if (!usados[i] && dev[i] >= limiares.spike.minDev) adicionar(i, i, 'BASELINE_SPIKE')
  }

  return anomalias
}