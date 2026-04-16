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
          Round 1 payment is under verification. After shortlisting, a payment request of ₹499 will be sent via WhatsApp. Once the payment is confirmed, your QR code ticket will be issued.
        </p>

        {ticketId && (
          <div className={styles.ticketNote}>
            <p className={styles.ticketLabel}>Registration ID</p>
            <p className={styles.ticketId}>{ticketId}</p>
          </div>
        )}

        <div className={styles.steps}>
          <div className={styles.step}><span></span><p>Round 1 — ₹50/head registration fee paid</p></div>
          <div className={styles.step}><span></span><p>Payment verification in progress</p></div>
          <div className={styles.step}><span></span><p>If shortlisted, Round 2 payment request (₹499/team) sent via WhatsApp</p></div>
          <div className={styles.step}><span></span><p>QR entry ticket sent after Round 2 payment confirmed</p></div>
          <div className={styles.step}><span></span><p>9 & 10 May 2026 — Bearys Institute of Technology</p></div>
        </div>

        <Link to="/" className="btn btn-primary btn-lg">← Back to Home</Link>
      </div>
    </div>
  )
}
