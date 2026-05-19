import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Box as Card, Loader, Select, Text, Title } from 'rizzui'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiClient } from '../../api/client'
import { ApiEnvelope, rub, toNumber, toString } from './shared'

type RawMetrics = {
  revenue?: unknown
  average_check?: unknown
  orders_count?: unknown
  orders_by_status?: Array<{ status?: unknown; count?: unknown }> | unknown
  hourly_load?: Array<{ hour?: unknown; orders_count?: unknown }> | unknown
  top_drinks?: Array<{ name?: unknown; total_quantity?: unknown }> | unknown
}

type Metrics = {
  revenue: number
  averageCheck: number
  ordersCount: number
  hourlyLoad: Array<{ hour: string; orders: number }>
  topDrinks: Array<{ name: string; value: number }>
}

const pieColors = ['#2B2D9E', '#3342B4', '#4A63C9', '#5E7BDE', '#7392EE', '#C0392B', '#CD5A4E', '#D97871']

function normalizeMetrics(payload: RawMetrics | null | undefined): Metrics {
  const ordersByStatus = Array.isArray(payload?.orders_by_status) ? payload.orders_by_status : []
  const hourlyLoadRaw = Array.isArray(payload?.hourly_load) ? payload.hourly_load : []
  const topDrinksRaw = Array.isArray(payload?.top_drinks) ? payload.top_drinks : []

  const ordersCount = toNumber(payload?.orders_count, 0) || ordersByStatus.reduce((sum, item) => sum + toNumber(item.count, 0), 0)

  return {
    revenue: toNumber(payload?.revenue, 0),
    averageCheck: toNumber(payload?.average_check, 0),
    ordersCount,
    hourlyLoad: hourlyLoadRaw.map((item) => ({
      hour: `${toNumber(item.hour, 0).toString().padStart(2, '0')}:00`,
      orders: toNumber(item.orders_count, 0),
    })),
    topDrinks: topDrinksRaw.map((item, index) => ({
      name: toString(item.name, `Напиток ${index + 1}`),
      value: toNumber(item.total_quantity, 0),
    })),
  }
}

export default function AdminDashboard() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [month, setMonth] = useState('all')
  const [day, setDay] = useState('all')

  const yearOptions = useMemo(
    () => Array.from({ length: 4 }).map((_, i) => ({ label: String(currentYear - i), value: String(currentYear - i) })),
    [currentYear],
  )
  const monthOptions = [{ label: 'Все месяцы', value: 'all' }, ...Array.from({ length: 12 }).map((_, i) => ({ label: String(i + 1).padStart(2, '0'), value: String(i + 1) }))]
  const dayOptions = [{ label: 'Все дни', value: 'all' }, ...Array.from({ length: 31 }).map((_, i) => ({ label: String(i + 1).padStart(2, '0'), value: String(i + 1) }))]

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminMetrics', year, month, day],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RawMetrics>>('/admin/metrics', {
        params: {
          year: Number(year),
          month: month === 'all' ? undefined : Number(month),
          day: day === 'all' ? undefined : Number(day),
        },
      })
      return normalizeMetrics(response.data.data)
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader size="lg" color="primary" />
      </div>
    )
  }

  if (isError || !data) {
    return <Alert color="danger">Не удалось загрузить аналитику.</Alert>
  }

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-3">
        <Select
          label="Год"
          options={yearOptions}
          value={yearOptions.find((option) => option.value === year) ?? yearOptions[0]}
          onChange={(value) => setYear(String(typeof value === 'object' && value && 'value' in value ? value.value : value))}
        />
        <Select
          label="Месяц"
          options={monthOptions}
          value={monthOptions.find((option) => option.value === month) ?? monthOptions[0]}
          onChange={(value) => setMonth(String(typeof value === 'object' && value && 'value' in value ? value.value : value))}
        />
        <Select
          label="День"
          options={dayOptions}
          value={dayOptions.find((option) => option.value === day) ?? dayOptions[0]}
          onChange={(value) => setDay(String(typeof value === 'object' && value && 'value' in value ? value.value : value))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-2xl bg-white p-5 shadow-sm">
          <Text className="text-sm uppercase tracking-[0.06em] text-text-main/70">Выручка</Text>
          <Title as="h3" className="mt-3 font-display text-4xl text-primary">
            {rub.format(data.revenue)} ₽
          </Title>
        </Card>

        <Card className="rounded-2xl bg-white p-5 shadow-sm">
          <Text className="text-sm uppercase tracking-[0.06em] text-text-main/70">Средний чек</Text>
          <Title as="h3" className="mt-3 font-display text-4xl text-primary">
            {rub.format(data.averageCheck)} ₽
          </Title>
        </Card>

        <Card className="rounded-2xl bg-white p-5 shadow-sm">
          <Text className="text-sm uppercase tracking-[0.06em] text-text-main/70">Количество заказов</Text>
          <Title as="h3" className="mt-3 font-display text-4xl text-primary">
            {rub.format(data.ordersCount)}
          </Title>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl bg-white p-5 shadow-sm">
          <Title as="h4" className="mb-4 text-xl text-text-main">
            Почасовая загрузка
          </Title>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlyLoad}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="hour" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" fill="#2B2D9E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl bg-white p-5 shadow-sm">
          <Title as="h4" className="mb-4 text-xl text-text-main">
            Топ-10 позиций
          </Title>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.topDrinks} dataKey="value" nameKey="name" outerRadius={110} innerRadius={45} paddingAngle={2}>
                  {data.topDrinks.map((item, index) => (
                    <Cell key={`cell-${item.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  )
}

