// ADR-0001: faturamento Grupo B — custo = kWh × (TE + TUSD) + bandeira (R$/MWh ÷ 1000).
export interface TarifaSimples {
  tePrecoKwh: number
  tusdPrecoKwh: number
  bandeiraPrecoMwh: number
}

export interface TarifaBranca {
  tePrecoPontaKwh: number
  tusdPrecoPontaKwh: number
  tePrecoForaPontaKwh: number
  tusdPrecoForaPontaKwh: number
  bandeiraPrecoMwh: number
}

export type FaturamentoInput =
  | { modalidade: 'simples'; kwh: number; tarifa: TarifaSimples }
  | { modalidade: 'branca'; kwhPonta: number; kwhForaPonta: number; tarifa: TarifaBranca }

export interface FaturamentoResult {
  custoTotal: number
  custoEnergia: number
  custoBandeira: number
  kwh: number
  formula: string
}

export function calcularFaturamento(input: FaturamentoInput): FaturamentoResult {
  if (input.modalidade === 'simples') {
    const custoEnergia = input.kwh * (input.tarifa.tePrecoKwh + input.tarifa.tusdPrecoKwh)
    const custoBandeira = (input.kwh / 1000) * input.tarifa.bandeiraPrecoMwh
    const custoTotal = custoEnergia + custoBandeira
    const formula =
      `${input.kwh} kWh × (${input.tarifa.tePrecoKwh.toFixed(2)} + ${input.tarifa.tusdPrecoKwh.toFixed(2)}) R$/kWh` +
      ` + ${input.tarifa.bandeiraPrecoMwh.toFixed(2)} R$/MWh × ${(input.kwh / 1000).toFixed(3)} MWh = R$ ${custoTotal.toFixed(2)}`
    return { custoTotal, custoEnergia, custoBandeira, kwh: input.kwh, formula }
  }

  const precoPonta = input.tarifa.tePrecoPontaKwh + input.tarifa.tusdPrecoPontaKwh
  const precoForaPonta = input.tarifa.tePrecoForaPontaKwh + input.tarifa.tusdPrecoForaPontaKwh
  const custoEnergia = input.kwhPonta * precoPonta + input.kwhForaPonta * precoForaPonta
  const kwh = input.kwhPonta + input.kwhForaPonta
  const custoBandeira = (kwh / 1000) * input.tarifa.bandeiraPrecoMwh
  const custoTotal = custoEnergia + custoBandeira
  const formula =
    `${input.kwhPonta} kWh ponta × ${precoPonta.toFixed(2)} R$/kWh + ${input.kwhForaPonta} kWh fora ponta × ${precoForaPonta.toFixed(2)} R$/kWh` +
    ` + ${input.tarifa.bandeiraPrecoMwh.toFixed(2)} R$/MWh × ${(kwh / 1000).toFixed(3)} MWh = R$ ${custoTotal.toFixed(2)}`
  return { custoTotal, custoEnergia, custoBandeira, kwh, formula }
}

// ADR-0001: tarifa branca — janela de ponta padrão ANEEL 17:30–20:30 (configurável);
// fora de ponta (menor tarifa) = todo horário fora da janela, incluindo o intermediário
// (a tabela de tarifas do MVP tem apenas as faixas ponta e fora ponta).
export interface JanelaPonta {
  inicio: string // "HH:MM"
  fim: string // "HH:MM"
}

export const JANELA_PONTA_PADRAO: JanelaPonta = { inicio: '17:30', fim: '20:30' }

export type PeriodoBranca = 'ponta' | 'fora_ponta'

export function classificarPeriodoBranca(
  data: Date,
  janela: JanelaPonta = JANELA_PONTA_PADRAO,
): PeriodoBranca {
  const minutos = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const agora = data.getHours() * 60 + data.getMinutes()
  const inicio = minutos(janela.inicio)
  const fim = minutos(janela.fim)
  return agora >= inicio && agora < fim ? 'ponta' : 'fora_ponta'
}

export interface LeituraBranca {
  periodo: Date
  leituraKwh: number
}

export interface FaturamentoBrancaInput {
  leituras: LeituraBranca[]
  tarifa: TarifaBranca
  janelaPonta?: JanelaPonta
}

export function calcularFaturamentoBranca(input: FaturamentoBrancaInput): FaturamentoResult {
  let kwhPonta = 0
  let kwhForaPonta = 0
  for (const leitura of input.leituras) {
    if (classificarPeriodoBranca(leitura.periodo, input.janelaPonta) === 'ponta') {
      kwhPonta += leitura.leituraKwh
    } else {
      kwhForaPonta += leitura.leituraKwh
    }
  }
  const resultado = calcularFaturamento({
    modalidade: 'branca',
    kwhPonta,
    kwhForaPonta,
    tarifa: input.tarifa,
  })
  const janela = input.janelaPonta ?? JANELA_PONTA_PADRAO
  return { ...resultado, formula: `${resultado.formula} (janela de ponta ${janela.inicio}–${janela.fim})` }
}
