"use client"

import { useState } from "react"
import {
  CheckCircle2,
  CircleDashed,
  Lightbulb,
  PiggyBank,
  TrendingDown,
  Zap,
} from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"

type Priority = "alta" | "media" | "baixa"

interface Recommendation {
  id: number
  titulo: string
  descricao: string
  prioridade: Priority
  economia: string
  energia: string
  aplicada: boolean
}

const initialRecommendations: Recommendation[] = [
  {
    id: 1,
    titulo: "Ajustar temperatura do ar-condicionado",
    descricao: "Elevar o setpoint de 20 °C para 23 °C reduz o consumo do sistema de climatização.",
    prioridade: "alta",
    economia: "R$ 180/mês",
    energia: "42 kWh/mês",
    aplicada: false,
  },
  {
    id: 2,
    titulo: "Reprogramar iluminação do galpão",
    descricao: "Desligar luminárias automaticamente após o expediente.",
    prioridade: "alta",
    economia: "R$ 95/mês",
    energia: "28 kWh/mês",
    aplicada: false,
  },
  {
    id: 3,
    titulo: "Avaliar tarifa no horário de ponta",
    descricao: "Transferir cargas flexíveis para fora do horário de pico (18h–21h).",
    prioridade: "media",
    economia: "R$ 120/mês",
    energia: "—",
    aplicada: false,
  },
  {
    id: 4,
    titulo: "Instalar sensores de presença na copa",
    descricao: "Iluminação acende apenas com ocupação do ambiente.",
    prioridade: "media",
    economia: "R$ 45/mês",
    energia: "12 kWh/mês",
    aplicada: true,
  },
  {
    id: 5,
    titulo: "Substituir lâmpadas por LED",
    descricao: "Trocar as últimas fluorescentes por LED de alta eficiência.",
    prioridade: "baixa",
    economia: "R$ 30/mês",
    energia: "9 kWh/mês",
    aplicada: false,
  },
  {
    id: 6,
    titulo: "Desligar equipamentos em standby",
    descricao: "Cortar o standby de impressoras e monitores fora do horário.",
    prioridade: "baixa",
    economia: "R$ 22/mês",
    energia: "6 kWh/mês",
    aplicada: true,
  },
]

const priorityStyles: Record<Priority, string> = {
  alta: "bg-red-500/10 text-red-500",
  media: "bg-amber-500/10 text-amber-600",
  baixa: "bg-blue-500/10 text-blue-600",
}

const priorityLabel: Record<Priority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
}

export function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState(initialRecommendations)

  const pending = recommendations.filter((r) => !r.aplicada)
  const totalEconomy = pending.reduce((acc, r) => {
    const match = r.economia.match(/([\d.]+)/)
    return acc + (match ? Number(match[1].replace(".", "")) : 0)
  }, 0)

  function toggleApplied(id: number) {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, aplicada: !r.aplicada } : r)),
    )
  }

  return (
    <DashboardShell>
      <div className="space-y-8 p-5 lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Próximas ações
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Recomendações
          </h1>
          <p className="mt-2 text-muted-foreground">
            Ações práticas para tornar sua operação mais eficiente.
          </p>
        </div>

        {/* Resumo */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Economia potencial
              </p>
              <PiggyBank className="size-4 text-primary" />
            </div>
            <p className="mt-4 font-mono text-2xl font-semibold tracking-tight">
              R$ {totalEconomy}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Pendentes
              </p>
              <Lightbulb className="size-4 text-primary" />
            </div>
            <p className="mt-4 font-mono text-2xl font-semibold tracking-tight">
              {String(pending.length).padStart(2, "0")}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Redução estimada
              </p>
              <TrendingDown className="size-4 text-primary" />
            </div>
            <p className="mt-4 font-mono text-2xl font-semibold tracking-tight">
              4,1<span className="text-sm font-normal text-muted-foreground">%</span>
            </p>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`rounded-2xl border bg-card p-5 transition sm:p-6 ${
                rec.aplicada ? "border-border opacity-70" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      rec.aplicada
                        ? "bg-primary/10 text-primary"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {rec.aplicada ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <Lightbulb className="size-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-semibold">{rec.titulo}</h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityStyles[rec.prioridade]}`}
                      >
                        Prioridade {priorityLabel[rec.prioridade]}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          rec.aplicada
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {rec.aplicada ? "Aplicada" : "Pendente"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rec.descricao}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-mono font-medium text-foreground">
                        <PiggyBank className="size-3.5 text-primary" />
                        {rec.economia}
                      </span>
                      {rec.energia !== "—" && (
                        <span className="flex items-center gap-1.5">
                          <Zap className="size-3.5" />
                          {rec.energia}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant={rec.aplicada ? "outline" : "default"}
                  onClick={() => toggleApplied(rec.id)}
                >
                  {rec.aplicada ? (
                    "Reverter"
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Marcar como aplicada
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
          {recommendations.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <CircleDashed className="size-8 text-muted-foreground" />
              <p className="font-medium">Nenhuma recomendação disponível</p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}