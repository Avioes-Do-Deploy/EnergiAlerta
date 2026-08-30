"use client"

import { useState } from "react"
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  RotateCcw,
  ShieldAlert,
  TriangleAlert,
  Zap,
} from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"

type Severity = "critica" | "media" | "leve"

interface Anomaly {
  id: number
  equipamento: string
  descricao: string
  severidade: Severity
  consumo: string
  horario: string
  resolvida: boolean
}

const initialAnomalies: Anomaly[] = [
  {
    id: 1,
    equipamento: "Ar-condicionado fora do padrão",
    descricao: "Consumo 12,4 kWh acima do esperado para o horário.",
    severidade: "critica",
    consumo: "+12,4 kWh",
    horario: "Hoje · 08:40",
    resolvida: false,
  },
  {
    id: 2,
    equipamento: "Pico de demanda às 14h",
    descricao: "Demanda 8,1 kWh acima da linha de base no período da tarde.",
    severidade: "media",
    consumo: "+8,1 kWh",
    horario: "Hoje · 14:00",
    resolvida: false,
  },
  {
    id: 3,
    equipamento: "Motor da bomba d'água",
    descricao: "Funcionamento contínuo fora da janela programada.",
    severidade: "critica",
    consumo: "+15,7 kWh",
    horario: "Ontem · 06:15",
    resolvida: false,
  },
  {
    id: 4,
    equipamento: "Iluminação do galpão",
    descricao: "Luminárias acesas além do expediente.",
    severidade: "leve",
    consumo: "+3,2 kWh",
    horario: "Ontem · 19:30",
    resolvida: false,
  },
  {
    id: 5,
    equipamento: "Servidor do datacenter",
    descricao: "Refrigeração extra ligada durante a madrugada.",
    severidade: "media",
    consumo: "+6,8 kWh",
    horario: "Segunda · 22:10",
    resolvida: true,
  },
  {
    id: 6,
    equipamento: "Refrigerador da copa",
    descricao: "Porta entreaberta aumentando o ciclo do compressor.",
    severidade: "leve",
    consumo: "+2,1 kWh",
    horario: "Domingo · 09:00",
    resolvida: true,
  },
]

const severityStyles: Record<Severity, string> = {
  critica: "bg-red-500/10 text-red-500",
  media: "bg-amber-500/10 text-amber-600",
  leve: "bg-blue-500/10 text-blue-600",
}

const severityLabel: Record<Severity, string> = {
  critica: "Crítica",
  media: "Média",
  leve: "Leve",
}

const filters = [
  { value: "todas", label: "Todas" },
  { value: "critica", label: "Críticas" },
  { value: "media", label: "Médias" },
  { value: "leve", label: "Leves" },
] as const

export function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState(initialAnomalies)
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("todas")

  const open = anomalies.filter((a) => !a.resolvida)
  const resolved = anomalies.filter((a) => a.resolvida)
  const visible = anomalies.filter(
    (a) => filter === "todas" || a.severidade === filter,
  )

  function toggleResolved(id: number) {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolvida: !a.resolvida } : a)),
    )
  }

  return (
    <DashboardShell>
      <div className="space-y-8 p-5 lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Monitoramento
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Anomalias
          </h1>
          <p className="mt-2 text-muted-foreground">
            Investigue os desvios antes que virem custos.
          </p>
        </div>

        {/* Métricas */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Anomalias abertas
              </p>
              <TriangleAlert className="size-4 text-orange-500" />
            </div>
            <p className="mt-4 font-mono text-2xl font-semibold tracking-tight">
              {String(open.length).padStart(2, "0")}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Resolvidas
              </p>
              <CheckCircle2 className="size-4 text-primary" />
            </div>
            <p className="mt-4 font-mono text-2xl font-semibold tracking-tight">
              {String(resolved.length).padStart(2, "0")}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Impacto estimado
              </p>
              <Zap className="size-4 text-primary" />
            </div>
            <p className="mt-4 font-mono text-2xl font-semibold tracking-tight">
              R$ 340<span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
        </div>

        {/* Filtro */}
        <div
          className="flex flex-wrap gap-1 rounded-xl border border-border bg-secondary/50 p-1"
          role="group"
          aria-label="Filtrar por severidade"
        >
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                filter === f.value
                  ? "bg-background font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-4">
          {visible.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`rounded-2xl border bg-card p-5 transition sm:p-6 ${
                anomaly.resolvida ? "border-border opacity-70" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      anomaly.resolvida
                        ? "bg-primary/10 text-primary"
                        : "bg-orange-500/10 text-orange-500"
                    }`}
                  >
                    {anomaly.resolvida ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <ShieldAlert className="size-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-semibold">
                        {anomaly.equipamento}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityStyles[anomaly.severidade]}`}
                      >
                        {severityLabel[anomaly.severidade]}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          anomaly.resolvida
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {anomaly.resolvida ? "Resolvida" : "Aberta"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {anomaly.descricao}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-mono font-medium text-foreground">
                        <Zap className="size-3.5 text-primary" />
                        {anomaly.consumo}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {anomaly.horario}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant={anomaly.resolvida ? "outline" : "default"}
                  onClick={() => toggleResolved(anomaly.id)}
                >
                  {anomaly.resolvida ? (
                    <>
                      <RotateCcw className="size-4" />
                      Reabrir
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Resolver
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <CircleDashed className="size-8 text-muted-foreground" />
              <p className="font-medium">Nenhuma anomalia neste filtro</p>
              <p className="text-sm text-muted-foreground">
                Tudo sob controle por aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}