import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Modal } from 'rizzui'
import { apiClient } from '../../api/client'
import HeroSection from '../../components/sections/HeroSection'

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

type HomeBentoData = {
  latest_published_event?: {
    id?: string
    title?: string
    description?: string | null
    event_date?: string
    published_at?: string
    photo_url?: string | null
  } | null
  popular_item?: {
    name?: string
    photo_url?: string | null
    image_url?: string | null
  } | null
}

type RawGalleryItem = {
  id?: number | string
  title?: string | null
  image_url?: string | null
}

type GalleryItem = {
  id: string
  title: string
  imageUrl: string
}

function normalizeGallery(payload: unknown): GalleryItem[] {
  const source = Array.isArray(payload) ? payload : []

  return source
    .filter((item): item is RawGalleryItem => item !== null && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id ?? index),
      title: item.title?.trim() || 'Фото',
      imageUrl: (item.image_url ?? '').trim(),
    }))
    .filter((item) => item.imageUrl.length > 0)
}

const defaultAbout =
  'we are BASE coffee — городская кофейня с фокусом на зерне, чистом вкусе и внимании к деталям.'

const defaultHours = ['Пн-Пт: 08:00-21:00', 'Сб-Вс: 09:00-22:00']

function formatEventDate(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Home() {
  const [activeImage, setActiveImage] = useState<GalleryItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['home-bento'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<HomeBentoData>>('/content/home-bento')
      return response.data.data
    },
  })

  const { data: galleryItems = [], isLoading: isGalleryLoading } = useQuery({
    queryKey: ['home-gallery'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/content/gallery')
      return normalizeGallery(response.data.data)
    },
  })

  const popularImage = data?.popular_item?.photo_url ?? data?.popular_item?.image_url ?? null
  const latestEvent = data?.latest_published_event
  const latestEventDate = formatEventDate(latestEvent?.event_date)

  const gallery = useMemo(() => galleryItems.slice(0, 8), [galleryItems])

  return (
    <div className="space-y-6 pb-8 sm:space-y-8 sm:pb-10">
      <HeroSection />

      <section className="opacity-0 animate-fade-in">
        <div className="grid grid-cols-1 gap-3 p-2 sm:gap-4 sm:p-4 md:grid-cols-3">
          <article className="rounded-3xl bg-bg-surface p-5 sm:p-6 md:col-span-2">
            <h2 className="mb-4 font-display text-2xl text-primary sm:text-3xl">О нас</h2>
            <p className="text-sm leading-relaxed text-text-main sm:text-base">{defaultAbout}</p>
          </article>

          <article className="rounded-3xl bg-bg-surface p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-main sm:text-xl">Часы работы</h2>
            <ul className="space-y-2 text-sm text-text-main/90 sm:text-base">
              {defaultHours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl bg-bg-surface p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-main sm:text-xl">Хит продаж</h2>
            <div className="space-y-3">
              {popularImage ? (
                <img
                  src={popularImage}
                  alt={data?.popular_item?.name || 'Популярный напиток'}
                  className="h-40 w-full rounded-2xl object-cover sm:h-44"
                />
              ) : (
                <div className="h-40 w-full rounded-2xl bg-white sm:h-44" />
              )}
              <p className="text-sm font-medium text-text-main sm:text-base">
                {isLoading ? 'Загрузка...' : data?.popular_item?.name || 'Капучино'}
              </p>
            </div>
          </article>

          <article className="rounded-3xl bg-bg-surface p-5 sm:p-6 md:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-text-main sm:text-xl">Ближайшее мероприятие</h2>
            <p className="mb-4 text-sm text-text-main/80">
              {isLoading
                ? 'Загрузка...'
                : latestEvent?.title
                  ? `${latestEvent.title}${latestEventDate ? ` · ${latestEventDate}` : ''}`
                  : 'Анонс мероприятия скоро появится.'}
            </p>
            <Link
              to="/events"
              className="inline-flex rounded-2xl border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
            >
              Перейти к мероприятиям
            </Link>
          </article>
        </div>
      </section>

      <section id="gallery-section" className="scroll-mt-28 px-2 opacity-0 animate-fade-in-delayed sm:px-4">
        <div className="rounded-3xl bg-bg-surface p-4 sm:p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-3xl text-primary sm:text-4xl">Галерея</h2>
            <Link to="/events" className="text-sm font-medium text-primary hover:underline">
              Смотреть все
            </Link>
          </div>

          {isGalleryLoading && gallery.length === 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`gallery-skeleton-${idx}`}
                  className="h-36 bg-white [clip-path:polygon(0_0,100%_0,100%_84%,84%_100%,0_100%)] sm:h-40"
                />
              ))}
            </div>
          ) : gallery.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
              {gallery.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setActiveImage(item)}
                  className="group relative h-36 overflow-hidden rounded-2xl bg-white text-left sm:h-40 md:h-48"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 border-2 border-transparent transition-colors duration-300 group-hover:border-primary" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-main/70">Фото скоро появятся.</p>
          )}
        </div>
      </section>

      <section id="map-section" className="scroll-mt-28 space-y-4 px-2 opacity-0 animate-fade-in-delayed sm:px-4">
        <h2 className="text-xl font-semibold text-text-main sm:text-2xl">Контакты</h2>
        <div className="h-80 w-full overflow-hidden rounded-3xl sm:h-96">
          <iframe
            title="Яндекс Карты: Барнаул, просп. Ленина, 58"
            src="https://yandex.ru/map-widget/v1/?text=%D0%91%D0%B0%D1%80%D0%BD%D0%B0%D1%83%D0%BB%2C%20%D0%BF%D1%80%D0%BE%D1%81%D0%BF.%20%D0%9B%D0%B5%D0%BD%D0%B8%D0%BD%D0%B0%2C%2058&z=16"
            className="h-full w-full border-0"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </section>

      <Modal isOpen={activeImage !== null} onClose={() => setActiveImage(null)} size="xl">
        <div className="bg-white p-2 sm:p-3">
          {activeImage ? (
            <div className="space-y-2">
              <img
                src={activeImage.imageUrl}
                alt={activeImage.title}
                className="max-h-[86vh] w-full rounded-xl object-contain"
              />
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <p className="text-sm text-text-main/80">{activeImage.title}</p>
                <Button type="button" variant="outline" onClick={() => setActiveImage(null)}>
                  Закрыть
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
