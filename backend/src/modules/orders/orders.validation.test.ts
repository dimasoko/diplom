import { describe, expect, it } from 'vitest'

import { queueQuerySchema, updateOrderStatusSchema } from './orders.validation'

describe('orders.validation', () => {
  it('normalizes queue statuses from csv string', () => {
    const parsed = queueQuerySchema.parse({ statuses: 'pending, ready, invalid' })
    expect(parsed.statuses).toEqual(['PENDING', 'READY'])
  })

  it('rejects equal old/new status', () => {
    const result = updateOrderStatusSchema.safeParse({
      old_status: 'READY',
      new_status: 'READY',
    })

    expect(result.success).toBe(false)
  })
})
