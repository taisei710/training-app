import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.__pwaInstallEvent ?? null)

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      window.__pwaInstallEvent = e
      setDeferredPrompt(e)
    }
    const onInstalled = () => {
      window.__pwaInstallEvent = null
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      window.__pwaInstallEvent = null
      setDeferredPrompt(null)
    }
  }

  return { canInstall: !!deferredPrompt, install }
}
