import { useState, useEffect, useRef } from 'react'
import { fetchRegistrations, checkInTicket } from '../api/client'
import { Html5Qrcode } from 'html5-qrcode'
import styles from './AdminCheckin.module.css'

export default function AdminCheckin() {
  const [registrations, setRegistrations] = useState([])
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [manualId, setManualId] = useState('')
  const [search, setSearch] = useState('')
  const html5QrRef = useRef(null)

  const reload = () => fetchRegistrations().then(setRegistrations)
  useEffect(() => { reload() }, [])

  const checkedIn = registrations.filter(r => r.checked_in)
  const notCheckedIn = registrations.filter(r => !r.checked_in)

  const filtered = checkedIn.filter(r => {
    const q = search.toLowerCase()
    return !q || (r.team_name||'').toLowerCase().includes(q) || (r.ticket_id||'').toLowerCase().includes(q) || (r.college||'').toLowerCase().includes(q)
  })

  const handleScan = async (text) => {
    const id = text.replace('TECHVERSE2026:', '').trim()
    const outcome = await checkInTicket(id)
    setResult(outcome)
    reload()
    stopScanner()
  }

  const startScanner = async () => {
    setResult(null)
    setScanning(true)
    setTimeout(async () => {
      try {
        html5QrRef.current = new Html5Qrcode('admin-qr-reader')
        await html5QrRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => handleScan(text),
          () => {}
        )
      } catch (err) {
        setResult({ success: false, error: `Camera error: ${err.message}` })
        setScanning(false)
      }
    }, 100)
  }

  const stopScanner = async () => {
    try {
      if (html5QrRef.current) { await html5QrRef.current.stop(); html5QrRef.current.clear() }
    } catch {}
    setScanning(false)
  }

  useEffect(() => () => { stopScanner() }, [])

  const handleManual = async () => {
    if (!manualId.trim()) return
    const outcome = await checkInTicket(manualId.trim().toUpperCase())
    setResult(outcome)
    reload()
    setManualId('')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        {/* Scanner panel */}
        <div className={`glass-card ${styles.scanPanel}`}>
          <h3 className={styles.panelTitle}>📷 Scan QR for Entry</h3>

          <div id="admin-qr-reader" className={styles.scanBox} style={{ display: scanning ? 'block' : 'none' }} />

          {!scanning ? (
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.75rem' }} onClick={startScanner}>
              📷 Start Scanner
            </button>
          ) : (
            <button className="btn btn-outline" style={{ width: '100%', marginBottom: '0.75rem' }} onClick={stopScanner}>
              ✕ Stop Scanner
            </button>
          )}

          <div className={styles.manualRow}>
            <input type="text" placeholder="Enter Ticket ID manually"
              value={manualId} onChange={e => setManualId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManual()}
              className={styles.input} />
            <button className="btn btn-outline" onClick={handleManual}>Verify</button>
          </div>

          {result && (
            <div className={`${styles.result} ${result.success ? styles.success : styles.fail}`}>
              <span className={styles.resultIcon}>{result.success ? '✅' : result.reg ? '⚠️' : '❌'}</span>
              <div>
                <p className={styles.resultTitle}>
                  {result.success ? 'Entry Granted' : result.reg ? 'Already Checked In' : 'Invalid Ticket'}
                </p>
                {result.reg && <p className={styles.resultTeam}>{result.reg.teamName}</p>}
                {result.error && !result.reg && <p className={styles.resultErr}>{result.error}</p>}
                {result.success && <p className={styles.resultTime}>✓ {new Date().toLocaleTimeString()}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={styles.statsCol}>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statNum} style={{ color: '#10b981' }}>{checkedIn.length}</span>
            <span className={styles.statLabel}>Checked In</span>
          </div>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statNum} style={{ color: '#f59e0b' }}>{notCheckedIn.length}</span>
            <span className={styles.statLabel}>Not Yet</span>
          </div>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statNum} style={{ color: '#a855f7' }}>{registrations.length}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </div>
      </div>

      {/* Checked-in table */}
      <div className={`glass-card ${styles.tableWrap}`}>
        <div className={styles.tableHeader}>
          <h3 className={styles.panelTitle}>✅ Checked-In Teams ({checkedIn.length})</h3>
          <input type="text" placeholder="🔍 Search team or ticket..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={styles.search} />
        </div>
        {filtered.length === 0 ? (
          <p className={styles.empty}>{checkedIn.length === 0 ? 'No teams checked in yet.' : 'No results.'}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Ticket ID</th>
                <th>Domain</th>
                <th>College</th>
                <th>Members</th>
                <th>Checked In At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td className={styles.teamName}>{r.team_name}</td>
                  <td className={styles.ticketId}>{r.ticket_id}</td>
                  <td><span className={styles.domainTag}>{r.domain}</span></td>
                  <td className={styles.muted}>{r.college}</td>
                  <td className={styles.center}>{r.team_size}</td>
                  <td className={styles.muted}>{r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
