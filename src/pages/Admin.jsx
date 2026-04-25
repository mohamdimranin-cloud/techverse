import { useState, useEffect, useMemo } from 'react'
import emailjs from '@emailjs/browser'
import { fetchRegistrations, updateRegistrationStatus, deleteRegistrationAPI, downloadPptAPI, sendTicket, notifyStatus, sendPaymentRequest, getWAStatus, getWAQr, login as apiLogin } from '../api/client'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import AdminSponsors from './AdminSponsors'
import AdminCheckin from './AdminCheckin'
import AdminPPT from './AdminPPT'
import styles from './Admin.module.css'

import { getToken } from '../api/client'

const STATUS_COLORS = {
  pending: '#f59e0b',
  shortlisted: '#10b981',
  rejected: '#f87171',
  'payment pending': '#fb923c',
  'payment successful': '#22d3ee',
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('tv_token'))
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const getToken = () => sessionStorage.getItem('tv_token')
  const [registrations, setRegistrations] = useState([])
  const [search, setSearch] = useState('')
  const [filterDomain, setFilterDomain] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [selected, setSelected] = useState(null)
  const [confirmStatus, setConfirmStatus] = useState(null) // { id, status, reg }
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [activeTab, setActiveTab] = useState('registrations')
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }
  const [waConnected, setWaConnected] = useState(false)
  const reload = () => fetchRegistrations().then(rows => {
    if (!Array.isArray(rows)) return
    // Normalize snake_case DB fields to camelCase for the UI
    setRegistrations(rows.map(r => ({
      ...r,
      teamName: r.team_name || r.teamName,
      projectTitle: r.project_title || r.projectTitle,
      projectDesc: r.project_desc || r.projectDesc,
      txnId: r.txn_id || r.txnId,
      ticketId: r.ticket_id || r.ticketId,
      teamSize: r.team_size || r.teamSize,
      registeredAt: r.registered_at || r.registeredAt,
      checkedIn: r.checked_in || r.checkedIn,
      checkedInAt: r.checked_in_at || r.checkedInAt,
      ppt: (r.ppt_name || r.ppt) ? { name: r.ppt_name || r.ppt?.name, size: r.ppt_size || r.ppt?.size } : null,
      ppt_link: r.ppt_link || null,
    })))
  })
  const [waQr, setWaQr] = useState(null)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    if (authed) {
      reload()
      // Poll registrations every 10 seconds for live updates
      const regInterval = setInterval(reload, 10000)

      const check = async () => {
        try {
          const data = await getWAStatus()
          setWaConnected(data.connected)
          if (!data.connected && data.hasQr) {
            const qrData = await getWAQr(getToken())
            if (qrData.qr) setWaQr(qrData.qr)
          } else { setWaQr(null) }
        } catch { setWaConnected(false) }
      }
      check()
      const waInterval = setInterval(check, 4000)
      return () => { clearInterval(regInterval); clearInterval(waInterval) }
    }
  }, [authed])

  const login = async (e) => {
    e.preventDefault()
    setPwLoading(true)
    setPwError('')
    try {
      const data = await apiLogin(pw)
      if (data.token) {
        sessionStorage.setItem('tv_token', data.token)
        setAuthed(true)
      } else {
        setPwError(data.error || 'Incorrect password')
      }
    } catch {
      setPwError('Cannot reach server. Make sure it is running.')
    } finally { setPwLoading(false) }
  }

  const logout = () => {
    sessionStorage.removeItem('tv_token')
    setAuthed(false)
  }

  const requestStatusChange = (id, status) => {
    const reg = registrations.find(r => r.id === id)
    setConfirmStatus({ id, status, reg })
  }

  const sendTicketEmails = async (reg, qrImageUrl) => {
    const members = reg.members || []
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = 'template_3r2tw3g'
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    console.log(`📧 EmailJS config — service: ${serviceId || '❌ missing'}, template: ${templateId}, key: ${publicKey ? '✅' : '❌ missing'}`)
    console.log(`📧 Sending ticket emails to ${members.length} member(s)`)
    const results = []
    for (const m of members) {
      if (!m.email) { console.warn(`⚠️ No email for ${m.name}`); continue }
      console.log(`📤 Sending to ${m.email} (${m.name})...`)
      try {
        const res = await emailjs.send(serviceId, templateId, {
          to_email: m.email,
          member_name: m.name,
          team_name: reg.team_name || reg.teamName,
          ticket_id: reg.ticket_id || reg.ticketId,
          domain: reg.domain,
          qr_image_url: qrImageUrl || '',
        }, publicKey)
        console.log(`✅ Email sent to ${m.email} — status: ${res.status} ${res.text}`)
        results.push({ name: m.name, status: 'sent' })
      } catch (e) {
        console.error(`❌ Email FAILED for ${m.email}:`, e?.text || e?.message || e)
        results.push({ name: m.name, status: 'failed', error: e?.text || e?.message })
      }
    }
    return results
  }

  const handleStatus = async () => {
    if (!confirmStatus) return
    const { id, status, reg } = confirmStatus
    setConfirmStatus(null)
    await updateRegistrationStatus(id, status)
    reload()
    if (selected?.id === id) setSelected(r => ({ ...r, status }))
    // Send WhatsApp notification for every status change
    if (reg) {
      try {
        // Send QR ticket when shortlisted
        if (status === 'shortlisted') {
          const waResult = await sendTicket({
            teamName: reg.team_name || reg.teamName,
            members: reg.members,
            domain: reg.domain,
            projectTitle: reg.project_title || reg.projectTitle,
            ticketId: reg.ticket_id || reg.ticketId,
          })
          const qrUrl = waResult?.qr || ''
          console.log(`🎟️ WA ticket sent, QR data URL length: ${qrUrl.length}`)
          const emailResults = await sendTicketEmails(reg, qrUrl)
          const sent = emailResults.filter(r => r.status === 'sent').length
          showToast(`Shortlisted! Ticket sent via WA + Email (${sent} emails)`, 'success')
        } else {
          const data = await notifyStatus({
            teamName: reg.team_name || reg.teamName,
            members: reg.members,
            domain: reg.domain,
            projectTitle: reg.project_title || reg.projectTitle,
            status,
          })
          if (data.success) {
            showToast(`✅ WhatsApp sent to ${data.results.filter(r => r.status === 'sent').length} member(s)`, 'success')
          } else {
            showToast(`⚠️ ${data.error}`, 'warn')
          }
        }
      } catch {
        showToast('⚠️ WhatsApp server unreachable', 'warn')
      }
    }
  }

  const handleDelete = async (id) => {
    await deleteRegistrationAPI(id)
    reload()
    setConfirmDelete(null)
    if (selected?.id === id) setSelected(null)
  }

  const exportExcel = async () => {
    const all = registrations
    const zip = new JSZip()
    const pptFolder = zip.folder('PPT_Files')
    let pptCount = 0
    const rows = []
    for (const r of all) {
      const teamName = r.team_name || r.teamName
      const domain = r.domain
      const college = r.college
      const pptName = r.ppt_name || r.ppt?.name
      let pptStatus = pptName || 'Not uploaded'
      if (pptName) {
        try {
          const pptData = await downloadPptAPI(r.id)
          if (pptData?.url) {
            // Cloudinary URL — fetch the file
            const res = await fetch(pptData.url)
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer()
              pptFolder.file(`${teamName}_${pptName}`, arrayBuf)
              pptCount++
            } else {
              pptStatus = 'Download failed'
            }
          } else if (pptData?.data) {
            // Legacy base64
            const base64 = pptData.data.includes(',') ? pptData.data.split(',')[1] : pptData.data
            const binary = atob(base64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            pptFolder.file(`${teamName}_${pptName}`, bytes)
            pptCount++
          }
        } catch (e) { pptStatus = 'Error: ' + e.message }
      }
      const members = r.members || []
      members.forEach((m, j) => {
        rows.push({
          'Team Name': teamName, 'Domain': domain, 'College': college,
          'Team Size': r.team_size || r.teamSize,
          'Member Role': j === 0 ? 'Leader' : `Member ${j + 1}`,
          'Full Name': m.name, 'Email': m.email, 'Phone': m.phone, 'Skill/Role': m.role,
          'Project Title': r.project_title || r.projectTitle,
          'Project Description': r.project_desc || r.projectDesc,
          'Status': r.status, 'Transaction ID': r.txn_id || r.txnId || '',
          'Ticket ID': r.ticket_id || r.ticketId || '',
          'PPT File': pptStatus,
          'PPT Link': r.ppt_link || '',
          'Registered At': new Date(r.registered_at || r.registeredAt).toLocaleString(),
        })
      })
    }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Registrations')
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    zip.file(`TechVerse_Registrations_${new Date().toISOString().slice(0,10)}.xlsx`, excelBuffer)
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TechVerse_Export_${new Date().toISOString().slice(0,10)}.zip`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`✅ Exported ${all.length} teams + ${pptCount} PPT files`, 'success')
  }

  const downloadPpt = async (reg) => {
    try {
      const data = await downloadPptAPI(reg.id)
      if (!data || (!data.url && !data.data)) {
        alert('No PPT uploaded for this team.')
        return
      }
      if (data.url) {
        const res = await fetch(data.url)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.name || reg.ppt?.name || 'presentation.pptx'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else if (data.data) {
        const a = document.createElement('a')
        a.href = data.data
        a.download = data.name
        a.click()
      }
    } catch (e) {
      alert('Download failed: ' + e.message)
    }
  }

  const domains = useMemo(() => ['All', ...new Set(registrations.map(r => r.domain))], [registrations])

  const filtered = useMemo(() => registrations.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.teamName.toLowerCase().includes(q) ||
      r.college.toLowerCase().includes(q) ||
      r.members.some(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    const matchDomain = filterDomain === 'All' || r.domain === filterDomain
    const matchStatus = filterStatus === 'All' || r.status === filterStatus
    return matchSearch && matchDomain && matchStatus
  }), [registrations, search, filterDomain, filterStatus])

  const stats = useMemo(() => ({
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    shortlisted: registrations.filter(r => r.status === 'shortlisted').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
    withPpt: registrations.filter(r => r.ppt).length,
  }), [registrations])

  // ── Login screen ──────────────────────────────────────────
  if (!authed) {
    return (
      <div className={styles.loginPage}>
        <div className={`glass-card ${styles.loginCard}`}>
          <div className={styles.loginIcon}>🛸</div>
          <h1 className={styles.loginTitle}>Admin Portal</h1>
          <p className={styles.loginSub}>TechVerse Hackathon 2026</p>
          <form onSubmit={login} className={styles.loginForm}>
            <div className={styles.field}>
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter admin password"
                value={pw}
                onChange={e => { setPw(e.target.value); setPwError('') }}
                autoFocus
              />
              {pwError && <span className={styles.error}>{pwError}</span>}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={pwLoading}>
              {pwLoading ? 'Verifying...' : 'Enter Admin Panel'}
            </button>
          </form>
          <p className={styles.loginHint}>Contact your administrator for the password.</p>
        </div>
      </div>
    )
  }

  // ── Admin dashboard ───────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>⚡ Admin Dashboard</h1>
          <p className={styles.pageSub}>TechVerse Hackathon 2026 — Registrations</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={exportExcel}>⬇ Export Excel</button>
          <button className="btn btn-outline" onClick={logout}>Logout</button>
          <span
          style={{ fontSize: '0.8rem', color: waConnected ? '#10b981' : '#f87171', cursor: 'pointer' }}
          onClick={() => setShowQr(true)}
          title={waConnected ? 'WhatsApp Connected' : 'Click to connect or reset WhatsApp'}
        >
          {waConnected ? '🟢 WhatsApp Connected' : waQr ? '🟡 Scan QR to Connect ↗' : '🔴 WhatsApp Offline (click to fix)'}
        </span>
        </div>
      </div>

      <div className={styles.inner}>
        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'registrations' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('registrations')}>📋 Registrations</button>
          <button className={`${styles.tab} ${activeTab === 'checkin' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('checkin')}>✅ Check-in</button>
          <button className={`${styles.tab} ${activeTab === 'ppt' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('ppt')}>📊 PPT</button>
          <button className={`${styles.tab} ${activeTab === 'sponsors' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('sponsors')}>🤝 Sponsors</button>
        </div>

        {activeTab === 'sponsors' && <AdminSponsors />}
        {activeTab === 'checkin' && <AdminCheckin />}
        {activeTab === 'ppt' && <AdminPPT />}

        {activeTab === 'registrations' && (<>
        {/* Stats */}
        <div className={styles.statsRow}>
          {[
            { label: 'Total Teams', val: stats.total, clr: '#a855f7' },
            { label: 'Pending', val: stats.pending, clr: '#f59e0b' },
            { label: 'Shortlisted', val: stats.shortlisted, clr: '#10b981' },
            { label: 'Rejected', val: stats.rejected, clr: '#f87171' },
            { label: 'PPT Uploaded', val: stats.withPpt, clr: '#38bdf8' },
          ].map(s => (
            <div key={s.label} className={`glass-card ${styles.statCard}`}>
              <span className={styles.statNum} style={{ color: s.clr }}>{s.val}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={`glass-card ${styles.filters}`}>
          <input
            type="text"
            placeholder="🔍  Search by team, college, or member name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} className={styles.select}>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={styles.select}>
            {['All', 'pending', 'shortlisted', 'rejected'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Table — full width now */}
        <div className={styles.layout}>
          <div className={`glass-card ${styles.tableWrap}`}>
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                {registrations.length === 0
                  ? '🌌 No registrations yet. Share the registration link!'
                  : '🔍 No results match your filters.'}
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Domain</th>
                    <th>College</th>
                    <th>Members</th>
                    <th>Ticket ID</th>
                    <th>PPT</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={`${styles.row} ${selected?.id === r.id ? styles.rowActive : ''}`}
                      onClick={() => setSelected(r)}
                    >
                      <td className={styles.idx}>{idx + 1}</td>
                      <td className={styles.teamName}>{r.teamName}</td>
                      <td><span className={styles.domainTag}>{r.domain}</span></td>
                      <td className={styles.college}>{r.college}</td>
                      <td className={styles.center}>{r.teamSize}</td>
                      <td className={styles.center} style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--neon-cyan)' }}>{r.ticketId || '—'}</td>
                      <td className={styles.center}>
                        {r.ppt
                          ? <span className={styles.pptBadge} onClick={e => { e.stopPropagation(); downloadPpt(r) }} title="Download PPT">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </span>
                          : <span className={styles.noPpt}>—</span>}
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{ color: STATUS_COLORS[r.status], borderColor: STATUS_COLORS[r.status] }}>
                          {r.status}
                        </span>
                      </td>
                      <td className={styles.date}>{new Date(r.registeredAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        </>) }

      </div>
      {selected && (
        <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div className={`glass-card ${styles.detailModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <h2 className={styles.detailTeam}>{selected.teamName}</h2>
              <button className={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className={styles.detailMeta}>
              <span className={styles.domainTag}>{selected.domain}</span>
              <span className={styles.statusBadge} style={{ color: STATUS_COLORS[selected.status], borderColor: STATUS_COLORS[selected.status] }}>
                {selected.status}
              </span>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailSection}>
                <h4>📍 College</h4>
                <p>{selected.college}</p>
              </div>

              <div className={styles.detailSection}>
                <h4>💡 Project</h4>
                <p className={styles.projectTitle}>{selected.projectTitle}</p>
                <p className={styles.projectDesc}>{selected.projectDesc}</p>
              </div>

              <div className={styles.detailSection}>
                <h4>👥 Team Members</h4>
                {selected.members.map((m, i) => (
                  <div key={i} className={styles.memberRow}>
                    <span className={styles.memberBadge}>{i === 0 ? '👑' : '👤'}</span>
                    <div>
                      <p className={styles.memberName}>{m.name} <span className={styles.memberRole}>· {m.role}</span></p>
                      <p className={styles.memberContact}>{m.email} · {m.phone}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.detailSection}>
                <h4>💳 Payment</h4>
                <p>Transaction ID: <span style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>{selected.txnId || '—'}</span></p>
              </div>

              {(selected.ppt || selected.ppt_link) && (
                <div className={styles.detailSection}>
                  <h4>📊 Presentation</h4>
                  {selected.ppt_link ? (
                    <a href={selected.ppt_link} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--neon-cyan)', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                      🔗 View Presentation
                    </a>
                  ) : (
                    <div className={styles.pptRow}>
                      <div>
                        <p className={styles.memberName}>{selected.ppt?.name || selected.ppt_name}</p>
                      </div>
                      <button className="btn btn-outline" onClick={() => downloadPpt(selected)}>⬇ Download</button>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.detailSection}>
                <h4>🔖 Update Status</h4>
                <button
                  className="btn btn-primary"
                  style={{ marginBottom: '0.75rem', width: '100%', background: 'rgba(168,85,247,0.15)', borderColor: '#a855f7', color: '#a855f7' }}
                  onClick={async () => {
                    try {
                      const data = await sendPaymentRequest({
                        teamName: selected.teamName,
                        members: selected.members,
                      })
                      if (data.success) showToast(`Payment request sent to ${data.results.filter(r => r.status === 'sent').length} member(s)`, 'success')
                      else showToast(`⚠️ ${data.error || 'Failed to send'}`, 'warn')
                    } catch (err) { showToast(`⚠️ ${err.message}`, 'warn') }
                  }}>
                  Send Payment Request (₹499)
                </button>
                <div className={styles.statusBtns}>
                  {['pending', 'shortlisted', 'rejected'].map(s => (
                    <button key={s}
                      className={`${styles.statusBtn} ${selected.status === s ? styles.statusBtnActive : ''}`}
                      style={{ '--clr': STATUS_COLORS[s] }}
                      onClick={() => requestStatusChange(selected.id, s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.detailSection}>
                <p className={styles.regDate}>Registered: {new Date(selected.registeredAt).toLocaleString()}</p>
                <button className={styles.deleteBtn} onClick={() => setConfirmDelete(selected.id)}>
                  🗑 Delete Registration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp QR Modal */}
      {showQr && (
        <div className={styles.modalOverlay} onClick={() => setShowQr(false)}>
          <div className={`glass-card ${styles.modal}`} onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>📱 Connect WhatsApp</h3>
            {waQr ? (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Open WhatsApp → Linked Devices → Link a Device → Scan this QR
                </p>
                <img src={waQr} alt="WhatsApp QR" style={{ width: 220, height: 220, borderRadius: 12 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.75rem' }}>QR refreshes automatically</p>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '1rem 0' }}>
                {waConnected ? '✅ WhatsApp is connected.' : '⏳ Waiting for QR... If stuck, click Reset Session below.'}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowQr(false)}>Close</button>
              {!waConnected && (
                <button className="btn btn-primary" onClick={async () => {
                  try {
                    await fetch(`${import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'}/api/wa-reset`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
                    })
                    setWaQr(null)
                    setTimeout(async () => {
                      const s = await getWAStatus()
                      if (s.hasQr) { const q = await getWAQr(getToken()); if (q.qr) setWaQr(q.qr) }
                    }, 4000)
                  } catch {}
                }}>🔄 Reset Session</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Confirm Modal */}
      {confirmStatus && (
        <div className={styles.modalOverlay} onClick={() => setConfirmStatus(null)}>
          <div className={`glass-card ${styles.modal}`} onClick={e => e.stopPropagation()}>
            <h3>Update Status?</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.2rem' }}>
              Mark <strong style={{ color: 'var(--text)' }}>{confirmStatus.reg?.teamName}</strong> as{' '}
              <strong style={{ color: STATUS_COLORS[confirmStatus.status] }}>{confirmStatus.status}</strong>?
              {confirmStatus.status === 'shortlisted' && (
                <span style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.82rem', color: '#22d3ee' }}>
                  🎟️ QR entry ticket will be sent to all members via WhatsApp & Email.
                </span>
              )}
            </p>
            <div className={styles.modalBtns}>
              <button className="btn btn-outline" onClick={() => setConfirmStatus(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStatus}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 999,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(251,146,60,0.15)',
          border: `1px solid ${toast.type === 'success' ? '#10b981' : '#fb923c'}`,
          color: toast.type === 'success' ? '#10b981' : '#fb923c',
          padding: '0.8rem 1.4rem', borderRadius: '12px',
          backdropFilter: 'blur(12px)', fontSize: '0.9rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h3>Delete Registration?</h3>
            <p>This action cannot be undone.</p>
            <div className={styles.modalBtns}>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className={`btn ${styles.btnDanger}`} onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
