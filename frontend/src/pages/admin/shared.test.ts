import { describe, expect, it } from 'vitest'

import { getPublicOrderNumber, toLocalDateTime, toNumber, toString } from './shared'

describe('admin shared utils', () => {
  it('converts numeric values safely', () => {
    expect(toNumber('123')).toBe(123)
    expect(toNumber('bad', 7)).toBe(7)
  })

  it('returns string with fallback', () => {
    expect(toString('ok')).toBe('ok')
    expect(toString(100, 'fallback')).toBe('fallback')
  })

  it('formats local datetime', () => {
    expect(toLocalDateTime('2026-05-20T10:00:00.000Z')).not.toBe('-')
    expect(toLocalDateTime('invalid')).toBe('-')
  })

  it('builds stable public order number', () => {
    expect(getPublicOrderNumber('abc')).toHaveLength(4)
    expect(getPublicOrderNumber(123456)).toBe('3456')
  })
})
