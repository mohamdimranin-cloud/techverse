import { useLocation, Link } from 'react-router-dom'
import styles from './RegistrationSuccess.module.css'

export default function RegistrationSuccess() {
  const { state } = useLocation()
  const teamName = state?.teamName || 'Your Team'
  const ticketId = state?.ticketId

  return (
    <div className={styles.page}>
      <div className={`glass-card ${styles.card}`}>
        <div className={styles.orb} />
        <div className={styles.icon}></div>
        <h1 className={styles.title}>You're In the TechVerse!</h1>
        <p className={styles.team}>{teamName}</p>
        <p className={styles.msg}>
          Your registration is confirmed and payment is under verification.
          Once shortlisted, your entry QR code will be sent to your WhatsApp and email.
        </p>

        {ticketId && (
          <div className={styles.ticketNote}>
            <p className={styles.ticketLabel}>Registration ID</p>
            <p className={styles.ticketId}>{ticketId}</p>
          </div>
        )}

        <div className={styles.steps}>
          <div className={styles.step}><span></span><p>Check your WhatsApp for registration confirmation</p></div>
          <div className={styles.step}><span></span><p>Payment verification in progress</p></div>
          <div className={styles.step}><span></span><p>QR entry ticket will be sent once shortlisted</p></div>
          <div className={styles.step}><span></span><p>9 & 10 May 2026 — Bearys Institute of Technology</p></div>
        </div>

        <Link to="/" className="btn btn-primary btn-lg">← Back to Home</Link>
      </div>
    </div>
  )
}
