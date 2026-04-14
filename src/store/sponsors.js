const KEY = 'techverse_sponsors'

export function getSponsors() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch { return [] }
}

export function saveSponsor(name, imageData) {
  const all = getSponsors()
  const entry = { id: crypto.randomUUID(), name, imageData }
  all.push(entry)
  localStorage.setItem(KEY, JSON.stringify(all))
  return entry
}

export function updateSponsor(id, name, imageData) {
  const all = getSponsors().map(s =>
    s.id === id ? { ...s, name, imageData: imageData || s.imageData } : s
  )
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function deleteSponsor(id) {
  const all = getSponsors().filter(s => s.id !== id)
  localStorage.setItem(KEY, JSON.stringify(all))
}
