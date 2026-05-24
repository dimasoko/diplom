import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { extractRole } from '../../utils/role'
import TileGridPattern from './TileGridPattern'

const marqueeText = 'we are BASE coffee -  варим классный кофе'

const baseColumns = [
  {
    title: 'Соцсети',
    links: [
      { to: '#', label: 'Telegram' },
      { to: '#', label: 'VK' },
      { to: '#', label: 'Instagram' },
    ],
  },
  {
    title: 'Навигация',
    links: [
      { to: '/', label: 'Главная' },
      { to: '/menu', label: 'Меню' },
      { to: '/events', label: 'События' },
    ],
  },
  {
    title: 'Документы',
    links: [
      { to: '/privacy', label: 'Политика конфиденциальности' },
      { to: '#', label: 'Пользовательское соглашение' },
      { to: '#', label: 'Оферта' },
    ],
  },
]

export default function Footer() {
  const user = useAuthStore((state) => state.user as Record<string, unknown> | null)
  const role = extractRole(user)
  const isAdmin = role === 'ADMIN' || role === 'STAFF'

  const userColumn = isAdmin
    ? {
        title: 'Админ',
        links: [{ to: '/admin', label: 'Админ-панель' }],
      }
    : {
        title: 'Пользователь',
        links: [
          { to: '/auth/login', label: 'Вход' },
          { to: '/auth/register', label: 'Регистрация' },
          { to: '/profile', label: 'Профиль' },
        ],
      }

  const footerColumns = [baseColumns[0], baseColumns[1], userColumn, baseColumns[2]]

  return (
    <footer className="mt-10">
      <TileGridPattern>
        <div className="overflow-hidden border-y border-primary/20 bg-white/80 py-4 backdrop-blur-sm">
          <div className="marquee-track flex whitespace-nowrap">
            <span className="px-8 font-display text-3xl text-primary">{marqueeText}</span>
            <span className="px-8 font-display text-3xl text-primary">{marqueeText}</span>
            <span className="px-8 font-display text-3xl text-primary">{marqueeText}</span>
            <span className="px-8 font-display text-3xl text-primary">{marqueeText}</span>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 md:grid-cols-2 xl:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title} className="rounded-2xl bg-white p-6">
              <h3 className="mb-4 text-base font-semibold text-text-main">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link to={link.to} className="text-sm text-text-main/80 transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </TileGridPattern>
    </footer>
  )
}
