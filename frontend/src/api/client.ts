import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosRequestHeaders,
} from 'axios'
import { useAuthStore } from '../store/authStore'

type ApiEnvelope<T = unknown> = {
  success: boolean
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
}

type RefreshData = {
  accessToken?: string
  user?: unknown
}

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

let refreshPromise: Promise<string | null> | null = null

const getRefreshToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiEnvelope<RefreshData>>('/auth/refresh')
      .then((response) => {
        const payload = response.data?.data
        const nextAccessToken = payload?.accessToken ?? null

        if (nextAccessToken) {
          useAuthStore.getState().setAuth({
            user: payload?.user ?? useAuthStore.getState().user,
            accessToken: nextAccessToken,
          })
        } else {
          useAuthStore.getState().clearAuth()
        }

        return nextAccessToken
      })
      .catch(() => {
        useAuthStore.getState().clearAuth()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()

  if (accessToken) {
    const headers = (config.headers ?? {}) as AxiosRequestHeaders
    headers.Authorization = `Bearer ${accessToken}`
    config.headers = headers
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined

    if (!originalRequest || originalRequest._retry || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    const nextAccessToken = await getRefreshToken()

    if (!nextAccessToken) {
      return Promise.reject(error)
    }

    const headers = (originalRequest.headers ?? {}) as AxiosRequestHeaders
    headers.Authorization = `Bearer ${nextAccessToken}`
    originalRequest.headers = headers

    return apiClient(originalRequest)
  },
)
