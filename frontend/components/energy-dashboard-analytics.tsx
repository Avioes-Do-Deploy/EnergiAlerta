"use client"

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudCog,
  CloudSun,
  Droplets,
  Filter,
  Gauge,
  Info,
  Lightbulb,
  Leaf,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type Period = "today" | "seven" | "thirty"
type TimeFilter = "all" | "business" | "off-hours" | "early"
type Severity = "Alta" | "Média" | "Baixa"

type Anomaly = {
  id: string
  title: string
  type: string
  time: string
  date: string
  variation: number
  severity: Severity
  surplus: number
  category: string
  impact: string
  causes: string[]
  recommendation: string
  color: string
}

type ChartPoint = {
  label: string
  time: string
  actual: number
  expected: number
  anomalyId?: string
}

const moneyPerKwh = 0.88
const co2Factor = 0.0817

const severityFor = (variation: number): Severity => {
  if (variation >= 30) return "Alta"
  if (variation >= 15) return "Média"
  return "Baixa"
}

const colorFor = (severity: Severity) => {
  if (severity === "Alta") return "text-destructive"
  if (severity === "Média") return "text-orange-500"
  return "text-primary"
}

const categoryFor = (hour: number) => {
  if (hour >= 8 && hour < 18) return "Processos"
  if (hour >= 18) return "Iluminação"
  return "Climatização"
}

const isOffHours = (hour: number) => hour < 8 || hour >= 18

function narrativeFor(type: string, point: ChartPoint, variation: number, surplus: number) {
  const time = point.time
  const pct = `${formatNumber(Math.abs(variation), 1)}%`
  switch (type) {
    case "Pico repentino":
      return {
        title: `Pico repentino às ${time}`,
        impact: `A demanda saltou para ${point.actual} kWh contra ${point.expected} kWh esperados (${pct}) em relação aos pontos vizinhos, elevando a carga no horário.`,
        causes: ["Partida simultânea de equipamentos", "Carga de alta potência acionada de uma vez"],
        recommendation: "Espaçar as partidas de equipamentos e deslocar cargas não críticas para horários de menor tarifa.",
      }
    case "Horário incomum persistente":
      return {
        title: "Carga persistente em horário incomum",
        impact: `Consumo elevado e contínuo em horário de baixa atividade (${surplus} kWh excedentes), indicando carga ligada sem produção correspondente.`,
        causes: ["Equipamento em modo manual ou stand-by", "Falha no desligamento automático"],
        recommendation: "Identificar a carga contínua e retomar o controle automático de desligamento.",
      }
    case "Consumo acima do padrão":
      return {
        title: `Consumo acima do padrão às ${time}`,
        impact: `O consumo atingiu ${point.actual} kWh contra ${point.expected} kWh esperados (${pct} acima da linha de base) no horário de maior atividade.`,
        causes: ["Carga ligada sem necessidade no período", "Equipamento com eficiência reduzida"],
        recommendation: `Revisar as cargas ativas às ${time} e verificar equipamentos com desempenho abaixo do esperado.`,
      }
    default:
      return {
        title: `Consumo fora do horário às ${time}`,
        impact: `Houve consumo de ${surplus} kWh fora do horário de operação, quando a unidade deveria estar em repouso.`,
        causes: ["Equipamento deixado ligado após o expediente", "Automação ou timer desconfigurado"],
        recommendation: "Desligar cargas fora do expediente e revisar a programação de horários.",
      }
  }
}

function detectAnomalies(points: ChartPoint[], period: Period): Anomaly[] {
  const detected: Anomaly[] = []
  const elevated = (point?: ChartPoint) => {
    if (!point) return false
    const hour = Number(point.time.slice(0, 2))
    const variation = point.expected > 0 ? ((point.actual - point.expected) / point.expected) * 100 : 0
    return isOffHours(hour) && variation >= 10
  }

  points.forEach((point, index) => {
    const hour = Number(point.time.slice(0, 2))
    const variation = point.expected > 0 ? ((point.actual - point.expected) / point.expected) * 100 : 0
    const surplus = Math.max(0, point.actual - point.expected)
    if (surplus <= 0) return

    const previous = points[index - 1]
    const next = points[index + 1]
    const neighbors = [previous?.actual, next?.actual].filter((value): value is number => value !== undefined)
    const isSpike = neighbors.length > 0 && point.actual > Math.max(...neighbors) * 1.3 && variation >= 10
    const isPersistent = isOffHours(hour) && variation >= 10 && (elevated(previous) || elevated(next))

    let type: string
    if (isSpike) {
      type = "Pico repentino"
    } else if (isPersistent) {
      type = "Horário incomum persistente"
    } else if (!isOffHours(hour) && variation >= 25) {
      type = "Consumo acima do padrão"
    } else if (isOffHours(hour) && variation >= 12) {
      type = "Consumo fora do horário"
    } else {
      return
    }

    const severity = severityFor(variation)
    const category = categoryFor(hour)
    const date = period === "today" ? "Hoje" : point.label
    const idBase = type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    const narrative = narrativeFor(type, point, variation, surplus)

    detected.push({
      id: `${period}-${idBase}-${point.time.replace(":", "")}`,
      title: narrative.title,
      type,
      time: point.time,
      date,
      variation: Math.round(variation * 10) / 10,
      severity,
      surplus,
      category,
      impact: narrative.impact,
      causes: narrative.causes,
      recommendation: narrative.recommendation,
      color: colorFor(severity),
    })
  })

  return detected
}

const chartData: Record<Period, ChartPoint[]> = {
  today: [
    { label: "00h", time: "00:00", actual: 38, expected: 32 },
    { label: "02h", time: "02:00", actual: 55, expected: 36 },
    { label: "04h", time: "04:00", actual: 33, expected: 31 },
    { label: "06h", time: "06:00", actual: 49, expected: 40 },
    { label: "08h", time: "08:00", actual: 66, expected: 62 },
    { label: "10h", time: "10:00", actual: 72, expected: 66 },
    { label: "12h", time: "12:00", actual: 78, expected: 69 },
    { label: "14h", time: "14:00", actual: 96, expected: 73 },
    { label: "16h", time: "16:00", actual: 74, expected: 70 },
    { label: "17h", time: "17:00", actual: 100, expected: 68 },
    { label: "20h", time: "20:00", actual: 53, expected: 46 },
    { label: "22h", time: "22:00", actual: 69, expected: 42 },
  ],
  seven: [
    { label: "Seg", time: "08:00", actual: 63, expected: 59 },
    { label: "Ter", time: "10:00", actual: 72, expected: 66 },
    { label: "Qua", time: "12:00", actual: 78, expected: 69 },
    { label: "Qui", time: "14:00", actual: 96, expected: 73 },
    { label: "Sex", time: "17:00", actual: 100, expected: 68 },
    { label: "Sáb", time: "22:00", actual: 69, expected: 42 },
    { label: "Hoje", time: "02:00", actual: 55, expected: 36 },
  ],
  thirty: [
    { label: "01 ago", time: "08:00", actual: 56, expected: 53 },
    { label: "05 ago", time: "10:00", actual: 62, expected: 59 },
    { label: "09 ago", time: "12:00", actual: 71, expected: 65 },
    { label: "13 ago", time: "14:00", actual: 82, expected: 69 },
    { label: "17 ago", time: "17:00", actual: 93, expected: 67 },
    { label: "21 ago", time: "22:00", actual: 69, expected: 42 },
    { label: "25 ago", time: "02:00", actual: 55, expected: 36 },
    { label: "28 ago", time: "14:00", actual: 96, expected: 73 },
  ],
}

const periodData: Record<
  Period,
  { label: string; comparison: string; consumption: number; expected: number; previous: number; monthlyCost: number }
> = {
  today: { label: "Hoje", comparison: "ontem", consumption: 1280, expected: 1210, previous: 1190, monthlyCost: 8240 },
  seven: { label: "7 dias", comparison: "período anterior", consumption: 8640, expected: 8120, previous: 8290, monthlyCost: 8240 },
  thirty: { label: "30 dias", comparison: "período anterior", consumption: 42860, expected: 39340, previous: 39820, monthlyCost: 8240 },
}

const timeFilterLabels: Record<TimeFilter, string> = {
  all: "Todos os horários",
  business: "Horário comercial",
  "off-hours": "Fora do horário",
  early: "Madrugada (dados insuficientes)",
}

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(value)

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value)

function severityClasses(severity: Severity) {
  if (severity === "Alta") return "border-destructive/20 bg-destructive/10 text-destructive"
  if (severity === "Média") return "border-orange-500/20 bg-orange-500/10 text-orange-600"
  return "border-primary/20 bg-primary/10 text-primary"
}

export function EnergyDashboardAnalytics() {
  const [period, setPeriod] = useState<Period>("thirty")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all")
  const [resolvedIds, setResolvedIds] = useState<string[]>([])
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState("há 4 minutos")

  useEffect(() => {
    const stored = window.localStorage.getItem("energialerta-resolved-anomalies")
    if (stored) {
      try {
        setResolvedIds(JSON.parse(stored))
      } catch {
        window.localStorage.removeItem("energialerta-resolved-anomalies")
      }
    }
    const timer = window.setTimeout(() => setIsLoading(false), 550)
    return () => window.clearTimeout(timer)
  }, [])

  const currentData = periodData[period]
  const detectedAnomalies = useMemo(() => detectAnomalies(chartData[period], period), [period])
  const chartPoints = useMemo(
    () => chartData[period].map((point) => ({ ...point, anomalyId: detectedAnomalies.find((anomaly) => anomaly.time === point.time)?.id })),
    [period, detectedAnomalies],
  )
  const filteredAnomalies = useMemo(() => {
    return detectedAnomalies.filter((anomaly) => {
      const hour = Number(anomaly.time.slice(0, 2))
      if (timeFilter === "business") return hour >= 8 && hour < 18
      if (timeFilter === "off-hours") return hour < 8 || hour >= 18
      if (timeFilter === "early") return hour >= 0 && hour < 6
      return true
    })
  }, [detectedAnomalies, timeFilter])

  const filteredChartPoints = useMemo(() => {
    return chartPoints.filter((point) => {
      const hour = Number(point.time.slice(0, 2))
      if (timeFilter === "business") return hour >= 8 && hour < 18
      if (timeFilter === "off-hours") return hour < 8 || hour >= 18
      if (timeFilter === "early") return hour >= 0 && hour < 6
      return true
    })
  }, [chartPoints, timeFilter])

  const openAnomalies = filteredAnomalies.filter((anomaly) => !resolvedIds.includes(anomaly.id))
  const offHours = filteredAnomalies.filter((anomaly) => Number(anomaly.time.slice(0, 2)) < 8 || Number(anomaly.time.slice(0, 2)) >= 18)
  const periodMultiplier = period === "today" ? 1 : period === "seven" ? 4 : 15
  const surplusKwh = filteredAnomalies.reduce((sum, anomaly) => sum + anomaly.surplus, 0) * periodMultiplier
  const wasteCost = surplusKwh * moneyPerKwh
  const monthlyEstimate = currentData.monthlyCost + wasteCost
  const potentialSavings = Math.round(wasteCost * 0.82)
  const variation = ((currentData.consumption - currentData.expected) / currentData.expected) * 100
  const comparisonVariation = ((currentData.consumption - currentData.previous) / currentData.previous) * 100
  const energyScore = Math.max(0, Math.min(100, Math.round(100 - openAnomalies.length * 8 - offHours.length * 4 - Math.max(0, variation) * 1.5)))
  const topOpportunity = filteredAnomalies
    .map((anomaly) => ({ ...anomaly, opportunity: Math.round(anomaly.surplus * moneyPerKwh * periodMultiplier * 0.82) }))
    .sort((a, b) => b.opportunity - a.opportunity)[0]
  const dataInsufficient = timeFilter === "early"
  const noAnomalies = !dataInsufficient && filteredAnomalies.length > 0 && openAnomalies.length === 0

  function toggleResolved(id: string) {
    setResolvedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      window.localStorage.setItem("energialerta-resolved-anomalies", JSON.stringify(next))
      return next
    })
  }

  function refreshData() {
    setLastUpdated("agora")
    setIsLoading(true)
    window.setTimeout(() => setIsLoading(false), 450)
  }

  if (isLoading) {
    return (
      <DashboardLoadingState />
    )
  }

  return (
    <>
      <div className="space-y-7 p-5 lg:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Quarta-feira, 28 de agosto de 2026</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Bom dia, Rafael.</h1>
            <p className="mt-2 text-muted-foreground">Uma leitura clara da energia da sua operação.</p>
          </div>
          <button onClick={refreshData} className="flex items-center gap-2 self-start rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-secondary sm:self-auto">
            <RefreshCw className={`size-4 text-primary ${isLoading ? "animate-spin" : ""}`} /> Atualizar dados
          </button>
        </div>

        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6" aria-labelledby="smart-summary-title">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><CloudCog className="size-5" /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="smart-summary-title" className="font-display text-lg font-semibold">Resumo inteligente</h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">Regras EnergiAlerta</span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {noAnomalies
                    ? "Tudo normal no recorte selecionado. Os alertas resolvidos continuam disponíveis no histórico."
                    : dataInsufficient
                      ? "Ainda não há leituras suficientes para interpretar este recorte. Amplie o período ou selecione outro horário."
                      : `O consumo está ${formatNumber(Math.abs(variation), 1)}% ${variation >= 0 ? "acima" : "abaixo"} do esperado. ${openAnomalies.length} ${openAnomalies.length === 1 ? "anomalia aberta exige" : "anomalias abertas exigem"} atenção; ${formatNumber(offHours.length)} ${offHours.length === 1 ? "ocorre" : "ocorrem"} fora do horário.`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[460px]">
              <SummaryChip label="Variação" value={`${variation >= 0 ? "+" : ""}${formatNumber(variation, 1)}%`} tone={variation > 0 ? "warning" : "good"} />
              <SummaryChip label="Anomalias" value={formatNumber(openAnomalies.length)} tone={openAnomalies.length ? "warning" : "good"} />
              <SummaryChip label="Maior oportunidade" value={topOpportunity ? topOpportunity.category : "—"} tone="neutral" />
              <SummaryChip label="Fora do horário" value={`${formatNumber(offHours.length)} sinais`} tone={offHours.length ? "warning" : "good"} />
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Zap} label={`Consumo · ${currentData.label.toLowerCase()}`} value={formatNumber(currentData.consumption)} unit="kWh" change={`${comparisonVariation >= 0 ? "+" : ""}${formatNumber(comparisonVariation, 1)}%`} warning={comparisonVariation > 0} />
          <MetricCard icon={TrendingDown} label="Custo mensal estimado" value={formatMoney(monthlyEstimate)} change={`${formatMoney(wasteCost)} desperdício`} warning={wasteCost > 0} />
          <MetricCard icon={Leaf} label="CO₂e do desperdício" value={formatNumber(surplusKwh * co2Factor / 1000, 2)} unit="tCO₂e" change={`fator ${co2Factor} kg/kWh`} />
          <MetricCard icon={ShieldAlert} label="Energy Score" value={formatNumber(energyScore)} unit="/ 100" change={energyScore >= 80 ? "Operação saudável" : "Ação recomendada"} warning={energyScore < 70} />
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-label="Filtros do dashboard">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-primary" />
              <div><p className="text-sm font-semibold">Filtros de análise</p><p className="text-xs text-muted-foreground">Recalcule os indicadores por período e horário.</p></div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Período
                <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring">
                  <option value="today">Hoje vs. ontem</option>
                  <option value="seven">7 dias vs. período anterior</option>
                  <option value="thirty">30 dias vs. período anterior</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Horário
                <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as TimeFilter)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring">
                  {Object.entries(timeFilterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="consumption-chart-title">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="consumption-chart-title" className="font-display text-lg font-semibold">Consumo real vs. esperado</h2><p className="mt-1 text-sm text-muted-foreground">{currentData.label} · pontos destacados têm anomalias clicáveis</p></div>
              <span className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${variation <= 0 ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-600"}`}>{variation <= 0 ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}{formatNumber(Math.abs(variation), 1)}%</span>
            </div>
            {dataInsufficient ? <InsufficientDataState /> : <EnergyChart points={filteredChartPoints} onSelect={(id) => setSelectedAnomaly(detectedAnomalies.find((anomaly) => anomaly.id === id) ?? null)} />}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="impact-title">
            <div className="flex items-start justify-between"><div><h2 id="impact-title" className="font-display text-lg font-semibold">Impacto do desperdício</h2><p className="mt-1 text-sm text-muted-foreground">Estimativa baseada nos desvios detectados</p></div><Leaf className="size-5 text-primary" /></div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <ImpactStat label="kWh excedentes" value={`${formatNumber(surplusKwh)} kWh`} />
              <ImpactStat label="Custo do desperdício" value={formatMoney(wasteCost)} tone="warning" />
              <ImpactStat label="Economia potencial" value={formatMoney(potentialSavings)} tone="good" />
              <ImpactStat label="CO₂e estimado" value={`${formatNumber(surplusKwh * co2Factor / 1000, 2)} t`} />
            </div>
            <div className="mt-5 rounded-xl bg-secondary/60 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-primary"><Info className="size-3.5" />Como calculamos</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Excedente × R$ {moneyPerKwh.toFixed(2)}/kWh. CO₂e usa o fator configurado de {co2Factor} kg/kWh.</p></div>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="comparisons-title">
          <div className="flex items-center justify-between"><div><h2 id="comparisons-title" className="font-display text-lg font-semibold">Comparações de consumo</h2><p className="mt-1 text-sm text-muted-foreground">Entenda a tendência antes de agir.</p></div><BarChart3 className="size-5 text-primary" /></div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">{(["today", "seven", "thirty"] as Period[]).map((item) => <ComparisonCard key={item} active={period === item} label={`${periodData[item].label} vs. ${periodData[item].comparison}`} current={periodData[item].consumption} previous={periodData[item].previous} onClick={() => setPeriod(item)} />)}</div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="alerts-title">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 id="alerts-title" className="font-display text-lg font-semibold">Alertas que pedem atenção</h2><p className="mt-1 text-sm text-muted-foreground">Cada desvio explica o que aconteceu e o próximo passo.</p></div><span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600">{openAnomalies.length} em aberto</span></div>
            {dataInsufficient ? <InsufficientDataState compact /> : noAnomalies ? <NormalState /> : <div className="mt-6 divide-y divide-border">{filteredAnomalies.map((anomaly) => <AlertRow key={anomaly.id} anomaly={anomaly} resolved={resolvedIds.includes(anomaly.id)} onOpen={() => setSelectedAnomaly(anomaly)} onResolve={() => toggleResolved(anomaly.id)} />)}</div>}
            {resolvedIds.length > 0 && <div className="mt-6 border-t border-border pt-5"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><CheckCircle2 className="size-4 text-primary" />Histórico de alertas resolvidos</p><div className="mt-3 flex flex-wrap gap-2">{detectedAnomalies.filter((anomaly) => resolvedIds.includes(anomaly.id)).map((anomaly) => <button key={anomaly.id} onClick={() => setSelectedAnomaly(anomaly)} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">{anomaly.title} · resolvido</button>)}</div></div>}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="opportunities-title">
            <div className="flex items-center justify-between"><div><h2 id="opportunities-title" className="font-display text-lg font-semibold">Ranking de oportunidades</h2><p className="mt-1 text-sm text-muted-foreground">Ordenado pelo potencial de economia.</p></div><Lightbulb className="size-5 text-primary" /></div>
            {dataInsufficient ? <InsufficientDataState compact /> : <div className="mt-6 space-y-4">{[...filteredAnomalies].sort((a, b) => b.surplus - a.surplus).map((anomaly, index) => { const opportunity = Math.round(anomaly.surplus * moneyPerKwh * periodMultiplier * 0.82); return <div key={anomaly.id} className="flex items-center gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary font-mono text-xs font-bold text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-medium">{anomaly.category}</span><span className="font-mono text-xs font-semibold text-primary">{formatMoney(opportunity)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(16, (opportunity / Math.max(1, potentialSavings)) * 100)}%` }} /></div></div></div> })}</div>}
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Gauge className="size-4 text-primary" />Energy Score <span className="ml-auto font-mono text-primary">{energyScore}/100</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Score simples: anomalias abertas, consumo fora do horário e variação contra a linha de base. Sem machine learning.</p></div>
          </section>
        </div>

        <footer className="flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" />Atualizado {lastUpdated}</span><span>Fator de emissão: {co2Factor} kg CO₂e/kWh</span></footer>
      </div>

      {selectedAnomaly && <AnomalyDrawer anomaly={selectedAnomaly} resolved={resolvedIds.includes(selectedAnomaly.id)} onClose={() => setSelectedAnomaly(null)} onResolve={() => toggleResolved(selectedAnomaly.id)} />}
    </>
  )
}

function DashboardLoadingState() {
  return <div className="space-y-7 p-5 lg:p-8" role="status" aria-label="Carregando dados de energia"><div className="h-9 w-72 animate-pulse rounded-xl bg-secondary" /><div className="h-28 animate-pulse rounded-2xl bg-secondary" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-secondary" />)}</div><div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><div className="h-80 animate-pulse rounded-2xl bg-secondary" /><div className="h-80 animate-pulse rounded-2xl bg-secondary" /></div><span className="sr-only">Preparando sua energia…</span></div>
}

function SummaryChip({ label, value, tone }: { label: string; value: string; tone: "good" | "warning" | "neutral" }) {
  return <div className="rounded-xl border border-border/70 bg-background/70 p-3"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 truncate text-sm font-semibold ${tone === "good" ? "text-primary" : tone === "warning" ? "text-orange-600" : "text-foreground"}`}>{value}</p></div>
}

function MetricCard({ icon: Icon, label, value, unit, change, warning }: { icon: typeof Zap; label: string; value: string; unit?: string; change: string; warning?: boolean }) {
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon className={`size-4 ${warning ? "text-orange-500" : "text-primary"}`} /></div><p className="mt-4 font-mono text-2xl font-semibold tracking-tight">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p><p className={`mt-2 flex items-center gap-1 text-xs font-medium ${warning ? "text-orange-500" : "text-primary"}`}>{warning ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{change}</p></div>
}

function EnergyChart({ points, onSelect }: { points: ChartPoint[]; onSelect: (id: string) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const maxValue = Math.max(...points.flatMap((point) => [point.actual, point.expected]), 100)
  return <div className="mt-8"><div className="relative h-56 border-b border-l border-border pl-3"><div className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[10px] text-muted-foreground"><span>{formatNumber(maxValue)} kWh</span><span>{formatNumber(maxValue * 0.75)} kWh</span><span>{formatNumber(maxValue * 0.5)} kWh</span><span>{formatNumber(maxValue * 0.25)} kWh</span><span>0 kWh</span></div><div className="absolute inset-0 ml-10 flex items-end gap-1.5 px-1">{points.map((point, index) => { const actualHeight = `${(point.actual / maxValue) * 100}%`; const expectedHeight = `${(point.expected / maxValue) * 100}%`; const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100; const y = 100 - (point.actual / maxValue) * 100; return <div key={`${point.label}-${index}`} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}><div className="absolute bottom-0 w-2/3 max-w-8 rounded-t-sm bg-primary/15" style={{ height: expectedHeight }} /><div className="absolute bottom-0 w-2/3 max-w-8 rounded-t-sm bg-primary/75 transition hover:bg-primary" style={{ height: actualHeight }} />{point.anomalyId && <button aria-label={`Abrir anomalia em ${point.time}`} onClick={() => onSelect(point.anomalyId!)} className="absolute z-10 size-4 -translate-x-1/2 rounded-full border-2 border-background bg-orange-500 shadow-[0_0_0_4px_rgb(249_115_22_/_20%)] transition hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ left: `${x}%`, top: `${y}%` }}><span className="sr-only">Alerta em {point.time}</span></button>}</div> })}</div>{hovered !== null && points[hovered] && (() => { const idx = hovered as number; const point = points[idx]; const x = points.length === 1 ? 50 : (idx / (points.length - 1)) * 100; const y = 100 - (point.actual / maxValue) * 100; const variation = point.expected > 0 ? ((point.actual - point.expected) / point.expected) * 100 : 0; return <div className="pointer-events-none absolute z-20 whitespace-nowrap rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-lg" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, calc(-100% - 10px))" }}><p className="font-semibold text-foreground">{point.label} · {point.time}</p><p className="mt-1 text-muted-foreground">Real <span className="font-mono font-semibold text-foreground">{point.actual} kWh</span></p><p className="text-muted-foreground">Esperado <span className="font-mono font-semibold text-foreground">{point.expected} kWh</span></p><p className={`mt-1 font-semibold ${variation > 0 ? "text-orange-600" : "text-primary"}`}>{variation > 0 ? "+" : ""}{formatNumber(variation, 1)}%</p></div> })()}</div><div className="ml-10 mt-3 flex justify-between gap-2 overflow-hidden text-[10px] text-muted-foreground">{points.map((point, index) => <span key={`${point.label}-axis-${index}`} className="min-w-0 flex-1 truncate text-center">{point.label}</span>)}</div><div className="mt-5 flex flex-wrap gap-5 text-xs text-muted-foreground"><span><i className="mr-2 inline-block size-2 rounded-full bg-primary/75" />Real</span><span><i className="mr-2 inline-block size-2 rounded-full bg-primary/15" />Esperado</span><span><i className="mr-2 inline-block size-2 rounded-full bg-orange-500" />Anomalia clicável</span></div></div>
}

function ImpactStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" | "good" }) {
  return <div className="rounded-xl border border-border p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className={`mt-2 font-mono text-base font-semibold ${tone === "warning" ? "text-orange-600" : tone === "good" ? "text-primary" : ""}`}>{value}</p></div>
}

function ComparisonCard({ label, current, previous, active, onClick }: { label: string; current: number; previous: number; active: boolean; onClick: () => void }) {
  const change = ((current - previous) / previous) * 100
  return <button onClick={onClick} className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${active ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{change <= 0 ? <TrendingDown className="size-4 text-primary" /> : <TrendingUp className="size-4 text-orange-500" />}</div><p className="mt-3 font-mono text-lg font-semibold">{formatNumber(current)} <span className="text-xs font-normal text-muted-foreground">kWh</span></p><p className={`mt-1 text-xs font-semibold ${change <= 0 ? "text-primary" : "text-orange-600"}`}>{change >= 0 ? "+" : ""}{formatNumber(change, 1)}% <span className="font-normal text-muted-foreground">vs. anterior</span></p></button>
}

function AlertRow({ anomaly, resolved, onOpen, onResolve }: { anomaly: Anomaly; resolved: boolean; onOpen: () => void; onResolve: () => void }) {
  return <div className={`flex flex-col gap-4 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between ${resolved ? "opacity-50" : ""}`}><button onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left"><div className={`rounded-xl bg-secondary p-2.5 ${anomaly.color}`}><AlertTriangle className="size-4" /></div><div className="min-w-0"><p className={`truncate text-sm font-semibold ${resolved ? "line-through" : ""}`}>{anomaly.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{anomaly.type} · {anomaly.time} · +{anomaly.variation}%</p></div><ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" /></button><div className="flex items-center gap-3 pl-12 sm:pl-0"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severityClasses(anomaly.severity)}`}>{anomaly.severity}</span><button onClick={onResolve} className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-secondary">{resolved ? <><Check className="mr-1 inline size-3" /> Reabrir</> : "Resolver"}</button></div></div>
}

function NormalState() {
  return <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center"><CheckCircle2 className="mx-auto size-8 text-primary" /><p className="mt-3 font-semibold">Tudo normal neste recorte</p><p className="mt-1 text-sm text-muted-foreground">Nenhuma anomalia aberta. O histórico continua disponível abaixo.</p></div>
}

function InsufficientDataState({ compact = false }: { compact?: boolean }) {
  return <div className={`${compact ? "mt-6 p-5" : "mt-8 p-8"} rounded-xl border border-dashed border-border bg-secondary/30 text-center`}><Droplets className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 font-semibold">Dados insuficientes</p><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">Não há leituras suficientes neste horário para uma conclusão confiável. Experimente ampliar o período.</p></div>
}

function AnomalyDrawer({ anomaly, resolved, onClose, onResolve }: { anomaly: Anomaly; resolved: boolean; onClose: () => void; onResolve: () => void }) {
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="anomaly-drawer-title"><button className="absolute inset-0 bg-foreground/25 backdrop-blur-[2px]" onClick={onClose} aria-label="Fechar detalhes da anomalia" /><aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"><div className="flex items-center justify-between border-b border-border p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><AlertTriangle className="size-4" />Detalhe do alerta</div><button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary" aria-label="Fechar"><X className="size-5" /></button></div><div className="flex-1 overflow-y-auto p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severityClasses(anomaly.severity)}`}>{anomaly.severity} severidade</span><h2 id="anomaly-drawer-title" className="mt-4 font-display text-2xl font-semibold tracking-tight">{anomaly.title}</h2><p className="mt-2 text-sm text-muted-foreground">{anomaly.type} · {anomaly.date} às {anomaly.time}</p></div><div className="rounded-2xl bg-primary/10 p-3 text-primary"><Clock3 className="size-5" /></div></div><div className="mt-7 grid grid-cols-2 gap-3"><ImpactStat label="Variação" value={`+${anomaly.variation}%`} tone="warning" /><ImpactStat label="Excedente" value={`${anomaly.surplus} kWh`} /></div><DrawerSection title="O que aconteceu"><p>{anomaly.impact}</p></DrawerSection><DrawerSection title="Possíveis causas"><ul className="space-y-2">{anomaly.causes.map((cause) => <li key={cause} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{cause}</li>)}</ul></DrawerSection><DrawerSection title="Recomendação"><div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-foreground"><div className="flex gap-2"><Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" /><p>{anomaly.recommendation}</p></div></div></DrawerSection></div><div className="border-t border-border p-5"><button onClick={onResolve} className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${resolved ? "border border-border bg-background hover:bg-secondary" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5"}`}>{resolved ? <><CheckCircle2 className="size-4 text-primary" /> Reabrir alerta</> : <><Check className="size-4" /> Marcar como resolvido</>}</button></div></aside></div>
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-7"><h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3><div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div></section>
}