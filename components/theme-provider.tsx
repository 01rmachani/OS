'use client'

import { useEffect } from 'react'

type StoredTheme = 'dark' | 'light' | 'system'

function resolveTheme(stored: StoredTheme): 'dark' | 'light' {
  if (stored === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return stored
}

function applyTheme(value: string | null) {
  const resolved = resolveTheme((value ?? 'dark') as StoredTheme)
  document.documentElement.setAttribute('data-theme', resolved)
}

// Reads the DKubeX platform theme key ("dkubex-ui-theme") from localStorage
// and keeps the app in sync when the user changes it from the platform shell.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(localStorage.getItem('dkubex-ui-theme'))

    const handler = (e: StorageEvent) => {
      if (e.key === 'dkubex-ui-theme') applyTheme(e.newValue)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return <>{children}</>
}
