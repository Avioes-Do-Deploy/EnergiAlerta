"use client"

import { useState } from "react"
import { Bell, Check, Monitor, Moon, Palette, Sun, UserRound, Zap } from "lucide-react"
import { useTheme } from "next-themes"
import { DashboardShell } from "@/components/dashboard-shell"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const themes = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const

const alertOptions = [
  {
    id: "anomalia",
    title: "Anomalia crítica detectada",
    description: "Notifique quando o consumo apresentar picos anormais ou falhas no fornecimento.",
  },
  {
    id: "relatorio",
    title: "Relatório mensal pronto",
    description: "Avise quando o relatório de consumo do mês estiver disponível.",
  },
  {
    id: "recomendacao",
    title: "Recomendações de economia",
    description: "Envie sugestões de redução de consumo quando houver oportunidade.",
  },
] as const

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="divide-y divide-border rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [alerts, setAlerts] = useState<Record<string, boolean>>({
    anomalia: true,
    relatorio: true,
    recomendacao: false,
  })
  const [limits, setLimits] = useState({ limite: "350", tarifa: "0,79", pico: "18h – 21h" })
  const [account, setAccount] = useState({
    nome: "Rafael Almeida",
    email: "rafael@energialerta.com.br",
  })
  const [savedSection, setSavedSection] = useState<"limites" | "conta" | null>(null)

  function handleSave(section: "limites" | "conta") {
    setSavedSection(section)
    window.setTimeout(() => setSavedSection(null), 2500)
  }

  return (
    <DashboardShell>
      <div className="space-y-8 p-5 lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Preferências
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Configurações
          </h1>
          <p className="mt-2 text-muted-foreground">
            Personalize a experiência da sua central de energia.
          </p>
        </div>

        <div className="space-y-6">
          {/* Aparência */}
          <SectionCard
            icon={<Palette className="size-5" />}
            title="Aparência"
            description="Escolha como o EnergiAlerta aparece para você."
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">Tema da interface</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sistema acompanha a preferência do seu dispositivo.
                </p>
              </div>
              <div
                className="flex rounded-xl border border-border bg-secondary/50 p-1"
                role="group"
                aria-label="Escolher tema"
              >
                {themes.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      theme === value
                        ? "bg-background font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Preferências de alertas */}
          <SectionCard
            icon={<Bell className="size-5" />}
            title="Preferências de alertas"
            description="Controle quais notificações você recebe da central."
          >
            <ul className="space-y-5">
              {alertOptions.map((option) => (
                <li
                  key={option.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium">{option.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  <Switch
                    checked={alerts[option.id]}
                    onCheckedChange={(checked) =>
                      setAlerts((prev) => ({ ...prev, [option.id]: checked }))
                    }
                  />
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Limites & tarifa */}
          <SectionCard
            icon={<Zap className="size-5" />}
            title="Limites & tarifa"
            description="Ajuste os parâmetros usados nas análises de consumo."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Limite mensal de consumo (kWh)
                </span>
                <Input
                  type="number"
                  min={0}
                  value={limits.limite}
                  onChange={(e) =>
                    setLimits((prev) => ({ ...prev, limite: e.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Tarifa de energia (R$/kWh)
                </span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={limits.tarifa}
                  onChange={(e) =>
                    setLimits((prev) => ({ ...prev, tarifa: e.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Horário de pico
                </span>
                <Select
                  value={limits.pico}
                  onValueChange={(pico) =>
                    setLimits((prev) => ({ ...prev, pico }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="17h – 20h">17h – 20h</SelectItem>
                    <SelectItem value="18h – 21h">18h – 21h</SelectItem>
                    <SelectItem value="19h – 22h">19h – 22h</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button variant="default" onClick={() => handleSave("limites")}>
                {savedSection === "limites" ? (
                  <>
                    <Check className="size-4" />
                    Salvo
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
              {savedSection === "limites" && (
                <p className="text-sm text-muted-foreground">
                  Parâmetros atualizados com sucesso.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Conta */}
          <SectionCard
            icon={<UserRound className="size-5" />}
            title="Conta"
            description="Suas informações de perfil na central."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Nome</span>
                <Input
                  value={account.nome}
                  onChange={(e) =>
                    setAccount((prev) => ({ ...prev, nome: e.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">E-mail</span>
                <Input
                  type="email"
                  value={account.email}
                  onChange={(e) =>
                    setAccount((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </label>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button variant="default" onClick={() => handleSave("conta")}>
                {savedSection === "conta" ? (
                  <>
                    <Check className="size-4" />
                    Salvo
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
              {savedSection === "conta" && (
                <p className="text-sm text-muted-foreground">
                  Dados atualizados com sucesso.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </DashboardShell>
  )
}