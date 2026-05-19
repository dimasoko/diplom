import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActionIcon, Badge, Button, Checkbox, Table, Tooltip } from 'rizzui'
import { apiClient } from '../../api/client'
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

type RawMenuItem = {
  id?: number | string
  name?: string
  title?: string
  description?: string | null
  category?: string | { name?: string } | null
  category_name?: string | null
  price_s?: number | null
  price_m?: number | null
  price_l?: number | null
}

type MenuItem = {
  id: string
  menu_item_id: string
  name: string
  description: string | null
  category: string
  price_s: number | null
  price_m: number | null
  price_l: number | null
}

type RawAddon = {
  id?: number | string
  name?: string
  title?: string
  type?: string | null
  price?: number | null
}

type Addon = {
  id: string
  name: string
  price: number
  type: 'SYRUP' | 'MILK' | 'EXTRA'
}

type SizeKey = 'S' | 'M' | 'L'

const money = new Intl.NumberFormat('ru-RU')

function formatPrice(value: number) {
  return `${money.format(value)} ₽`
}

function resolveCategory(raw: RawMenuItem): string {
  if (typeof raw.category === 'string' && raw.category.trim()) return raw.category
  if (raw.category && typeof raw.category === 'object' && raw.category.name?.trim()) return raw.category.name
  if (raw.category_name?.trim()) return raw.category_name
  return 'Без категории'
}

function normalizeItems(payload: unknown): MenuItem[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && 'items' in payload && Array.isArray((payload as { items: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : []

  return source
    .filter((item): item is RawMenuItem => item !== null && typeof item === 'object')
    .map((item, index) => {
      const rawId = String(item.id ?? `item-${index}`)
      return {
        id: rawId,
        menu_item_id: rawId,
        name: item.name?.trim() || item.title?.trim() || 'Без названия',
        description: item.description?.trim() || null,
        category: resolveCategory(item),
        price_s: item.price_s ?? null,
        price_m: item.price_m ?? null,
        price_l: item.price_l ?? null,
      }
    })
}

function normalizeAddons(payload: unknown): Addon[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && 'items' in payload && Array.isArray((payload as { items: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : []

  return source
    .filter((item): item is RawAddon => item !== null && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id ?? `addon-${index}`),
      name: item.name?.trim() || item.title?.trim() || 'Добавка',
      price: typeof item.price === 'number' ? item.price : 0,
      type:
        item.type === 'SYRUP' || item.type === 'MILK' || item.type === 'EXTRA'
          ? item.type
          : 'EXTRA',
    }))
}

function getSizePrice(item: MenuItem, size: SizeKey | null) {
  if (!size) return null
  if (size === 'S') return item.price_s
  if (size === 'M') return item.price_m
  return item.price_l
}

function SizeCell({ size, price }: { size: SizeKey; price: number | null }) {
  if (price === null) {
    return <span>-</span>
  }

  return (
    <Tooltip content={formatPrice(price)} placement="top">
      <span className="cursor-help underline decoration-dashed underline-offset-4">{size}</span>
    </Tooltip>
  )
}

function extractKitchenMeta(description: string | null) {
  if (!description) return { grams: null, kbju: null }
  const gramsMatch = description.match(/(\d+)\s*г/)
  const kbjuMatch = description.match(/КБЖУ:\s*([0-9/]+)/i)
  return {
    grams: gramsMatch ? `${gramsMatch[1]} г` : null,
    kbju: kbjuMatch ? kbjuMatch[1] : null,
  }
}

export default function AuthMenu() {
  const addItem = useCartStore((state) => state.addItem)
  const [openedDescriptionIds, setOpenedDescriptionIds] = useState<Record<string, boolean>>({})
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<Record<string, SizeKey | null>>({})
  const [selectedAddons, setSelectedAddons] = useState<Record<string, string[]>>({})

  const { data: menuItems, isLoading: menuLoading } = useQuery({
    queryKey: ['menu-items-auth'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/menu/items')
      return normalizeItems(response.data.data)
    },
  })

  const { data: addons = [] } = useQuery({
    queryKey: ['menu-addons'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/menu/addons')
      return normalizeAddons(response.data.data)
    },
  })

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>()

    for (const item of menuItems ?? []) {
      if (!map.has(item.category)) {
        map.set(item.category, [])
      }
      map.get(item.category)!.push(item)
    }

    return Array.from(map.entries())
  }, [menuItems])

  const addonsByType = useMemo(() => {
    const map: Record<'SYRUP' | 'MILK' | 'EXTRA', Addon[]> = {
      SYRUP: [],
      MILK: [],
      EXTRA: [],
    }
    for (const addon of addons) {
      map[addon.type].push(addon)
    }
    return map
  }, [addons])

  const toggleDescription = (id: string) => {
    setOpenedDescriptionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const toggleAddon = (itemId: string, addonId: string, checked: boolean) => {
    setSelectedAddons((prev) => {
      const current = prev[itemId] ?? []
      const next = checked ? [...current, addonId] : current.filter((id) => id !== addonId)
      return { ...prev, [itemId]: next }
    })
  }

  const handleAddToCart = (item: MenuItem) => {
    const selectedSize = selectedSizes[item.id] ?? null
    const basePrice = getSizePrice(item, selectedSize)
    if (!selectedSize || basePrice === null) return

    const addonIds = selectedAddons[item.id] ?? []
    const addonNames = addonIds
      .map((addonId) => {
        const addon = addons.find((a) => a.id === addonId)
        return addon?.name ?? ''
      })
      .filter(Boolean)

    const addonsTotal = addonIds.reduce((sum, addonId) => {
      const addon = addons.find((a) => a.id === addonId)
      return sum + (addon?.price ?? 0)
    }, 0)

    addItem({
      menu_item_id: item.menu_item_id,
      menu_item_name: item.name,
      size: selectedSize,
      addon_ids: addonIds,
      addon_names: addonNames,
      quantity: 1,
      calculated_price: basePrice + addonsTotal,
    })

    setExpandedRowId(null)
    setSelectedSizes((prev) => ({ ...prev, [item.id]: null }))
    setSelectedAddons((prev) => ({ ...prev, [item.id]: [] }))
  }

  return (
    <section className="space-y-8 px-2 py-4 sm:px-4 sm:py-6">
      {menuLoading ? <p className="text-text-main/70">Загрузка меню...</p> : null}

      {grouped.map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h2 className="font-display text-2xl text-primary sm:text-3xl">{category}</h2>

          <div className="overflow-x-auto rounded-2xl bg-white p-2">
            <Table variant="minimal">
              {category.toLowerCase().includes('кухня') ? null : (
                <Table.Header>
                  <Table.Row>
                    <Table.Head className="w-10 text-center">+</Table.Head>
                    <Table.Head>Название</Table.Head>
                    <Table.Head className="text-center">200 мл</Table.Head>
                    <Table.Head className="text-center">300 мл</Table.Head>
                    <Table.Head className="text-center">400 мл</Table.Head>
                  </Table.Row>
                </Table.Header>
              )}
              <Table.Body>
                {items.map((item) => {
                  const expanded = expandedRowId === item.id
                  const selectedSize = selectedSizes[item.id] ?? null
                  const selectedAddonIds = selectedAddons[item.id] ?? []
                  const sizePrice = getSizePrice(item, selectedSize)
                  const addonsPrice = selectedAddonIds.reduce((sum, addonId) => {
                    const addon = addons.find((a) => a.id === addonId)
                    return sum + (addon?.price ?? 0)
                  }, 0)
                  const total = (sizePrice ?? 0) + addonsPrice

                  const availableSizes: Array<{ key: SizeKey; price: number }> = [
                    item.price_s !== null ? { key: 'S', price: item.price_s } : null,
                    item.price_m !== null ? { key: 'M', price: item.price_m } : null,
                    item.price_l !== null ? { key: 'L', price: item.price_l } : null,
                  ].filter((entry): entry is { key: SizeKey; price: number } => entry !== null)

                  return (
                    <Fragment key={item.id}>
                      <Table.Row>
                        <Table.Cell className="text-center">
                          <ActionIcon
                            type="button"
                            size="sm"
                            rounded="full"
                            variant="outline"
                            aria-label="Добавить"
                            onClick={() => setExpandedRowId((prev) => (prev === item.id ? null : item.id))}
                          >
                            +
                          </ActionIcon>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="space-y-1">
                            {item.description ? (
                              <button
                                type="button"
                                onClick={() => toggleDescription(item.id)}
                                className="border-b border-dashed border-gray-400 text-left transition-colors hover:text-primary"
                              >
                                {item.name}
                              </button>
                            ) : (
                              <span>{item.name}</span>
                            )}
                          </div>
                        </Table.Cell>
                        {category.toLowerCase().includes('кухня') ? (
                          <>
                            <Table.Cell className="text-center">
                              {(() => {
                                const meta = extractKitchenMeta(item.description)
                                const price = item.price_m ?? item.price_s ?? item.price_l
                                if (price === null) return '-'
                                return (
                                  <Tooltip content={`Цена: ${formatPrice(price)}${meta.kbju ? ` · КБЖУ: ${meta.kbju}` : ''}`} placement="top">
                                    <span className="cursor-help underline decoration-dashed underline-offset-4">{meta.grams ?? 'порция'}</span>
                                  </Tooltip>
                                )
                              })()}
                            </Table.Cell>
                            <Table.Cell className="text-center">-</Table.Cell>
                            <Table.Cell className="text-center">-</Table.Cell>
                          </>
                        ) : (
                          <>
                            <Table.Cell className="text-center">
                              <SizeCell size="S" price={item.price_s} />
                            </Table.Cell>
                            <Table.Cell className="text-center">
                              <SizeCell size="M" price={item.price_m} />
                            </Table.Cell>
                            <Table.Cell className="text-center">
                              <SizeCell size="L" price={item.price_l} />
                            </Table.Cell>
                          </>
                        )}
                      </Table.Row>

                      {item.description && openedDescriptionIds[item.id] ? (
                        <Table.Row>
                          <Table.Cell colSpan={5} className="text-sm text-text-main/80">
                            {item.description}
                          </Table.Cell>
                        </Table.Row>
                      ) : null}

                      {expanded ? (
                        <Table.Row>
                          <Table.Cell colSpan={5}>
                            <div className="rounded-2xl bg-bg-surface p-4 sm:p-5">
                              <div className="space-y-5">
                                <div>
                                  <p className="mb-3 text-sm font-semibold text-text-main">Шаг 1: Выберите объем</p>
                                  <div className="flex flex-wrap gap-2">
                                    {availableSizes.map((size) => (
                                      <Button
                                        key={size.key}
                                        type="button"
                                        variant={selectedSize === size.key ? 'solid' : 'outline'}
                                        className={
                                          selectedSize === size.key
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-primary text-primary'
                                        }
                                        onClick={() =>
                                          setSelectedSizes((prev) => ({
                                            ...prev,
                                            [item.id]: size.key,
                                          }))
                                        }
                                      >
                                        {size.key} · {formatPrice(size.price)}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <div className="mb-3 flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-text-main">Шаг 2: Добавки</p>
                                    <Badge>{selectedAddonIds.length}</Badge>
                                  </div>

                                  {addons.length === 0 ? (
                                    <p className="text-sm text-text-main/60">Добавки недоступны</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {([
                                        { key: 'SYRUP', label: 'Сиропы' },
                                        { key: 'MILK', label: 'Альтернативное молоко' },
                                        { key: 'EXTRA', label: 'Другое' },
                                      ] as const).map((group) => (
                                        <details key={group.key} className="rounded-xl border border-gray-200 bg-white p-3" open>
                                          <summary className="cursor-pointer text-sm font-semibold text-text-main">
                                            {group.label}
                                          </summary>
                                          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                            {addonsByType[group.key].length === 0 ? (
                                              <p className="text-xs text-text-main/55">Нет опций</p>
                                            ) : (
                                              addonsByType[group.key].map((addon) => {
                                                const checked = selectedAddonIds.includes(addon.id)
                                                return (
                                                  <label
                                                    key={addon.id}
                                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                                                      checked
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-gray-200 bg-white hover:border-primary/40'
                                                    }`}
                                                  >
                                                    <Checkbox
                                                      checked={checked}
                                                      onChange={(event) => toggleAddon(item.id, addon.id, event.target.checked)}
                                                    />
                                                    <div className="min-w-0">
                                                      <p className="truncate text-sm font-medium text-text-main">{addon.name}</p>
                                                      <p className="text-xs text-text-main/70">+{formatPrice(addon.price)}</p>
                                                    </div>
                                                  </label>
                                                )
                                              })
                                            )}
                                          </div>
                                        </details>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-text-main">
                                    Сумма: <span className="text-primary">{formatPrice(total)}</span>
                                  </p>
                                  <Button
                                    type="button"
                                    className="border-primary bg-primary text-white hover:bg-primary/90"
                                    disabled={selectedSize === null || sizePrice === null}
                                    onClick={() => handleAddToCart(item)}
                                  >
                                    Добавить в корзину
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ) : null}
                    </Fragment>
                  )
                })}
              </Table.Body>
            </Table>
          </div>
        </div>
      ))}
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm text-text-main">
        Также в кофейне можно приобрести дрипы, воронки и термосы, когда придете к нам в кофейню.
      </div>
    </section>
  )
}
