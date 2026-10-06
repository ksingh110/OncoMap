"use client"

import { useEffect } from "react"

/** Retire the legacy offline cache. Never store analysis pages or patient data. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    void (async () => {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.filter((registration) => {
          const worker = registration.active ?? registration.waiting ?? registration.installing
          return worker && new URL(worker.scriptURL).pathname === "/sw.js"
        }).map((registration) => registration.unregister()))
      }
      if ("caches" in window) {
        const names = await caches.keys()
        await Promise.all(names.filter((name) => name.startsWith("oncomap")).map((name) => caches.delete(name)))
      }
    })().catch(() => { /* Do not log browser state or request details. */ })
  }, [])
  return null
}
