import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { uploadPptToCloudinary } from '../api/client'
import styles from './UploadPPT.module.css'

export default function UploadPPT() {
  const { ticketId: paramTicketId } = useParams()
  const [ticketId, setTicketId] = useState(paramTicketId || '')
  const [regId, setRegId] = useState('')
  const [pptFile, setPptFile] = useState(null)
  const [pptError, setPptError] = useState('')
  const [status, setStatus] = useState(null)
  const [step, setStep] = useState(paramTicketId ? 'loading' : 1)

  // Auto-lookup if ticket ID came from URL
  useEffect(() => {
    if (paramTicketId) {
      lookupTicket(paramTicketId)
    }
  }, [paramTicketId])

  const lookupTicket = async (id) => {
    setStatus('loading')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'}/api/registration-by-ticket/${id.trim().toUpperCase()}`)
      const data = await res.json()
      if (!data.id) { setStatus('notfound'); setStep(1); return }
      setRegId(data.id)
      setTicketId(id.trim().toUpperCase())
      setStatus(null)
      setStep(2)
    } catch {
      setStatus('error')
      setStep(1)
    }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    setPptError('')
    if (!file) return
    if (!file.name.match(/\.(ppt|pptx)$/i)) { setPptError('Only .ppt or .pptx files allowed'); return }
    if (file.size > 10 * 1024 * 1024) { setPptError(`File too large (${(file.size/1024/1024).toFixed(1)}MB). Max 10MB.`); return }
    setPptFile(file)
  }

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!ticketId.trim()) return
    await lookupTicket(ticketId)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!pptFile || !regId) return
    setStatus('uploading')
    try {
      await uploadPptToCloudinary(pptFile, regId)
      setStatus('success')
    } catch (err) {
      setPptError(err.message)
      setStatus('error')
    }
  }

  return (
    <div className={styles.page}>
      <div className={`glass-card ${styles.card}`}>
        <h1 className={styles.title}>Upload Your PPT</h1>
        <p className={styles.sub}>Submit your presentation for TechVerse Hackathon 2026</p>

        {step === 'loading' ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Looking up your registration...</p>
        ) : status === 'success' ? (
          <div className={styles.successBox}>
            <p className={styles.successIcon}>✓</p>
            <p className={styles.successMsg}>PPT uploaded successfully!</p>
            <p className={styles.successSub}>Your presentation has been received. Good luck!</p>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleLookup} className={styles.form}>
            <div className={styles.field}>
              <label>Registration ID</label>
              <input
                type="text"
                placeholder="e.g. TV2026-XXXXX-XXXXXX"
                value={ticketId}
                onChange={e => { setTicketId(e.target.value); setStatus(null) }}
              />
              <p className={styles.hint}>Find your Registration ID in the confirmation message sent to your WhatsApp.</p>
            </div>
            {status === 'notfound' && <p className={styles.error}>Registration not found. Check your ID and try again.</p>}
            {status === 'error' && <p className={styles.error}>Something went wrong. Please try again.</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={status === 'loading'}>
              {status === 'loading' ? 'Looking up...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpload} className={styles.form}>
            <p className={styles.idConfirm}>Registration ID: <strong>{ticketId.toUpperCase()}</strong></p>
            <div className={styles.field}>
              <label>Select PPT File *</label>
              <p className={styles.hint}>Max 10MB · .ppt or .pptx only</p>
              <label className={`${styles.uploadBox} ${pptFile ? styles.uploadDone : ''}`}>
                <input type="file" accept=".ppt,.pptx" onChange={handleFile} style={{ display: 'none' }} />
                {pptFile ? (
                  <div className={styles.fileInfo}>
                    <span>📊</span>
                    <div>
                      <p className={styles.fileName}>{pptFile.name}</p>
                      <p className={styles.fileSize}>{(pptFile.size/1024/1024).toFixed(2)} MB</p>
                    </div>
                    <span style={{ color: 'var(--neon-cyan)' }}>✓</span>
                  </div>
                ) : (
                  <div className={styles.uploadPrompt}>
                    <span>📤</span>
                    <p>Click to select your PPT file</p>
                  </div>
                )}
              </label>
              {pptError && <p className={styles.error}>{pptError}</p>}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}
              disabled={!pptFile || status === 'uploading'}>
              {status === 'uploading' ? 'Uploading...' : 'Upload PPT'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}    </div>
  )
}
