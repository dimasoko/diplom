import { Route, Routes } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ProfileAccessRedirect from './components/auth/ProfileAccessRedirect'
import AdminLayout from './components/admin/AdminLayout'
import { useAuthStore } from './store/authStore'
import Home from './pages/public/Home'
import Menu from './pages/public/Menu'
import Events from './pages/public/Events'
import Privacy from './pages/public/Privacy'
import About from './pages/public/About'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Profile from './pages/profile/Profile'
import AuthMenu from './pages/auth/AuthMenu'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrdersQueue from './pages/admin/AdminOrdersQueue'
import AdminMenu from './pages/admin/AdminMenu'
import AdminUsers from './pages/admin/AdminUsers'
import AdminEvents from './pages/admin/AdminEvents'
import AdminPush from './pages/admin/AdminPush'
import { extractRole } from './utils/role'

export default function App() {
  const user = useAuthStore((state) => state.user as Record<string, unknown> | null)
  const role = extractRole(user)
  const isAdmin = role === 'ADMIN' || role === 'STAFF'

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={user && !isAdmin ? <AuthMenu /> : <Menu />} />
        <Route path="/events" element={<Events />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/profile" element={isAdmin ? <Navigate to="/admin" replace /> : user ? <Profile /> : <ProfileAccessRedirect />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrdersQueue />} />
          <Route path="menu" element={<AdminMenu />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="push" element={<AdminPush />} />
        </Route>
      </Route>
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />
    </Routes>
  )
}
