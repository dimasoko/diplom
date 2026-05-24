import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconSearch } from '@tabler/icons-react'
import { Alert, Button, Input, Loader, Table } from 'rizzui'
import { apiClient } from '../../api/client'
import { ApiEnvelope, rub, toNumber, toString } from './shared'

type RawUser = {
  id?: unknown
  phone?: unknown
  name?: unknown
  bonus_balance?: unknown
  orders_count?: unknown
  ltv?: unknown
  role?: unknown
}

type UsersResponse = {
  items?: RawUser[]
}

type UserRow = {
  id: string
  phone: string
  name: string
  bonusBalance: number
  ordersCount: number
  ltv: number
}

function normalizeUsers(payload: unknown): UserRow[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as UsersResponse).items)
      ? (payload as UsersResponse).items ?? []
      : []

  return source
    .map((item, index) => {
      const user = item as RawUser
      const role = typeof user.role === 'string' ? user.role.toUpperCase() : ''

      return {
        id: toString(user.id, `user-${index}`),
        phone: toString(user.phone, '-'),
        name: toString(user.name, '-'),
        bonusBalance: toNumber(user.bonus_balance, 0),
        ordersCount: toNumber(user.orders_count, 0),
        ltv: toNumber(user.ltv, 0),
        role,
      }
    })
    .filter((user) => user.role === '' || user.role === 'CLIENT' || user.role === 'USER')
    .map(({ role: _role, ...user }) => user)
}

export default function AdminUsers() {
  const [page, setPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim())
      setPage(1)
    }, 350)

    return () => {
      window.clearTimeout(timer)
    }
  }, [searchValue])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminUsers', page, debouncedSearch],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/admin/users', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
        },
      })

      return {
        rows: normalizeUsers(response.data.data),
        meta: response.data.meta,
      }
    },
  })

  const currentPage = data?.meta?.page ?? page
  const totalPages = Math.max(data?.meta?.totalPages ?? 1, 1)
  const rows = useMemo(() => data?.rows ?? [], [data?.rows])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-4xl text-primary">Клиенты</h2>

        <div className="w-full max-w-md">
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Поиск по телефону или имени"
            prefix={<IconSearch className="h-4 w-4" />}
          />
        </div>
      </div>

      {isError ? <Alert color="danger">Не удалось загрузить список клиентов.</Alert> : null}

      <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader size="lg" color="primary" />
          </div>
        ) : (
          <Table variant="minimal">
            <Table.Header>
              <Table.Row>
                <Table.Head>Телефон</Table.Head>
                <Table.Head>Имя</Table.Head>
                <Table.Head>Бонусы</Table.Head>
                <Table.Head>Количество заказов</Table.Head>
                <Table.Head>LTV</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5}>Пользователи не найдены</Table.Cell>
                </Table.Row>
              ) : (
                rows.map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell>{row.phone}</Table.Cell>
                    <Table.Cell>{row.name}</Table.Cell>
                    <Table.Cell>{rub.format(row.bonusBalance)}</Table.Cell>
                    <Table.Cell>{rub.format(row.ordersCount)}</Table.Cell>
                    <Table.Cell>{rub.format(row.ltv)} ₽</Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
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
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  )
}
