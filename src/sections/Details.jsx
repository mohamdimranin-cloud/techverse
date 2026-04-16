import styles from './Details.module.css'

const items = [
  { icon: '', label: 'Date', val: '9 & 10 May 2026' },
  { icon: '', label: 'Location', val: 'Bearys Institute of Technology' },
  { icon: '', label: 'Duration', val: '24 Hours' },
  { icon: '', label: 'Team Size', val: '2 – 4 Members' },
]

export default function Details() {
  return (
    <section className="section section-alt" id="details">
      <div className="container">
        <p className="section-tag">Event Details</p>
        <h2 className="section-title">Mark Your Calendar</h2>
        <div className={styles.grid}>
          {items.map(i => (
            <div key={i.label} className={`glass-card ${styles.item}`}>
              <span className={styles.icon}>{i.icon}</span>
              <span className={styles.label}>{i.label}</span>
              <span className={styles.val}>{i.val}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
