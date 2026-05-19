import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

type ApiEnvelope<T> = {
  success: boolean
  data: T
}

type RawBarista = {
  id?: string
  name?: string
  role_title?: string
  fun_fact?: string | null
  photo_url?: string | null
  hover_color?: string | null
}

type TeamMember = {
  id: string
  name: string
  role: string
  fact: string
  photoUrl: string | null
  hoverColor: string
}

function normalizeBaristas(payload: unknown): TeamMember[] {
  const source = Array.isArray(payload) ? payload : []

  return source
    .filter((item): item is RawBarista => item !== null && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id ?? index),
      name: item.name?.trim() || 'Бариста',
      role: item.role_title?.trim() || 'Бариста',
      fact: item.fun_fact?.trim() || '',
      photoUrl: item.photo_url?.trim() || null,
      hoverColor: item.hover_color?.trim() || '#2B2D9E',
    }))
}

function hoverClass(color: string) {
  if (color.toUpperCase() === '#C0392B') {
    return 'hover:bg-accent-red hover:text-white'
  }
  return 'hover:bg-primary hover:text-white'
}

export default function About() {
  const { data: team = [], isLoading } = useQuery({
    queryKey: ['content-baristas'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/content/baristas')
      return normalizeBaristas(response.data.data)
    },
  })

  return (
    <section className="space-y-8 px-4 py-6">
      <header className="space-y-3">
        <h1 className="font-display text-5xl text-primary">О нас</h1>
        <p className="max-w-3xl text-base leading-7 text-text-main">
          we are BASE coffee - городская кофейня про чистый вкус, удобный ритм и дружелюбный сервис.
          Мы варим классический и авторский кофе, проводим мероприятия и развиваем кофейную культуру.
        </p>
      </header>

      {isLoading ? <p className="text-text-main/70">Загрузка команды...</p> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {team.map((member) => (
          <article
            key={member.id}
            className={`rounded-3xl bg-bg-surface p-5 transition-colors duration-300 ${hoverClass(member.hoverColor)}`}
          >
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.name}
                className="mb-4 h-44 w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="mb-4 h-44 rounded-2xl bg-white" />
            )}
            <h2 className="text-xl font-semibold">{member.name}</h2>
            <p className="text-sm opacity-80">{member.role}</p>
            <p className="mt-3 text-sm leading-6">{member.fact}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
