import { describe, expect, it } from 'vitest'

import { adminEventSchema, metricsQuerySchema, usersQuerySchema } from './admin.validation'

describe('admin.validation', () => {
  it('applies defaults for users query', () => {
    const parsed = usersQuerySchema.parse({})

    expect(parsed.page).toBe(1)
    expect(parsed.limit).toBe(20)
  })

  it('validates metrics query ranges', () => {
    const parsed = metricsQuerySchema.parse({ year: '2026', month: '5', day: '20' })

    expect(parsed).toEqual({ year: 2026, month: 5, day: 20 })
  })

  it('validates admin event payload', () => {
    const parsed = adminEventSchema.parse({
      title: 'Каппинг Бразилии',
      description: 'Дегустация лотов',
      event_date: '2026-06-01T12:00:00.000Z',
      photo_url: 'https://example.com/event.jpg',
      is_published: true,
    })

    expect(parsed.title).toBe('Каппинг Бразилии')
    expect(parsed.event_date).toBeInstanceOf(Date)
  })
})
