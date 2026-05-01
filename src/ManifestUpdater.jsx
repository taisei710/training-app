import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ManifestUpdater() {
  const location = useLocation()

  useEffect(() => {
    const isAdmin = location.pathname.startsWith('/admin')

    let link = document.querySelector('link[rel="manifest"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    link.href = isAdmin ? '/manifest-admin.json' : '/manifest-trainee.json'

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) metaTheme.content = isAdmin ? '#1e3a8a' : '#1a56db'

    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]')
    if (appleIcon) appleIcon.href = isAdmin ? '/admin-pwa-192x192.png' : '/trainee-pwa-192x192.png'

    const metaAppleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (metaAppleTitle) metaAppleTitle.content = isAdmin ? '研修管理' : '研修生'
  }, [location.pathname])

  return null
}
