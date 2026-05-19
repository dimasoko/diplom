export type ApiEnvelope<T> = {
  success: boolean
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = Number(value)
    if (Number.isFinite(normalized)) return normalized
  }
  return fallback
}

export function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function toLocalDateTime(value?: string | null): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getPublicOrderNumber(orderId: string | number | undefined, fallbackIndex = 1): string {
  if (typeof orderId === 'number' && Number.isFinite(orderId)) {
    return String(Math.abs(orderId) % 10000).padStart(4, '0')
  }

  const source = typeof orderId === 'string' && orderId.trim() ? orderId : `fallback-${fallbackIndex}`
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 10000
  }

  return String(hash).padStart(4, '0')
}

export const rub = new Intl.NumberFormat('ru-RU')
