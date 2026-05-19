import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Drawer, Input, Loader, Table, Textarea } from 'rizzui'
import { apiClient } from '../../api/client'
import { ApiEnvelope, toString } from './shared'

const formSchema = z.object({
  title: z.string().trim().min(2, 'Минимум 2 символа'),
  description: z.string().trim().optional(),
  event_date: z.string().min(1, 'Укажите дату и время события'),
  published_at: z.string().min(1, 'Укажите дату публикации'),
  photo_url: z.string().trim().optional(),
  is_published: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

type EventRow = {
  id: string
  title: string
  description: string
  event_date: string
  published_at: string
  photo_url: string | null
  is_published: boolean
}

function normalize(payload: unknown): EventRow[] {
  const source = Array.isArray(payload) ? payload : []
  return source.map((item, index) => {
    const row = item as Record<string, unknown>
    return {
      id: toString(row.id, `event-${index}`),
      title: toString(row.title, 'Без названия'),
      description: toString(row.description, ''),
      event_date: toString(row.event_date, new Date().toISOString()),
      published_at: toString(row.published_at, new Date().toISOString()),
      photo_url: toString(row.photo_url) || null,
      is_published: Boolean(row.is_published),
    }
  })
}

function toDateTimeInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultNowInput() {
  return toDateTimeInput(new Date().toISOString())
}

export default function AdminEvents() {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<EventRow | null>(null)
  const queryClient = useQueryClient()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      event_date: defaultNowInput(),
      published_at: defaultNowInput(),
      photo_url: '',
      is_published: true,
    },
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminEvents'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/admin/events')
      return normalize(response.data.data)
    },
  })

  const rows = useMemo(() => data ?? [], [data])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        event_date: new Date(values.event_date).toISOString(),
        published_at: new Date(values.published_at).toISOString(),
        photo_url: values.photo_url || null,
        is_published: values.is_published,
      }
      if (editing) {
        await apiClient.put(`/admin/events/${editing.id}`, payload)
      } else {
        await apiClient.post('/admin/events', payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminEvents'] })
      setIsOpen(false)
      setEditing(null)
      reset({
        title: '',
        description: '',
        event_date: defaultNowInput(),
        published_at: defaultNowInput(),
        photo_url: '',
        is_published: true,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/admin/events/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEvents'] }),
  })

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-4xl text-primary">Мероприятия</h2>
        <Button
          className="border-primary bg-primary text-white"
          onClick={() => {
            setEditing(null)
            reset({
              title: '',
              description: '',
              event_date: defaultNowInput(),
              published_at: defaultNowInput(),
              photo_url: '',
              is_published: true,
            })
            setIsOpen(true)
          }}
        >
          Добавить
        </Button>
      </div>

      {isError ? <Alert color="danger">Не удалось загрузить мероприятия.</Alert> : null}

      <div className="overflow-x-auto rounded-2xl bg-white p-4">
        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader color="primary" />
          </div>
        ) : (
          <Table variant="minimal">
            <Table.Header>
              <Table.Row>
                <Table.Head>Заголовок</Table.Head>
                <Table.Head>Дата события</Table.Head>
                <Table.Head>Дата публикации</Table.Head>
                <Table.Head>Публикация</Table.Head>
                <Table.Head>Действия</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell>{row.title}</Table.Cell>
                  <Table.Cell>{new Date(row.event_date).toLocaleString('ru-RU')}</Table.Cell>
                  <Table.Cell>{new Date(row.published_at).toLocaleString('ru-RU')}</Table.Cell>
                  <Table.Cell>{row.is_published ? 'Да' : 'Нет'}</Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(row)
                          reset({
                            title: row.title,
                            description: row.description,
                            event_date: toDateTimeInput(row.event_date),
                            published_at: toDateTimeInput(row.published_at),
                            photo_url: row.photo_url ?? '',
                            is_published: row.is_published,
                          })
                          setIsOpen(true)
                        }}
                      >
                        Редактировать
                      </Button>
                      <Button size="sm" variant="outline" className="border-accent-red text-accent-red" onClick={() => deleteMutation.mutate(row.id)}>
                        Удалить
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} placement="right" size="lg">
        <form className="space-y-4 bg-white p-6" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
          <h3 className="font-display text-3xl text-primary">{editing ? 'Редактирование' : 'Новое мероприятие'}</h3>

          <Input label="Заголовок" {...register('title')} error={errors.title?.message} />
          <Input type="datetime-local" label="Дата события" {...register('event_date')} error={errors.event_date?.message} />
          <Input type="datetime-local" label="Дата публикации" {...register('published_at')} error={errors.published_at?.message} />
          <Input label="URL фото" {...register('photo_url')} />
          <Controller control={control} name="description" render={({ field }) => <Textarea label="Описание" {...field} />} />
          <Controller
            control={control}
            name="is_published"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} /> Опубликовать
              </label>
            )}
          />

          {saveMutation.isError ? <Alert color="danger">Не удалось сохранить мероприятие.</Alert> : null}

          <Button type="submit" className="w-full border-primary bg-primary text-white" isLoading={saveMutation.isPending}>
            Сохранить
          </Button>
        </form>
      </Drawer>
    </section>
  )
}
