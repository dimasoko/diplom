import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Checkbox, Drawer, Input, Loader, Select, Table } from 'rizzui'
import { apiClient } from '../../api/client'
import { ApiEnvelope, rub, toNumber, toString } from './shared'

type RawMenuItem = {
  id?: unknown
  name?: unknown
  category?: unknown
  category_name?: unknown
  category_slug?: unknown
  category_obj?: { name?: unknown; slug?: unknown } | null
  price_s?: unknown
  price_m?: unknown
  price_l?: unknown
  base_price?: unknown
  image_url?: unknown
  photo_url?: unknown
  is_seasonal?: unknown
}

type MenuRow = {
  id: string
  name: string
  categoryName: string
  categoryValue: string
  basePrice: number
  imageUrl: string | null
  isSeasonal: boolean
}

const formSchema = z.object({
  name: z.string().trim().min(2, 'Минимум 2 символа'),
  category: z.string().trim().min(1, 'Выберите категорию'),
  base_price: z.coerce.number().positive('Цена должна быть больше 0'),
  image_url: z.string().trim().optional(),
  is_seasonal: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

function normalizeCategory(raw: RawMenuItem): { name: string; value: string } {
  const fromObj = raw.category as { name?: unknown; slug?: unknown } | null
  const name =
    toString(fromObj?.name) ||
    toString(raw.category_name) ||
    (typeof raw.category === 'string' ? raw.category : '') ||
    'Без категории'

  const value =
    toString(fromObj?.slug) ||
    toString(raw.category_slug) ||
    name.toLowerCase().replace(/\s+/g, '-')

  return { name, value }
}

function normalizeMenuItems(payload: unknown): MenuRow[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : []

  return source.map((item, index) => {
    const raw = item as RawMenuItem
    const category = normalizeCategory(raw)

    return {
      id: toString(raw.id, `item-${index}`),
      name: toString(raw.name, 'Без названия'),
      categoryName: category.name,
      categoryValue: category.value,
      basePrice:
        toNumber(raw.base_price, 0) ||
        toNumber(raw.price_m, 0) ||
        toNumber(raw.price_s, 0) ||
        toNumber(raw.price_l, 0),
      imageUrl: toString(raw.image_url) || toString(raw.photo_url) || null,
      isSeasonal: Boolean(raw.is_seasonal),
    }
  })
}

function toPayload(values: FormValues) {
  return {
    name: values.name,
    category: values.category,
    base_price: values.base_price,
    price_s: values.base_price,
    price_m: values.base_price,
    price_l: values.base_price,
    image_url: values.image_url?.trim() || null,
    photo_url: values.image_url?.trim() || null,
    is_seasonal: values.is_seasonal,
  }
}

export default function AdminMenu() {
  const queryClient = useQueryClient()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<MenuRow | null>(null)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      base_price: 0,
      image_url: '',
      is_seasonal: false,
    },
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminMenuItems'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<unknown>>('/menu/items')
      return normalizeMenuItems(response.data.data)
    },
  })

  const categoryOptions = useMemo(() => {
    const unique = new Map<string, { label: string; value: string }>()

    for (const row of data ?? []) {
      unique.set(row.categoryValue, {
        value: row.categoryValue,
        label: row.categoryName,
      })
    }

    const options = Array.from(unique.values())
    return options.length > 0 ? options : [{ value: 'klassika', label: 'Классика' }]
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = toPayload(values)

      if (editing) {
        await apiClient.put(`/menu/items/${editing.id}`, payload)
      } else {
        await apiClient.post('/menu/items', payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems'] })
      setIsDrawerOpen(false)
      setEditing(null)
      reset()
    },
  })

  const openCreate = () => {
    setEditing(null)
    reset({
      name: '',
      category: categoryOptions[0]?.value ?? '',
      base_price: 0,
      image_url: '',
      is_seasonal: false,
    })
    setIsDrawerOpen(true)
  }

  const openEdit = (row: MenuRow) => {
    setEditing(row)
    reset({
      name: row.name,
      category: row.categoryValue,
      base_price: row.basePrice,
      image_url: row.imageUrl ?? '',
      is_seasonal: row.isSeasonal,
    })
    setIsDrawerOpen(true)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-4xl text-primary">Управление меню</h2>
        <Button
          type="button"
          className="border-primary bg-primary text-white hover:bg-primary/90"
          onClick={openCreate}
        >
          Создать
        </Button>
      </div>

      {isError ? <Alert color="danger">Не удалось загрузить позиции меню.</Alert> : null}
      {saveMutation.isError ? <Alert color="danger">Не удалось сохранить изменения.</Alert> : null}

      <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader size="lg" color="primary" />
          </div>
        ) : (
          <Table variant="minimal">
            <Table.Header>
              <Table.Row>
                <Table.Head>Фото</Table.Head>
                <Table.Head>Название</Table.Head>
                <Table.Head>Категория</Table.Head>
                <Table.Head>Базовая цена</Table.Head>
                <Table.Head>Действия</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(data ?? []).length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5}>Позиции меню не найдены</Table.Cell>
                </Table.Row>
              ) : (
                (data ?? []).map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell>
                      {row.imageUrl ? (
                        <img
                          src={row.imageUrl}
                          alt={row.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-bg-surface" />
                      )}
                    </Table.Cell>
                    <Table.Cell>{row.name}</Table.Cell>
                    <Table.Cell>{row.categoryName}</Table.Cell>
                    <Table.Cell>{rub.format(row.basePrice)} ₽</Table.Cell>
                    <Table.Cell>
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)}>
                        Редактировать
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        )}
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setEditing(null)
        }}
        placement="right"
        size="lg"
      >
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="h-full overflow-auto bg-white p-6"
        >
          <h3 className="mb-6 font-display text-3xl text-primary">
            {editing ? 'Редактирование позиции' : 'Создание позиции'}
          </h3>

          <div className="space-y-4">
            <Input
              label="Название"
              placeholder="Например, Капучино"
              error={errors.name?.message}
              {...register('name')}
            />

            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  label="Категория"
                  options={categoryOptions}
                  value={categoryOptions.find((option) => option.value === field.value) ?? categoryOptions[0]}
                  onChange={(value) => {
                    if (value && typeof value === 'object' && 'value' in value) {
                      field.onChange(String(value.value))
                    } else {
                      field.onChange(String(value))
                    }
                  }}
                  placeholder="Выберите категорию"
                  error={errors.category?.message}
                />
              )}
            />

            <Input
              type="number"
              label="Базовая цена"
              placeholder="0"
              error={errors.base_price?.message}
              {...register('base_price', { valueAsNumber: true })}
            />

            <Input
              label="URL фото"
              placeholder="https://..."
              error={errors.image_url?.message}
              {...register('image_url')}
            />

            <Controller
              control={control}
              name="is_seasonal"
              render={({ field }) => (
                <Checkbox
                  label="Сезонная позиция"
                  checked={field.value}
                  onChange={(event) => {
                    setValue('is_seasonal', event.target.checked)
                    field.onChange(event)
                  }}
                />
              )}
            />

            <Button
              type="submit"
              isLoading={saveMutation.isPending}
              className="w-full border-primary bg-primary text-white hover:bg-primary/90"
            >
              Сохранить
            </Button>
          </div>
        </form>
      </Drawer>
    </section>
  )
}
