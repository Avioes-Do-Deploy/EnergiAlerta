"use client"

import { useState } from "react"
import { Check, Download, FileBarChart, FileSpreadsheet, FileText } from "lucide-react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"

interface Report {
  id: number
  titulo: string
  descricao: string
  periodo: string
  formato: "PDF" | "XLSX" | "CSV"
  tamanho: string
}

const reports: Report[] = [
  {
    id: 1,
    titulo: "Relatório de consumo",
    descricao: "Consumo mensal por equipamento, com comparativo ao mês anterior.",
    periodo: "Agosto 2026",
    formato: "PDF",
    tamanho: "2,4 MB",
  },
  {
    id: 2,
    titulo: "Comparativo de eficiência",
    descricao: "Evolução do Energy Score e eficiência média no trimestre.",
    periodo: "Q3 2026",
    formato: "PDF",
    tamanho: "1,8 MB",
  },
  {
    id: 3,
    titulo: "Resumo financeiro de energia",
    descricao: "Custos por unidade, tarifas aplicadas e projeção de gastos.",
    periodo: "Agosto 2026",
    formato: "XLSX",
    tamanho: "890 KB",
  },
  {
    id: 4,
    titulo: "Análise de anomalias",
    descricao: "Desvios detectados, severidade e impacto estimado no período.",
    periodo: "Julho 2026",
    formato: "PDF",
    tamanho: "1,2 MB",
  },
  {
    id: 5,
    titulo: "Histórico de tarifas",
    descricao: "Série histórica de tarifas de energia por bandeira.",
    periodo: "2026",
    formato: "CSV",
    tamanho: "340 KB",
  },
  {
    id: 6,
    titulo: "Relatório de sustentabilidade",
    descricao: "Redução de consumo e emissões evitadas no semestre.",
    periodo: "1º semestre 2026",
    formato: "PDF",
    tamanho: "3,1 MB",
  },
]

const formatIcon = {
  PDF: FileText,
  XLSX: FileSpreadsheet,
  CSV: FileText,
}

export function ReportsPage() {
  const [downloaded, setDownloaded] = useState<number[]>([])

  function handleDownload(id: number) {
    if (!downloaded.includes(id)) {
      setDownloaded((prev) => [...prev, id])
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-8 p-5 lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Inteligência
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Relatórios
          </h1>
          <p className="mt-2 text-muted-foreground">
            Seus dados de energia organizados para decisões melhores.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => {
            const Icon = formatIcon[report.formato]
            const isDownloaded = downloaded.includes(report.id)
            return (
              <div
                key={report.id}
                className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {report.formato} · {report.tamanho}
                  </span>
                </div>
                <h2 className="mt-6 font-display font-semibold">{report.titulo}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {report.descricao}
                </p>
                <p className="mt-4 text-xs font-medium text-muted-foreground">
                  Período: {report.periodo}
                </p>
                <Button
                  variant={isDownloaded ? "outline" : "default"}
                  className="mt-5 w-full"
                  onClick={() => handleDownload(report.id)}
                >
                  {isDownloaded ? (
                    <>
                      <Check className="size-4" />
                      Baixado
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      Baixar
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <FileBarChart className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm leading-5 text-muted-foreground">
            Os downloads são simulados nesta demonstração — na versão final, os
            arquivos serão gerados a partir dos dados reais da sua central.
          </p>
        </div>
      </div>
    </DashboardShell>
  )
}