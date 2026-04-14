const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function getToken() {
  return sessionStorage.getItem('tv_token')
}

export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}

// ── Auth ──────────────────────────────────────────────────────
export async function login(password) {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res.json()
}

// ── Registrations ─────────────────────────────────────────────
export async function submitRegistration(data) {
  const res = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function fetchRegistrations() {
  const res = await fetch(`${BASE}/api/registrations`, { headers: authHeaders() })
  return res.json()
}

export async function updateRegistrationStatus(id, status) {
  const res = await fetch(`${BASE}/api/registrations/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  })
  return res.json()
}

export async function deleteRegistrationAPI(id) {
  const res = await fetch(`${BASE}/api/registrations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return res.json()
}

export async function downloadPptAPI(id) {
  const res = await fetch(`${BASE}/api/registrations/${id}/ppt`, { headers: authHeaders() })
  return res.json()
}

// ── Check-in ──────────────────────────────────────────────────
export async function checkInTicket(ticketId) {
  const res = await fetch(`${BASE}/api/checkin`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ticketId }),
  })
  return res.json()
}

// ── Sponsors ──────────────────────────────────────────────────
export async function fetchSponsors() {
  const res = await fetch(`${BASE}/api/sponsors`)
  return res.json()
}

export async function addSponsor(name, imageData) {
  const res = await fetch(`${BASE}/api/sponsors`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, imageData }),
  })
  return res.json()
}

export async function editSponsor(id, name, imageData) {
  const res = await fetch(`${BASE}/api/sponsors/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name, imageData }),
  })
  return res.json()
}

export async function deleteSponsorAPI(id) {
  const res = await fetch(`${BASE}/api/sponsors/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return res.json()
}

// ── WhatsApp / Notifications ──────────────────────────────────
export async function notifyRegistration(data) {
  return fetch(`${BASE}/api/notify-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {})
}

export async function sendTicket(data) {
  const res = await fetch(`${BASE}/api/send-ticket`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function notifyStatus(data) {
  const res = await fetch(`${BASE}/api/notify-status`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getWAStatus() {
  const res = await fetch(`${BASE}/api/status`)
  return res.json()
}

export async function getWAQr(token) {
  const res = await fetch(`${BASE}/api/qr`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}
