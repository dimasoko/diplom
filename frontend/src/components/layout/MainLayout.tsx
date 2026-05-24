import { Link, Outlet, useLocation } from 'react-router-dom'
import { ActionIcon } from 'rizzui'
import Header from './Header'
import Footer from './Footer'
import ScrollToTop from './ScrollToTop'
import { useAuthStore } from '../../store/authStore'
import CartDrawer from '../cart/CartDrawer'
import { uiFlags } from '../../config/ui'
import { extractRole } from '../../utils/role'

export default function MainLayout() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const role = extractRole(user as Record<string, unknown> | null)
  const isAdmin = role === 'ADMIN' || role === 'STAFF'
  const isHome = location.pathname === '/'
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false
  const isAuthorizedUser = !isAdmin && user !== null && typeof accessToken === 'string' && accessToken.length > 0

  return (
    <div className="min-h-screen bg-bg-base text-text-main">
      <ScrollToTop />
      <Header />
      <main className={isHome ? 'w-full pb-20 pt-0' : 'mx-auto w-full max-w-6xl px-4 pb-20 pt-0'}>
        <Outlet />
      </main>
      <Footer />
      {isAuthorizedUser ? <CartDrawer /> : null}

      {user === null && uiFlags.guestMenuFabEnabled && !isMobile ? (
        <Link to="/menu" className="fixed bottom-6 right-6 z-40">
          <ActionIcon
            as="span"
            size="xl"
            rounded="full"
            aria-label="Меню"
            className="h-14 w-14 border-0 bg-primary text-white shadow-lg hover:bg-primary/90"
          >
            {'Меню'}
          </ActionIcon>
        </Link>
      ) : null}
    </div>
  )
}
