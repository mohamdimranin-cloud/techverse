import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import styles from './Prizes.module.css'

const perks = [
  { label: 'Cash Prizes' },
  { label: 'Certificates' },
  { label: 'Incubation Facilities' },
  { label: 'Mentorship' },
  { label: 'Grants & Investments' },
]

function useCountUp(target, duration = 2200) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    let raf
    const start = () => {
      let startTime = null
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.floor(eased * target))
        if (progress < 1) raf = requestAnimationFrame(step)
      }
      setCount(0)
      raf = requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start()
        } else {
          cancelAnimationFrame(raf)
          setCount(0)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => { observer.disconnect(); cancelAnimationFrame(raf) }
  }, [target, duration])

  return { count, ref }
}

export default function Prizes() {
  const { count, ref } = useCountUp(50000, 2200)

  return (
    <section className="section" id="prizes">
      <div className="container">
        <p className="section-tag">Rewards</p>
        <h2 className="section-title">Prizes</h2>

        <div className={`glass-card ${styles.pool}`} ref={ref}>
          <div className={styles.poolOrb} />
          <p className={styles.poolLabel}>Total Prize Pool</p>
          <div className={styles.poolAmount}>
            ₹{count.toLocaleString('en-IN')}<span>+</span>
          </div>
          <p className={styles.poolSub}>Across all tracks and domain categories</p>
        </div>

        <div className={styles.perksGrid}>
          {perks.map(p => (
            <div key={p.label} className={`glass-card ${styles.perkCard}`}>
              <span className={styles.star}>★</span>
              <p>{p.label}</p>
            </div>
          ))}
        </div>

        <div className={styles.feeSection}>
          <h3 className={styles.feeTitle}>Fee Structure</h3>
          <div className={styles.feeGrid}>
            <div className={`glass-card ${styles.feeCard}`}>
              <span className={styles.feeRound}>Registration</span>
              <p className={styles.feeName}>Free to Register</p>
              <p className={styles.feeAmount}>₹0 <span>/ per team</span></p>
            </div>
            <div className={`glass-card ${styles.feeCard}`}>
              <span className={styles.feeRound}>After Shortlisting</span>
              <p className={styles.feeName}>Participation Fee</p>
              <p className={styles.feeAmount}>₹549 <span>/ per team</span></p>
            </div>
          </div>
          <p className={styles.feeNote}>
            Registration is free. After shortlisting, a payment request of ₹549 will be sent via WhatsApp. Once confirmed, your QR code ticket will be issued.
          </p>
        </div>

        <div className={styles.cta}>
          <Link to="/register" className="btn btn-primary btn-lg">Register Now</Link>
        </div>
      </div>
    </section>
  )
}
