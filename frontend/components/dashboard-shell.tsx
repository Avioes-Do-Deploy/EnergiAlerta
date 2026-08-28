"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, ChevronRight, FileBarChart, Gauge, Lightbulb, Menu, Settings, TriangleAlert, X } from "lucide-react"
import { useState } from "react"

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: Gauge },
  { href: "/anomalias", label: "Anomalias", icon: TriangleAlert },
  { href: "/recomendacoes", label: "Recomendações", icon: Lightbulb },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-4">
            <button className="rounded-xl p-2 text-muted-foreground transition hover:bg-secondary lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
            <Link href="/" className="group flex items-center gap-2">
              <Image src="/energialerta-logo.png" alt="EnergiAlerta" width={220} height={72} className="h-12 w-auto object-contain object-left transition duration-300 group-hover:scale-[1.02] dark:brightness-0 dark:invert" priority />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-xl p-2.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Notificações"><Bell className="size-4" /></button>
            <div className="ml-2 hidden h-8 w-px bg-border sm:block" />
            <div className="hidden items-center gap-3 pl-3 sm:flex"><div className="text-right"><p className="text-sm font-medium">Rafael Silva</p><p className="text-xs text-muted-foreground">Administrador</p></div><div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">RS</div></div>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-16 left-0 z-30 w-64 border-r border-border bg-background p-4 transition-transform lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0`}>
          <nav className="flex flex-col gap-1" aria-label="Navegação principal">{navigation.map(({ href, label, icon: Icon }) => { const active = pathname === href; return <Link key={href} href={href} onClick={() => setOpen(false)} className={`group flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><span className="flex items-center gap-3"><Icon className="size-4" />{label}</span>{active && <ChevronRight className="size-4" />}</Link> })}</nav>
          <div className="mt-auto hidden rounded-2xl border border-primary/20 bg-primary/5 p-4 lg:block"><p className="text-xs font-semibold text-primary">Eficiência energética</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Sua operação está 12% mais eficiente este mês.</p></div>
        </aside>
        {open && <button className="fixed inset-0 z-20 bg-foreground/20 lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
