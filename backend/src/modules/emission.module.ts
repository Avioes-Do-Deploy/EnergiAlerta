// ADR-0001: emissão = kWh × fator (tCO₂/MWh) ÷ 1000; equivalências em config/reference.
import { REFERENCE } from '../config/reference.js'

export interface EmissaoInput {
  kwh: number
  fatorTco2Mwh?: number
}

export interface EmissaoResult {
  tco2e: number
  arvores: number
  kmCarro: number
  fatorTco2Mwh: number
  fonte: string
  vigencia: string
  formula: string
}

export function calcularEmissao({ kwh, fatorTco2Mwh }: EmissaoInput): EmissaoResult {
  const fator = fatorTco2Mwh ?? REFERENCE.sinFactor.tco2PerMwh
  const tco2e = (kwh * fator) / 1000
  const kgCo2 = tco2e * 1000
  const arvores = kgCo2 / REFERENCE.equivalences.arvoreKgCo2PorAno
  const kmCarro = kgCo2 / REFERENCE.equivalences.carroKgCo2PorKm
  const formula =
    `${kwh} kWh × ${fator.toFixed(3)} tCO₂/MWh ÷ 1000 = ${tco2e.toFixed(3)} tCO₂e` +
    ` (≈ ${arvores.toFixed(1)} árvores/ano ou ${kmCarro.toFixed(0)} km de carro)`
  return {
    tco2e,
    arvores,
    kmCarro,
    fatorTco2Mwh: fator,
    fonte: REFERENCE.sinFactor.fonte,
    vigencia: REFERENCE.sinFactor.vigencia,
    formula,
  }
}