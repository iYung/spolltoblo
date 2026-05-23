import { describe, it, expect } from 'vitest'
import { cardImages } from '../../utils/cardImages'

describe('cardImages', () => {
  it('returns [image_uris.normal] for a single-faced card', () => {
    const card = { image_uris: { normal: 'https://example.com/front.jpg' } }
    expect(cardImages(card)).toEqual(['https://example.com/front.jpg'])
  })

  it('returns URLs from each face for a dual-faced card', () => {
    const card = {
      card_faces: [
        { image_uris: { normal: 'https://example.com/face-a.jpg' } },
        { image_uris: { normal: 'https://example.com/face-b.jpg' } },
      ],
    }
    expect(cardImages(card)).toEqual([
      'https://example.com/face-a.jpg',
      'https://example.com/face-b.jpg',
    ])
  })

  it('skips faces that are missing image_uris', () => {
    const card = {
      card_faces: [
        { image_uris: { normal: 'https://example.com/face-a.jpg' } },
        {},
      ],
    }
    expect(cardImages(card)).toEqual(['https://example.com/face-a.jpg'])
  })

  it('returns [] for null input', () => {
    expect(cardImages(null)).toEqual([])
  })

  it('returns [] for undefined input', () => {
    expect(cardImages(undefined)).toEqual([])
  })

  it('returns [] for a card with neither image_uris nor card_faces', () => {
    expect(cardImages({ name: 'Mystery Card' })).toEqual([])
  })
})
