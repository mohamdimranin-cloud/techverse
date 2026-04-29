import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Countdown.module.css'

const BASE = import.meta.env.VITE_API_URL || 'https://techverse-1-2fun.onrender.com'

function getTimeLeft(deadline) {
  const diff = new Date(deadline) - new Date()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    mins: Math.floor((diff / (1000 * 60)) % 60),
    secs: Math.floor((diff / 1000) % 60),
  }
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Countdown() {
  const [deadline, setDeadline] = useState('2026-04-29T23:59:59')
  const [time, setTime] = useState(null)

  useEffect(() => {
    fetch(`${BASE}/api/settings/deadline`)
      .then(r => r.json())
      .then(d => { if (d.deadline) setDeadline(d.deadline) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setTime(getTimeLeft(deadline))
    const t = setInterval(() => setTime(getTimeLeft(deadline)), 1000)
    return () => clearInterval(t)
  }, [deadline])

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {time ? (
          <>
            <p className={styles.label}>Registration Closes In</p>
            <div className={styles.timer}>
              {[['Days', time.days], ['Hours', time.hours], ['Mins', time.mins], ['Secs', time.secs]].map(([unit, val]) => (
                <div key={unit} className={styles.block}>
                  <span className={styles.num}>{String(val).padStart(2, '0')}</span>
                  <span className={styles.unit}>{unit}</span>
                </div>
              ))}
            </div>
            <p className={styles.date}>Deadline: {formatDate(deadline)}</p>
            <Link to="/register" className="btn btn-primary">Register Before It's Too Late</Link>
          </>
        ) : (
          <>
            <p className={styles.label}>Registration Closed</p>
            <p className={styles.date}>Registration ended on {formatDate(deadline)}</p>
          </>
        )}
      </div>
    </section>
  )
}
