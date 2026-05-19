import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useCartStore } from './cartStore'

type AuthUser = Record<string, unknown> | null

type AuthState = {
  user: AuthUser
  accessToken: string | null
  setAuth: (payload: { user: AuthUser; accessToken: string }) => void
  clearAuth: () => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: ({ user, accessToken }) => set({ user, accessToken }),
      clearAuth: () => set({ user: null, accessToken: null }),
      logout: async () => {
        try {
          await fetch('/api/v1/auth/logout', {
            method: 'POST',
            credentials: 'include',
          })
        } catch {
          // ignore network/logout endpoint errors and still clear client state
        }
        useCartStore.getState().clearCart()
        set({ user: null, accessToken: null })
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    },
  ),
)
