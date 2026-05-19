import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Modal, Table } from 'rizzui'
import { QRCodeSVG } from 'qrcode.react'
import { apiClient } from '../../api/client'
import { registerPushSubscription } from '../../api/push'
import { useAuthStore } from '../../store/authStore'
import { getPublicOrderNumber } from '../admin/shared'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
}

type UserProfile = {
  id?: number | string
  name?: string
  email?: string
  phone?: string
  phone_number?: string
  role?: string
  bonus_balance?: number
}

type OrderItem = {
  id?: number | string
  public_number?: string
  status?: string
  total_price?: number
  bonus_used?: number
  bonus_earned?: number
  pickup_time?: string
  created_at?: string
  order_items?: Array<{
    id?: string
    size?: string
    quantity?: number
    calculated_item_price?: number
    menu_item?: { name?: string }
    order_item_addons?: Array<{ calculated_addon_price?: number; addon?: { name?: string } }>
  }>
}

type OrdersResponse = {
  items?: OrderItem[]
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value?: string) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return dateFormat.format(parsed)
}

const orderStatusRu: Record<string, string> = {
  PENDING: 'Новый',
  ACCEPTED: 'Принят',
  BREWING: 'Готовится',
  READY: 'Готов',
  ISSUED: 'Выдан',
  CANCELLED: 'Отменен',
}

export default function Profile() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const [page, setPage] = useState(1)
  const [activeOrder, setActiveOrder] = useState<OrderItem | null>(null)
  const [isPushModalOpen, setIsPushModalOpen] = useState(false)
  const authUser = useAuthStore((state) => state.user as UserProfile | null)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const { data: profileData, isError: isProfileError } = useQuery({
    queryKey: ['users-me'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<UserProfile>>('/users/me')
      return response.data.data
    },
  })

  const { data: ordersData, isLoading: isOrdersLoading, isError: isOrdersError } = useQuery({
    queryKey: ['orders-my', page],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<OrdersResponse>>('/orders/my', {
        params: { page },
      })
      return response.data
    },
  })

  const profile = profileData ?? authUser ?? null

  const phone = useMemo(
    () => profile?.phone?.trim() || profile?.phone_number?.trim() || '',
    [profile],
  )
  const role = typeof profile?.role === 'string' ? String(profile.role).toUpperCase() : ''

  const orders = ordersData?.data?.items ?? []
  const currentPage = ordersData?.meta?.page ?? page
  const totalPages = ordersData?.meta?.totalPages ?? 1

  const pushSubscribeMutation = useMutation({
    mutationFn: async () => {
      if (typeof Notification === 'undefined') {
        throw new Error('unsupported')
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('permission_denied')
      }
      await registerPushSubscription()
    },
    onSuccess: () => {
      localStorage.setItem('push_prompt_seen_v1', '1')
      setIsPushModalOpen(false)
    },
  })

  useEffect(() => {
    const isAlreadySeen = localStorage.getItem('push_prompt_seen_v1') === '1'
    const hasOrders = orders.length > 0
    const canAskPermission = typeof Notification !== 'undefined' && Notification.permission === 'default'

    if (!isAlreadySeen && hasOrders && canAskPermission) {
      setIsPushModalOpen(true)
    }
  }, [orders.length])

  return (
    <section className="space-y-8 px-4 py-6">
      <h1 className="font-display text-4xl text-primary sm:text-5xl">Профиль</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-bg-surface p-6">
          <h2 className="mb-4 text-2xl font-semibold text-text-main">Личные данные</h2>
          {isProfileError ? <p className="mb-2 text-sm text-accent-red">Не удалось загрузить профиль из API, показаны локальные данные.</p> : null}
          <div className="space-y-2 text-text-main">
            <p>Имя: {profile?.name ?? '-'}</p>
            <p>Email: {profile?.email ?? '-'}</p>
            <p>Телефон: {phone || '-'}</p>
            <p>Бонусы: {profile?.bonus_balance ?? 0}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="mt-6 w-full border-accent-red text-accent-red hover:bg-accent-red/10"
          >
            Выход
          </Button>
          {role === 'ADMIN' || role === 'STAFF' ? (
            <Button
              type="button"
              onClick={() => navigate('/admin')}
              className="mt-3 w-full border-primary bg-primary text-white hover:bg-primary/90"
            >
              В админ панель
            </Button>
          ) : null}
        </div>

        <div className="rounded-3xl bg-bg-surface p-6">
          <h2 className="mb-4 text-2xl font-semibold text-text-main">QR телефона</h2>
          {phone ? (
            <div className="inline-flex rounded-2xl bg-white p-4">
              <QRCodeSVG value={phone} size={180} />
            </div>
          ) : (
            <p className="text-text-main/70">Телефон не указан</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-main">История заказов</h2>
        {isOrdersError ? <p className="text-sm text-accent-red">История заказов временно недоступна.</p> : null}

        <div className="overflow-x-auto rounded-2xl bg-white p-3">
          <Table variant="minimal">
            <Table.Header>
              <Table.Row>
                <Table.Head>Заказ</Table.Head>
                <Table.Head>Статус</Table.Head>
                <Table.Head>Сумма</Table.Head>
                <Table.Head>Самовывоз</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {isOrdersLoading ? (
                <Table.Row>
                  <Table.Cell colSpan={4}>Загрузка заказов...</Table.Cell>
                </Table.Row>
              ) : orders.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={4}>Заказов пока нет</Table.Cell>
                </Table.Row>
              ) : (
                orders.map((order, index) => (
                  <Table.Row key={String(order.id ?? `order-${index}`)}>
                    <Table.Cell>
                      <button
                        type="button"
                        onClick={() => setActiveOrder(order)}
                        className="border-b border-dashed border-primary text-left text-primary"
                      >
                        Заказ #{order.public_number || getPublicOrderNumber(order.id, index + 1)}
                      </button>
                    </Table.Cell>
                    <Table.Cell>{orderStatusRu[order.status ?? ''] ?? order.status ?? '-'}</Table.Cell>
                    <Table.Cell>{order.total_price ?? 0} ₽</Table.Cell>
                    <Table.Cell>{formatDate(order.pickup_time)}</Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </Button>
            <span className="text-sm text-text-main/80">
              Страница {currentPage} из {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      <Modal isOpen={activeOrder !== null} onClose={() => setActiveOrder(null)} size="md">
        <div className="bg-white p-6">
          {activeOrder ? (
            <div className="space-y-3">
              <h3 className="font-display text-3xl text-primary">Заказ #{getPublicOrderNumber(activeOrder.id)}</h3>
              <p className="text-sm text-text-main/80">Статус: {orderStatusRu[activeOrder.status ?? ''] ?? activeOrder.status ?? '-'}</p>
              <p className="text-sm text-text-main/80">Сумма: {activeOrder.total_price ?? 0} ₽</p>
              <p className="text-sm text-text-main/80">Время самовывоза: {formatDate(activeOrder.pickup_time)}</p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-main">Состав:</p>
                {(activeOrder.order_items ?? []).length === 0 ? <p className="text-sm text-text-main/60">Нет данных</p> : null}
                {(activeOrder.order_items ?? []).map((item, itemIndex) => (
                  <p key={item.id ?? itemIndex} className="text-sm text-text-main/80">
                    {item.menu_item?.name ?? 'Позиция'} · {item.size ?? '-'} · x{item.quantity ?? 1}
                    {(item.order_item_addons ?? []).length > 0
                      ? ` · ${item.order_item_addons.map((addon) => addon.addon?.name).filter(Boolean).join(', ')}`
                      : ''}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal isOpen={isPushModalOpen} onClose={() => setIsPushModalOpen(false)} size="sm">
        <div className="space-y-4 bg-white p-6">
          <h3 className="font-display text-3xl text-primary">Включить уведомления?</h3>
          <p className="text-sm text-text-main/80">Будем отправлять только самое важное: статусы заказов и акционные предложения.</p>

          {pushSubscribeMutation.isError ? <p className="text-sm text-accent-red">Не удалось включить уведомления. Попробуйте позже.</p> : null}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                localStorage.setItem('push_prompt_seen_v1', '1')
                setIsPushModalOpen(false)
              }}
            >
              Позже
            </Button>
            <Button
              type="button"
              isLoading={pushSubscribeMutation.isPending}
              className="w-full border-primary bg-primary text-white"
              onClick={() => pushSubscribeMutation.mutate()}
            >
              Включить
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
