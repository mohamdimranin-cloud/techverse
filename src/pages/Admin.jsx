import { useState, useEffect, useMemo } from 'react'
import emailjs from '@emailjs/browser'
import { fetchRegistrations, updateRegistrationStatus, deleteRegistrationAPI, updateMembers, downloadPptAPI, sendTicket, notifyStatus, sendPaymentRequest, getWAStatus, getWAQr, login as apiLogin } from '../api/client'
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
  const [editingMembers, setEditingMembers] = useState(null) // local copy for editing

  const [activeTab, setActiveTab] = useState('registrations')
  const [deadlineInput, setDeadlineInput] = useState('')
  const [deadlineSaved, setDeadlineSaved] = useState(false)
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
      members: (r.members || []).map(m => ({
        ...m,
        id: m.id || null,
      })),
    })))
  })
  const [waQr, setWaQr] = useState(null)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    if (authed) {
      reload()
      // Load current deadline
      fetch(`${import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'}/api/settings/deadline`)
        .then(r => r.json()).then(d => { if (d.deadline) setDeadlineInput(d.deadline.slice(0,16)) }).catch(() => {})
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
    await reload()
    if (selected?.id === id) setSelected(r => ({ ...r, status }))
    // Always use freshest members from reloaded registrations
    const freshReg = { ...reg, ...registrations.find(r => r.id === id), status }
    // Send WhatsApp notification for every status change
    if (freshReg) {
      try {
        // Send QR ticket when shortlisted
        if (status === 'shortlisted') {
          const waResult = await sendTicket({
            teamName: freshReg.team_name || freshReg.teamName,
            members: freshReg.members,
            domain: freshReg.domain,
            projectTitle: freshReg.project_title || freshReg.projectTitle,
            ticketId: freshReg.ticket_id || freshReg.ticketId,
          })
          const qrUrl = waResult?.qr || ''
          const emailResults = await sendTicketEmails(freshReg, qrUrl)
          const sent = emailResults.filter(r => r.status === 'sent').length
          showToast(`Shortlisted! Ticket sent via WA + Email (${sent} emails)`, 'success')
        } else {
          const data = await notifyStatus({
            teamName: freshReg.team_name || freshReg.teamName,
            members: freshReg.members,
            domain: freshReg.domain,
            projectTitle: freshReg.project_title || freshReg.projectTitle,
            status,
            feeAmount: freshReg.fee_amount || 549,
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

    const themeMap = {
      'Agritech': 'Rural Tech',
      'Fisheries & Coastal Solutions': 'Rural Tech',
      'Health Technology': 'MedTech',
      'Cybersecurity': 'Future Tech',
      'Energy Conservation & Digitization': 'Future Tech',
    }

    const themes = ['Rural Tech', 'MedTech', 'Future Tech']
    const grouped = { 'Rural Tech': [], 'MedTech': [], 'Future Tech': [] }

    all.forEach(r => {
      const theme = themeMap[r.domain] || 'Rural Tech'
      const members = r.members || []
      const row = {
        'Team Name': r.team_name || r.teamName,
        'Domain': r.domain,
        'College': r.college,
        'Team Size': r.team_size || r.teamSize,
        'Project Title': r.project_title || r.projectTitle || '',
        'Status': r.status,
        'Fee Amount': r.fee_amount || 549,
        'Ticket ID': r.ticket_id || r.ticketId || '',
        'PPT/PDF URL': r.ppt_url || r.ppt_link || '',
        'Registered At': new Date(r.registered_at || r.registeredAt).toLocaleString(),
      }
      members.forEach((m, i) => {
        const label = i === 0 ? 'Leader' : `Member ${i + 1}`
        row[`${label} Name`] = m.name || ''
        row[`${label} Email`] = m.email || ''
        row[`${label} Phone`] = m.phone || ''
        row[`${label} Role`] = m.role || ''
      })
      grouped[theme].push(row)
    })

    const wb = XLSX.utils.book_new()
    themes.forEach(theme => {
      const ws = XLSX.utils.json_to_sheet(grouped[theme].length ? grouped[theme] : [{ 'Team Name': 'No registrations yet' }])
      XLSX.utils.book_append_sheet(wb, ws, theme)
    })

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TechVerse_Registrations_${new Date().toISOString().slice(0,10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast(`Exported ${all.length} teams across 3 themes`, 'success')
  }

  const downloadPpt = async (reg) => {
    try {
      const data = await downloadPptAPI(reg.id)
      if (!data) { showToast('No file found.', 'warn'); return }
      if (data.url) {
        // Add fl_attachment to force download instead of browser render
        const downloadUrl = data.url.includes('res.cloudinary.com')
          ? data.url.replace('/raw/upload/', '/raw/upload/fl_attachment/')
          : data.url
        window.open(downloadUrl, '_blank')
      } else if (data.data) {
        const a = document.createElement('a')
        a.href = data.data
        a.download = data.name || 'presentation'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        showToast('File name recorded but upload may have failed. Ask team to re-upload.', 'warn')
      }
    } catch (e) {
      showToast('Download failed: ' + e.message, 'warn')
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
          <button className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('settings')}>⚙️ Settings</button>
        </div>

        {activeTab === 'sponsors' && <AdminSponsors />}
        {activeTab === 'checkin' && <AdminCheckin />}
        {activeTab === 'ppt' && <AdminPPT />}

        {activeTab === 'settings' && (
          <div className={`glass-card`} style={{ maxWidth: 480, padding: '2rem', marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--neon-cyan)' }}>Registration Deadline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="datetime-local"
                value={deadlineInput}
                onChange={e => { setDeadlineInput(e.target.value); setDeadlineSaved(false) }}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.95rem' }}
              />
              <button className="btn btn-primary" onClick={async () => {
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'}/api/settings/deadline`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                    body: JSON.stringify({ deadline: deadlineInput })
                  })
                  const data = await res.json()
                  if (data.success) { setDeadlineSaved(true); showToast('Deadline updated!', 'success') }
                } catch { showToast('Failed to update deadline', 'warn') }
              }}>
                Save Deadline
              </button>
              {deadlineSaved && <p style={{ color: '#10b981', fontSize: '0.85rem' }}>Saved — countdown will update on the website.</p>}
            </div>
          </div>
        )}

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
        <div className={styles.modalOverlay} onClick={() => { setSelected(null); setEditingMembers(null) }}>
          <div className={`glass-card ${styles.detailModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <h2 className={styles.detailTeam}>{selected.teamName}</h2>
              <button className={styles.closeBtn} onClick={() => { setSelected(null); setEditingMembers(null) }}>✕</button>
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
                {(editingMembers || selected.members).map((m, i) => (
                  editingMembers ? (
                    <div key={i} className={styles.memberRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={styles.memberBadge}>{i === 0 ? '👑' : '👤'}</span>
                        <input
                          value={m.name}
                          onChange={e => setEditingMembers(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                          placeholder="Name"
                          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '0.4rem 0.6rem', color: 'var(--text)', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', paddingLeft: '1.8rem' }}>
                        <input
                          value={m.email}
                          onChange={e => setEditingMembers(prev => prev.map((x, j) => j === i ? { ...x, email: e.target.value } : x))}
                          placeholder="Email"
                          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '0.4rem 0.6rem', color: 'var(--text)', fontSize: '0.85rem' }}
                        />
                        <input
                          value={m.phone}
                          onChange={e => setEditingMembers(prev => prev.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))}
                          placeholder="Phone"
                          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '0.4rem 0.6rem', color: 'var(--text)', fontSize: '0.85rem' }}
                        />
                        <input
                          value={m.role || ''}
                          onChange={e => setEditingMembers(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                          placeholder="Role"
                          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '0.4rem 0.6rem', color: 'var(--text)', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div key={i} className={styles.memberRow}>
                      <span className={styles.memberBadge}>{i === 0 ? '👑' : '👤'}</span>
                      <div>
                        <p className={styles.memberName}>{m.name} <span className={styles.memberRole}>· {m.role}</span></p>
                        <p className={styles.memberContact}>{m.email} · {m.phone}</p>
                      </div>
                    </div>
                  )
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {editingMembers ? (
                    <>
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}
                        onClick={async () => {
                          const data = await updateMembers(selected.id, editingMembers)
                          if (data.success) {
                            setSelected(r => ({ ...r, members: editingMembers }))
                            setEditingMembers(null)
                            reload()
                            showToast('Members updated', 'success')
                          } else {
                            showToast(`⚠️ ${data.error}`, 'warn')
                          }
                        }}>
                        💾 Save
                      </button>
                      <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}
                        onClick={() => setEditingMembers(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      onClick={() => setEditingMembers(selected.members.map(m => ({ ...m })))}>
                      ✏️ Edit Members
                    </button>
                  )}
                  {editingMembers && editingMembers.length < 4 && (
                    <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderColor: '#10b981', color: '#10b981', width: '100%', marginTop: '0.25rem' }}
                      onClick={() => setEditingMembers(prev => [...prev, { name: '', email: '', phone: '', role: '' }])}>
                      + Add Member ({editingMembers.length}/4)
                    </button>
                  )}
                </div>
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
                  style={{ marginBottom: '0.75rem', width: '100%', background: 'rgba(34,211,238,0.1)', borderColor: '#22d3ee', color: '#22d3ee' }}
                  onClick={async () => {
                    const ticketId = selected.ticket_id || selected.ticketId
                    const uploadUrl = `https://bit-techverse.netlify.app/upload/${ticketId}`
                    const msg = `📎 *Upload Your PPT*\n\nHey Team *${selected.teamName}*, please upload your presentation for TechVerse Hackathon 2026 using the link below:\n\n🔗 ${uploadUrl}\n\nYou can re-upload anytime — the latest file will be used for evaluation.\n\n*Team TechVerse* ⚡`
                    try {
                      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'}/api/send-upload-link`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                        body: JSON.stringify({ teamName: selected.teamName, members: selected.members, ticketId }),
                      })
                      const data = await res.json()
                      if (data.success) showToast(`Upload link sent to ${data.results.filter(r => r.status === 'sent').length} member(s)`, 'success')
                      else showToast(`⚠️ ${data.error || 'Failed to send'}`, 'warn')
                    } catch (err) { showToast(`⚠️ ${err.message}`, 'warn') }
                  }}>
                  📎 Send Upload Link via WhatsApp
                </button>
                <button
                  className="btn btn-primary"
                  style={{ marginBottom: '0.75rem', width: '100%', background: 'rgba(168,85,247,0.15)', borderColor: '#a855f7', color: '#a855f7' }}
                  onClick={async () => {
                    try {
                      const data = await sendPaymentRequest({
                        teamName: selected.teamName,
                        members: selected.members,
                        registrationId: selected.id,
                      })
                      if (data.success) showToast(`Payment request sent to ${data.results.filter(r => r.status === 'sent').length} member(s)`, 'success')
                      else showToast(`⚠️ ${data.error || 'Failed to send'}`, 'warn')
                    } catch (err) { showToast(`⚠️ ${err.message}`, 'warn') }
                  }}>
                  Send Payment Request (₹{selected.fee_amount || 549})
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

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    className={`${styles.statusBtn} ${selected.status === 'payment pending' ? styles.statusBtnActive : ''}`}
                    style={{ '--clr': '#fb923c', flex: 1 }}
                    onClick={async () => {
                      await updateRegistrationStatus(selected.id, 'payment pending')
                      reload()
                      setSelected(r => ({ ...r, status: 'payment pending' }))
                      try {
                        const data = await notifyStatus({
                          teamName: selected.teamName,
                          members: selected.members,
                          domain: selected.domain,
                          projectTitle: selected.projectTitle,
                          status: 'payment pending',
                          feeAmount: selected.fee_amount || 549,
                        })
                        showToast(data.success ? `Payment pending WA sent` : `⚠️ ${data.error}`, data.success ? 'success' : 'warn')
                      } catch { showToast('⚠️ WA unreachable', 'warn') }
                    }}>
                    Payment Pending
                  </button>
                  <button
                    className={`${styles.statusBtn} ${selected.status === 'payment successful' ? styles.statusBtnActive : ''}`}
                    style={{ '--clr': '#22d3ee', flex: 1 }}
                    onClick={async () => {
                      await updateRegistrationStatus(selected.id, 'payment successful')
                      reload()
                      setSelected(r => ({ ...r, status: 'payment successful' }))
                      try {
                        const data = await notifyStatus({
                          teamName: selected.teamName,
                          members: selected.members,
                          domain: selected.domain,
                          projectTitle: selected.projectTitle,
                          status: 'payment successful',
                          feeAmount: selected.fee_amount || 549,
                        })
                        showToast(data.success ? `Payment confirmed WA sent` : `⚠️ ${data.error}`, data.success ? 'success' : 'warn')
                      } catch { showToast('⚠️ WA unreachable', 'warn') }
                    }}>
                    Payment Successful
                  </button>
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
