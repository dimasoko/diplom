import { Link } from 'react-router-dom'
import TileGridPattern from './TileGridPattern'

const marqueeText = 'we are BASE coffee -  \u0432\u0430\u0440\u0438\u043c \u043a\u043b\u0430\u0441\u0441\u043d\u044b\u0439 \u043a\u043e\u0444\u0435'

const footerColumns = [
  {
    title: '\u0421\u043e\u0446\u0441\u0435\u0442\u0438',
    links: [
      { to: '#', label: 'Telegram' },
      { to: '#', label: 'VK' },
      { to: '#', label: 'Instagram' },
    ],
  },
  {
    title: '\u041d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f',
    links: [
      { to: '/', label: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f' },
      { to: '/menu', label: '\u041c\u0435\u043d\u044e' },
      { to: '/events', label: '\u0421\u043e\u0431\u044b\u0442\u0438\u044f' },
    ],
  },
  {
    title: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c',
    links: [
      { to: '/auth/login', label: '\u0412\u0445\u043e\u0434' },
      { to: '/auth/register', label: '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f' },
      { to: '/profile', label: '\u041f\u0440\u043e\u0444\u0438\u043b\u044c' },
    ],
  },
  {
    title: '\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b',
    links: [
      { to: '/privacy', label: '\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438' },
      { to: '#', label: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u0441\u043a\u043e\u0435 \u0441\u043e\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u0435' },
      { to: '#', label: '\u041e\u0444\u0435\u0440\u0442\u0430' },
    ],
  },
]

export default function Footer() {
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
