"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setVisible(window.localStorage.getItem("energialerta-cookies") !== "accepted") }, [])
  if (!visible) return null
  const accept = () => { window.localStorage.setItem("energialerta-cookies", "accepted"); setVisible(false) }
  return <aside role="dialog" aria-label="Consentimento de cookies" className="fixed inset-x-4 bottom-4 z-50 animate-reveal-up rounded-2xl border border-border bg-card p-5 shadow-2xl sm:inset-x-auto sm:right-6 sm:max-w-md"><p className="text-sm font-semibold">Sua privacidade importa</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Usamos cookies necessários para manter o site seguro e cookies opcionais para melhorar sua experiência. <Link href="/cookies" className="font-medium text-primary underline underline-offset-4">Saiba mais</Link>.</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={accept} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02]">Aceitar todos</button><button onClick={accept} className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-secondary">Apenas necessários</button></div></aside>
}

export function CookieButton() { return <button onClick={() => { window.localStorage.removeItem("energialerta-cookies"); window.location.reload() }} className="text-primary underline underline-offset-4">Gerenciar cookies</button> }
