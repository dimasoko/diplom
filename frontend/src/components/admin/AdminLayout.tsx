import { NavLink, Outlet } from 'react-router-dom'
import Header from '../layout/Header'
import Footer from '../layout/Footer'

const links = [
  { to: '/admin', label: 'Дашборд' },
  { to: '/admin/orders', label: 'Очередь' },
  { to: '/admin/menu', label: 'Меню' },
  { to: '/admin/users', label: 'Клиенты' },
  { to: '/admin/events', label: 'Мероприятия' },
  { to: '/admin/push', label: 'Пуш-уведомления' },
]

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-bg-surface">
      <Header />
      <div className="pt-28 lg:grid lg:grid-cols-[260px_1fr]">
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
        </aside>

        <main className="bg-bg-surface p-6">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}
