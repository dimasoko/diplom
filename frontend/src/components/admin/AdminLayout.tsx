import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from 'rizzui'
import { useAuthStore } from '../../store/authStore'

const links = [
  { to: '/admin', label: 'Дашборд' },
  { to: '/admin/orders', label: 'Очередь' },
  { to: '/admin/menu', label: 'Меню' },
  { to: '/admin/users', label: 'Клиенты' },
  { to: '/admin/events', label: 'Мероприятия' },
  { to: '/admin/push', label: 'Пуш-уведомления' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    await logout()
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg-surface">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="bg-[#1A1A1A] px-5 py-6 text-white">
          <h1 className="mb-8 font-display text-3xl">we are BASE</h1>

          <nav className="grid gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin'}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.06em] transition-colors ${
                    isActive ? 'bg-primary text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="mt-8 w-full border-white/40 text-white hover:bg-white/10"
          >
            Выйти
          </Button>
        </aside>

        <main className="bg-bg-surface p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
