import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { ActionIcon, Badge, Button, Drawer, Input } from 'rizzui'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

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

type WorkingHoursConfig = {
  timezone: 'UTC'
  open_hour_utc: number
  close_hour_utc: number
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function isWithinWorkingHoursByUtcHours(value: string, openHourUtc: number, closeHourUtc: number) {
  const minutes = toMinutes(value)
  if (minutes === null) return false
  const [hours, mins] = value.split(':').map(Number)
  const localDate = new Date()
  localDate.setHours(hours, mins, 0, 0)
  const utcHour = localDate.getUTCHours()

  if (openHourUtc === closeHourUtc) return true
  if (openHourUtc < closeHourUtc) return utcHour >= openHourUtc && utcHour < closeHourUtc
  return utcHour >= openHourUtc || utcHour < closeHourUtc
}

function toPickupIsoUtc(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  const pickup = new Date()
  pickup.setHours(hours, minutes, 0, 0)
  return pickup.toISOString()
}

function getBonusBalance(user: Record<string, unknown> | null) {
  const raw = user?.bonus_balance
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  return 0
}

export default function CartDrawer() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user as Record<string, unknown> | null)
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)

  const [isOpen, setIsOpen] = useState(false)
  const [bonusToUse, setBonusToUse] = useState(0)
  const [pickupTime, setPickupTime] = useState('')
  const [timeError, setTimeError] = useState('')
  const workingHoursQuery = useQuery({
    queryKey: ['workingHours'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<WorkingHoursConfig>>('/orders/working-hours')
      return response.data.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const isHome = location.pathname === '/'
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false
  const showFloatingCart = !(isHome && isMobile)

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.calculated_price, 0), [items])

  const maxBonus = useMemo(() => {
    const byBalance = getBonusBalance(user)
    const byOrderLimit = subtotal * 0.5
    return Math.max(0, Math.floor(Math.min(byBalance, byOrderLimit)))
  }, [subtotal, user])

  useEffect(() => {
    if (bonusToUse > maxBonus) {
      setBonusToUse(maxBonus)
    }
  }, [bonusToUse, maxBonus])

  const total = Math.max(0, subtotal - bonusToUse)
  const workingHoursHint = useMemo(() => {
    const config = workingHoursQuery.data
    if (!config) return null
    const open = new Date()
    open.setUTCHours(config.open_hour_utc, 0, 0, 0)
    const close = new Date()
    close.setUTCHours(config.close_hour_utc % 24, 0, 0, 0)
    const fmt = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${fmt(open)} - ${fmt(close)}`
  }, [workingHoursQuery.data])

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!pickupTime) {
        throw new Error('Укажите время самовывоза')
      }
      if (workingHoursQuery.data && !isWithinWorkingHoursByUtcHours(pickupTime, workingHoursQuery.data.open_hour_utc, workingHoursQuery.data.close_hour_utc)) {
        throw new Error(`Время самовывоза вне рабочих часов (${workingHoursHint ?? 'см. график'})`)
      }

      const payload = {
        items: items.map((item) => ({
          menu_item_id: item.menu_item_id,
          size: item.size,
          quantity: item.quantity,
          addon_ids: item.addon_ids,
        })),
        pickup_time: toPickupIsoUtc(pickupTime),
        bonus_used: bonusToUse,
      }

      await apiClient.post<ApiEnvelope<unknown>>('/orders', payload)
    },
    onSuccess: () => {
      clearCart()
      setBonusToUse(0)
      setPickupTime('')
      setTimeError('')
      setIsOpen(false)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Не удалось оформить предзаказ'
      setTimeError(message)
    },
  })

  return (
    <>
      {showFloatingCart ? (
        <ActionIcon
          type="button"
          size="xl"
          rounded="full"
          aria-label="Корзина"
          className="fixed bottom-6 left-6 z-40 h-14 w-14 border-0 bg-primary text-white shadow-lg hover:bg-primary/90"
          onClick={() => setIsOpen(true)}
        >
          <span className="text-lg">Заказ</span>
        </ActionIcon>
      ) : null}

      {items.length > 0 && showFloatingCart ? (
        <Badge renderAsDot={false} className="fixed bottom-16 left-16 z-40 bg-white text-primary shadow">
          {items.length}
        </Badge>
      ) : null}

      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} placement="right">
        <div className="flex h-full flex-col bg-white">
          <div className="border-b border-gray-200 p-5">
            <h2 className="font-display text-2xl text-primary">Корзина</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {items.length === 0 ? (
              <p className="text-sm text-text-main/70">Корзина пуста</p>
            ) : (
              <ul className="space-y-3">
                {items.map((item, index) => (
                  <li key={`${item.menu_item_id}-${item.size}-${index}`} className="rounded-2xl bg-bg-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-text-main">{item.menu_item_name || `Позиция #${item.menu_item_id}`}</p>
                        <p className="text-sm text-text-main/80">Размер: {item.size}</p>
                        <p className="text-sm text-text-main/80">Количество: {item.quantity}</p>
                        <p className="text-sm text-text-main/80">
                          Добавки: {item.addon_names && item.addon_names.length > 0 ? item.addon_names.join(', ') : item.addon_ids.length > 0 ? item.addon_ids.join(', ') : '-'}
                        </p>
                        <p className="text-sm font-semibold text-primary">{item.calculated_price} ₽</p>
                      </div>
                      <ActionIcon type="button" size="sm" rounded="full" variant="outline" aria-label="Удалить" onClick={() => removeItem(index)}>
                        ×
                      </ActionIcon>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sticky bottom-0 space-y-4 border-t border-gray-200 bg-white p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-text-main">
                <span>Списать бонусы</span>
                <span>{bonusToUse} / {maxBonus}</span>
              </div>
              <input type="range" min={0} max={maxBonus} step={1} value={Math.min(bonusToUse, maxBonus)} onChange={(event) => setBonusToUse(Number(event.target.value))} className="w-full accent-[#2B2D9E]" />
            </div>

            <Input
              type="time"
              label="Время самовывоза"
              helperText={workingHoursHint ? `Часы самовывоза: ${workingHoursHint}` : 'Часы самовывоза загружаются с сервера'}
              value={pickupTime}
              onChange={(event) => {
                const value = event.target.value
                setPickupTime(value)
                if (!value || !workingHoursQuery.data) {
                  setTimeError('')
                } else if (
                  isWithinWorkingHoursByUtcHours(value, workingHoursQuery.data.open_hour_utc, workingHoursQuery.data.close_hour_utc)
                ) {
                  setTimeError('')
                } else {
                  setTimeError(`Время самовывоза вне рабочих часов (${workingHoursHint ?? 'см. график'})`)
                }
              }}
              error={timeError}
            />

            <div className="space-y-1 text-sm text-text-main">
              <p>Сумма: {subtotal} ₽</p>
              <p>Итого: <span className="font-semibold text-primary">{total} ₽</span></p>
            </div>

            <Button type="button" className="w-full border-primary bg-primary text-white hover:bg-primary/90" disabled={items.length === 0 || createOrder.isPending} isLoading={createOrder.isPending} onClick={() => createOrder.mutate()}>
              Оформить предзаказ
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
