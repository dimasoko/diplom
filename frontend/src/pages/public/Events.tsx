import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'rizzui'
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

type RawEvent = {
  id?: number | string
  title?: string
  name?: string
  description?: string | null
  photo_url?: string | null
  image_url?: string | null
  image?: string | null
  event_date?: string | null
  published_at?: string | null
}

type EventItem = {
  id: string
  title: string
  description: string
  imageUrl: string | null
  eventDate: string | null
  publishedAt: string | null
}

function normalizeEvents(payload: unknown): EventItem[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && 'items' in payload && Array.isArray((payload as { items: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : []

  return source
    .filter((item): item is RawEvent => item !== null && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id ?? index),
      title: item.title?.trim() || item.name?.trim() || 'Событие',
      description: item.description?.trim() || 'Подробности скоро появятся.',
      imageUrl: item.photo_url ?? item.image_url ?? item.image ?? null,
      eventDate: item.event_date ?? null,
      publishedAt: item.published_at ?? null,
    }))
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('ru-RU')
}

export default function Events() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['content-events'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/content/events')
      return normalizeEvents(response.data.data)
    },
  })

  return (
    <section className="space-y-6 px-4 py-6">
      <h1 className="font-display text-5xl text-primary">События</h1>
      <p className="font-display text-3xl text-text-main">Кофе, лекции, каппинги, музыка</p>

      {isLoading ? <p className="text-text-main/70">Загрузка событий...</p> : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => {
          const isExpanded = expanded[event.id] ?? false
          const long = event.description.length > 30
          const shortText = long ? `${event.description.slice(0, 30)}...` : event.description

          return (
            <article key={event.id} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-bg-surface p-4">
              {event.imageUrl ? (
                <div className="relative overflow-hidden rounded-2xl">
                  <img src={event.imageUrl} alt={event.title} className="h-52 w-full object-cover transition-transform duration-500 hover:scale-105" />
                </div>
              ) : (
                <div className="h-52 w-full rounded-2xl bg-white" />
              )}

              <div className="flex flex-1 flex-col space-y-2 p-2 pt-4">
                <h2 className="text-xl font-semibold text-text-main">{event.title}</h2>
                {formatDate(event.eventDate) ? <p className="text-sm text-primary">{formatDate(event.eventDate)}</p> : null}
                <p className="text-sm text-text-main/80">{isExpanded || !long ? event.description : shortText}</p>
                {long ? (
                  <Button type="button" variant="text" className="p-0 text-primary" onClick={() => setExpanded((prev) => ({ ...prev, [event.id]: !isExpanded }))}>
                    {isExpanded ? 'Свернуть' : 'Развернуть'}
                  </Button>
                ) : null}
                {formatDate(event.publishedAt) ? (
                  <p className="mt-auto pt-3 text-right text-xs text-text-main/65">Опубликовано: {formatDate(event.publishedAt)}</p>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
