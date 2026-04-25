import { useLocation, Link } from 'react-router-dom'
import styles from './RegistrationSuccess.module.css'

export default function RegistrationSuccess() {
  const { state } = useLocation()
  const teamName = state?.teamName || 'Your Team'
  const ticketId = state?.ticketId
  const hasPpt = state?.hasPpt || false

  return (
    <div className={styles.page}>
      <div className={`glass-card ${styles.card}`}>
        <div className={styles.orb} />
        <div className={styles.icon}></div>
        <h1 className={styles.title}>You're In the TechVerse!</h1>
        <p className={styles.team}>{teamName}</p>
        <p className={styles.msg}>
          Registration is free. If shortlisted, a payment request of ₹549 will be sent via WhatsApp. Once confirmed, your QR code entry ticket will be issued.
        </p>

        {ticketId && (
          <div className={styles.ticketNote}>
            <p className={styles.ticketLabel}>Registration ID</p>
            <p className={styles.ticketId}>{ticketId}</p>
          </div>
        )}

        {!hasPpt && (
          <div className={styles.uploadAlert}>
            <p>You haven't uploaded your PPT yet. Please upload it as soon as possible.</p>
            <Link to="/upload" className="btn btn-primary" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
              Upload PPT Now
            </Link>
          </div>
        )}

        <div className={styles.steps}>
          <div className={styles.step}><span></span><p>Registration submitted successfully</p></div>
          <div className={styles.step}><span></span><p>Team will be reviewed and shortlisted</p></div>
          <div className={styles.step}><span></span><p>If shortlisted, ₹549 payment request sent via WhatsApp</p></div>
          <div className={styles.step}><span></span><p>QR entry ticket issued after payment confirmed</p></div>
          <div className={styles.step}><span></span><p>9 & 10 May 2026 — Bearys Institute of Technology</p></div>
        </div>

        <Link to="/" className="btn btn-outline btn-lg">← Back to Home</Link>
      </div>
    </div>
  )
}
