import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Loader } from 'rizzui'
import { apiClient } from '../../api/client'
import { ApiEnvelope, getPublicOrderNumber, toLocalDateTime, toString } from './shared'

type QueueStatus = 'PENDING' | 'ACCEPTED' | 'BREWING' | 'READY' | 'ISSUED'

type RawAddon = { name?: unknown }
type RawQueueItem = {
  id?: unknown
  quantity?: unknown
  size?: unknown
  menu_item_name?: unknown
  name?: unknown
  menuItem?: { name?: unknown } | null
  addons?: unknown
}

type RawQueueOrder = {
  id?: unknown
  status?: unknown
  pickup_time?: unknown
  customer_name?: unknown
  user_name?: unknown
  user?: { name?: unknown } | null
  items?: unknown
}

type QueueItem = {
  name: string
  size: string
  quantity: number
  addons: string[]
}

type QueueOrder = {
  id: string
  status: QueueStatus
  pickupTime: string | null
  customerName: string
  items: QueueItem[]
}

const columns: Array<{ title: string; status: QueueStatus }> = [
  { title: 'Новые', status: 'PENDING' },
  { title: 'Приняты', status: 'ACCEPTED' },
  { title: 'Готовятся', status: 'BREWING' },
  { title: 'Готовы', status: 'READY' },
]

const nextStatusMap: Record<QueueStatus, QueueStatus | null> = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'BREWING',
  BREWING: 'READY',
  READY: 'ISSUED',
  ISSUED: null,
}

const actionLabel: Record<Exclude<QueueStatus, 'ISSUED'>, string> = {
  PENDING: 'Принять',
  ACCEPTED: 'В работу',
  BREWING: 'Отметить готовым',
  READY: 'Выдать',
}

function normalizeAddons(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') return toString((item as RawAddon).name, '')
      return ''
    })
    .filter(Boolean)
}

function normalizeItems(value: unknown): QueueItem[] {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    const raw = item as RawQueueItem
    return {
      name: toString(raw.menu_item_name) || toString(raw.name) || toString(raw.menuItem?.name) || 'Позиция',
      size: toString(raw.size, '-'),
      quantity: typeof raw.quantity === 'number' ? raw.quantity : 1,
      addons: normalizeAddons(raw.addons),
    }
  })
}

function normalizeQueue(payload: unknown): QueueOrder[] {
  const source: RawQueueOrder[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown[] }).items)
      ? ((payload as { items: RawQueueOrder[] }).items ?? [])
      : payload && typeof payload === 'object'
        ? (['PENDING', 'ACCEPTED', 'BREWING', 'READY'] as const).flatMap((status) => {
            const list = (payload as Record<string, unknown>)[status]
            if (!Array.isArray(list)) return []
            return (list as RawQueueOrder[]).map((item) => ({ ...item, status }))
          })
        : []

  return source.map((order, index) => {
    const statusRaw = toString(order.status).toUpperCase() as QueueStatus
    const status: QueueStatus = ['PENDING', 'ACCEPTED', 'BREWING', 'READY', 'ISSUED'].includes(statusRaw) ? statusRaw : 'PENDING'

    return {
      id: toString(order.id, `order-${index}`),
      status,
      pickupTime: typeof order.pickup_time === 'string' ? order.pickup_time : null,
      customerName: toString(order.customer_name) || toString(order.user_name) || toString(order.user?.name) || 'Гость',
      items: normalizeItems(order.items),
    }
  })
}

export default function AdminOrdersQueue() {
  const queryClient = useQueryClient()
  const [localStatuses, setLocalStatuses] = useState<Record<string, QueueStatus>>({})

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminQueue'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/orders/queue')
      return normalizeQueue(response.data.data)
    },
    refetchInterval: 15000,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, oldStatus, newStatus }: { id: string; oldStatus: QueueStatus; newStatus: QueueStatus }) => {
      await apiClient.patch(`/orders/${id}/status`, {
        old_status: oldStatus,
        new_status: newStatus,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQueue'] })
    },
  })

  const grouped = useMemo(() => {
    const map: Record<QueueStatus, QueueOrder[]> = {
      PENDING: [],
      ACCEPTED: [],
      BREWING: [],
      READY: [],
      ISSUED: [],
    }

    for (const order of data ?? []) {
      const status = localStatuses[order.id] ?? order.status
      map[status].push({ ...order, status })
    }

    return map
  }, [data, localStatuses])

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader size="lg" color="primary" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-4xl text-primary">Очередь заказов</h2>

      {isError ? <Alert color="danger">Не удалось загрузить очередь заказов.</Alert> : null}

      {updateStatusMutation.isError ? <Alert color="danger">Не удалось обновить статус заказа.</Alert> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {columns.map((column) => (
          <div key={column.status} className="space-y-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm uppercase tracking-[0.06em] text-text-main/80">{column.title}</h3>
              <Badge>{grouped[column.status].length}</Badge>
            </div>

            <div className="grid gap-3">
              {grouped[column.status].length === 0 ? (
                <p className="rounded-xl bg-bg-surface p-3 text-sm text-text-main/60">Нет заказов</p>
              ) : (
                grouped[column.status].map((order, index) => {
                  const nextStatus = nextStatusMap[order.status]

                  return (
                    <article key={order.id} className="rounded-xl bg-bg-surface p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text-main">#{getPublicOrderNumber(order.id, index + 1)}</p>
                        <p className="text-xs text-text-main/70">{toLocalDateTime(order.pickupTime)}</p>
                      </div>

                      <p className="mb-2 text-sm text-text-main/90">Клиент: {order.customerName}</p>

                      <ul className="mb-3 space-y-1 text-xs text-text-main/80">
                        {order.items.length === 0 ? <li>Состав заказа недоступен</li> : null}
                        {order.items.map((item, itemIndex) => (
                          <li key={`${order.id}-item-${itemIndex}`}>
                            {item.name} · {item.size} · x{item.quantity}
                            {item.addons.length > 0 ? ` · Добавки: ${item.addons.join(', ')}` : ''}
                          </li>
                        ))}
                      </ul>

                      {nextStatus ? (
                        <Button
                          type="button"
                          size="sm"
                          isLoading={updateStatusMutation.isPending}
                          onClick={() => {
                            setLocalStatuses((prev) => ({ ...prev, [order.id]: nextStatus }))
                            updateStatusMutation.mutate({ id: order.id, oldStatus: order.status, newStatus: nextStatus })
                          }}
                          className="w-full border-primary bg-primary text-white hover:bg-primary/90"
                        >
                          {actionLabel[order.status as Exclude<QueueStatus, 'ISSUED'>]}
                        </Button>
                      ) : null}
                    </article>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
