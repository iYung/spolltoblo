import { generateId } from '../../utils/id.js'

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string')
  })

  it('is exactly 8 characters long', () => {
    expect(generateId()).toHaveLength(8)
  })

  it('contains only alphanumeric base-36 characters', () => {
    expect(generateId()).toMatch(/^[a-z0-9]+$/)
  })

  it('returns different values on successive calls', () => {
    expect(generateId()).not.toBe(generateId())
  })
})
