export function cardImages(card) {
  if (card?.image_uris?.normal) return [card.image_uris.normal]
  if (card?.card_faces) {
    const urls = card.card_faces.map((f) => f.image_uris?.normal).filter(Boolean)
    if (urls.length) return urls
  }
  return []
}
