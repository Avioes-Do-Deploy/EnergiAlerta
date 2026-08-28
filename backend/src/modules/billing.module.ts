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
