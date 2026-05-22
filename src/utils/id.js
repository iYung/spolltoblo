export function getOrCreateId() {
  const existing = localStorage.getItem('spolltoblo-peer-id')
  if (existing) return existing
  const id = Math.random().toString(36).slice(2, 10)
  localStorage.setItem('spolltoblo-peer-id', id)
  return id
}
