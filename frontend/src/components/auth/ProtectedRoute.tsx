import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

type Role = 'ADMIN' | 'STAFF'

function extractRole(user: Record<string, unknown> | null): string {
  if (!user) return ''
  const role = user.role
  if (typeof role !== 'string') return ''
  return role.toUpperCase()
}

export default function ProtectedRoute() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user as Record<string, unknown> | null)

  const role = extractRole(user)
  const allowed: Role[] = ['ADMIN', 'STAFF']

  if (!user || !allowed.includes(role as Role)) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <Outlet />
}
