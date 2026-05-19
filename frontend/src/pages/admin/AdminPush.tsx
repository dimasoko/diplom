import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Input, Loader, Table, Textarea } from 'rizzui'
import { apiClient } from '../../api/client'
import { ApiEnvelope, toNumber, toString } from './shared'

const campaignSchema = z.object({
  title: z.string().trim().min(2, 'Минимум 2 символа'),
  body: z.string().trim().min(4, 'Минимум 4 символа'),
  url: z.string().trim().optional(),
})

type CampaignFormValues = z.infer<typeof campaignSchema>

type PushHistoryItem = {
  id: string
  title: string
  body: string
  target: string
  sent_count: number
  failed_count: number
  created_at: string
}

function normalizeRows(payload: unknown): PushHistoryItem[] {
  if (!Array.isArray(payload)) return []

  return payload.map((item, index) => {
    const row = item as Record<string, unknown>
    return {
      id: toString(row.id, `push-${index}`),
      title: toString(row.title, 'Без заголовка'),
      body: toString(row.body, ''),
      target: toString(row.target, '-'),
      sent_count: toNumber(row.sent_count, 0),
      failed_count: toNumber(row.failed_count, 0),
      created_at: toString(row.created_at, ''),
    }
  })
}

export default function AdminPush() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: '',
      body: '',
      url: '/',
    },
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminPushHistory', page],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/push/admin/history', {
        params: { page, limit: 10 },
      })

      return {
        rows: normalizeRows(response.data.data),
        meta: response.data.meta,
      }
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (values: CampaignFormValues) => {
      await apiClient.post('/push/admin/send', {
        title: values.title,
        body: values.body,
        url: values.url || '/',
      })
    },
    onSuccess: () => {
      reset({ title: '', body: '', url: '/' })
      queryClient.invalidateQueries({ queryKey: ['adminPushHistory'] })
    },
  })

  const rows = data?.rows ?? []
  const currentPage = data?.meta?.page ?? page
  const totalPages = data?.meta?.totalPages ?? 1

  return (
    <section className="space-y-6">
      <h2 className="font-display text-4xl text-primary">Пуш-уведомления</h2>

      <form className="space-y-4 rounded-2xl bg-white p-4 shadow-sm" onSubmit={handleSubmit((values) => sendMutation.mutate(values))}>
        <Input label="Заголовок" {...register('title')} error={errors.title?.message} />
        <Textarea label="Текст" {...register('body')} error={errors.body?.message} />
        <Input label="URL перехода" {...register('url')} />

        {sendMutation.isError ? <Alert color="danger">Не удалось отправить уведомление.</Alert> : null}

        <Button type="submit" isLoading={sendMutation.isPending} className="border-primary bg-primary text-white">
          Отправить уведомление
        </Button>
      </form>

      <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">История уведомлений</h3>

        {isError ? <Alert color="danger">Не удалось загрузить историю уведомлений.</Alert> : null}

        {isLoading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <Loader color="primary" />
          </div>
        ) : (
          <Table variant="minimal">
            <Table.Header>
              <Table.Row>
                <Table.Head>Дата</Table.Head>
                <Table.Head>Заголовок</Table.Head>
                <Table.Head>Текст</Table.Head>
                <Table.Head>Тип</Table.Head>
                <Table.Head>Доставлено</Table.Head>
                <Table.Head>Ошибки</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={6}>Пока нет отправленных уведомлений.</Table.Cell>
                </Table.Row>
              ) : (
                rows.map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell>{row.created_at ? new Date(row.created_at).toLocaleString('ru-RU') : '-'}</Table.Cell>
                    <Table.Cell>{row.title}</Table.Cell>
                    <Table.Cell>{row.body}</Table.Cell>
                    <Table.Cell>{row.target}</Table.Cell>
                    <Table.Cell>{row.sent_count}</Table.Cell>
                    <Table.Cell>{row.failed_count}</Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Prev
          </Button>
          <span className="text-sm text-text-main/80">
            Страница {currentPage} из {totalPages}
          </span>
          <Button type="button" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Next
          </Button>
        </div>
      ) : null}
    </section>
  )
}
