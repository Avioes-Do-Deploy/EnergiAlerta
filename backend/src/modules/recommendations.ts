// ADR-0001: recomendações determinísticas por template (1 ação concreta + economia).
import type { TipoAnomalia } from '../seed/generator.js'

export interface AnomaliaEntrada {
  tipo: TipoAnomalia
  desvio: number
  kwhExcedente: number
  janelaInicio: string
  janelaFim?: string
}

export interface ContextoRecomendacao {
  precoKwh: number
  fatorTco2Mwh: number
}

export interface Recomendacao {
  tipo: TipoAnomalia
  acao: string
  economiaKwh: number
  economiaReais: number
  economiaTco2e: number
}

// Fração do excedente considerada recuperável por tipo de anomalia.
const FRACAO_RECUPERAVEL: Record<TipoAnomalia, number> = {
  BASELINE_SPIKE: 1, // evento pontual: 100% evitável
  SUSTAINED_HIGH: 0.8, // rotina elevada: boa parte é desligável
  TARIFF_WASTE: 0.6, // desperdício estrutural: parte é mitigável
}

const TEMPLATES: Record<TipoAnomalia, (a: AnomaliaEntrada) => string> = {
  BASELINE_SPIKE: (a) =>
    `Pico de ${(a.desvio * 100).toFixed(0)}% em ${a.janelaInicio}. Verifique o que ocorreu nesse dia (evento, obra, equipamento temporário) e confira se algo ficou ligado sem necessidade.`,
  SUSTAINED_HIGH: (a) =>
    `Consumo ${(a.desvio * 100).toFixed(0)}% acima do normal por dias seguidos (${a.janelaInicio}${a.janelaFim ? ' a ' + a.janelaFim : ''}). Identifique equipamentos ligados fora do horário (ar-condicionado, iluminação, cozinha) e programe o desligamento automático.`,
  TARIFF_WASTE: (a) =>
    `Consumo ${(a.desvio * 100).toFixed(0)}% acima do normal por vários dias (${a.janelaInicio} a ${a.janelaFim}). Avalie vazamentos e equipamentos ineficientes (ar-condicionado, geladeira, compressores) e desloque parte do consumo para fora do horário de ponta, quando a tarifa é mais barata.`,
}

export function recomendacaoPara(a: AnomaliaEntrada, ctx: ContextoRecomendacao): Recomendacao {
  const fracao = FRACAO_RECUPERAVEL[a.tipo]
  const economiaKwh = Math.round(a.kwhExcedente * fracao * 100) / 100
  const economiaReais = Math.round(economiaKwh * ctx.precoKwh * 100) / 100
  const economiaTco2e = Math.round(((economiaKwh * ctx.fatorTco2Mwh) / 1000) * 10000) / 10000
  return {
    tipo: a.tipo,
    acao: TEMPLATES[a.tipo](a),
    economiaKwh,
    economiaReais,
    economiaTco2e,
  }
}