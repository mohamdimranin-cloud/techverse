import { useState, useEffect, useRef } from 'react'
import { checkInTicket } from '../api/client'
import { Html5Qrcode } from 'html5-qrcode'
import styles from './Verify.module.css'

export default function Verify() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null) // { success, reg, error }
  const [manualId, setManualId] = useState('')
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)

  const handleScan = async (ticketId) => {
    const id = ticketId.replace('TECHVERSE2026:', '')
    const outcome = await checkInTicket(id)
    setResult(outcome)
    stopScanner()
  }

  const startScanner = async () => {
    setResult(null)
    setScanning(true)
    setTimeout(async () => {
      try {
        html5QrRef.current = new Html5Qrcode('qr-reader')
        await html5QrRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
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
      if (html5QrRef.current) {
        await html5QrRef.current.stop()
        html5QrRef.current.clear()
      }
    } catch {}
    setScanning(false)
  }

  useEffect(() => () => { stopScanner() }, [])

  const handleManual = async () => {
    if (!manualId.trim()) return
    const outcome = await checkInTicket(manualId.trim().toUpperCase())
    setResult(outcome)
    setManualId('')
  }

  return (
    <div className={styles.page}>
      <div className={`glass-card ${styles.card}`}>
        <h1 className={styles.title}>Entry Verification</h1>
        <p className={styles.sub}>TechVerse Hackathon 2026 — Check-in</p>

        {/* Scanner */}
        <div id="qr-reader" className={styles.scanBox} style={{ display: scanning ? 'block' : 'none' }} />

        {!scanning && !result && (
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }} onClick={startScanner}>
            Scan QR Code
          </button>
        )}
        {scanning && (
          <button className="btn btn-outline" style={{ width: '100%', marginBottom: '1rem' }} onClick={stopScanner}>
            Stop Scanner
          </button>
        )}

        {/* Manual entry */}
        <div className={styles.manual}>
          <input
            type="text"
            placeholder="Or enter Ticket ID manually (e.g. TV2026-XXXXX)"
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            className={styles.input}
          />
          <button className="btn btn-outline" onClick={handleManual}>Verify</button>
        </div>

        {/* Result */}
        {result && (
          <div className={`${styles.result} ${result.success ? styles.success : styles.fail}`}>
            {result.success ? (
              <>
                <div className={styles.resultIcon}>Granted</div>
                <h2>Entry Granted</h2>
                <p className={styles.teamName}>{result.reg?.team_name || result.reg?.teamName}</p>
                <div className={styles.details}>
                  <span>{result.reg?.ticket_id || result.reg?.ticketId}</span>
                  <span>{result.reg?.domain}</span>
                  <span>{result.reg?.team_size || result.reg?.teamSize} members</span>
                  <span>{result.reg?.college}</span>
                </div>
                <p className={styles.checkinTime}>Checked in at {new Date().toLocaleTimeString()}</p>
              </>
            ) : (
              <>
                <div className={styles.resultIcon}>{result.reg ? 'Warning' : 'Invalid'}</div>
                <h2>{result.reg ? 'Already Checked In' : 'Invalid Ticket'}</h2>
                <p>{result.error}</p>
                {result.reg && (
                  <p className={styles.teamName}>{result.reg.teamName} — checked in at {new Date(result.reg.checkedInAt).toLocaleTimeString()}</p>
                )}
              </>
            )}
            <button className="btn btn-outline" style={{ marginTop: '1rem' }}
              onClick={() => { setResult(null) }}>
              Scan Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
