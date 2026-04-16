import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Countdown.module.css'

const DEADLINE = new Date('2026-04-25T23:59:59')

function getTimeLeft() {
  const diff = DEADLINE - new Date()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    mins: Math.floor((diff / (1000 * 60)) % 60),
    secs: Math.floor((diff / 1000) % 60),
  }
}

export default function Countdown() {
  const [time, setTime] = useState(getTimeLeft())

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [])

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
            <p className={styles.date}>Deadline: 25 April 2026</p>
            <Link to="/register" className="btn btn-primary">Register Before It's Too Late</Link>
          </>
        ) : (
          <>
            <p className={styles.label}>Registration Closed</p>
            <p className={styles.date}>Registration ended on 25 April 2026</p>
          </>
        )}
      </div>
    </section>
  )
}
