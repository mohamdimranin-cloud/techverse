// localStorage stores only metadata (no file blobs)
const KEY = 'techverse_registrations'

export function getRegistrations() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

export function saveRegistration(data) {
  const all = getRegistrations()
  const ticketId = `TV2026-${Math.random().toString(36).substring(2,7).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
  const entry = {
    ...data,
    id: crypto.randomUUID(),
    ticketId,
    registeredAt: new Date().toISOString(),
    status: 'pending',
    checkedIn: false,
  }
  all.push(entry)
  localStorage.setItem(KEY, JSON.stringify(all))
  return entry
}

export function updateStatus(id, status) {
  const all = getRegistrations().map(r => r.id === id ? { ...r, status } : r)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function deleteRegistration(id) {
  const all = getRegistrations().filter(r => r.id !== id)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function checkInByTicket(ticketId) {
  const all = getRegistrations()
  const reg = all.find(r => r.ticketId === ticketId)
  if (!reg) return { success: false, error: 'Ticket not found' }
  if (reg.checkedIn) return { success: false, error: 'Already checked in', reg }
  const updated = all.map(r => r.ticketId === ticketId ? { ...r, checkedIn: true, checkedInAt: new Date().toISOString() } : r)
  localStorage.setItem(KEY, JSON.stringify(updated))
  return { success: true, reg: { ...reg, checkedIn: true } }
}

export function getByTicket(ticketId) {
  return getRegistrations().find(r => r.ticketId === ticketId) || null
}
