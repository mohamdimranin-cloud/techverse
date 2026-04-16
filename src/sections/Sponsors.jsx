import { useState, useEffect } from 'react'
import { fetchSponsors } from '../api/client'
import styles from './Sponsors.module.css'

export default function Sponsors() {
  const [sponsors, setSponsors] = useState([])
  useEffect(() => { fetchSponsors().then(setSponsors) }, [])

  const TOTAL_SLOTS = 4
  const slots = [...sponsors, ...Array(Math.max(0, TOTAL_SLOTS - sponsors.length)).fill(null)]

  return (
    <section className="section section-alt" id="sponsors">
      <div className="container">
        <p className="section-tag">Partners</p>
        <h2 className="section-title">Sponsors & Partners</h2>
        <p className={styles.sub}>Powered by innovation, supported by industry leaders.</p>
        <div className={styles.grid}>
          {slots.map((s, i) => s ? (
            <div key={s.id} className={`glass-card ${styles.slot}`}>
              <img src={s.image_data} alt={s.name} className={styles.logo} />
            </div>
          ) : (
            <div key={`empty-${i}`} className={`glass-card ${styles.slot} ${styles.placeholder}`}>
              Your Logo Here
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
