import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useScrollStore } from '../../store/useScrollStore'
import AnimatedLogo from './AnimatedLogo'
import { extractRole } from '../../utils/role'

const linksBase = [
  { to: '/', label: 'Главная' },
  { to: '/menu', label: 'Меню' },
  { to: '/events', label: 'Мероприятия' },
  { to: '/about', label: 'О нас' },
]

export default function Header() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const role = extractRole(user as Record<string, unknown> | null)
  const isAdmin = role === 'ADMIN' || role === 'STAFF'
  const scrollProgress = useScrollStore((state) => state.scrollProgress)
  const scrollY = useScrollStore((state) => state.scrollY)
  const isHome = location.pathname === '/'
  const progress = isHome ? scrollProgress : 1
  const [mobileOpen, setMobileOpen] = useState(false)

  const headerHeight = 86
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900
  const startTop = isHome ? Math.max(viewportHeight - headerHeight, 0) : 0
  const currentTop = isHome ? Math.max(startTop - scrollY, 0) : 0
  const dockProgress = startTop > 0 ? 1 - currentTop / startTop : 1
  const surfaceProgress = Math.min(Math.max((progress - 0.08) / 0.92, 0), 1)
  const centerGap = 124 - Math.round(dockProgress * 10)

  const lastLink = user ? (isAdmin ? { to: '/admin', label: 'Админ-панель' } : { to: '/profile', label: 'Профиль' }) : { to: '/auth/login', label: 'Вход' }
  const leftLinks = linksBase.slice(0, 2)
  const rightLinks = [...linksBase.slice(2), lastLink]
  const cartMobileLink = user && !isAdmin ? [{ to: `${location.pathname}?cart=1`, label: 'Корзина', isCart: true }] : []
  const allMobileLinks = [...linksBase, ...cartMobileLink, lastLink]

  return (
    <>
      <div className="hidden lg:block">
        <AnimatedLogo />
      </div>

      <header
        className="fixed left-0 z-50 hidden w-full lg:block"
        style={{
          top: `${currentTop}px`,
          height: `${headerHeight}px`,
          backgroundColor: `rgba(255,255,255,${0.1 + surfaceProgress * 0.86})`,
          backdropFilter: `blur(${surfaceProgress * 8}px)`,
          WebkitBackdropFilter: `blur(${surfaceProgress * 8}px)`,
          borderBottom: `1px solid rgba(26,26,26,${surfaceProgress * 0.08})`,
          willChange: 'top',
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-6xl items-center px-4">
          <div className="flex h-[52px] w-full items-center" style={{ color: `rgba(26,26,26,${0.68 + surfaceProgress * 0.3})` }}>
            <nav className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
              <div className="flex items-center justify-start gap-3 sm:gap-6">
                {leftLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `text-[13px] font-normal uppercase tracking-[0.06em] transition-colors ${
                        isActive ? 'text-primary' : 'hover:text-text-main'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>

              <div style={{ width: `${centerGap}px` }} />

              <div className="flex items-center justify-end gap-3 sm:gap-6">
                {rightLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `text-[13px] font-normal uppercase tracking-[0.06em] transition-colors ${
                        isActive ? 'text-primary' : 'hover:text-text-main'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="fixed inset-x-0 bottom-0 z-[72] lg:hidden">
        <div className={`mx-2 mb-2 rounded-2xl bg-white/95 shadow-sm backdrop-blur ${mobileOpen ? 'border border-primary/50' : 'border border-white/70'}`}>
          {mobileOpen ? (
            <nav className="grid gap-1 p-3">
              {allMobileLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    link.label === 'Корзина'
                      ? 'rounded-xl border border-primary px-3 py-2 text-sm text-primary transition-colors hover:bg-bg-surface'
                      : `rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-primary text-white' : 'text-text-main hover:bg-bg-surface'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          ) : null}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-lg font-medium text-text-main"
          >
            <img src="/assets/base-logo.jpg" alt="we are BASE" className="h-12 w-20 object-contain" />
            <span>{mobileOpen ? '×' : '☰'}</span>
          </button>
        </div>
      </div>
    </>
  )
}

