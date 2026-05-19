import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Tooltip } from 'rizzui'
import { apiClient } from '../../api/client'

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
  name: string
  description: string | null
  category: string
  price_s: number | null
  price_m: number | null
  price_l: number | null
}

const money = new Intl.NumberFormat('ru-RU')

function formatPrice(value: number) {
  return `${money.format(value)} ₽`
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
    .map((item, index) => ({
      id: String(item.id ?? `${item.name ?? item.title ?? 'item'}-${index}`),
      name: item.name?.trim() || item.title?.trim() || 'Без названия',
      description: item.description?.trim() || null,
      category: resolveCategory(item),
      price_s: item.price_s ?? null,
      price_m: item.price_m ?? null,
      price_l: item.price_l ?? null,
    }))
}

function SizeCell({ size, price }: { size: 'S' | 'M' | 'L'; price: number | null }) {
  if (price === null) {
    return <span>-</span>
  }

  return (
    <Tooltip content={formatPrice(price)} placement="top">
      <span className="cursor-help underline decoration-dashed underline-offset-4">{size}</span>
    </Tooltip>
  )
}

export default function Menu() {
  const [openedIds, setOpenedIds] = useState<Record<string, boolean>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/menu/items')
      return normalizeItems(response.data.data)
    },
  })

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>()

    for (const item of data ?? []) {
      if (!map.has(item.category)) {
        map.set(item.category, [])
      }
      map.get(item.category)!.push(item)
    }

    return Array.from(map.entries())
  }, [data])

  const toggleDescription = (id: string) => {
    setOpenedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <section className="space-y-8 px-2 py-4 sm:px-4 sm:py-6">
      {isLoading ? <p className="text-text-main/70">Загрузка меню...</p> : null}

      {grouped.map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h2 className="font-display text-2xl text-primary sm:text-3xl">{category}</h2>

          <div className="overflow-x-auto rounded-2xl bg-white p-2">
              <Table variant="minimal">
                {category.toLowerCase().includes('кухня') ? null : (
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Название</Table.Head>
                      <Table.Head className="text-center">200 мл</Table.Head>
                      <Table.Head className="text-center">300 мл</Table.Head>
                      <Table.Head className="text-center">400 мл</Table.Head>
                    </Table.Row>
                  </Table.Header>
                )}
                <Table.Body>
                  {items.map((item) => (
                    <Fragment key={item.id}>
                      <Table.Row>
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

                    {item.description && openedIds[item.id] ? (
                      <Table.Row>
                        <Table.Cell colSpan={4} className="text-sm text-text-main/80">
                          {item.description}
                        </Table.Cell>
                      </Table.Row>
                    ) : null}
                  </Fragment>
                ))}
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
