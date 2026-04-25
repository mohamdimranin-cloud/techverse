require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const QRCode = require('qrcode')
const { useDBAuthState } = require('./waAuthState')
const { v2: cloudinary } = require('cloudinary')
const { pool, initDB } = require('./db')
const {
  default: makeWASocket,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')

const app = express()
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!origin || allowed.length === 0 || allowed.includes('*') || allowed.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '100mb' }))

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})
console.log('Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? '✅ set' : '❌ missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ set' : '❌ missing',
})

async function uploadToCloudinary(base64Data, filename) {
  const result = await cloudinary.uploader.upload(base64Data, {
    resource_type: 'raw',
    folder: 'techverse_ppts',
    public_id: filename.replace(/\.[^/.]+$/, ''),
    use_filename: true,
    overwrite: false,
    access_mode: 'public',
  })
  return result.secure_url
} // for base64 PPT/images

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH

// ── Auth ──────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try { req.admin = jwt.verify(auth.slice(7), JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Invalid or expired token' }) }
}

app.post('/api/login', async (req, res) => {
  const { password } = req.body
  if (!password) return res.status(400).json({ error: 'Password required' })
  const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
  if (!valid) return res.status(401).json({ error: 'Incorrect password' })
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token })
})

// ── Registrations ─────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { teamName, domain, college, teamSize, members, projectTitle, projectDesc, txnId, ppt, pptLink } = req.body
  const ticketId = `TV2026-${Math.random().toString(36).substring(2,7).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO registrations (ticket_id, team_name, domain, college, team_size, project_title, project_desc, txn_id, ppt_name, ppt_size, ppt_link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [ticketId, teamName, domain, college, teamSize, projectTitle, projectDesc, txnId,
       ppt?.name || null, ppt?.size || null, pptLink || null]
    )
    const reg = rows[0]
    for (let i = 0; i < members.length; i++) {
      const m = members[i]
      await client.query(
        `INSERT INTO members (registration_id, name, email, phone, role, is_leader) VALUES ($1,$2,$3,$4,$5,$6)`,
        [reg.id, m.name, m.email, m.phone, m.role || '', i === 0]
      )
    }
    // PPT is now uploaded directly to Cloudinary from the browser
    // ppt_url will be updated separately via /api/registrations/:id/ppt-url
    await client.query('COMMIT')
    res.json({ success: true, id: reg.id, ticketId })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: err.message })
  } finally { client.release() }
})

app.get('/api/registration-by-ticket/:ticketId', async (req, res) => {
  const { rows } = await pool.query(`SELECT id, ticket_id, team_name FROM registrations WHERE ticket_id=$1`, [req.params.ticketId])
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  res.json({ id: rows[0].id, ticketId: rows[0].ticket_id, teamName: rows[0].team_name })
})

app.get('/api/registrations', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.*, json_agg(json_build_object('name',m.name,'email',m.email,'phone',m.phone,'role',m.role,'isLeader',m.is_leader) ORDER BY m.is_leader DESC) AS members
    FROM registrations r LEFT JOIN members m ON m.registration_id = r.id
    GROUP BY r.id ORDER BY r.registered_at DESC
  `)
  res.json(rows)
})

app.patch('/api/registrations/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body
  await pool.query(`UPDATE registrations SET status=$1 WHERE id=$2`, [status, req.params.id])
  res.json({ success: true })
})

app.delete('/api/registrations/:id', requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM registrations WHERE id=$1`, [req.params.id])
  res.json({ success: true })
})

app.get('/api/registrations/:id/ppt', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT ppt_url, ppt_data, ppt_name FROM registrations WHERE id=$1`, [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Registration not found' })
  if (rows[0].ppt_url) return res.json({ url: rows[0].ppt_url, name: rows[0].ppt_name })
  if (rows[0].ppt_data) return res.json({ data: rows[0].ppt_data, name: rows[0].ppt_name })
  // No PPT stored — return 200 with null so frontend can handle gracefully
  res.json({ url: null, data: null, name: rows[0].ppt_name })
})

// ── Check-in ──────────────────────────────────────────────────
app.post('/api/checkin', requireAuth, async (req, res) => {
  const { ticketId } = req.body
  const { rows } = await pool.query(`SELECT * FROM registrations WHERE ticket_id=$1`, [ticketId])
  if (!rows[0]) return res.status(404).json({ success: false, error: 'Ticket not found' })

  const reg = rows[0]
  const count = reg.checkin_count || 0
  const teamSize = reg.team_size

  if (count >= teamSize) {
    return res.status(409).json({
      success: false,
      error: `All ${teamSize} member(s) already checked in`,
      reg,
    })
  }

  const newCount = count + 1
  const fullyCheckedIn = newCount >= teamSize

  await pool.query(
    `UPDATE registrations SET checkin_count=$1, checked_in=$2, checked_in_at=COALESCE(checked_in_at, NOW()) WHERE ticket_id=$3`,
    [newCount, fullyCheckedIn, ticketId]
  )

  res.json({
    success: true,
    checkinCount: newCount,
    teamSize,
    remaining: teamSize - newCount,
    fullyCheckedIn,
    reg: { ...reg, checkin_count: newCount },
  })
})

// ── Sponsors ──────────────────────────────────────────────────
app.get('/api/sponsors', async (req, res) => {
  const { rows } = await pool.query(`SELECT id, name, image_data FROM sponsors ORDER BY created_at`)
  res.json(rows)
})

app.post('/api/sponsors', requireAuth, async (req, res) => {
  const { name, imageData } = req.body
  const { rows } = await pool.query(`INSERT INTO sponsors (name, image_data) VALUES ($1,$2) RETURNING *`, [name, imageData])
  res.json(rows[0])
})

app.put('/api/sponsors/:id', requireAuth, async (req, res) => {
  const { name, imageData } = req.body
  const q = imageData
    ? `UPDATE sponsors SET name=$1, image_data=$2 WHERE id=$3 RETURNING *`
    : `UPDATE sponsors SET name=$1 WHERE id=$2 RETURNING *`
  const params = imageData ? [name, imageData, req.params.id] : [name, req.params.id]
  const { rows } = await pool.query(q, params)
  res.json(rows[0])
})

app.delete('/api/sponsors/:id', requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM sponsors WHERE id=$1`, [req.params.id])
  res.json({ success: true })
})

// ── WhatsApp ──────────────────────────────────────────────────
let sock = null, isConnected = false, qrCodeData = null, retryCount = 0

async function clearWASession() {
  await pool.query('DELETE FROM whatsapp_session')
  console.log('🗑️ WA session cleared from DB')
}

async function connectWhatsApp() {
  const { state, saveCreds } = await useDBAuthState()
  const { version } = await fetchLatestBaileysVersion()
  sock = makeWASocket({
    version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, console) },
    browser: ['Ubuntu', 'Chrome', '22.04'],
    connectTimeoutMs: 60000, keepAliveIntervalMs: 10000,
    syncFullHistory: false, markOnlineOnConnect: false,
  })
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) { qrCodeData = qr; console.log('📱 QR ready — check /api/qr') }
    if (connection === 'close') {
      isConnected = false
      const boom = lastDisconnect?.error instanceof Boom ? lastDisconnect.error : null
      const code = boom?.output?.statusCode
      const reason = boom?.output?.payload?.error || ''
      console.log(`🔌 WA disconnected — code: ${code}, reason: ${reason}`)

      if (code === DisconnectReason.loggedOut) {
        console.log('🚪 Logged out — clearing session and reconnecting for fresh QR')
        await clearWASession()
        retryCount = 0
        setTimeout(connectWhatsApp, 2000)
        return
      }
      // conflict = another instance is active, don't fight it
      if (reason?.toLowerCase().includes('conflict') || code === 440) {
        console.log('⚠️ Conflict detected (another instance active) — not reconnecting')
        return
      }
      retryCount++
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${retryCount})`)
      setTimeout(connectWhatsApp, delay)
    }
    if (connection === 'open') { isConnected = true; qrCodeData = null; retryCount = 0; console.log('✅ WhatsApp connected') }
  })
  sock.ev.on('creds.update', saveCreds)
}
connectWhatsApp().catch(console.error)

app.get('/api/status', (req, res) => res.json({ connected: isConnected, hasQr: !!qrCodeData }))

app.get('/api/qr', requireAuth, async (req, res) => {
  if (!qrCodeData) return res.status(404).json({ error: 'No QR yet' })
  const dataUrl = await QRCode.toDataURL(qrCodeData, { width: 300, margin: 2 })
  res.json({ qr: dataUrl })
})

// Force clear session and get a fresh QR
app.post('/api/wa-reset', requireAuth, async (req, res) => {
  try {
    isConnected = false
    qrCodeData = null
    retryCount = 0
    if (sock) { try { sock.end() } catch {} }
    await clearWASession()
    setTimeout(connectWhatsApp, 1000)
    res.json({ success: true, message: 'Session cleared — new QR will be ready in a few seconds' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

async function sendWA(phone, message) {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('0')) p = '91' + p.slice(1)
  if (!p.startsWith('91')) p = '91' + p
  await sock.sendMessage(`${p}@s.whatsapp.net`, { text: message })
}

// ── Cloudinary signed upload ──────────────────────────────────
app.get('/api/cloudinary-signature', (req, res) => {
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder: 'techverse_ppts',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'techverse_ppts',
  })
})

app.patch('/api/registrations/:id/ppt-url', async (req, res) => {
  const { pptUrl, pptName, pptSize } = req.body
  await pool.query(
    `UPDATE registrations SET ppt_url=$1, ppt_name=$2, ppt_size=$3 WHERE id=$4`,
    [pptUrl, pptName, pptSize, req.params.id]
  )
  res.json({ success: true })
})

app.post('/api/notify-registration', async (req, res) => {
  const { teamName, members, domain, projectTitle, txnId, ticketId, hasPpt } = req.body
  if (!isConnected) return res.json({ success: false, error: 'WhatsApp not connected', results: [] })

  const uploadLine = !hasPpt
    ? `\n\n📎 *Upload your PPT here:*\nhttps://bit-techverse.netlify.app/upload/${ticketId}`
    : ''

  const msg = `✅ *Registration Confirmed!*\n\nHey Team *${teamName}*, your registration for *TechVerse Hackathon 2026* is complete! 🚀\n\n📌 *Domain:* ${domain}\n💡 *Project:* ${projectTitle}\n🎫 *Registration ID:* ${ticketId || 'N/A'}${uploadLine}\n\n📅 9 & 10 May 2026\n📍 Bearys Institute of Technology, Mangalore\n\nRegistration is free. If shortlisted, you'll receive a payment request of ₹549 to confirm your spot.\n\n📧 techverse@bitmangalore.edu.in\n\n*Team TechVerse* ⚡`
  const results = []
  for (const m of members) {
    try { await sendWA(m.phone, msg); results.push({ name: m.name, status: 'sent' }) }
    catch (e) { results.push({ name: m.name, status: 'failed', error: e.message }) }
  }
  res.json({ success: true, results })
})

app.post('/api/send-ticket', async (req, res) => {
  const { teamName, members, domain, projectTitle, ticketId } = req.body
  const qrData = `TECHVERSE2026:${ticketId}`
  const qrBase64 = await QRCode.toDataURL(qrData, { width: 400, margin: 2, color: { dark: '#ffffff', light: '#020817' } })
  const qrBuffer = Buffer.from(qrBase64.split(',')[1], 'base64')
  const msg = `🎟️ *Your TechVerse 2026 Ticket*\n\nTeam: *${teamName}*\nTicket ID: \`${ticketId}\`\nDomain: ${domain}\nProject: ${projectTitle}\n\n📅 9 & 10 May 2026\n📍 Bearys Institute of Technology, Mangalore\n\n*Show this QR code at the entry gate.*\n\n_Do not share your ticket._\n\n*Team TechVerse* ⚡`
  const results = { whatsapp: [] }
  if (isConnected && sock) {
    for (const m of members) {
      let p = m.phone.replace(/\D/g, '')
      if (p.startsWith('0')) p = '91' + p.slice(1)
      if (!p.startsWith('91')) p = '91' + p
      const jid = `${p}@s.whatsapp.net`
      try {
        await sock.sendMessage(jid, { text: msg })
        await sock.sendMessage(jid, { image: qrBuffer, caption: `🎟️ ${ticketId}`, mimetype: 'image/png' })
        results.whatsapp.push({ name: m.name, status: 'sent' })
      } catch (e) { results.whatsapp.push({ name: m.name, status: 'failed', error: e.message }) }
    }
  } else {
    console.log('⚠️ WhatsApp not connected, skipping WA ticket send')
    members.forEach(m => results.whatsapp.push({ name: m.name, status: 'skipped' }))
  }
  res.json({ success: true, ticketId, qr: qrBase64, results })
})

app.post('/api/send-payment-request', requireAuth, async (req, res) => {
  const { teamName, members } = req.body
  if (!isConnected) return res.json({ success: false, error: 'WhatsApp not connected', results: [] })

  const UPI_ID = '7760543128@ibl'
  const amount = 549
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=TechVerse%20Hackathon&am=${amount}&cu=INR&tn=TechVerse%202026%20Participation`
  const qrData = `upi://pay?pa=${UPI_ID}&pn=TechVerse%20Hackathon&am=${amount}&cu=INR&tn=TechVerse%202026%20Participation`
  const qrBase64 = await QRCode.toDataURL(qrData, { width: 400, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
  const qrBuffer = Buffer.from(qrBase64.split(',')[1], 'base64')

  const msg = `🎉 *Congratulations!*\n\nYour team *${teamName}* has been shortlisted for the next round.\n\nTo proceed, please complete the participation fee of *₹549* using the link provided. Once your payment is successfully confirmed, your QR code ticket will be generated and sent to you.\n\n💳 *UPI ID:* ${UPI_ID}\n🔗 *Pay Link:* ${upiLink}\n\nPlease send your successful payment screenshot to this number.\n\nWe look forward to seeing you in the next round!\n\n*Team TechVerse* ⚡`

  const results = []
  for (const m of members) {
    let p = m.phone.replace(/\D/g, '')
    if (p.startsWith('0')) p = '91' + p.slice(1)
    if (!p.startsWith('91')) p = '91' + p
    const jid = `${p}@s.whatsapp.net`
    try {
      await sock.sendMessage(jid, { text: msg })
      await sock.sendMessage(jid, { image: qrBuffer, caption: `Scan to pay ₹499 — TechVerse Round 2`, mimetype: 'image/png' })
      results.push({ name: m.name, status: 'sent' })
    } catch (e) {
      results.push({ name: m.name, status: 'failed', error: e.message })
    }
  }
  res.json({ success: true, results })
})

app.post('/api/notify-status', requireAuth, async (req, res) => {
  const { teamName, members, domain, projectTitle, status } = req.body
  if (!isConnected) return res.json({ success: false, error: 'WhatsApp not connected', results: [] })
  const msgs = {
    'pending': `⏳ *Team ${teamName}* — Your registration is under review. Stay tuned!\n\n*Team TechVerse* ⚡`,
    'shortlisted': `🎉 *Congratulations, Team ${teamName}!*\n\nYou've been *SHORTLISTED* for TechVerse Hackathon 2026! 🚀\n\n📌 *Domain:* ${domain}\n💡 *Project:* ${projectTitle}\n📅 9 & 10 May 2026\n📍 Bearys Institute of Technology, Mangalore\n\n━━━━━━━━━━━━━━━━━━\n💳 *Participation Fee Required*\n\nTo confirm your participation, please complete the fee:\n\n*Amount:* ₹549 (per team)\n*UPI ID:* 7760543128@ibl\n\nPay and send the transaction ID to this number to confirm your slot.\n━━━━━━━━━━━━━━━━━━\n\n📧 techverse@bitmangalore.edu.in\n\n*Team TechVerse* ⚡`,
    'rejected': `😔 *Team ${teamName}* — Unfortunately your application was not selected this time. Thank you for participating!\n\n*Team TechVerse* ⚡`,
  }
  const message = msgs[status] || `📢 *Team ${teamName}* — Status updated to *${status}*.\n\n*Team TechVerse* ⚡`
  const results = []
  for (const m of members) {
    try { await sendWA(m.phone, message); results.push({ name: m.name, status: 'sent' }) }
    catch (e) { results.push({ name: m.name, status: 'failed', error: e.message }) }
  }
  res.json({ success: true, results })
})

// ── Keep-alive ping ───────────────────────────────────────────
app.get('/ping', (req, res) => res.send('pong'))

// Self-ping every 14 minutes to prevent Render sleep
setInterval(() => {
  const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3001}`
  fetch(`${url}/ping`).catch(() => {})
}, 14 * 60 * 1000)

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 TechVerse API → http://localhost:${PORT}`))
}).catch(err => { console.error('DB init failed:', err); process.exit(1) })

// Cloudinary config (added after imports)
